import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.router import geometry, position, project, road

from .services.redis_config import redis_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Validation Error: URL=%s Method=%s Errors=%s",
        request.url,
        request.method,
        exc.errors(),
    )

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "요청 데이터 검증 실패",
            "errors": exc.errors(),
        },
    )


app.include_router(position.router, prefix="", tags=["위치표출"])
app.include_router(geometry.router, prefix="", tags=["공간정보"])
app.include_router(road.router, prefix="", tags=["링크"])
app.include_router(project.router, prefix="", tags=["프로젝트"])
