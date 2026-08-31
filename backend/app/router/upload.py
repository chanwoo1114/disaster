from fastapi import APIRouter, Depends, File, UploadFile

from ..dependencies import get_chunk_service
from ..schemas.upload import (
    ChunkUploadApiResponse,
    ChunkUploadRequest,
    ChunkUploadResponse,
    UploadInitApiResponse,
    UploadInitRequest,
    UploadInitResponse,
)
from ..services.chunk_upload import ChunkUploadService

router = APIRouter(prefix="/upload")


@router.post("/init", response_model=UploadInitApiResponse, summary="업로드 세션 초기화")
async def init_upload(
    request: UploadInitRequest,
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
):
    session = chunk_service.create_session(
        file_name=request.file_name,
        total_chunks=request.total_chunks,
        total_size=request.total_size,
    )
    return UploadInitApiResponse(
        success=True,
        message="업로드 세션이 생성되었습니다",
        data=UploadInitResponse(**session),
    )


@router.post("/chunk", response_model=ChunkUploadApiResponse, summary="청크 업로드")
async def upload_chunk(
    data: ChunkUploadRequest = Depends(),
    file: UploadFile = File(..., description="청크 파일"),
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
):
    result = await chunk_service.save_chunk(data.upload_id, data.chunk_index, file)
    return ChunkUploadApiResponse(
        success=True,
        message=f"청크 {data.chunk_index} 업로드 완료",
        data=ChunkUploadResponse(**result),
    )
