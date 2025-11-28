from fastapi import APIRouter, HTTPException
from ..schemas.road import (
    RoadResponse, RoadRequest
)
from ..services.road_geometry import RoadGeometry

router = APIRouter(prefix="/road")

# 재난 범위 도로 제공 API
@router.post("/geometry", response_model=RoadResponse)
async def create_road_geometry(request: RoadRequest):
    try:
        features = RoadGeometry.get_roads_geometry(
            request.lng,
            request.lat,
            request.disaster_type,
            request.analysis_distance
        )

        return RoadResponse(
            features=features
        )

    except Exception as e:
        print(f"도로 추출 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"도로 추출 중 오류 발생: {str(e)}"
        )
