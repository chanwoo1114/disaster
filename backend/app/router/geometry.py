import asyncio

from fastapi import APIRouter, Depends

from ..schemas.geometry import (
    AdmZonesApiResponse,
    AdmZonesData,
    AdmZonesRequest,
    DisasterApiResponse,
    DisasterBufferData,
    DisasterQueryParams,
    NuclearApiResponse,
    NuclearBufferData,
    NuclearQueryParams,
)
from ..services import adm_geometry, disaster_geometry

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


@router.post(
    "/adm-zones",
    response_model=AdmZonesApiResponse,
    summary="행정동 경계 조회 API",
)
async def create_adm_zones(request: AdmZonesRequest):
    """대상지 반경 내 행정동 경계.

    최초 호출 시 adm.csv(320MB)를 parquet으로 변환하므로 수 분 걸릴 수 있다 (스레드에서 실행).
    """
    features = await asyncio.to_thread(
        adm_geometry.get_adm_zones,
        request.directory,
        request.lng,
        request.lat,
        request.analysis_distance,
        request.damage_geometry,
    )

    return AdmZonesApiResponse(
        success=True,
        message="행정동 조회 성공",
        data=AdmZonesData(features=features),
    )
