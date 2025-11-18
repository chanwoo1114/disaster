from fastapi import APIRouter, HTTPException, Query, Path
from typing import Annotated
from ..schemas.person import PersonPosition, PersonDetails
import pandas as pd

router = APIRouter(prefix="/person")

@router.post("/{directory}/{time}")
async def person_position(
    directory: Annotated[str, Path(title="디렉토리", description="디렉토리")],
    time: Annotated[str, Path(title="시간", description="시간")],
    person: PersonPosition
):
    t = pd.read_csv(f'{directory}/Person_Position_1300.txt', sep=r'\s+', encoding="CP949")
    print(t)
    return {"hello": f"{directory}, {time}"}