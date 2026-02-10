from typing import List

from pydantic import BaseModel, Field

from .common import ApiResponse


class UploadInitRequest(BaseModel):
    """업로드 세션 초기화 요청"""

    file_name: str = Field(..., description="파일명")
    total_chunks: int = Field(..., ge=1, description="전체 청크 수")
    total_size: int = Field(..., ge=1, description="전체 파일 크기(bytes)")


class UploadInitResponse(BaseModel):
    """업로드 세션 초기화 응답"""

    upload_id: str = Field(..., description="업로드 세션 ID")
    file_name: str = Field(..., description="파일명")
    total_chunks: int = Field(..., description="전체 청크 수")
    total_size: int = Field(..., description="전체 파일 크기(bytes)")


class UploadInitApiResponse(ApiResponse[UploadInitResponse]):
    """업로드 세션 초기화 응답"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "업로드 세션이 생성되었습니다",
                "data": {
                    "upload_id": "550e8400-e29b-41d4-a716-446655440000",
                    "file_name": "data.zip",
                    "total_chunks": 25,
                    "total_size": 524288000,
                },
            }
        }


class ChunkUploadRequest(BaseModel):
    """청크 업로드 요청"""

    upload_id: str = Field(..., description="업로드 세션 ID")
    chunk_index: int = Field(..., ge=0, description="청크 인덱스")


class ChunkUploadResponse(BaseModel):
    """청크 업로드 응답"""

    upload_id: str = Field(..., description="업로드 세션 ID")
    chunk_index: int = Field(..., description="업로드된 청크 인덱스")


class ChunkUploadApiResponse(ApiResponse[ChunkUploadResponse]):
    """청크 업로드 응답"""

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "청크 5 업로드 완료",
                "data": {
                    "upload_id": "550e8400-e29b-41d4-a716-446655440000",
                    "chunk_index": 5,
                },
            }
        }


class UploadSession(BaseModel):
    """업로드 세션 정보"""

    upload_id: str = Field(..., description="업로드 세션 ID")
    file_name: str = Field(..., description="파일명")
    total_chunks: int = Field(..., description="전체 청크 수")
    total_size: int = Field(..., description="전체 파일 크기(bytes)")
    received_chunks: List[int] = Field(
        default_factory=list, description="받은 청크 인덱스 목록"
    )
    created_at: str = Field(..., description="생성 시간")
