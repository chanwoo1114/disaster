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

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ Validation Error:")
    print(f"URL: {request.url}")
    print(f"Method: {request.method}")
    print(f"Errors: {exc.errors()}")
    print(f"Body: {exc.body}")

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
