from typing import Optional

from pydantic import BaseModel, Field

from .common import ApiResponse


class FileUploadResponse(BaseModel):
    uuid: str = Field(..., description="업로드된 파일의 고유 ID (폴더명)")


class FileApiResponse(ApiResponse[FileUploadResponse]):
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "파일 업로드 및 압축 해제 성공",
                "data": {"uuid": "550e8400-e29b-41d4-a716-446655440000"},
            }
        }
