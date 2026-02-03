from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import geometry, position, project, road

app = FastAPI()

origins = ["http://39.119.84.115:8000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(position.router, prefix="", tags=["위치표출"])
app.include_router(geometry.router, prefix="", tags=["공간정보"])
app.include_router(road.router, prefix="", tags=["링크"])
app.include_router(project.router, prefix="", tags=["프로젝트"])
