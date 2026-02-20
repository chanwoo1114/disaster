from fastapi import APIRouter, Depends, Response, status

from ..schemas.geometry import (
    DisasterApiResponse,
    DisasterBufferData,
    DisasterQueryParams,
    NuclearApiResponse,
    NuclearBufferData,
    NuclearQueryParams,
)
from ..services.disaster_geometry import DisasterGeometryService

router = APIRouter(prefix="/geometry")


@router.get(
    "/nuclear-buffer",
    response_model=NuclearApiResponse,
    summary="방사능 대피 범위 조회 API",
)
async def create_nuclear_buffer(
    response: Response, params: NuclearQueryParams = Depends()
):
    try:
        result = DisasterGeometryService.create_nuclear_buffer(
            lng=params.lng,
            lat=params.lat,
            paz_distance=params.paz_distance,
            upz_distance=params.upz_distance,
            upz_wind_distance=params.upz_wind_distance,
            wind_direction=params.wind_direction,
            shadow_distance=params.shadow_distance,
            analysis_distance=params.analysis_distance,
        )

        response.status_code = status.HTTP_200_OK
        return NuclearApiResponse(
            success=True,
            message="방사능 대피 범위 조회 성공",
            data=NuclearBufferData(**result),
        )

    except ValueError as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return NuclearApiResponse(success=False, message=str(e), data=None)

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return NuclearApiResponse(
            success=False, message=f"버퍼 생성 중 오류 발생: {str(e)}", data=None
        )


@router.get(
    "/disaster-buffer",
    response_model=DisasterApiResponse,
    summary="일반 재난 범위 조회 API",
)
async def create_disaster_buffer(
    response: Response, params: DisasterQueryParams = Depends()
):
    try:
        result = DisasterGeometryService.create_disaster_buffer(
            lng=params.lng,
            lat=params.lat,
            disaster_distance=params.disaster_distance,
            analysis_distance=params.analysis_distance,
        )

        response.status_code = status.HTTP_200_OK
        return DisasterApiResponse(
            success=True,
            message="재난 범위 조회 성공",
            data=DisasterBufferData(**result),
        )

    except ValueError as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return DisasterApiResponse(success=False, message=str(e), data=None)

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return DisasterApiResponse(
            success=False, message=f"오류 발생: {str(e)}", data=None
        )
