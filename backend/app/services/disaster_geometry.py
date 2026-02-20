import math
from typing import Dict, List

from pyproj import Transformer
from shapely.geometry import Point, Polygon, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform

# 모듈 레벨 Transformer 캐싱 (앱 전체에서 2회만 생성)
_TO_METERS = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True).transform
_TO_WGS84 = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True).transform

# 상수
NUM_SECTORS = 16
SECTOR_ANGLE = 360.0 / NUM_SECTORS  # 22.5


class DisasterGeometryService:
    """Geometry 관련 로직 처리"""

    @staticmethod
    def _transform_to_meters(geometry: BaseGeometry) -> BaseGeometry:
        return transform(_TO_METERS, geometry)

    @staticmethod
    def _transform_from_meters(geometry: BaseGeometry) -> BaseGeometry:
        return transform(_TO_WGS84, geometry)

    @staticmethod
    def _create_wedge(
        center_point: Point, radius_meters: float, start_angle: float, end_angle: float
    ) -> Polygon:
        cx, cy = center_point.x, center_point.y

        coords = [(cx, cy)]
        for angle in range(int(start_angle), int(end_angle) + 1):
            rad = math.radians(angle)
            x = cx + radius_meters * math.sin(rad)
            y = cy + radius_meters * math.cos(rad)
            coords.append((x, y))
        coords.append((cx, cy))

        return Polygon(coords)

    @staticmethod
    def _create_specific_wedges_with_same_width(
        center_point: Point,
        base_radius_meters: float,
        new_radius_meters: float,
        sector_indices: List[int],
    ) -> List[Polygon]:
        wedges = []
        adjusted_angle_per_wedge = (
            base_radius_meters / new_radius_meters
        ) * SECTOR_ANGLE

        for i in sector_indices:
            center_angle = i * SECTOR_ANGLE
            start_angle = center_angle - (adjusted_angle_per_wedge / 2)
            end_angle = center_angle + (adjusted_angle_per_wedge / 2)

            wedge = DisasterGeometryService._create_wedge(
                center_point, new_radius_meters, start_angle, end_angle
            )
            wedges.append(wedge)

        return wedges

    @staticmethod
    def _create_16_wedges(center_point: Point, radius_meters: float) -> List[Polygon]:
        wedges = []
        for i in range(NUM_SECTORS):
            start_angle = i * SECTOR_ANGLE - (SECTOR_ANGLE / 2)
            end_angle = start_angle + SECTOR_ANGLE
            wedge = DisasterGeometryService._create_wedge(
                center_point, radius_meters, start_angle, end_angle
            )
            wedges.append(wedge)
        return wedges

    @staticmethod
    def _get_opposite_sectors(wind_direction: int) -> List[int]:
        opposite_center = ((wind_direction - 1) + 8) % NUM_SECTORS
        return [
            (opposite_center - 1) % NUM_SECTORS,
            opposite_center,
            (opposite_center + 1) % NUM_SECTORS,
        ]

    @staticmethod
    def _geometries_to_dict_list(geometries: List[BaseGeometry]) -> List[Dict]:
        return [
            mapping(DisasterGeometryService._transform_from_meters(geom))
            for geom in geometries
        ]

    @staticmethod
    def create_disaster_buffer(
        lng: float,
        lat: float,
        disaster_distance: float,
        analysis_distance: float,
    ) -> Dict[str, str]:
        point = Point(lng, lat)
        point_meters = DisasterGeometryService._transform_to_meters(point)

        disaster_buffer = point_meters.buffer(disaster_distance * 1000)
        analysis_buffer = point_meters.buffer(analysis_distance * 1000)

        disaster_geometry = DisasterGeometryService._transform_from_meters(
            disaster_buffer
        )
        analysis_geometry = DisasterGeometryService._transform_from_meters(
            analysis_buffer
        )

        return {
            "disaster_geometry": mapping(disaster_geometry),
            "analysis_geometry": mapping(analysis_geometry),
        }

    @staticmethod
    def create_nuclear_buffer(
        lng: float,
        lat: float,
        paz_distance: float,
        upz_distance: float,
        upz_wind_distance: float,
        wind_direction: int,
        shadow_distance: float,
        analysis_distance: float,
    ) -> Dict[str, str | List[str] | None]:
        point = Point(lng, lat)
        point_meters = DisasterGeometryService._transform_to_meters(point)

        result = {
            "paz_geometry": None,
            "upz_geometry": None,
            "upz_wind_geometry": None,
            "shadow_geometry": None,
            "analysis_geometry": None,
        }

        if paz_distance is not None:
            paz_buffer = point_meters.buffer(paz_distance * 1000)
            paz_geometry = DisasterGeometryService._transform_from_meters(paz_buffer)
            result["paz_geometry"] = mapping(paz_geometry)

        if upz_distance is not None:
            upz_wedges_meters = DisasterGeometryService._create_16_wedges(
                point_meters, upz_distance * 1000
            )
            result["upz_geometry"] = DisasterGeometryService._geometries_to_dict_list(
                upz_wedges_meters
            )

            if (
                upz_wind_distance is not None
                and wind_direction is not None
                and upz_distance != upz_wind_distance
            ):
                opposite_sectors = DisasterGeometryService._get_opposite_sectors(
                    wind_direction
                )
                upz_wind_wedges_meters = (
                    DisasterGeometryService._create_specific_wedges_with_same_width(
                        point_meters,
                        upz_distance * 1000,
                        upz_wind_distance * 1000,
                        opposite_sectors,
                    )
                )
                result["upz_wind_geometry"] = (
                    DisasterGeometryService._geometries_to_dict_list(
                        upz_wind_wedges_meters
                    )
                )

        if shadow_distance is not None:
            shadow_buffer = point_meters.buffer(shadow_distance * 1000)
            shadow_geometry = DisasterGeometryService._transform_from_meters(
                shadow_buffer
            )
            result["shadow_geometry"] = mapping(shadow_geometry)

        if analysis_distance is not None:
            analysis_buffer = point_meters.buffer(analysis_distance * 1000)
            analysis_geometry = DisasterGeometryService._transform_from_meters(
                analysis_buffer
            )
            result["analysis_geometry"] = mapping(analysis_geometry)

        return result
