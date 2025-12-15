from typing import Any, Dict, List

from pydantic import BaseModel, Field

from .common import ApiResponse


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
