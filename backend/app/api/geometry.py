from fastapi import APIRouter, HTTPException

from ..schemas.geometry import (
    DisasterBufferRequest,
    DisasterBufferResponse,
    NuclearBufferRequest,
    NuclearBufferResponse,
)
from ..services.disaster_geometry import DisasterGeometryService

router = APIRouter(prefix="/geometry")


# 방사능 범위 제공 API
@router.post("/nuclear-buffer", response_model=NuclearBufferResponse)
async def create_nuclear_buffer(request: NuclearBufferRequest):
    try:
        result = DisasterGeometryService.create_nuclear_buffer(
            lng=request.disaster_data.lng,
            lat=request.disaster_data.lat,
            paz_distance=request.paz_distance,
            upz_distance=request.upz_distance,
            upz_wind_distance=request.upz_wind_distance,
            wind_direction=request.wind_direction,
            shadow_distance=request.shadow_distance,
            analysis_distance=request.analysis_distance,
        )

        return NuclearBufferResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"버퍼 생성 중 오류 발생: {str(e)}")


# 재난 범위 제공 API
@router.post("/disaster-buffer", response_model=DisasterBufferResponse)
async def create_disaster_buffer(request: DisasterBufferRequest):
    try:
        result = DisasterGeometryService.create_disaster_buffer(
            lng=request.disaster_data.lng,
            lat=request.disaster_data.lat,
            disaster_distance=request.disaster_distance,
            analysis_distance=request.analysis_distance,
        )

        return DisasterBufferResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"버퍼 생성 중 오류 발생: {str(e)}")
