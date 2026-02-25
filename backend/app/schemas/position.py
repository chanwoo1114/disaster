from typing import List, Optional

from fastapi import Path, Query
from pydantic import BaseModel, Field

from .common import ApiResponse


class UploadPosition(BaseModel):
    first_time: int = Field(..., description="시작 시간")
    last_time: int = Field(..., description="종료 시간")


class PositionUploadApiResponse(ApiResponse[UploadPosition]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Redis 업로드 성공",
                "data": [{"first_time": 110000, "last_time": 130000}],
            }
        }


class PositionQueryParams:
    def __init__(
        self,
        disaster_type: str = Path(
            ...,
            description="재난 종류",
            examples=["nuclear", "chemistry", "storm", "flood"],
        ),
        directory: str = Query(..., description="경로"),
        time: str = Query(..., description="시간"),
    ):
        self.disaster_type = disaster_type
        self.directory = directory
        self.time = time


class BasePosition(BaseModel):
    """위치 조회 응답 공통 필드"""

    time: int = Field(..., description="시간")
    x: float = Field(..., description="X 좌표(경도)")
    y: float = Field(..., description="Y 좌표(위도)")
    direction: float = Field(..., ge=0, le=360, description="방향")


class NuclearPosition(BasePosition):
    """메조 위치 표출"""

    veh_id: int = Field(..., gt=0, description="차량ID")
    occupancy: int = Field(..., ge=0, description="승차 인원")


class ChemistryPosition(BasePosition):
    """마이크로 위치 표출"""

    veh_id: int = Field(..., gt=0, description="차량ID")
    occupancy: int = Field(..., ge=0, description="승차 인원")
    speed: Optional[int] = Field(None, ge=0, description="속도")
    mode: Optional[int] = Field(None, description="수단")


class WalkingPosition(BasePosition):
    """보행 위치 표출"""

    person_id: int = Field(..., gt=0, description="사람ID")
    speed: int = Field(..., ge=0, description="속도")


class NuclearPositionApiResponse(ApiResponse[List[NuclearPosition]]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "방사능 위치 데이터 조회 성공",
                "data": [
                    {
                        "time": 100,
                        "x": 127.0,
                        "y": 36.5,
                        "direction": 90.0,
                        "veh_id": 1,
                        "occupancy": 3,
                    }
                ],
            }
        }


class ChemistryPositionApiResponse(ApiResponse[List[ChemistryPosition]]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "화학 위치 데이터 조회 성공",
                "data": [
                    {
                        "time": 100,
                        "x": 127.0,
                        "y": 36.5,
                        "direction": 90.0,
                        "veh_id": 1,
                        "occupancy": 3,
                        "speed": 1,
                        "mode": 1,
                    }
                ],
            }
        }


class WalkingPositionApiResponse(ApiResponse[List[WalkingPosition]]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "보행 위치 데이터 조회 성공",
                "data": [
                    {
                        "time": 100,
                        "x": 127.0,
                        "y": 36.5,
                        "direction": 90.0,
                        "person_id": 1,
                        "speed": 5,
                    }
                ],
            }
        }
