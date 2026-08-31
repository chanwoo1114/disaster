from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from .common import ApiResponse

DisasterType = Literal["nuclear", "chemistry", "storm", "flood", "complex"]


class SessionCreateRequest(BaseModel):
    """업로드 완료 → 세션 생성 요청"""

    upload_id: str = Field(..., description="청크 업로드 세션 ID")
    disaster_type: DisasterType = Field(..., description="재난 종류")
    lng: float = Field(..., ge=-180, le=180, description="대상지 경도")
    lat: float = Field(..., ge=-90, le=90, description="대상지 위도")


class ScenarioArgs(BaseModel):
    """Scenario_{n}.arg 에서 읽은 설정 (없는 항목은 null)"""

    season: Optional[int] = None
    day: Optional[int] = None
    hour: Optional[int] = Field(None, description="재난 발생 시각(시)")
    weather: Optional[int] = None
    wind_direction: Optional[int] = Field(None, description="풍향 (0=무풍, 1~16 방위)")
    wind_speed: Optional[int] = None


class LngLatPoint(BaseModel):
    lng: float
    lat: float


class ScenarioRef(BaseModel):
    name: str = Field(..., description="시나리오 이름 (예: S_1)")
    path: str = Field(..., description="세션 폴더 기준 상대 경로")
    args: Optional[ScenarioArgs] = Field(None, description="시나리오 설정 (.arg)")
    center: Optional[LngLatPoint] = Field(
        None, description="데이터에서 도출한 발원지 중심좌표"
    )


class SessionInfo(BaseModel):
    session_id: str
    disaster_type: DisasterType
    lng: float
    lat: float
    file_count: int = Field(..., description="추출된 파일 수")
    scenarios: List[ScenarioRef] = Field(..., description="발견된 시나리오 목록 (자연 정렬)")
    created_at: str
    expires_at: str


class SessionApiResponse(ApiResponse[SessionInfo]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "세션이 생성되었습니다",
                "data": {
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "disaster_type": "nuclear",
                    "lng": 129.28595,
                    "lat": 35.32991,
                    "file_count": 473,
                    "scenarios": [
                        {"name": "S_1", "path": "tt/Result/S_1"},
                        {"name": "S_4", "path": "tt/Result/S_4"},
                    ],
                    "created_at": "2026-08-31T15:00:00",
                    "expires_at": "2026-08-31T21:00:00",
                },
            }
        }


class LinkTrafficSummary(BaseModel):
    radius_km: int = Field(..., description="배경 도로망 추출 반경")
    network_count: int = Field(..., description="반경 내 도로 링크 수 (회색 배경)")
    link_count: int = Field(..., description="소통정보가 있는 링크 수")
    unmatched_count: int = Field(..., description="매칭 실패 링크 수")
    hours: List[int] = Field(..., description="데이터가 있는 시간대(시)")


class VehiclePositionsSummary(BaseModel):
    frame_count: int = Field(..., description="스냅샷 수")
    max_vehicles: int = Field(..., description="스냅샷당 최대 차량 수")
    first_time: int = Field(..., description="첫 스냅샷 시각(초)")
    last_time: int = Field(..., description="마지막 스냅샷 시각(초)")


class ScenarioData(BaseModel):
    """시나리오 준비 결과 — 각 항목이 null이면 해당 데이터 없음"""

    link_traffic: Optional[LinkTrafficSummary] = None
    vehicle_positions: Optional[VehiclePositionsSummary] = None


class ScenarioApiResponse(ApiResponse[ScenarioData]):
    pass
