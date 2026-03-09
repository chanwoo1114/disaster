from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from ..validators.project_validator import validate_project_by_disaster_type
from .common import ApiResponse


class ProjectQueryParams(BaseModel):
    """프로젝트 목록 조회 쿼리"""

    skip: int = Field(0, ge=0, description="건너뛸 개수")
    limit: int = Field(12, ge=1, le=50, description="가져올 개수")


class ProjectItems(BaseModel):
    """프로젝트 상세 조회 응답"""

    upload_id: str = Field(..., description="프로젝트 경로")
    id: int = Field(..., description="ID")
    project_name: str = Field(..., description="프로젝트 이름")
    project_description: Optional[str] = Field(None, description="프로젝트 설명")
    disaster_type: str = Field(..., description="재난 유형")
    lng: float = Field(..., description="X 좌표 (경도)")
    lat: float = Field(..., description="Y 좌표 (위도)")
    radius1: float = Field(..., description="반경1")
    radius2: float = Field(..., description="반경2")
    radius3: Optional[float] = Field(None, description="반경3")
    radius4: Optional[float] = Field(None, description="반경4")
    wind_direction: Optional[int] = Field(None, description="바람 방향")
    wind_speed: Optional[float] = Field(None, description="바람 속도")
    created_at: str = Field(..., description="생성된 날짜")
    is_deleted: bool = Field(..., description="삭제 여부")


class ProjectsItemApiResponse(ApiResponse[List[ProjectItems]]):
    """프로젝트 목록 조회 응답"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "프로젝트 목록 조회 성공",
                "data": [
                    {
                        "uuid": "a12754e3-39ec-4c17-9f19-20c68ada7f35'",
                        "id": 1,
                        "project_name": "테스트1",
                        "disaster_type": "nuclear",
                        "lng": 129.0,
                        "lat": 35.0,
                        "radius1": 3,
                        "radius2": 20,
                        "radius3": 30,
                        "radius4": 40,
                        "wind_direction": 1,
                        "wind_speed": 10,
                        "created_at": "2026-01-07 16:52:00",
                        "is_deleted": False,
                    },
                    {
                        "uuid": "5f757673-1ac4-4d51-bf39-31346f2414c7",
                        "id": 2,
                        "project_name": "테스트2",
                        "disaster_type": "chemistry",
                        "lng": 129.0,
                        "lat": 35.0,
                        "radius1": 3,
                        "radius2": 20,
                        "created_at": "2026-01-07 16:52:00",
                        "is_deleted": False,
                    },
                ],
            }
        }


class ProjectCreate(BaseModel):
    """프로젝트 생성 요청"""

    upload_id: str = Field(..., description="청크 업로드 세션 ID")
    project_name: str = Field(
        ..., min_length=1, max_length=100, description="프로젝트 이름"
    )
    project_description: Optional[str] = Field(
        "", max_length=500, description="프로젝트 설명"
    )
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류"
    )
    lng: float = Field(..., ge=-180, le=180, description="X 좌표 (경도)")
    lat: float = Field(..., ge=-90, le=90, description="Y 좌표 (위도)")
    radius1: float = Field(..., gt=0, description="반경1")
    radius2: float = Field(..., gt=0, description="반경2")
    radius3: Optional[float] = Field(None, gt=0, description="반경3")
    radius4: Optional[float] = Field(None, gt=0, description="반경4")
    wind_direction: Optional[int] = Field(
        None, ge=1, le=16, description="바람 방향(원자력)"
    )
    wind_speed: Optional[float] = Field(None, gt=0, description="바람 속도(원자력)")

    @model_validator(mode="after")
    def validate_by_disaster_type(self):
        """재난 유형별 파라미터 검증"""
        return validate_project_by_disaster_type(self)


class ProjectCreateResponse(BaseModel):
    """프로젝트 생성 응답"""

    id: int = Field(..., description="생성된 프로젝트 ID")


class ProjectCreateApiResponse(ApiResponse[ProjectCreateResponse]):
    """프로젝트 생성 응답"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "프로젝트가 성공적으로 생성되었습니다.",
                "data": {"id": 1},
            }
        }
