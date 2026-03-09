import json
import logging
from typing import Dict, List, Optional

import geopandas as gpd
import pandas as pd
from shapely import wkt
from shapely.geometry import LineString, MultiLineString, Point
from shapely.ops import transform
from shapely.strtree import STRtree

from ..config import DATA_DIR, PROJECTS_DIR
from ..schemas.exceptions import AppException
from .disaster_geometry import _TO_METERS, _TO_WGS84

logger = logging.getLogger(__name__)


class RoadGeometry:
    _road_data_4326: Optional[gpd.GeoDataFrame] = None
    _road_data_5179: Optional[gpd.GeoDataFrame] = None
    _spatial_index: Optional[STRtree] = None

    @classmethod
    def load_road_data(cls) -> gpd.GeoDataFrame:
        if cls._road_data_4326 is None:
            parquet_4326 = DATA_DIR / "link_4326.parquet"
            parquet_5179 = DATA_DIR / "link_5179.parquet"

            if parquet_4326.exists() and parquet_5179.exists():
                logger.info("Parquet 파일에서 도로 데이터 로딩")
                cls._road_data_4326 = gpd.read_parquet(parquet_4326)
                cls._road_data_5179 = gpd.read_parquet(parquet_5179)

            else:
                logger.info("CSV 파일에서 도로 데이터 로딩 (fallback)")
                csv_path = DATA_DIR / "link.csv"

                if not csv_path.exists():
                    raise AppException(
                        404, f"도로 데이터 파일을 찾을 수 없습니다: {csv_path}"
                    )

                df = pd.read_csv(csv_path, usecols=["link_id", "geom", "cartrk_co"])

                df["geometry"] = df["geom"].apply(wkt.loads)
                df = df.drop(columns=["geom"])

                gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:3857")
                cls._road_data_4326 = gdf.to_crs("EPSG:4326")
                cls._road_data_5179 = gdf.to_crs("EPSG:5179")

                cls._road_data_4326.to_parquet(parquet_4326)
                cls._road_data_5179.to_parquet(parquet_5179)
                logger.info("Parquet 파일로 변환 저장 완료")

            cls._spatial_index = STRtree(cls._road_data_4326.geometry)

        return cls._road_data_4326

    @classmethod
    def get_spatial_index(cls) -> STRtree:
        if cls._spatial_index is None:
            cls.load_road_data()
        return cls._spatial_index


def _filter_intersected_roads(
    roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
) -> gpd.GeoDataFrame:
    if len(candidate_indices) == 0:
        return gpd.GeoDataFrame()

    candidates = roads.iloc[candidate_indices]
    mask = candidates.intersects(buffer_geometry)
    filtered = candidates[mask]

    if filtered.empty:
        return gpd.GeoDataFrame()

    return gpd.GeoDataFrame(filtered, crs=roads.crs)


def _apply_offset_curve(geometry, offset):
    """MultiLineString과 LineString 모두 처리"""
    if isinstance(geometry, MultiLineString):
        offset_lines = []
        for line in geometry.geoms:
            try:
                offset_line = line.offset_curve(offset)
                if not offset_line.is_empty:
                    offset_lines.append(offset_line)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"offset_curve 실패 (MultiLineString, offset={offset}): {e}"
                )
                continue

        if not offset_lines:
            return None

        return (
            MultiLineString(offset_lines) if len(offset_lines) > 1 else offset_lines[0]
        )

    elif isinstance(geometry, LineString):
        try:
            return geometry.offset_curve(offset)
        except (ValueError, TypeError) as e:
            logger.warning(f"offset_curve 실패 (LineString, offset={offset}): {e}")
            return None

    return None


def _convert_to_features(
    gdf: gpd.GeoDataFrame, properties_keys: List[str]
) -> List[Dict]:
    features = []
    for record in gdf.__geo_interface__["features"]:
        feature = {
            "type": "Feature",
            "properties": {},
            "geometry": record["geometry"],
        }
        props = record.get("properties", {})
        for key in properties_keys:
            if key in props:
                value = props[key]
                if isinstance(value, (int, float)):
                    feature["properties"][key] = (
                        int(value) if key == "link_id" else bool(value)
                    )
                else:
                    feature["properties"][key] = value
        features.append(feature)
    return features


def _extract_intersected_roads(
    roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
) -> List[Dict]:
    """Meso 레벨: 도로 중심선만 추출"""
    filtered_roads = _filter_intersected_roads(
        roads, candidate_indices, buffer_geometry
    )

    if filtered_roads.empty:
        return []

    return _convert_to_features(filtered_roads, ["link_id"])


