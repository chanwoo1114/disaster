import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, Path
from fastapi.responses import FileResponse, JSONResponse

from ..dependencies import get_chunk_service, get_session_service, get_zip_service
from ..schemas.common import ApiResponse
from ..schemas.exceptions import AppException
from ..schemas.session import (
    ScenarioApiResponse,
    ScenarioData,
    SessionApiResponse,
    SessionCreateRequest,
    SessionInfo,
    SessionListApiResponse,
)
from ..services import link_traffic, shelter, shelter_status, vehicle_positions, zone_evac, zone_population
from ..services.chunk_upload import ChunkUploadService
from ..services.session import SessionService
from ..services.zip_file import ZipFileService

router = APIRouter(prefix="/session")


@router.post("", response_model=SessionApiResponse, status_code=201, summary="세션 생성")
async def create_session(
    request: SessionCreateRequest,
    sessions: SessionService = Depends(get_session_service),
    chunk_service: ChunkUploadService = Depends(get_chunk_service),
    zip_service: ZipFileService = Depends(get_zip_service),
):
    """업로드된 ZIP을 검증·추출하고 시나리오를 스캔한다 (수 GB 추출이라 스레드에서 실행)"""
    meta = await asyncio.to_thread(
        sessions.create_from_upload,
        request.upload_id,
        request.disaster_type,
        request.lng,
        request.lat,
        chunk_service,
        zip_service,
    )
    return SessionApiResponse(
        success=True, message="세션이 생성되었습니다", data=SessionInfo(**meta)
    )


@router.get("", response_model=SessionListApiResponse, summary="세션 목록")
async def list_sessions(
    sessions: SessionService = Depends(get_session_service),
):
    """만료되지 않은 기존 세션 목록 (최근 생성 순). 재업로드 없이 이어보기 위한 용도"""
    metas = sessions.list_all()
    return SessionListApiResponse(
        success=True,
        message="세션 목록 조회 성공",
        data=[SessionInfo(**m) for m in metas],
    )


@router.get("/{session_id}", response_model=SessionApiResponse, summary="세션 조회")
async def get_session(
    session_id: str = Path(..., description="세션 ID"),
    sessions: SessionService = Depends(get_session_service),
):
    meta = sessions.get(session_id)
    return SessionApiResponse(success=True, message="세션 조회 성공", data=SessionInfo(**meta))


@router.delete("/{session_id}", response_model=ApiResponse, summary="세션 삭제")
async def delete_session(
    session_id: str = Path(..., description="세션 ID"),
    sessions: SessionService = Depends(get_session_service),
):
    sessions.delete(session_id)
    return ApiResponse(success=True, message="세션이 삭제되었습니다", data=None)


# ── 시나리오 ─────────────────────────────────────────────────────────────


@router.post(
    "/{session_id}/scenario/{name}/prepare",
    response_model=ScenarioApiResponse,
    summary="시나리오 산출물 준비",
)
async def prepare_scenario(
    session_id: str = Path(..., description="세션 ID"),
    name: str = Path(..., description="시나리오 이름 (예: S_1)"),
    sessions: SessionService = Depends(get_session_service),
):
    """선택한 시나리오의 소통정보·차량 산출물을 (없으면) 생성"""
    result = await asyncio.to_thread(sessions.prepare_scenario, session_id, name)
    return ScenarioApiResponse(
        success=True, message=f"시나리오 {name} 준비 완료", data=ScenarioData(**result)
    )


_SCENARIO_FILES = {
    "links.geojson": (link_traffic.GEOJSON_FILE, "application/geo+json"),
    "link-traffic.json": (link_traffic.META_FILE, "application/json"),
    "link-speeds.bin": (link_traffic.SPEEDS_FILE, "application/octet-stream"),
    "link-vols.bin": (link_traffic.VOLS_FILE, "application/octet-stream"),
    "vehicle-positions.json": (vehicle_positions.META_FILE, "application/json"),
    "vehicle-positions.bin": (vehicle_positions.BIN_FILE, "application/octet-stream"),
    "vehicle-info.json": (vehicle_positions.INFO_FILE, "application/json"),
    "shelters.geojson": (shelter.GEOJSON_FILE, "application/geo+json"),
    "shelter-status.json": (shelter_status.STATUS_FILE, "application/json"),
    "zone-evac.json": (zone_evac.ZONE_FILE, "application/json"),
}


