from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field


class RoadRequest(BaseModel):
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류"
    )
    analysis_distance: int = Field(..., le=50, description="분석 권역 거리")


class RoadResponse(BaseModel):
    features: List[Dict[str, Any]] = Field(..., description="Feature 리스트")