def _create_micro_link(
    roads_4326: gpd.GeoDataFrame,
    roads_5179: gpd.GeoDataFrame,
    candidate_indices: list,
    buffer_geometry,
) -> List[Dict]:
    filtered_roads = _filter_intersected_roads(
        roads_4326, candidate_indices, buffer_geometry
    )

    if filtered_roads.empty:
        return []

    filtered_indices = filtered_roads.index
    filtered_roads_5179 = roads_5179.loc[filtered_indices]

    max_lanes = (
        int(filtered_roads_5179["cartrk_co"].max())
        if "cartrk_co" in filtered_roads_5179.columns
        else 2
    )

    all_features = []
    for geom, link_id, lanes_raw in zip(
        filtered_roads_5179.geometry,
        filtered_roads_5179["link_id"],
        filtered_roads_5179["cartrk_co"].fillna(2).astype(int),
    ):
        lanes = int(lanes_raw)

        # 첫 번째 차선
        offset_geom = _apply_offset_curve(geom, 5.5)
        if offset_geom:
            all_features.append(
                {
                    "link_id": link_id,
                    "geometry": offset_geom,
                    "lanes": lanes,
                    "lane_ty": True,
                }
            )

        # 추가 차선
        for lane_num in range(2, max_lanes + 1):
            if lanes >= lane_num:
                offset_distance = 5.5 + (-3.6 * (lane_num - 1))
                offset_geom = _apply_offset_curve(geom, offset_distance)
                if offset_geom:
                    all_features.append(
                        {
                            "link_id": link_id,
                            "geometry": offset_geom,
                            "lanes": lanes,
                            "lane_ty": (lane_num == lanes),
                        }
                    )

    if not all_features:
        return []

    final_lanes = gpd.GeoDataFrame(all_features, crs="EPSG:5179").to_crs("EPSG:4326")
    return _convert_to_features(final_lanes, ["link_id", "lane_ty"])


def _create_walking_link(
    roads_4326: gpd.GeoDataFrame,
    roads_5179: gpd.GeoDataFrame,
    candidate_indices: list,
    buffer_geometry,
) -> List[Dict]:
    filtered_roads = _filter_intersected_roads(
        roads_4326, candidate_indices, buffer_geometry
    )

    if filtered_roads.empty:
        return []

    filtered_indices = filtered_roads.index
    filtered_roads_5179 = roads_5179.loc[filtered_indices]

    all_features = []
    for geom, link_id, lanes_raw in zip(
        filtered_roads_5179.geometry,
        filtered_roads_5179["link_id"],
        filtered_roads_5179["cartrk_co"].fillna(2).astype(int),
    ):
        lanes = int(lanes_raw)
        last_lane_offset = 5.5 + (-3.6 * (lanes - 1))

        for offset, lane_ty in [
            (last_lane_offset, True),
            (last_lane_offset - 3.6, False),
            (last_lane_offset - 7.2, True),
        ]:
            offset_geom = _apply_offset_curve(geom, offset)
            if offset_geom:
                all_features.append(
                    {
                        "link_id": link_id,
                        "geometry": offset_geom,
                        "lane_ty": lane_ty,
                    }
                )

    if not all_features:
        return []

    final_features = gpd.GeoDataFrame(all_features, crs="EPSG:5179").to_crs("EPSG:4326")
    return _convert_to_features(final_features, ["link_id", "lane_ty"])


def _load_cached_road(directory: str) -> List[Dict] | None:
    """캐시된 road geometry JSON 파일 로드"""
    cache_path = PROJECTS_DIR / directory / "road_geometry.json"
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_road_cache(directory: str, data: List[Dict]) -> None:
    """road geometry 결과를 JSON 파일로 저장"""
    cache_dir = PROJECTS_DIR / directory
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / "road_geometry.json"
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def get_roads_geometry(
    directory: str, lng: float, lat: float, disaster_type: str, analysis_distance: float
) -> List[Dict]:
    cached = _load_cached_road(directory)
    if cached is not None:
        return cached

    point = Point(lng, lat)
    point_meters = transform(_TO_METERS, point)
    analysis_buffer_meters = point_meters.buffer(analysis_distance * 1000)
    analysis_buffer_wgs84 = transform(_TO_WGS84, analysis_buffer_meters)

    roads_4326 = RoadGeometry.load_road_data()
    roads_5179 = RoadGeometry._road_data_5179
    spatial_index = RoadGeometry.get_spatial_index()
    candidate_indices = spatial_index.query(analysis_buffer_wgs84)

    if disaster_type == "nuclear":
        result = _extract_intersected_roads(
            roads_4326, candidate_indices, analysis_buffer_wgs84
        )

    elif disaster_type == "chemistry":
        if analysis_distance > 5:
            result = _extract_intersected_roads(
                roads_4326, candidate_indices, analysis_buffer_wgs84
            )
        else:
            result = _create_micro_link(
                roads_4326, roads_5179, candidate_indices, analysis_buffer_wgs84
            )

    else:
        result = _create_walking_link(
            roads_4326, roads_5179, candidate_indices, analysis_buffer_wgs84
        )

    _save_road_cache(directory, result)
    return result
