from pydantic import BaseModel, Field
from typing import Optional, List, Any

class RoadRequest(BaseModel):
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    disaster_type: Literal["방사능", "화학", "풍수해", "해일", "기타"] = Field(..., description="재난 종류")
    analysis_distance: int = Field(..., le= 50,description="분석 권역 거리")

class RoadResponse(BaseModel):
    link_id: str = Field(..., description="링크ID")
    link_geometry: Dict[str, Any] = Field(..., description="각 링크 Geometry")
    road_polygon: Dict[str, Any] = Field(..., description="링크 Polygon")
    walking_polygon: Optional[Dict[str, Any]] = Field(..., description="보행 Polygon")
