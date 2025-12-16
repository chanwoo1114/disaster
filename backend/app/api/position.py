from typing import List, Literal, Union

from fastapi import APIRouter, Depends, HTTPException, Query

from ..schemas.position import (
    MesoPosition,
    MicroPosition,
    PositionQueryParams,
    WalkingPosition,
)
from ..services.position import PositionService

router = APIRouter(prefix="/position", tags=["Position"])

PositionItem = Union[MesoPosition, MicroPosition, WalkingPosition]


def get_position_params(
    directory: str,
    time: str,
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Query(
        ..., description="재난 종류"
    ),
) -> PositionQueryParams:
    return PositionQueryParams(
        directory=directory, time=time, disaster_type=disaster_type
    )


def convert_to_position_model(
    raw_data: List[dict],
    disaster_type: str,
) -> List[PositionItem]:
    result: List[PositionItem] = []

    for item in raw_data:
        try:
            if disaster_type == "nuclear":
                result.append(MesoPosition(**item))

            elif disaster_type == "chemistry":
                if item.get("mode") is not None:
                    result.append(MicroPosition(**item))
                else:
                    result.append(MesoPosition(**item))

            elif disaster_type in ("flood", "storm"):
                result.append(WalkingPosition(**item))

            elif disaster_type == "complex":
                result.append(MesoPosition(**item))

        except Exception as e:
            print(f"데이터 변환 실패: {e}, item: {item}")
            continue

    return result


@router.get(
    "/{directory}/{time}",
    summary="특정 시간의 위치 데이터 조회",
    response_model=List[PositionItem],
)
async def get_position_data(
    params: PositionQueryParams = Depends(get_position_params),
):
    try:
        raw_data = PositionService.get_position_at_time(
            params.directory, params.time, params.disaster_type
        )

        if not raw_data:
            return []

        converted_data = convert_to_position_model(raw_data, params.disaster_type)
        return converted_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
