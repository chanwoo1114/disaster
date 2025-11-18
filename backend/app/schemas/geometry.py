from pydantic import BaseModel, Field
from typing import Optional, List

class BaseBufferRequest(BaseModel):
    lng: float = Field(..., description="X 좌표 (경도)")
    lat: float = Field(..., description="Y 좌표 (위도)")
    coordinate: str = Field(default="EPSG:4326", description="좌표계")

class NuclearBufferRequest(BaseModel):
    disaster_data: BaseBufferRequest
    paz_distance: int = Field(..., ge=0, le=5, description="PAZ 대피 거리")
    upz_distance: int = Field(..., ge=paz_distance, le= 30,description="UPZ 대피 거리")
    upz_wind_distance: int = Field(..., ge=paz_distance, le= upz_distance,description="UPZ 풍향 대피 거리")
    wind_direction: int = Field(..., ge=1, le=16, description="풍향 방향")
    shadow_distance: int = Field(..., ge=upz_distance, le= 45,description="그림자 권역 거리")
    analysis_distance: int = Field(..., ge=shadow_distance, le= 50,description="분석 권역 거리")

class NuclearBufferResponse(BaseModel):
    centroid: str = Field(..., description="중심점 GeoJson")
    paz_geometry: str = Field(..., description="PAZ 권역 버퍼 GeoJson")
    upz_geometry: List[str] = Field(..., description="UPZ 권역 16방위 쐐기 GeoJson")
    upz_wind_geometry: Optional[List[str]] = Field(None, description="UPZ 풍향 권역 16방위 쐐기 GeoJson (선택)")
    shadow_geometry: str = Field(..., description="그림자 대피 권역 버퍼 GeoJson")
    analysis_geometry: str = Field(..., description="분석 권역 버퍼 GeoJson")

class DisasterBufferRequest(BaseModel):
    disaster_data: BaseBufferRequest
    disaster_distance: int = Field(..., description="피난 권역 대피 거리")
    analysis_distance: int = Field(..., description="분석 권역 대피 거리")

class DisasterBufferResponse(BaseModel):
    centroid: str = Field(..., description="중심점 GeoJson")
    disaster_geometry: str = Field(..., description="피난 권역 버퍼 GeoJson")
    analysis_geometry: str = Field(..., description="분석 권역 버퍼 GeoJson")