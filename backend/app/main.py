import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.router import geometry, position, project, road

from .schemas.exceptions import AppException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(lifespan=lifespan)


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": message, "data": None},
    )


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return _error_response(exc.status_code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    messages = []
    for error in exc.errors():
        loc = " → ".join(str(l) for l in error["loc"] if l != "body")
        messages.append(f"{loc}: {error['msg']}")

    return _error_response(422, "; ".join(messages))


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return _error_response(400, str(exc))


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return _error_response(500, f"서버 오류: {str(exc)}")


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
