from fastapi import APIRouter, HTTPException, Query
from typing import Annotated
from schemas.person import PersonPosition, PersonDetails

router = APIRouter(prefix="/person")

@router.post("/{directory}/{time}")
async def person_position(
    directory: str,
    time: str
    # person: PersonPosition
):
    return {"hello": f"{directory}, {time}"}