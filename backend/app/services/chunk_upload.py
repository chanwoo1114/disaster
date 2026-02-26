import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Tuple

from .. import config
from ..schemas.exceptions import AppException

logger = logging.getLogger(__name__)


class ChunkUploadService:
    """청크 업로드 처리 서비스"""

    def __init__(self):
        self.chunks_path = config.TEMP_DIR / "chunks"
        self.complete_path = config.UPLOADS_DIR
        self.sessions_file = config.UPLOADS_DIR / "sessions.json"

        self.chunks_path.mkdir(parents=True, exist_ok=True)
        self.complete_path.mkdir(parents=True, exist_ok=True)

        if not self.sessions_file.exists():
            self._save_sessions({})

    def _load_sessions(self):
        """세션 정보 로드"""
        try:
            with open(self.sessions_file, "r", encoding="utf-8") as f:
                return json.load(f)

        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_sessions(self, sessions):
        """세션 정보 저장"""
        with open(self.sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)

    def create_session(self, file_name, total_chunks, total_size):
        """업로드 세션 생성"""
        if not file_name.lower().endswith(".zip"):
            raise AppException(400, "ZIP 파일만 업로드 가능합니다")

        if total_size > config.MAX_FILE_SIZE:
            raise AppException(
                400,
                f"파일 크기는 {config.MAX_FILE_SIZE // (1024 * 1024)}MB를 초과할 수 없습니다",
            )

        upload_id = str(uuid.uuid4())

        session = {
            "upload_id": upload_id,
            "file_name": file_name,
            "total_chunks": total_chunks,
            "total_size": total_size,
            "received_chunks": [],
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        sessions = self._load_sessions()
        sessions[upload_id] = session
        self._save_sessions(sessions)

        chunk_dir = self.chunks_path / upload_id
        chunk_dir.mkdir(exist_ok=True)

        return session

    async def save_chunk(self, upload_id, chunk_index, file):
        """청크 저장"""
        sessions = self._load_sessions()

        if upload_id not in sessions:
            raise AppException(400, "유효하지 않은 업로드 세션입니다")

        session = sessions[upload_id]

        if chunk_index < 0 or chunk_index >= session["total_chunks"]:
            raise AppException(400, f"유효하지 않은 청크 인덱스입니다. {chunk_index}")

        if chunk_index in session["received_chunks"]:
            raise AppException(400, f"이미 업로드된 청크입니다: {chunk_index}")

        chunk_dir = self.chunks_path / upload_id

        os.makedirs(chunk_dir, exist_ok=True)

        chunk_file = chunk_dir / f"chunk_{chunk_index}"

        content = await file.read()
        with open(chunk_file, "wb") as f:
            f.write(content)

        session["received_chunks"].append(chunk_index)
        sessions[upload_id] = session
        self._save_sessions(sessions)

        return {
            "upload_id": upload_id,
            "chunk_index": chunk_index,
        }

    def merge_chunks(self, upload_id: str) -> Tuple[Path, dict]:
        """청크 병합하여 완성된 파일 생성

        Returns:
            Tuple[완성된 파일 경로, 세션 정보]
        """
        sessions = self._load_sessions()

        if upload_id not in sessions:
            raise AppException(400, "유효하지 않은 업로드 세션입니다")

        session = sessions[upload_id]
        total_chunks = session["total_chunks"]
        received = sorted(session["received_chunks"])

        if len(received) != total_chunks:
            missing = set(range(total_chunks)) - set(received)
            raise AppException(
                400, f"아직 업로드되지 않은 청크가 있습니다: {sorted(missing)}"
            )

        chunk_dir = self.chunks_path / upload_id
        output_file = self.complete_path / f"{upload_id}_{session['file_name']}"

        with open(output_file, "wb") as out:
            for i in range(total_chunks):
                chunk_file = chunk_dir / f"chunk_{i}"
                with open(chunk_file, "rb") as cf:
                    out.write(cf.read())

        # 청크 임시 디렉토리 정리
        shutil.rmtree(chunk_dir, ignore_errors=True)

        return output_file, session

    def cleanup_session(self, upload_id: str) -> None:
        """세션 정리"""
        sessions = self._load_sessions()

        # 청크 디렉토리 정리
        chunk_dir = self.chunks_path / upload_id
        if chunk_dir.exists():
            shutil.rmtree(chunk_dir, ignore_errors=True)

        # 완성 파일 정리
        if upload_id in sessions:
            file_name = sessions[upload_id].get("file_name", "")
            complete_file = self.complete_path / f"{upload_id}_{file_name}"
            if complete_file.exists():
                complete_file.unlink(missing_ok=True)

            del sessions[upload_id]
            self._save_sessions(sessions)
