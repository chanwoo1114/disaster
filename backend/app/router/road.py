from fastapi import APIRouter, Depends, Response, status

from ..schemas.road import RoadApiResponse, RoadQueryParams, RoadResponse
from ..services.road_geometry import RoadGeometry

router = APIRouter(prefix="/road")


@router.get(
    "/geometry", response_model=RoadApiResponse, summary="재난 범위 도로 조회 API"
)
async def create_road_geometry(response: Response, params: RoadQueryParams = Depends()):
    try:
        features = RoadGeometry.get_roads_geometry(
            params.lng, params.lat, params.disaster_type, params.analysis_distance
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
