import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from .. import config
from ..schemas.exceptions import AppException
from ..services.chunk_upload import ChunkUploadService
from ..services.zip_file import ZipFileService
from ..validators import zip_file_validator

logger = logging.getLogger(__name__)


class ProjectStorage:
    """JSONL 기반 프로젝트 저장"""

    def __init__(self, max_per_batch: int = config.MAX_PER_BATCH):
        self.data_dir = config.DATA_DIR
        self.projects_dir = config.PROJECTS_DIR
        self.projects_dir.mkdir(exist_ok=True, parents=True)

        self.max_per_batch = max_per_batch
        self.metadata_file = config.DATA_DIR / "metadata.json"
        self._init_metadata()

    def _init_metadata(self):
        """메타데이터 초기화"""
        if not self.metadata_file.exists():
            metadata = {"current_batch": 1, "current_count": 0, "last_id": 0}
            self._save_metadata(metadata)

    def _load_metadata(self) -> dict:
        """메타데이터 로드"""
        try:
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                return json.load(f)

        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"메타데이터 로드 실패: {e}")
            return {"current_batch": 1, "current_count": 0, "last_id": 0}

    def _save_metadata(self, metadata: dict):
        """메타데이터 저장"""
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

    def _get_batch_folder(self, batch_num: str) -> Path:
        """배치 폴더 경로"""
        folder = self.data_dir / batch_num
        folder.mkdir(exist_ok=True, parents=True)
        return folder

    def _get_batch_file(self, batch_num: str) -> Path:
        """배치 JSONL 파일 경로"""
        return self._get_batch_folder(batch_num) / "project.jsonl"

    def _get_next_id(self) -> int:
        """다음 ID 생성"""
        metadata = self._load_metadata()
        next_id = metadata["last_id"] + 1
        metadata["last_id"] = next_id
        self._save_metadata(metadata)
        return next_id

    def get_project_dir(self, directory: str) -> Path:
        """프로젝트 디렉토리 경로"""
        project_dir = self.projects_dir / directory
        project_dir.mkdir(exist_ok=True, parents=True)
        return project_dir

    def create_project(self, data: dict) -> int:
        """프로젝트 저장 후 생성된 ID 반환"""
        project_id = self._get_next_id()
        data["id"] = project_id
        self.save_project(data)
        return project_id

    def save_project(self, project: dict) -> bool:
        """프로젝트 저장 (ID는 create_project에서 미리 할당되어야 함)"""
        try:
            metadata = self._load_metadata()
            current_batch = metadata["current_batch"]
            current_count = metadata["current_count"]

            if current_count >= self.max_per_batch:
                current_batch += 1
                current_count = 0

            project["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            project["is_deleted"] = False

            file_path = self._get_batch_file(str(current_batch))

            with open(file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(project, ensure_ascii=False, default=str) + "\n")

            metadata["current_batch"] = current_batch
            metadata["current_count"] = current_count + 1

            self._save_metadata(metadata)

            return True

        except Exception as e:
            logger.error(f"프로젝트 저장 실패: {e}")
            return False

    def load_project_list(self, skip: int = 0, limit: int = 12) -> List[dict]:
        """시나리오 목록 조회"""
        load_projects = []
        skipped = 0

        batch_folders = sorted(
            self.data_dir.glob("[0-9]*"), key=lambda x: int(x.name), reverse=True
        )

        for folder in batch_folders:
            if len(load_projects) >= limit:
                break

            file_path = folder / "project.jsonl"
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = [line for line in f if line.strip()]

                    for line in reversed(lines):
                        if len(load_projects) >= limit:
                            break

                        project = json.loads(line)

                        if project.get("is_deleted", False):
                            continue

                        if skipped < skip:
                            skipped += 1
                            continue
                        load_projects.append(project)

            except Exception as e:
                logger.error(f"프로젝트 목록 로드 실패: {e}")

        return load_projects

    def delete_project(self, project_id: int) -> bool:
        """프로젝트 소프트 삭제 (is_deleted = True)"""
        batch_folders = sorted(self.data_dir.glob("[0-9]*"), key=lambda x: int(x.name))

        for folder in batch_folders:
            file_path = folder / "project.jsonl"
            if not file_path.exists():
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            updated = False
            new_lines = []
            for line in lines:
                if not line.strip():
                    continue
                project = json.loads(line)
                if project.get("id") == project_id:
                    if project.get("is_deleted", False):
                        raise AppException(400, "이미 삭제된 프로젝트입니다")
                    project["is_deleted"] = True
                    updated = True
                new_lines.append(
                    json.dumps(project, ensure_ascii=False, default=str) + "\n"
                )

            if updated:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                return True

        raise AppException(404, "프로젝트를 찾을 수 없습니다")

    def create_project_from_upload(
        self,
        project_dict: dict,
        chunk_service: ChunkUploadService,
        zip_service: ZipFileService,
    ) -> int:
        """청크 병합 → 검증 → 이동 → 프로젝트 저장"""
        merged_file = None
        try:
            merged_file, session = chunk_service.merge_chunks(project_dict["upload_id"])
            zip_file_validator.validate_zip_integrity(str(merged_file))
            zip_file_validator.validate_required_files(
                str(merged_file), project_dict["disaster_type"]
            )

            project_dir = self.get_project_dir(project_dict["upload_id"])
            zip_path = zip_service.move_to_project(merged_file, project_dir)
            zip_service.extract_zip(str(zip_path), str(project_dir))

            merged_file = None  # 이동 완료 후 cleanup 방지

            return self.create_project(project_dict)

        except Exception as e:
            if not isinstance(e, AppException):
                logger.error(f"프로젝트 생성 실패: {e}")
            raise

        finally:
            if merged_file and merged_file.exists():
                merged_file.unlink(missing_ok=True)