@router.get(
    "/{session_id}/scenario/{name}/file/{file_name}",
    summary="시나리오 산출물 파일",
    response_class=FileResponse,
)
async def get_scenario_file(
    session_id: str = Path(..., description="세션 ID"),
    name: str = Path(..., description="시나리오 이름"),
    file_name: str = Path(..., description="links.geojson | link-traffic.json | … | vehicle-info.json"),
    sessions: SessionService = Depends(get_session_service),
):
    if file_name not in _SCENARIO_FILES:
        raise AppException(404, f"알 수 없는 파일: {file_name}")

    scen_dir = sessions.scenario_dir(session_id, name)
    real_name, media_type = _SCENARIO_FILES[file_name]
    path = scen_dir / real_name
    if not path.exists():
        raise AppException(404, "산출물이 없습니다. 시나리오 준비(prepare)를 먼저 호출하세요")

    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "private, no-cache"})


@router.get("/{session_id}/population", summary="존별 인구·이동 요약", response_class=FileResponse)
async def get_zone_population(
    session_id: str = Path(..., description="세션 ID"),
    sessions: SessionService = Depends(get_session_service),
):
    """세션 공통(InputData) 존별 인구 요약 zone-population.json"""
    sessions.get(session_id)  # 존재/만료 검사
    path = sessions.session_dir(session_id) / zone_population.POP_FILE
    if not path.exists():
        raise AppException(404, "인구 요약이 없습니다. 시나리오 준비(prepare)를 먼저 호출하세요")
    return FileResponse(path, media_type="application/json", headers={"Cache-Control": "private, no-cache"})


@router.get("/{session_id}/path/origins", summary="선택 가능한 출발지 존 목록")
async def get_path_origins(
    session_id: str = Path(..., description="세션 ID"),
    sessions: SessionService = Depends(get_session_service),
):
    sessions.get(session_id)
    return JSONResponse(content={"origins": sessions.path_origins(session_id)})


@router.get("/{session_id}/path/origin-zones", summary="선택 가능한 출발지 행정동 GeoJSON")
async def get_path_origin_zones(
    session_id: str = Path(..., description="세션 ID"),
    sessions: SessionService = Depends(get_session_service),
):
    sessions.get(session_id)
    data = await asyncio.to_thread(sessions.path_origin_zones, session_id)
    return JSONResponse(content=data, headers={"Cache-Control": "private, max-age=600"})


@router.get("/{session_id}/path/dests/{zone}", summary="출발지의 도착지 목록")
async def get_path_dests(
    session_id: str = Path(..., description="세션 ID"),
    zone: str = Path(..., description="출발지 존 코드"),
    sessions: SessionService = Depends(get_session_service),
):
    if not zone.isdigit():
        raise AppException(400, "유효하지 않은 존 코드입니다")
    sessions.get(session_id)
    dests = await asyncio.to_thread(sessions.path_dests, session_id, zone)
    return JSONResponse(content={"dests": dests})


@router.get("/{session_id}/zone-path/{zone}", summary="존 대피 경로 GeoJSON")
async def get_zone_path(
    session_id: str = Path(..., description="세션 ID"),
    zone: str = Path(..., description="출발지 존 코드"),
    dz: Optional[int] = None,
    sessions: SessionService = Depends(get_session_service),
):
    """출발지[→도착지 dz] 대피 경로 링크망 (온디맨드)"""
    if not zone.isdigit():
        raise AppException(400, "유효하지 않은 존 코드입니다")
    sessions.get(session_id)
    data = await asyncio.to_thread(sessions.zone_paths, session_id, zone, dz)
    return JSONResponse(content=data, headers={"Cache-Control": "private, max-age=600"})
