import json
import logging
import math
from pathlib import Path
from typing import Dict, List, Optional

from pyproj import Transformer
from shapely.geometry import Point, Polygon, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform

from ..config import SESSIONS_DIR

logger = logging.getLogger(__name__)

# 모듈 레벨 Transformer 캐싱 (앱 전체에서 2회만 생성)
_TO_METERS = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True).transform
_TO_WGS84 = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True).transform

# 상수
NUM_SECTORS = 16
SECTOR_ANGLE = 360.0 / NUM_SECTORS


def _transform_to_meters(geometry: BaseGeometry) -> BaseGeometry:
    return transform(_TO_METERS, geometry)


def _transform_from_meters(geometry: BaseGeometry) -> BaseGeometry:
    return transform(_TO_WGS84, geometry)


def _create_wedge(
    center_point: Point, radius_meters: float, start_angle: float, end_angle: float
) -> Polygon:
    cx, cy = center_point.x, center_point.y
    num_points = max(int(abs(end_angle - start_angle)), 1)

    coords = [(cx, cy)]
    for i in range(num_points + 1):
        angle = start_angle + (end_angle - start_angle) * i / num_points
        rad = math.radians(angle)
        x = cx + radius_meters * math.sin(rad)
        y = cy + radius_meters * math.cos(rad)
        coords.append((x, y))
    coords.append((cx, cy))

    return Polygon(coords)


def _create_16_wedges(center_point: Point, radius_meters: float) -> List[Polygon]:
    wedges = []
    for i in range(NUM_SECTORS):
        start_angle = i * SECTOR_ANGLE - (SECTOR_ANGLE / 2)
        end_angle = start_angle + SECTOR_ANGLE
        wedge = _create_wedge(center_point, radius_meters, start_angle, end_angle)
        wedges.append(wedge)
    return wedges


def _geometries_to_dict_list(geometries: List[BaseGeometry]) -> List[Dict]:
    return [mapping(_transform_from_meters(geom)) for geom in geometries]


def _load_cached_geometry(directory: str, filename: str) -> Optional[dict]:
    """캐시된 geometry JSON 파일 로드"""
    cache_path = SESSIONS_DIR / directory / filename
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_geometry_cache(directory: str, filename: str, data: dict) -> None:
    """geometry 결과를 JSON 파일로 저장"""
    cache_dir = SESSIONS_DIR / directory
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / filename
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def create_disaster_buffer(
    directory: str,
    lng: float,
    lat: float,
    disaster_distance: float,
    analysis_distance: float,
) -> Dict[str, str]:
    cached = _load_cached_geometry(directory, "disaster_geometry.json")
    if cached is not None:
        return cached

    point = Point(lng, lat)
    point_meters = _transform_to_meters(point)

    disaster_buffer = point_meters.buffer(disaster_distance * 1000)
    analysis_buffer = point_meters.buffer(analysis_distance * 1000)

    disaster_geometry = _transform_from_meters(disaster_buffer)
    analysis_geometry = _transform_from_meters(analysis_buffer)

    result = {
        "disaster_geometry": mapping(disaster_geometry),
        "analysis_geometry": mapping(analysis_geometry),
    }

    _save_geometry_cache(directory, "disaster_geometry.json", result)
    return result


def create_nuclear_buffer(
    directory: str,
    lng: float,
    lat: float,
    paz_distance: float,
    upz_distance: float,
    upz_wind_distance: float,
    wind_direction: int,
    shadow_distance: float,
    analysis_distance: float,
) -> Dict[str, str | List[str] | None]:
    cached = _load_cached_geometry(directory, "nuclear_geometry.json")
    if cached is not None:
        return cached

    point = Point(lng, lat)
    point_meters = _transform_to_meters(point)

    result = {
        "paz_geometry": None,
        "upz_geometry": None,
        "shadow_geometry": None,
        "analysis_geometry": None,
    }

    if paz_distance is not None:
        paz_buffer = point_meters.buffer(paz_distance * 1000)
        paz_geometry = _transform_from_meters(paz_buffer)
        result["paz_geometry"] = mapping(paz_geometry)

    if upz_distance is not None:
        upz_wedges_meters = _create_16_wedges(point_meters, upz_distance * 1000)
        result["upz_geometry"] = _geometries_to_dict_list(upz_wedges_meters)

    if shadow_distance is not None:
        shadow_buffer = point_meters.buffer(shadow_distance * 1000)
        shadow_geometry = _transform_from_meters(shadow_buffer)
        result["shadow_geometry"] = mapping(shadow_geometry)

    if analysis_distance is not None:
        analysis_buffer = point_meters.buffer(analysis_distance * 1000)
        analysis_geometry = _transform_from_meters(analysis_buffer)
        result["analysis_geometry"] = mapping(analysis_geometry)

    _save_geometry_cache(directory, "nuclear_geometry.json", result)
    return result
