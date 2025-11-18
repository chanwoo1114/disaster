from fastapi import FastAPI
from .api import upload
from .api import person
from .api import geometry
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://39.119.84.115:8000",
    '*'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["업로드"])
app.include_router(person.router, prefix="/api", tags=["보헹"])
app.include_router(person.router, prefix="/api", tags=["공간정보"])