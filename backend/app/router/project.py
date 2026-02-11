from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Path,
    Response,
    UploadFile,
    status,
)

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
from ..validators.zip_file_validator import ZipFileValidator

router = APIRouter(prefix="/project")

storage = ProjectStorage()
chunk_service = ChunkUploadService()
zip_service = ZipFileService()


@router.get("", response_model=ProjectsItemApiResponse, summary="프로젝트 조회")
async def get_projects(response: Response, params: ProjectQueryParams = Depends()):
    """프로젝트 목록 조회(최신순)"""

    result = storage.load_project_list(params.skip, params.limit)

    items = [ProjectItems(**p) for p in result]

    response.status_code = status.HTTP_200_OK

    return ProjectsItemApiResponse(
        success=True, message="프로젝트 목록 조회 성공", data=items
    )


@router.delete(
    "/{project_id}",
    response_model=ApiResponse,
    summary="프로젝트 삭제",
)
async def delete_project(
    response: Response,
    project_id: int = Path(..., description="프로젝트 ID"),
):
    """프로젝트 소프트 삭제"""
    try:
        storage.delete_project(project_id)

        response.status_code = status.HTTP_200_OK
        return ApiResponse(success=True, message="프로젝트가 삭제되었습니다", data=None)

    except ValueError as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return ApiResponse(success=False, message=str(e), data=None)

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return ApiResponse(
            success=False, message=f"프로젝트 삭제 실패: {str(e)}", data=None
        )


@router.post(
    "/upload/init",
    response_model=UploadInitApiResponse,
    summary="업로드 세션 초기화",
)
async def init_upload(
    response: Response,
    request: UploadInitRequest,
):
    """청그 업로드 세션 초기화"""
    try:
        session = chunk_service.create_session(
            file_name=request.file_name,
            total_chunks=request.total_chunks,
            total_size=request.total_size,
        )

        response.status_code = status.HTTP_200_OK
        return UploadInitApiResponse(
            success=True,
            message="업로드 세션이 생성되었습니다",
            data=UploadInitResponse(**session),
        )

    except ValueError as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return UploadInitApiResponse(success=False, message=str(e), data=None)

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return UploadInitApiResponse(
            success=False, message=f"세션 생성 실패: {str(e)}", data=None
        )


@router.post(
    "/upload/chunk",
    response_model=ChunkUploadApiResponse,
    summary="청크 업로드",
)
async def upload_chunk(
    response: Response,
    data: ChunkUploadRequest = Depends(),
    file: UploadFile = File(..., description="청크 파일"),
):
    """개별 청크 업로드"""
    try:
        result = await chunk_service.save_chunk(data.upload_id, data.chunk_index, file)

        response.status_code = status.HTTP_200_OK
        return ChunkUploadApiResponse(
            success=True,
            message=f"청크 {data.chunk_index} 업로드 완료",
            data=ChunkUploadResponse(**result),
        )

    except ValueError as e:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return ChunkUploadApiResponse(success=False, message=str(e), data=None)

    except Exception as e:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return ChunkUploadApiResponse(
            success=False, message=f"청크 업로드 실패: {str(e)}", data=None
        )


@router.post(
    "",
    response_model=ProjectCreateApiResponse,
    summary="프로젝트 생성",
)
async def create_project(
    response: Response,
    request: ProjectCreate,
):
    """프로젝트 생성"""

    merged_file = None
    try:
        # 1. 청크 병합
        merged_file, session = chunk_service.merge_chunks(request.upload_id)
        ZipFileValidator.validate_zip_integrity(str(merged_file))

        ZipFileValidator.validate_required_files(
            str(merged_file), request.disaster_type
        )

        # 4. 프로젝트 저장
        project_id = storage._get_next_id()

        project_dict = request.model_dump()
        project_dict["id"] = project_id
        project_dir = storage.get_project_dir(project_dict["upload_id"])

        zip_path = zip_service.move_to_project(merged_file, project_dir)
        zip_service.extract_zip(str(zip_path), str(project_dir))

        merged_file = None  # 이동 완료 후 cleanup 방지

        storage.save_project(project_dict)

        response.status_code = status.HTTP_201_CREATED

        return ProjectCreateApiResponse(
            success=True,
            message="프로젝트가 성공적으로 생성되었습니다.",
            data=ProjectCreateResponse(id=project_id),
        )

    except HTTPException as e:
        if merged_file and merged_file.exists():
            merged_file.unlink(missing_ok=True)
        response.status_code = e.status_code
        return ProjectCreateApiResponse(
            success=False,
            message=e.detail,
            data=None,
        )

    except ValueError as e:
        if merged_file and merged_file.exists():
            merged_file.unlink(missing_ok=True)
        response.status_code = status.HTTP_400_BAD_REQUEST
        return ProjectCreateApiResponse(
            success=False,
            message=str(e),
            data=None,
        )

    except Exception as e:
        if merged_file and merged_file.exists():
            merged_file.unlink(missing_ok=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return ProjectCreateApiResponse(
            success=False,
            message=f"프로젝트 생성 중 오류 발생: {str(e)}",
            data=None,
        )
