import math
from typing import Dict, List, Tuple

from pyproj import Transformer
from shapely.geometry import Point, Polygon, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform


class DisasterGeometryService:
    """Geometry 관련 로직 처리"""

    # Geometry 좌표계 변환 관련
    @staticmethod
    def _create_transform() -> Tuple:
        project_to_meters = Transformer.from_crs(
            "EPSG:4326", "EPSG:5179", always_xy=True
        ).transform

        project_to_wgs84 = Transformer.from_crs(
            "EPSG:5179", "EPSG:4326", always_xy=True
        ).transform

        return project_to_meters, project_to_wgs84

    # Geometry을 EPSG:5179로 변환
    @staticmethod
    def _transform_to_meters(geometry: BaseGeometry) -> BaseGeometry:
        project_to_meters, _ = DisasterGeometryService._create_transform()

        return transform(project_to_meters, geometry)

    # Geometry을 EPSG:4326 변환
    @staticmethod
    def _transform_from_meters(geometry: BaseGeometry) -> BaseGeometry:
        _, project_to_wgs84 = DisasterGeometryService._create_transform()

        return transform(project_to_wgs84, geometry)

    # 쐐기 형태 생성
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

    # 기준 반경의 쐐기 폭과 동일한 폭을 가지도록 각도를 조정한 쐐기 생성
    @staticmethod
    def _create_specific_wedges_with_same_width(
        center_point: Point,
        base_radius_meters: float,
        new_radius_meters: float,
        sector_indices: List[int],
    ) -> List[Polygon]:
        wedges = []
        base_angle_per_wedge = 360 / 16

        adjusted_angle_per_wedge = (
            base_radius_meters / new_radius_meters
        ) * base_angle_per_wedge

        for i in sector_indices:
            center_angle = i * base_angle_per_wedge

            start_angle = center_angle - (adjusted_angle_per_wedge / 2)
            end_angle = center_angle + (adjusted_angle_per_wedge / 2)

            wedge = DisasterGeometryService._create_wedge(
                center_point, new_radius_meters, start_angle, end_angle
            )
            wedges.append(wedge)

        return wedges

    # 16방위 쐐기 생성
    @staticmethod
    def _create_16_wedges(center_point: Point, radius_meters: float) -> List[Polygon]:
        wedges = []
        angle_per_wedge = 360 / 16

        for i in range(16):
            start_angle = i * angle_per_wedge - (angle_per_wedge / 2)
            end_angle = start_angle + angle_per_wedge
            wedge = DisasterGeometryService._create_wedge(
                center_point, radius_meters, start_angle, end_angle
            )
            wedges.append(wedge)

        return wedges

    # 풍향 반대 방향 3섹터 인덱스 반환
    @staticmethod
    def _get_opposite_sectors(wind_direction: int) -> List[int]:
        opposite_center = ((wind_direction - 1) + 8) % 16
        return [(opposite_center - 1) % 16, opposite_center, (opposite_center + 1) % 16]

    # Geometry 리스트를 EPSG:4326 GeoJSON dict 리스트로 변환
    @staticmethod
    def _geometries_to_dict_list(geometries: List[BaseGeometry]) -> List[Dict]:
        return [
            mapping(DisasterGeometryService._transform_from_meters(geom))
            for geom in geometries
        ]

    # 재난에 따른 피해 범위 생성
    @staticmethod
    def create_disaster_buffer(
        lng: float,
        lat: float,
        disaster_distance: float,
        analysis_distance: float,
    ) -> Dict[str, str]:
        # 포인트 생성
        point = Point(lng, lat)

        # 5179 변환
        point_meters = DisasterGeometryService._transform_to_meters(point)

        # 버퍼 생성
        disaster_buffer = point_meters.buffer(disaster_distance * 1000)
        analysis_buffer = point_meters.buffer(analysis_distance * 1000)

        # 4326 변환
        disaster_geometry = DisasterGeometryService._transform_from_meters(
            disaster_buffer
        )
        analysis_geometry = DisasterGeometryService._transform_from_meters(
            analysis_buffer
        )

        return {
            "centroid": mapping(point),
            "disaster_geometry": mapping(disaster_geometry),
            "analysis_geometry": mapping(analysis_geometry),
        }

    # 방사능 재난 범위 생성
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
        # 포인트 생성 및 좌표계 변환
        point = Point(lng, lat)
        point_meters = DisasterGeometryService._transform_to_meters(point)

        # 결과 딕셔너리 초기화 (모두 None으로 시작)
        result = {
            "centroid": mapping(point),
            "paz_geometry": None,
            "upz_geometry": None,
            "upz_wind_geometry": None,
            "shadow_geometry": None,
            "analysis_geometry": None,
        }

        # PAZ 권역 생성
        if paz_distance is not None:
            paz_buffer = point_meters.buffer(paz_distance * 1000)
            paz_geometry = DisasterGeometryService._transform_from_meters(paz_buffer)
            result["paz_geometry"] = mapping(paz_geometry)

        # UPZ 권역 생성 (16방위)
        if upz_distance is not None:
            upz_wedges_meters = DisasterGeometryService._create_16_wedges(
                point_meters, upz_distance * 1000
            )
            result["upz_geometry"] = DisasterGeometryService._geometries_to_dict_list(
                upz_wedges_meters
            )

            # UPZ 풍향 권역 생성 (조건: upz_wind_distance와 wind_direction이 모두 있고, upz와 다를 때)
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

        # 그림자 권역 생성
        if shadow_distance is not None:
            shadow_buffer = point_meters.buffer(shadow_distance * 1000)
            shadow_geometry = DisasterGeometryService._transform_from_meters(
                shadow_buffer
            )
            result["shadow_geometry"] = mapping(shadow_geometry)

        # 분석 권역 생성
        if analysis_distance is not None:
            analysis_buffer = point_meters.buffer(analysis_distance * 1000)
            analysis_geometry = DisasterGeometryService._transform_from_meters(
                analysis_buffer
            )
            result["analysis_geometry"] = mapping(analysis_geometry)

        return result
