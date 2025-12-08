from pathlib import Path
from typing import Dict, List, Optional

import geopandas as gpd
from shapely.geometry import Point
from shapely.strtree import STRtree


class RoadGeometry:
    _road_data: Optional[gpd.GeoDataFrame] = None
    _spatial_index: Optional[STRtree] = None

    @classmethod
    def load_road_data(cls) -> gpd.GeoDataFrame:
        if cls._road_data is None:
            shp_path = Path("app/data/MOCT_LINK_4326.shp")
            cls._road_data = gpd.read_file(shp_path)
            cls._spatial_index = STRtree(cls._road_data.geometry)
        return cls._road_data

    @classmethod
    def get_spatial_index(cls) -> STRtree:
        if cls._spatial_index is None:
            cls.load_road_data()
        return cls._spatial_index

    @staticmethod
    def _filter_intersected_roads(
        roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
    ) -> gpd.GeoDataFrame:
        intersected_roads = []
        for idx in candidate_indices:
            road = roads.iloc[idx]
            if road.geometry.intersects(buffer_geometry):
                intersected_roads.append(road)

        if not intersected_roads:
            return gpd.GeoDataFrame()

        return gpd.GeoDataFrame(intersected_roads, crs=roads.crs)

    @staticmethod
    def _convert_to_features(
        gdf: gpd.GeoDataFrame, properties_keys: List[str]
    ) -> List[Dict]:
        features = []
        for _, row in gdf.iterrows():
            feature = {
                "type": "Feature",
                "properties": {},
                "geometry": row.geometry.__geo_interface__,
            }

            # properties 추가
            for key in properties_keys:
                if key in row:
                    value = row[key]
                    # 타입 변환
                    if isinstance(value, (int, float)):
                        feature["properties"][key] = (
                            int(value) if key == "link_id" else bool(value)
                        )
                    else:
                        feature["properties"][key] = value

            features.append(feature)

        return features

    @staticmethod
    def _extract_intersected_roads(
        roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
    ) -> List[Dict]:
        """Meso 레벨: 도로 중심선만 추출"""
        filtered_roads = RoadGeometry._filter_intersected_roads(
            roads, candidate_indices, buffer_geometry
        )

        if filtered_roads.empty:
            return []

        # link_id만 포함
        filtered_roads["link_id"] = filtered_roads["LINK_ID"].astype(int)
        return RoadGeometry._convert_to_features(filtered_roads, ["link_id"])

    @staticmethod
    def _create_micro_link(
        roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
    ) -> List[Dict]:
        filtered_roads = RoadGeometry._filter_intersected_roads(
            roads, candidate_indices, buffer_geometry
        )

        if filtered_roads.empty:
            return []

        max_lanes = (
            int(filtered_roads["LANES"].max())
            if "LANES" in filtered_roads.columns
            else 2
        )
        filtered_roads_5179 = filtered_roads.to_crs("EPSG:5179")

        all_lanes = []

        for _, road in filtered_roads_5179.iterrows():
            all_lanes.append(
                {
                    "link_id": road["LINK_ID"],
                    "geometry": road.geometry.offset_curve(5.5),
                    "lanes": int(road.get("LANES", 2)),
                    "lane_ty": True,
                }
            )

        for lane_num in range(2, max_lanes + 1):
            offset_distance = 5.5 + (-3.6 * (lane_num - 1))

            for _, road in filtered_roads_5179.iterrows():
                lanes = int(road.get("LANES", 2))

                if lanes >= lane_num:
                    all_lanes.append(
                        {
                            "link_id": road["LINK_ID"],
                            "geometry": road.geometry.offset_curve(offset_distance),
                            "lanes": lanes,
                            "lane_ty": (lane_num == lanes),
                        }
                    )

        final_lanes = gpd.GeoDataFrame(all_lanes, crs="EPSG:5179").to_crs("EPSG:4326")
        return RoadGeometry._convert_to_features(final_lanes, ["link_id", "lane_ty"])

    @staticmethod
    def _create_walking_link(
        roads: gpd.GeoDataFrame, candidate_indices: list, buffer_geometry
    ) -> List[Dict]:
        filtered_roads = RoadGeometry._filter_intersected_roads(
            roads, candidate_indices, buffer_geometry
        )

        if filtered_roads.empty:
            return []

        filtered_roads_5179 = filtered_roads.to_crs("EPSG:5179")
        all_features = []

        for _, road in filtered_roads_5179.iterrows():
            lanes = int(road.get("LANES", 2))
            last_lane_offset = 5.5 + (-3.6 * (lanes - 1))

            # 보행로 3개
            for i, (offset, lane_ty) in enumerate(
                [
                    (last_lane_offset, True),
                    (last_lane_offset - 3.6, False),
                    (last_lane_offset - 7.2, True),
                ]
            ):
                all_features.append(
                    {
                        "link_id": road["LINK_ID"],
                        "geometry": road.geometry.offset_curve(offset),
                        "lane_ty": lane_ty,
                    }
                )

        final_features = gpd.GeoDataFrame(all_features, crs="EPSG:5179").to_crs(
            "EPSG:4326"
        )
        return RoadGeometry._convert_to_features(final_features, ["link_id", "lane_ty"])

    @staticmethod
    def get_roads_geometry(
        lng: float, lat: float, disaster_type: str, analysis_distance: float
    ) -> List[Dict]:
        from .disaster_geometry import DisasterGeometryService

        point = Point(lng, lat)
        point_meters = DisasterGeometryService._transform_to_meters(point)
        analysis_buffer_meters = point_meters.buffer(analysis_distance * 1000)
        analysis_buffer_wgs84 = DisasterGeometryService._transform_from_meters(
            analysis_buffer_meters
        )

        roads = RoadGeometry.load_road_data()
        spatial_index = RoadGeometry.get_spatial_index()
        candidate_indices = spatial_index.query(analysis_buffer_wgs84)

        if disaster_type == "nuclear":
            return RoadGeometry._extract_intersected_roads(
                roads, candidate_indices, analysis_buffer_wgs84
            )

        elif disaster_type == "chemistry":
            if analysis_distance > 5:
                return RoadGeometry._extract_intersected_roads(
                    roads, candidate_indices, analysis_buffer_wgs84
                )
            else:
                return RoadGeometry._create_micro_link(
                    roads, candidate_indices, analysis_buffer_wgs84
                )

        else:
            return RoadGeometry._create_walking_link(
                roads, candidate_indices, analysis_buffer_wgs84
            )
