import logging
import shutil
import uuid
import zipfile
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import UploadFile

from ..schemas.exceptions import AppException

logger = logging.getLogger(__name__)


class ZipFileService:
    """ZIP 파일 처리 서비스"""

    ALLOWED_EXTENSIONS = [".txt", ".arg"]

    def __init__(self, base_path: Optional[str] = None):
        if base_path is None:
            base_dir = Path(__file__).parent.parent
            self.base_path = base_dir / "data" / "uploads"
        else:
            self.base_path = Path(base_path)

        self.temp_path = self.base_path / "temp"
        self.temp_path.mkdir(parents=True, exist_ok=True)

    async def save_upload_file(
        self, file: UploadFile, max_size: int = 500 * 1024 * 1024
    ) -> Tuple[Path, int]:
        """
        업로드 파일을 임시 경로에 스트리밍 저장

        Returns:
            Tuple[파일 경로, 파일 크기]
        """
        temp_file_path = self.temp_path / f"{uuid.uuid4()}_{file.filename}"

        total_size = 0
        chunk_size = 1024 * 1024  # 1MB씩 읽기

        try:
            with open(temp_file_path, "wb") as buffer:
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break

                    total_size += len(chunk)

                    if total_size > max_size:
                        buffer.close()
                        temp_file_path.unlink(missing_ok=True)
                        raise AppException(
                            400,
                            f"파일 크기는 {max_size // (1024 * 1024)}MB를 초과할 수 없습니다",
                        )

                    buffer.write(chunk)

            return temp_file_path, total_size

        except AppException:
            raise

        except Exception as e:
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)
            raise e

    def move_to_project(self, temp_file_path: Path, project_dir: Path) -> Path:
        """임시 파일을 프로젝트 폴더로 이동"""
        project_dir.mkdir(parents=True, exist_ok=True)
        destination = project_dir / "data.zip"
        shutil.move(str(temp_file_path), str(destination))
        return destination

    def extract_zip(
        self,
        zip_path: str,
        extract_to: str,
        allowed_extensions: Optional[List[str]] = None,
    ) -> List[str]:
        """
        ZIP 파일 압축 해제

        Returns:
            추출된 파일 목록
        """
        zip_file = Path(zip_path)
        extract_dir = Path(extract_to).resolve()
        extract_dir.mkdir(parents=True, exist_ok=True)

        extensions = allowed_extensions or self.ALLOWED_EXTENSIONS
        extracted_files = []

        with zipfile.ZipFile(zip_file, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                # 폴더 구조를 유지해 추출한다 (같은 파일명이 폴더별로 존재하므로 평탄화 금지)
                parts = Path(member.filename.replace("\\", "/")).parts
                if any(p in ("..", "") or ":" in p for p in parts):
                    continue  # 경로 탐색 공격 방지

                ext = Path(parts[-1]).suffix.lower()
                if ext not in extensions:
                    continue

                target_path = extract_dir.joinpath(*parts)
                if not target_path.resolve().is_relative_to(extract_dir):
                    continue

                target_path.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as source, open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

                extracted_files.append(str(target_path.relative_to(extract_dir)))

        zip_file.unlink()

        return extracted_files

    def cleanup_temp_file(self, file_path: Path) -> None:
        """임시 파일 삭제"""
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)
