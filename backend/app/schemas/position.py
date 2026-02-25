from typing import Literal

from pydantic import BaseModel, Field


class PositionQueryParams(BaseModel):
    """위치 조회 요청 공통 파라미터"""

    directory: str = Field(..., description="경로")
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류"
    )
    time: str = Field(..., description="시간")


class BasePosition(BaseModel):
    """위치 조회 응답 공통 필드"""

    time: int = Field(..., description="시간")
    x: float = Field(..., description="X 좌표(경도)")
    y: float = Field(..., description="Y 좌표(위도)")
    direction: float = Field(..., ge=0, le=360, description="방향")


class MesoPosition(BasePosition):
    """메조 위치 표출"""

    veh_id: int = Field(..., gt=0, description="차량ID")
    occupancy: int = Field(..., ge=0, description="승차 인원")


class MicroPosition(BasePosition):
    """마이크로 위치 표출"""

    veh_id: int = Field(..., gt=0, description="차량ID")
    occupancy: int = Field(..., ge=0, description="승차 인원")
    speed: int = Field(..., ge=0, description="속도")
    mode: int = Field(..., description="수단")


class WalkingPosition(BasePosition):
    """보행 위치 표출"""

    person_id: int = Field(..., gt=0, description="사람ID")
    speed: int = Field(..., ge=0, description="속도")
