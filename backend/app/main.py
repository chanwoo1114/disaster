import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .router import geometry, position, road, session, upload
from .schemas.exceptions import AppException
from .services.session import SessionService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _session_cleanup_loop():
    while True:
        try:
            removed = SessionService().cleanup_expired()
            if removed:
                logger.info("만료 세션 %d개 정리", removed)
        except Exception:
            logger.exception("세션 정리 실패")
        await asyncio.sleep(config.SESSION_CLEANUP_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_session_cleanup_loop())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="재난대피 시뮬레이터 API", lifespan=lifespan)


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
        loc = " → ".join(str(part) for part in error["loc"] if part != "body")
        messages.append(f"{loc}: {error['msg']}")
    return _error_response(422, "; ".join(messages))


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return _error_response(400, str(exc))


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("처리되지 않은 오류")
    return _error_response(500, "서버 내부 오류가 발생했습니다")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, tags=["업로드"])
app.include_router(session.router, tags=["세션"])
app.include_router(geometry.router, tags=["공간정보"])
app.include_router(road.router, tags=["링크"])
app.include_router(position.router, tags=["위치표출"])
