from pydantic import BaseModel

class PersonPosition(BaseModel):
    person_id: str
    direction: float
    lot: float
    lat: float
    speed: str

class PersonDetails(BaseModel):
    person_id: str
    house_id: str
    age: str
    sex: str

