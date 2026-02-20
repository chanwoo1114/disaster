from typing import Any, Dict, List, Literal, Optional

from fastapi import Query
from pydantic import BaseModel, Field

from .common import ApiResponse


class NuclearQueryParams:
    """방사능 대피 범위 조회 파라미터"""

    def __init__(
        self,
        lng: float = Query(..., ge=-180, le=180, description="X 좌표 (경도)"),
        lat: float = Query(..., ge=-90, le=90, description="Y 좌표 (위도)"),
        paz_distance: int = Query(None, ge=0, le=5, description="PAZ 대피 거리"),
        upz_distance: int = Query(None, le=30, description="UPZ 대피 거리"),
        shadow_distance: int = Query(None, le=45, description="그림자 권역 거리"),
        analysis_distance: int = Query(None, le=50, description="분석 권역 거리"),
        upz_wind_distance: Optional[int] = Query(
            None, description="UPZ 풍향 대피 거리"
        ),
        wind_direction: Optional[int] = Query(
            None, ge=1, le=16, description="풍향 방향(1~16)"
        ),
    ):
        self.lng = lng
        self.lat = lat
        self.paz_distance = paz_distance
        self.upz_distance = upz_distance
        self.upz_wind_distance = upz_wind_distance
        self.wind_direction = wind_direction
        self.shadow_distance = shadow_distance
        self.analysis_distance = analysis_distance
        self._validate()

    def _validate(self):
        if all(
            v is None
            for v in [
                self.paz_distance,
                self.upz_distance,
                self.shadow_distance,
                self.analysis_distance,
            ]
        ):
            raise ValueError("최소 하나 이상의 거리 값을 입력해야 합니다.")

        if self.paz_distance is not None and self.upz_distance is not None:
            if self.upz_distance < self.paz_distance:
                raise ValueError(
                    "upz_distance는 paz_distance보다 크거나 같아야 합니다."
                )

        if self.upz_wind_distance is not None:
            if self.paz_distance is None or self.upz_distance is None:
                raise ValueError(
                    "upz_wind_distance를 사용하려면 paz_distance와 upz_distance가 필요합니다."
                )

            upz_wind = self.upz_wind_distance
            if not (self.paz_distance <= upz_wind <= self.upz_distance):
                raise ValueError(
                    "upz_wind_distance는 paz_distance 이상 upz_distance 이하여야 합니다."
                )

        if self.shadow_distance is not None and self.upz_distance is not None:
            if not (self.upz_distance <= self.shadow_distance <= 45):
                raise ValueError(
                    "shadow_distance는 upz_distance 이상 45이하여야 합니다."
                )

        if self.analysis_distance is not None and self.shadow_distance is not None:
            if not (self.shadow_distance <= self.analysis_distance <= 50):
                raise ValueError(
                    "analysis_distance는 shadow_distance 이상 50이하여야 합니다."
                )


class DisasterQueryParams:
    """일반 재난 대피 범위 조회 파라미터"""

    def __init__(
        self,
        lng: float = Query(..., ge=-180, le=180, description="X 좌표 (경도)"),
        lat: float = Query(..., ge=-90, le=90, description="Y 좌표 (위도)"),
        disaster_type: Literal["chemistry", "storm", "flood", "complex"] = Query(
            ..., description="재난 종류 (nuclear 제외)"
        ),
        disaster_distance: int = Query(..., ge=0, description="피난 권역 대피 거리"),
        analysis_distance: int = Query(..., ge=0, description="분석 권역 거리"),
    ):
        self.lng = lng
        self.lat = lat
        self.disaster_type = disaster_type
        self.disaster_distance = disaster_distance
        self.analysis_distance = analysis_distance
        self._validate()

    def _validate(self):
        max_disaster_distance = {"chemistry": 10, "flood": 2, "storm": 2, "complex": 10}
        max_analysis_distance = {"chemistry": 15, "flood": 3, "storm": 3, "complex": 15}

        max_disaster = max_disaster_distance.get(self.disaster_type, 10)
        if self.disaster_distance > max_disaster:
            raise ValueError(
                f"{self.disaster_type} 재난의 disaster_distance는 {max_disaster}km 이하여야 합니다."
            )

        max_analysis = max_analysis_distance.get(self.disaster_type, 15)
        if not (self.disaster_distance <= self.analysis_distance <= max_analysis):
            raise ValueError(
                f"{self.disaster_type} 재난의 analysis_distance는 "
                f"disaster_distance({self.disaster_distance}) 이상 {max_analysis}km 이하여야 합니다."
            )


class NuclearBufferData(BaseModel):
    """방사능 대피 범위 응답 파라미터"""

    centroid: Dict[str, Any] = Field(..., description="중심점 GeoJson")
    paz_geometry: Optional[Dict[str, Any]] = Field(None, description="PAZ 권역")
    upz_geometry: Optional[List[Dict[str, Any]]] = Field(None, description="UPZ 권역")
    upz_wind_geometry: Optional[List[Dict[str, Any]]] = Field(
        None, description="UPZ 풍향 권역"
    )
    shadow_geometry: Optional[Dict[str, Any]] = Field(None, description="그림자 권역")
    analysis_geometry: Optional[Dict[str, Any]] = Field(None, description="분석 권역")


class NuclearApiResponse(ApiResponse[NuclearBufferData]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "방사능 대피 범위 조회 성공",
                "data": {
                    "paz_geometry": {"type": "Polygon", "coordinates": []},
                    "upz_geometry": {"type": "Polygon", "coordinates": []},
                    "shadow_geometry": {"type": "Polygon", "coordinates": []},
                    "analysis_geometry": {"type": "Polygon", "coordinates": []},
                },
            }
        }


class DisasterBufferData(BaseModel):
    """일반 재난 대피 범위 응답 파라미터"""

    disaster_geometry: Dict[str, Any] = Field(..., description="피난 권역")
    analysis_geometry: Dict[str, Any] = Field(..., description="분석 권역")


class DisasterApiResponse(ApiResponse[DisasterBufferData]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "재난 범위 조회 성공",
                "data": {
                    "disaster_geometry": {"type": "Polygon", "coordinates": []},
                    "analysis_geometry": {"type": "Polygon", "coordinates": []},
                },
            }
        }
