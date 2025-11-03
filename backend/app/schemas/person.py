from pydantic import BaseModel

class PersonPosition(BaseModel):
    time: str
    person_id: str
    direction: float
    lot: str
    lat: str
    speed: int

class PersonDetails(BaseModel):
    person_id: str
    house_id: str
    age: str
    sex: str

