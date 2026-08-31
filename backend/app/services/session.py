import json
import logging
import re
import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from .. import config
from ..schemas.exceptions import AppException
from ..validators import zip_file_validator
from . import link_traffic, scenario_meta, shelter, shelter_status, vehicle_positions
from .chunk_upload import ChunkUploadService
from .zip_file import ZipFileService

logger = logging.getLogger(__name__)

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_TIME_FMT = "%Y-%m-%dT%H:%M:%S"


def _natural_key(name: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def _find_scenarios(sdir: Path) -> list:
    """결과 파일이 들어 있는 폴더 = 시나리오. tt.zip의 Result/S_* 도, S_1.zip처럼
    시나리오 폴더 하나만 든 ZIP도 같은 규칙으로 잡힌다."""
    dirs = set()
    for pattern in ("LinkTravelInformation_*.txt", "VehicleLocation_*.txt"):
        for p in sdir.rglob(pattern):
            dirs.add(p.parent)

    items = []
    used_names = set()
    for d in sorted(dirs):
        rel = d.relative_to(sdir).as_posix() if d != sdir else "."
        name = d.name if d != sdir else "결과"
        if name in used_names:
            name = rel.replace("/", "_")
        used_names.add(name)
        items.append({"name": name, "path": rel})

    return sorted(items, key=lambda s: _natural_key(s["name"]))


class SessionService:
    """업로드 1건 = 세션 1개. DB 없이 data/sessions/{id}/ 폴더 하나로 관리한다."""

    def __init__(self):
        self.root = config.SESSIONS_DIR
        self.root.mkdir(parents=True, exist_ok=True)

    # ── 경로 ────────────────────────────────────────────────────────────

    @staticmethod
    def _check_id(session_id: str) -> None:
        if not _UUID_RE.match(session_id):
            raise AppException(400, "유효하지 않은 세션 ID입니다")

    def session_dir(self, session_id: str) -> Path:
        self._check_id(session_id)
        return self.root / session_id

    def _meta_path(self, session_id: str) -> Path:
        return self.session_dir(session_id) / "session.json"

    # ── 생성 ────────────────────────────────────────────────────────────

    def create_from_upload(
        self,
        upload_id: str,
        disaster_type: str,
        lng: float,
        lat: float,
        chunk_service: ChunkUploadService,
        zip_service: ZipFileService,
    ) -> dict:
        """청크 병합 → ZIP 검증 → 구조 유지 추출 → 시나리오 스캔 → 메타 저장.
        산출물 생성은 시나리오 선택 시(prepare_scenario)로 미룬다."""
        merged_file, _ = chunk_service.merge_chunks(upload_id)
        session_id = str(uuid.uuid4())
        sdir = self.root / session_id

        try:
            zip_file_validator.validate_zip_integrity(str(merged_file))

            sdir.mkdir(parents=True, exist_ok=False)
            zip_path = zip_service.move_to_project(merged_file, sdir)
            extracted = zip_service.extract_zip(str(zip_path), str(sdir))

            if not extracted:
                raise AppException(400, "ZIP 안에 데이터 파일(.txt)이 없습니다")

            scenarios = _find_scenarios(sdir)
            if not scenarios:
                raise AppException(
                    400,
                    "결과 데이터(VehicleLocation / LinkTravelInformation)를 찾을 수 없습니다",
                )

            # .arg 설정과 데이터 기반 중심좌표를 시나리오에 부착 (실패해도 세션은 유지)
            try:
                center = scenario_meta.derive_center(sdir)
                for s in scenarios:
                    s["args"] = scenario_meta.parse_scenario_args(sdir, s["name"])
                    s["center"] = center
            except Exception:
                logger.exception("시나리오 부가정보 추출 실패 (무시)")

            now = datetime.now()
            expires = now + timedelta(seconds=config.SESSION_TTL_SECONDS)
            meta = {
                "session_id": session_id,
                "disaster_type": disaster_type,
                "lng": lng,
                "lat": lat,
                "file_count": len(extracted),
                "scenarios": scenarios,
                "created_at": now.strftime(_TIME_FMT),
                "expires_at": expires.strftime(_TIME_FMT),
            }
            with open(sdir / "session.json", "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)

            logger.info(
                "세션 생성 %s (%s, 파일 %d개, 시나리오 %s)",
                session_id, disaster_type, len(extracted), [s["name"] for s in scenarios],
            )
            return meta

        except Exception:
            shutil.rmtree(sdir, ignore_errors=True)
            raise

        finally:
            if merged_file.exists():
                merged_file.unlink(missing_ok=True)
            chunk_service.cleanup_session(upload_id)

    # ── 시나리오 ────────────────────────────────────────────────────────

    def scenario_dir(self, session_id: str, name: str) -> Path:
        meta = self.get(session_id)
        for s in meta.get("scenarios", []):
            if s["name"] == name:
                sdir = self.session_dir(session_id)
                d = (sdir / s["path"]).resolve()
                if d.is_relative_to(sdir.resolve()) and d.is_dir():
                    return d
        raise AppException(404, f"시나리오를 찾을 수 없습니다: {name}")

    def prepare_scenario(self, session_id: str, name: str) -> dict:
        """선택한 시나리오의 산출물을 (없으면) 생성하고 요약을 반환"""
        meta = self.get(session_id)
        scen_dir = self.scenario_dir(session_id, name)

        # 도로망 추출 기준은 사용자가 지정한 대상지 좌표를 사용한다
        if link_traffic.has_outputs(scen_dir):
            traffic_summary = link_traffic.summary_from_meta(scen_dir)
        else:
            traffic_summary = link_traffic.build(
                scen_dir, meta["disaster_type"], meta["lng"], meta["lat"]
            )

        if vehicle_positions.has_outputs(scen_dir):
            vehicle_summary = vehicle_positions.summary_from_meta(scen_dir)
        else:
            vehicle_summary = vehicle_positions.build(scen_dir)

        # 대피소는 시나리오 폴더가 아니라 세션 전체(InputData/Shelter)에서 찾는다
        shelter_summary = shelter.build_or_load(self.session_dir(session_id), scen_dir)
        # 대피율 시계열은 시나리오 결과 폴더(ShelterStatus.txt)에서
        shelter_status.build_or_load(scen_dir)

        logger.info("시나리오 준비 %s/%s", session_id, name)
        return {
            "link_traffic": traffic_summary,
            "vehicle_positions": vehicle_summary,
            "shelters": shelter_summary,
        }

    # ── 조회 / 삭제 ─────────────────────────────────────────────────────

    def get(self, session_id: str) -> dict:
        path = self._meta_path(session_id)
        if not path.exists():
            raise AppException(404, "세션을 찾을 수 없습니다 (만료되었거나 삭제됨)")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_all(self) -> list:
        """만료되지 않은 세션 메타 목록 (최근 생성 순)"""
        now = datetime.now()
        out = []
        for sdir in self.root.iterdir():
            if not sdir.is_dir():
                continue
            meta_path = sdir / "session.json"
            if not meta_path.exists():
                continue
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                expires = datetime.strptime(meta["expires_at"], _TIME_FMT)
            except (OSError, ValueError, KeyError):
                continue
            if now >= expires:
                continue
            out.append(meta)
        out.sort(key=lambda m: m.get("created_at", ""), reverse=True)
        return out

    def delete(self, session_id: str) -> None:
        sdir = self.session_dir(session_id)
        if not sdir.exists():
            raise AppException(404, "세션을 찾을 수 없습니다")
        shutil.rmtree(sdir, ignore_errors=True)
        logger.info("세션 삭제 %s", session_id)

    def cleanup_expired(self) -> int:
        """만료된 세션 폴더 삭제. 삭제 개수 반환"""
        now = datetime.now()
        removed = 0
        for sdir in self.root.iterdir():
            if not sdir.is_dir():
                continue
            meta_path = sdir / "session.json"
            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        expires_at = datetime.strptime(json.load(f)["expires_at"], _TIME_FMT)
                    expired = now >= expires_at
                except (OSError, ValueError, KeyError):
                    expired = True
            else:
                # 메타 없는 폴더 = 생성 도중 죽은 것. TTL만큼 지났으면 정리
                age = now.timestamp() - sdir.stat().st_mtime
                expired = age > config.SESSION_TTL_SECONDS

            if expired:
                shutil.rmtree(sdir, ignore_errors=True)
                removed += 1
        return removed
