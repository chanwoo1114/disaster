from fastapi import APIRouter, Depends, Response, status

from ..schemas.common import ApiResponse
from ..schemas.project import ProjectQueryParams, Projects, ProjectsApiResponse
from ..services.project import ProjectStorage

router = APIRouter(prefix="/project")

storage = ProjectStorage()


@router.get("", response_model=ProjectsApiResponse, summary="프로젝트 조회")
async def get_projects(response: Response, params: ProjectQueryParams = Depends()):
    """프로젝트 목록 조회(최신순)"""

    result = storage.load_project_list(params.skip, params.limit)

    items = [Projects(**p) for p in result]

    response.status_code = status.HTTP_200_OK

    return ProjectsApiResponse(
        success=True, message="프로젝트 목록 조회 성공", data=items
    )


@router.post("", summary="프로젝트 생성")
async def create_project():
    """프로젝트 생성"""
    for i in range(10000):
        t = storage.save_project({"project_name": f"test_{i}"})
