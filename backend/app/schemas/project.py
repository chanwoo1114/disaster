from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, Field

from .common import ApiResponse


class ProjectQueryParams(BaseModel):
    """프로젝트 목록 조회 쿼리"""

    skip: int = Field(0, ge=0, description="건너뛸 개수")
    limit: int = Field(12, ge=1, le=50, description="가져올 개수")


class Projects(BaseModel):
    """프로젝트 목록 조회"""

    id: int = Field(..., description="고유ID")
    project_name: str = Field(..., description="프로젝트 이름")
    created_at: str = Field(..., description="생성된 날짜")


class ProjectsApiResponse(ApiResponse[List[Projects]]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "프로젝트 목록 조회 성공",
                "data": [
                    {
                        "id": 1,
                        "project_name": "테스트1",
                        "created_at": "2026-01-07 16:52:00",
                    },
                    {
                        "id": 2,
                        "project_name": "테스트2",
                        "created_at": "2026-01-07 16:51:00",
                    },
                ],
            }
        }


class DisasterBaseModel(BaseModel):
    id: int = Field(..., description="고유ID")
    lng: float = Field(..., description="X 좌표 (경도)")
    lat: float = Field(..., description="Y 좌표 (위도)")
    description: str = Field(..., description="프로젝트 설명")
    register_date: datetime = Field(..., description="등록 시간")
