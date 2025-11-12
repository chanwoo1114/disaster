from fastapi import APIRouter, HTTPException
from app.schemas.person import PersonPosition, PersonDetails

router = APIRouter(prefix="/person")

@router.post("/{description}/{time}")
async def person_position(
    description: str,
    time: str,
    Person
):
