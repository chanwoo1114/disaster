from typing import Any, Dict, List, Literal

from fastapi import Query
from pydantic import BaseModel, Field

from .common import ApiResponse


class RoadQueryParams:
    """도로 조회 파라미터"""

    def __init__(
        self,
        lng: float = Query(..., ge=-180, le=180, description="X 좌표 (경도)"),
        lat: float = Query(..., ge=-90, le=90, description="Y 좌표 (위도)"),
        disaster_type: Literal[
            "nuclear", "chemistry", "storm", "flood", "complex"
        ] = Query(..., description="재난 종류"),
        analysis_distance: int = Query(None, le=50, description="분석 권역 거리"),
    ):
        self.lng = lng
        self.lat = lat
        self.disaster_type = disaster_type
        self.analysis_distance = analysis_distance


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
