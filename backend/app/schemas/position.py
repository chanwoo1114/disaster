from pydantic import BaseModel

class BasePosition(BaseModel):
    disaster_type: str

class VehiclePosition(BaseModel):
    veh_id: str

class PersonPosition(BaseModel):
    time: str
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