from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Literal, Dict, Any

class BaseRequest(BaseModel):
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(..., description="재난 종류")


class NuclearBufferRequest(BaseModel):
    disaster_data: BaseRequest
    paz_distance: int = Field(..., ge=0, le=5, description="PAZ 대피 거리")
    upz_distance: int = Field(..., le= 30, description="UPZ 대피 거리")
    upz_wind_distance: int = Field(..., description="UPZ 풍향 대피 거리")
    wind_direction: int = Field(..., ge=1, le=16, description="풍향 방향")
    shadow_distance: int = Field(..., le= 45, description="그림자 권역 거리")
    analysis_distance: int = Field(..., le= 50,description="분석 권역 거리")

    @model_validator(mode="after")
    def custom_validate(cls, values):
        paz = values.paz_distance
        upz = values.upz_distance
        upz_wind = values.upz_wind_distance
        shadow = values.shadow_distance
        analysis = values.analysis_distance

        # 방사능 범위 검증
        if upz < paz:
            raise ValueError("upz_distance는 paz_distance보다 크거나 같아야 합니다.")
        if not (paz <= upz_wind <= upz):
            raise ValueError("upz_wind_distance는 paz_distance 이상 upz_distance 이하여야 합니다.")
        if not (upz <= shadow <= 45):
            raise ValueError("shadow_distance는 upz_distance 이상 45이하여야 합니다.")
        if not (shadow <= analysis <= 50):
            raise ValueError("analysis_distance는 shadow_distance 이상 50이하여야 합니다.")
        return values


class NuclearBufferResponse(BaseModel):
    centroid: Dict[str, Any] = Field(..., description="중심점 GeoJson")  # 필수
    paz_geometry: Optional[Dict[str, Any]] = Field(None, description="PAZ 권역 버퍼 GeoJson")
    upz_geometry: Optional[List[Dict[str, Any]]] = Field(None, description="UPZ 권역 16방위 쐐기 GeoJson")
    upz_wind_geometry: Optional[List[Dict[str, Any]]] = Field(None, description="UPZ 풍향 권역 16방위 쐐기 GeoJson (선택)")
    shadow_geometry: Optional[Dict[str, Any]] = Field(None, description="그림자 대피 권역 버퍼 GeoJson")
    analysis_geometry: Optional[Dict[str, Any]] = Field(None, description="분석 권역 버퍼 GeoJson")


class DisasterBufferRequest(BaseModel):
    disaster_data: BaseRequest
    disaster_distance: int = Field(..., ge=0, description="피난 권역 대피 거리")
    analysis_distance: int = Field(..., description="분석 권역 대피 거리")

    @model_validator(mode="after")
    def custom_validate(cls, values):
        disaster_type = values.disaster_data.disaster_type
        disaster_distance = values.disaster_distance
        analysis_distance = values.analysis_distance

        max_disaster_distance = {
            "chemistry": 10,
            "flood": 2,
            "storm": 2,
            "complex": 10
        }

        max_analysis_distance = {
            "chemistry": 15,
            "flood": 3,
            "storm": 3,
            "complex": 15
        }

        # disaster_distance 범위 검증
        if disaster_distance > max_disaster_distance[disaster_type]:
            raise ValueError(
                f"{disaster_type} 재난의 disaster_distance는 {max_disaster_distance[disaster_type]}km 이하여야 합니다."
            )

        # analysis_distance 범위 검증
        if not (disaster_distance <= analysis_distance <= max_analysis_distance[disaster_type]):
            raise ValueError(
                f"{disaster_type} 재난의 analysis_distance는 disaster_distance({disaster_distance}) 이상 "
                f"{max_analysis_distance[disaster_type]}km 이하여야 합니다."
            )

        return values


class DisasterBufferResponse(BaseModel):
    centroid: Dict[str, Any] = Field(..., description="중심점 GeoJson")
    disaster_geometry: Dict[str, Any] = Field(..., description="피난 권역 버퍼 GeoJson")
    analysis_geometry: Dict[str, Any] = Field(..., description="분석 권역 버퍼 GeoJson")
