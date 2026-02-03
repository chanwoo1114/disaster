from fastapi import APIRouter, Depends, File, Response, UploadFile, status

from ..schemas.common import ApiResponse
from ..schemas.project import (
    ProjectCreate,
    ProjectQueryParams,
    ProjectsListItemApiResponse,
    ProjectsListItems,
)
from ..services.project import ProjectStorage

router = APIRouter(prefix="/project")

storage = ProjectStorage()


@router.get("", response_model=ProjectsListItemApiResponse, summary="프로젝트 조회")
async def get_projects(response: Response, params: ProjectQueryParams = Depends()):
    """프로젝트 목록 조회(최신순)"""

    result = storage.load_project_list(params.skip, params.limit)

    items = [ProjectsListItems(**p) for p in result]

    response.status_code = status.HTTP_200_OK

    return ProjectsListItemApiResponse(
        success=True, message="프로젝트 목록 조회 성공", data=items
    )


@router.post("", summary="프로젝트 생성")
async def create_project(
    response: Response,
    project_data: ProjectCreate = Depends(),
    file: UploadFile = File(..., description="Zip 파일 업로드"),
):
    """프로젝트 생성"""
    try:
        print("test")

    except Exception as e:
        print(e)
