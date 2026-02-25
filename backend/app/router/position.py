from typing import Union

from fastapi import APIRouter, Depends, Path

from ..schemas.exceptions import AppException
from ..schemas.position import (
    ChemistryPositionApiResponse,
    NuclearPositionApiResponse,
    PositionQueryParams,
    PositionUploadApiResponse,
    UploadPosition,
    WalkingPositionApiResponse,
)
from ..services.position import CacheService, PositionService

router = APIRouter(prefix="/position")

RESPONSE_MODEL_MAP = {
    "nuclear": NuclearPositionApiResponse,
    "chemistry": ChemistryPositionApiResponse,
    "storm": WalkingPositionApiResponse,
    "flood": WalkingPositionApiResponse,
}


@router.post(
    "/upload/{disaster_type}/{directory}",
    summary="Redis 프로젝트 업로드",
    response_model=PositionUploadApiResponse,
)
async def upload_position_data(
    disaster_type: str = Path(..., description="재난 종류"),
    directory: str = Path(..., description="프로젝트 폴더명"),
):
    first_time, last_time, position_data = CacheService.preload_position(
        disaster_type, directory
    )
    PositionService.upload_data(directory, position_data)

    return PositionUploadApiResponse(
        success=True,
        message="Redis 업로드 성공",
        data=UploadPosition(first_time=first_time, last_time=last_time),
    )


@router.get(
    "/{disaster_type}",
    summary="위치 데이터 조회",
    response_model=Union[
        NuclearPositionApiResponse,
        ChemistryPositionApiResponse,
        WalkingPositionApiResponse,
    ],
)
async def get_position(params: PositionQueryParams = Depends()):
    position_data = PositionService.get_position_data(
        params.disaster_type, params.directory, params.time
    )

    response_cls = RESPONSE_MODEL_MAP.get(params.disaster_type)
    if not response_cls:
        raise AppException(400, f"지원하지 않는 재난 종류: {params.disaster_type}")

    return response_cls(
        success=True,
        message=f"{params.disaster_type} 위치 데이터 조회",
        data=position_data,
    )
