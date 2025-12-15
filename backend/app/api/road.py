from typing import Literal

from fastapi import APIRouter, Query, Response, status

from ..schemas.road import RoadApiResponse, RoadResponse
from ..services.road_geometry import RoadGeometry

router = APIRouter(prefix="/road")


@router.get(
    "/geometry", response_model=RoadApiResponse, summary="재난 범위 도로 조회 API"
)
async def create_road_geometry(
    response: Response,
    lng: float = Query(..., ge=-180, le=180, description="X 좌표 (경도)"),
    lat: float = Query(..., ge=-90, le=90, description="Y 좌표 (위도)"),
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Query(
        ..., description="재난 종류"
    ),
    analysis_distance: int = Query(..., le=50, description="분석 권역 거리"),
):
    try:
        features = RoadGeometry.get_roads_geometry(
            lng, lat, disaster_type, analysis_distance
        )

        road_data = RoadResponse(features=features)

        return RoadApiResponse(
            success=True,
            message="도로 조회 성공",
            data=road_data,
        )

    except FileNotFoundError as e:
        response.status_code = status.HTTP_404_NOT_FOUND

        return RoadApiResponse(
            success=False,
            message=f"도로 데이터 파일을 찾을 수 없습니다: {str(e)}",
            data=None,
        )

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

        return RoadApiResponse(
            success=False,
            message=f"도로 추출 중 오류가 발생했습니다: {str(e)}",
            data=None,
        )
