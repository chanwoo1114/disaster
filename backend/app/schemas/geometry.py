from typing import Any, Dict, List, Literal, Optional

from fastapi import Query
from pydantic import BaseModel, Field, model_validator

from ..validators.geometry_validator import (
    validate_disaster_distances,
    validate_nuclear_distances,
)
from .common import ApiResponse


class NuclearQueryParams(BaseModel):
    """방사능 대피 범위 조회 파라미터"""

    directory: str = Field(..., description="프로젝트 디렉토리(upload_id)")
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    paz_distance: Optional[int] = Field(None, ge=0, le=5, description="PAZ 대피 거리")
    upz_distance: Optional[int] = Field(None, le=30, description="UPZ 대피 거리")
    shadow_distance: Optional[int] = Field(None, le=45, description="그림자 권역 거리")
    analysis_distance: Optional[int] = Field(None, le=50, description="분석 권역 거리")
    upz_wind_distance: Optional[int] = Field(None, description="UPZ 풍향 대피 거리")
    wind_direction: Optional[int] = Field(
        None, ge=1, le=16, description="풍향 방향(1~16)"
    )

    @model_validator(mode="after")
    def validate_distances(self):
        return validate_nuclear_distances(self)


class DisasterQueryParams(BaseModel):
    """일반 재난 대피 범위 조회 파라미터"""

    directory: str = Field(..., description="프로젝트 디렉토리(upload_id)")
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    disaster_type: Literal["chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류 (nuclear 제외)"
    )
    disaster_distance: int = Field(..., ge=0, description="피난 권역 대피 거리")
    analysis_distance: int = Field(..., ge=0, description="분석 권역 거리")

    @model_validator(mode="after")
    def validate_distances(self):
        return validate_disaster_distances(self)


class NuclearBufferData(BaseModel):
    """방사능 대피 범위 응답 파라미터"""

    paz_geometry: Optional[Dict[str, Any]] = Field(None, description="PAZ 권역")
    upz_geometry: Optional[List[Dict[str, Any]]] = Field(None, description="UPZ 권역")
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


class AdmZonesRequest(BaseModel):
    """행정동 경계 조회 요청.

    damage_geometry 는 프론트가 그린 피해범위 폴리곤(GeoJSON, EPSG:4326)을 그대로 받는다.
    여기에 걸치는 행정동은 응답에서 properties.hit = true 로 표시된다.
    """

    directory: str = Field(..., description="세션 ID")
    lng: float = Field(..., ge=-180, le=180, description="대상지 경도")
    lat: float = Field(..., ge=-90, le=90, description="대상지 위도")
    analysis_distance: float = Field(50, gt=0, le=50, description="조회 반경(km)")
    damage_geometry: Optional[Dict[str, Any]] = Field(
        None, description="피해범위 폴리곤 (없으면 hit 전부 false)"
    )


class AdmZonesData(BaseModel):
    """행정동 경계 응답"""

    features: List[Dict[str, Any]] = Field(..., description="Feature 리스트")


class AdmZonesApiResponse(ApiResponse[AdmZonesData]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "행정동 조회 성공",
                "data": {
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {
                                "code": "31200105",
                                "name": "서생면",
                                "hit": True,
                            },
                            "geometry": {"type": "Polygon", "coordinates": []},
                        }
                    ]
                },
            }
        }
