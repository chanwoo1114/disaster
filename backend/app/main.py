from fastapi import FastAPI
from api import upload

app = FastAPI()
app.include_router(upload.router, prefix="/api", tags=["zip"])