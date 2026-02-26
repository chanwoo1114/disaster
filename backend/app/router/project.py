from fastapi import APIRouter, Depends, File, Path, UploadFile

from ..dependencies import get_chunk_service, get_project_storage, get_zip_service
from ..schemas.common import ApiResponse
from ..schemas.project import (
    ProjectCreate,
    ProjectCreateApiResponse,
    ProjectCreateResponse,
    ProjectItems,
    ProjectQueryParams,
    ProjectsItemApiResponse,
)
from ..schemas.upload import (
    ChunkUploadApiResponse,
    ChunkUploadRequest,
    ChunkUploadResponse,
    UploadInitApiResponse,
    UploadInitRequest,
    UploadInitResponse,
)
from ..services.chunk_upload import ChunkUploadService
from ..services.project import ProjectStorage
from ..services.zip_file import ZipFileService

router = APIRouter(prefix="/project")


@router.get("", response_model=ProjectsItemApiResponse, summary="프로젝트 조회")
async def get_projects(
    params: ProjectQueryParams = Depends(),
    storage: ProjectStorage = Depends(get_project_storage),
):
    """프로젝트 목록 조회(최신순)"""
    result = storage.load_project_list(params.skip, params.limit)
    items = [ProjectItems(**p) for p in result]

    return ProjectsItemApiResponse(
        success=True, message="프로젝트 목록 조회 성공", data=items
    )


@router.delete(
    "/{project_id}",
    response_model=ApiResponse,
    summary="프로젝트 삭제",
)
async def delete_project(
    project_id: int = Path(..., description="프로젝트 ID"),
    storage: ProjectStorage = Depends(get_project_storage),
):
    """프로젝트 소프트 삭제"""
    storage.delete_project(project_id)
    return ApiResponse(success=True, message="프로젝트가 삭제되었습니다", data=None)


@router.post(
    "/upload/init",
    response_model=UploadInitApiResponse,
    summary="업로드 세션 초기화",
)
async def init_upload(
    request: UploadInitRequest,
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
):
    """청크 업로드 세션 초기화"""
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


@router.post(
    "/upload/chunk",
    response_model=ChunkUploadApiResponse,
    summary="청크 업로드",
)
async def upload_chunk(
    data: ChunkUploadRequest = Depends(),
    file: UploadFile = File(..., description="청크 파일"),
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
):
    """개별 청크 업로드"""
    result = await chunk_service.save_chunk(data.upload_id, data.chunk_index, file)

    return ChunkUploadApiResponse(
        success=True,
        message=f"청크 {data.chunk_index} 업로드 완료",
        data=ChunkUploadResponse(**result),
    )


@router.post(
    "",
    response_model=ProjectCreateApiResponse,
    status_code=201,
    summary="프로젝트 생성",
)
async def create_project(
    request: ProjectCreate,
    storage: ProjectStorage = Depends(get_project_storage),
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
    zip_service: ZipFileService = Depends(get_zip_service),
):
    """프로젝트 생성"""
    project_dict = request.model_dump()
    project_id = storage.create_project_from_upload(
        project_dict, chunk_service, zip_service
    )

    return ProjectCreateApiResponse(
        success=True,
        message="프로젝트가 성공적으로 생성되었습니다.",
        data=ProjectCreateResponse(id=project_id),
    )
