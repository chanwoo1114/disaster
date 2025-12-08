from fastapi import APIRouter, HTTPException

from ..schemas.position import RequestPersonPosition
from ..services.data_loader import PositionService

router = APIRouter(prefix="/position")


@router.post("/{directory}/{time}")
async def person_position(request: RequestPersonPosition):
    try:
        data = PositionService.get_position_at_time(
            request.directory, request.time, request.disaster_type
        )
        return data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
