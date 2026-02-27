from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from .common import ApiResponse


class RoadQueryParams(BaseModel):
    """도로 조회 파라미터"""

    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류"
    )
    analysis_distance: Optional[int] = Field(None, le=50, description="분석 권역 거리")


class RoadResponse(BaseModel):
    features: List[Dict[str, Any]] = Field(..., description="Feature 리스트")


class RoadApiResponse(ApiResponse[RoadResponse]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "도로 조회 성공",
                "data": {
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {"link_id": "2710656600"},
                            "geometry": {
                                "type": "LineString",
                                "coordinates": ((127.0, 37.5), (127.1, 37.6)),
                            },
                        }
                    ]
                },
            }
        }
