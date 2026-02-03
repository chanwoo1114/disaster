from typing import Annotated, List, Literal, Optional

from fastapi import Form
from pydantic import BaseModel, Field, field_validator, model_validator

from ..validator.project import ProjectValidators
from .common import ApiResponse


class ProjectQueryParams(BaseModel):
    """프로젝트 목록 조회 쿼리"""

    skip: int = Field(0, ge=0, description="건너뛸 개수")
    limit: int = Field(12, ge=1, le=50, description="가져올 개수")


class ProjectsListItems(BaseModel):
    """프로젝트 목록 조회"""

    id: int = Field(..., description="고유ID")
    project_name: str = Field(..., description="프로젝트 이름")
    disaster_type: str = Field(..., description="재난 유형")
    created_at: str = Field(..., description="생성된 날짜")


class ProjectsListItemApiResponse(ApiResponse[List[ProjectsListItems]]):
    """프로젝트 목록 조회 응답 예시"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "프로젝트 목록 조회 성공",
                "data": [
                    {
                        "id": 1,
                        "project_name": "테스트1",
                        "disaster_type": "nuclear",
                        "created_at": "2026-01-07 16:52:00",
                    },
                    {
                        "id": 2,
                        "project_name": "테스트2",
                        "disaster_type": "chemistry",
                        "created_at": "2026-01-07 16:51:00",
                    },
                ],
            }
        }


class ProjectCreate(ProjectValidators, BaseModel):
    """프로젝트 생성 요청"""

    project_name: Annotated[
        str, Form(..., min_length=1, max_length=100, description="프로젝트 이름")
    ]
    project_description: Annotated[
        Optional[str], Form("", max_length=500, description="프로젝트 설명")
    ]
    disaster_type: Annotated[
        Literal["nuclear", "chemistry", "storm", "flood", "complex"],
        Form(..., description="재난 종류"),
    ]
    lng: Annotated[float, Form(..., ge=-180, le=180, description="X 좌표 (경도)")]
    lat: Annotated[float, Form(..., ge=-90, le=90, description="Y 좌표 (위도)")]
    radius1: Annotated[float, Form(..., gt=0, description="반경1")]
    radius2: Annotated[float, Form(..., gt=0, description="반경2")]
    radius3: Annotated[Optional[float], Form(None, gt=0, description="반경3")]
    radius4: Annotated[Optional[float], Form(None, gt=0, description="반경4")]
    wind_direction: Annotated[
        Optional[int], Form(None, gt=0, description="바람 방향(원자력)")
    ]
    wind_speed: Annotated[
        Optional[float], Form(None, gt=0, description="바람 속도(원자력)")
    ]
    created_at: Annotated[str, Form(..., description="생성된 날짜")]


class ProjectCreateResponse(BaseModel):
    """프로젝트 생성 응답"""

    id: int = Field(..., description="생성된 프로젝트 ID")


class ProjectCreateApiResponse(ApiResponse[ProjectCreateResponse]):
    """프로젝트 생성 응답 예시"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "프로젝트가 성공적으로 생성되었습니다.",
                "data": {"id": 1},
            }
        }
