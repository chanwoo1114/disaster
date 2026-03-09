import asyncio

from fastapi import APIRouter, Depends

from ..schemas.road import RoadApiResponse, RoadQueryParams, RoadResponse
from ..services import road_geometry

router = APIRouter(prefix="/road")


@router.get(
    "/geometry", response_model=RoadApiResponse, summary="재난 범위 도로 조회 API"
)
async def create_road_geometry(params: RoadQueryParams = Depends()):
    features = await asyncio.to_thread(
        road_geometry.get_roads_geometry,
        params.directory,
        params.lng,
        params.lat,
        params.disaster_type,
        params.analysis_distance,
    )

    return RoadApiResponse(
        success=True,
        message="도로 조회 성공",
        data=RoadResponse(features=features),
    )
