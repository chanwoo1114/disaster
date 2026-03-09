from fastapi import APIRouter, Depends

from ..schemas.geometry import (
    DisasterApiResponse,
    DisasterBufferData,
    DisasterQueryParams,
    NuclearApiResponse,
    NuclearBufferData,
    NuclearQueryParams,
)
from ..services import disaster_geometry

router = APIRouter(prefix="/geometry")


@router.get(
    "/nuclear-buffer",
    response_model=NuclearApiResponse,
    summary="방사능 대피 범위 조회 API",
)
async def create_nuclear_buffer(params: NuclearQueryParams = Depends()):
    result = disaster_geometry.create_nuclear_buffer(
        directory=params.directory,
        lng=params.lng,
        lat=params.lat,
        paz_distance=params.paz_distance,
        upz_distance=params.upz_distance,
        upz_wind_distance=params.upz_wind_distance,
        wind_direction=params.wind_direction,
        shadow_distance=params.shadow_distance,
        analysis_distance=params.analysis_distance,
    )

    return NuclearApiResponse(
        success=True,
        message="방사능 대피 범위 조회 성공",
        data=NuclearBufferData(**result),
    )


@router.get(
    "/disaster-buffer",
    response_model=DisasterApiResponse,
    summary="일반 재난 범위 조회 API",
)
async def create_disaster_buffer(params: DisasterQueryParams = Depends()):
    result = disaster_geometry.create_disaster_buffer(
        directory=params.directory,
        lng=params.lng,
        lat=params.lat,
        disaster_distance=params.disaster_distance,
        analysis_distance=params.analysis_distance,
    )

    return DisasterApiResponse(
        success=True,
        message="재난 범위 조회 성공",
        data=DisasterBufferData(**result),
    )
