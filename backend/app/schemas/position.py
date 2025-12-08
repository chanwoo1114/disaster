from typing import Literal

from pydantic import BaseModel, Field


class BasePosition(BaseModel):
    directory: str = Field(..., description="디렉토리")
    disaster_type: Literal["nuclear", "chemistry", "storm", "flood", "complex"] = Field(
        ..., description="재난 종류"
    )


class RequestPersonPosition(BasePosition):
    time: str = Field(..., description="시간")


class PersonDetails(BaseModel):
    person_id: str
    house_id: str
    age: str
    sex: str
