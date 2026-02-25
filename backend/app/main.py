import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.router import geometry, position, project, road

from .schemas.exceptions import AppException
from .services.redis_config import redis_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "data": None,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"서버 오류: {str(exc)}",
            "data": None,
        },
    )


@app.on_event("startup")
async def startup_event():
    """Redis 연결 확인"""
    redis_config()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(position.router, prefix="", tags=["위치표출"])
app.include_router(geometry.router, prefix="", tags=["공간정보"])
app.include_router(road.router, prefix="", tags=["링크"])
app.include_router(project.router, prefix="", tags=["프로젝트"])
