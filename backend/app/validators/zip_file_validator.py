import zipfile
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile

from ..config import MAX_COMPRESSION_RATIO, MAX_FILE_SIZE, MAX_UNCOMPRESSED_SIZE
from ..schemas.exceptions import AppException

DANGEROUS_EXTENSIONS = [".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh", ".py", ".js"]

# 재난 유형별 필수 파일
REQUIRED_FILES_MAP = {
    "nuclear": ["VehicleLocation"],
    "chemistry": [["VehicleLocation", "Vehicle_Position"]],
    "flood": ["Person_Position"],
    "storm": ["Person_Position"],
    "complex": ["VehicleLocation", "Person_Position"],
}


def validate_upload_file(file: UploadFile) -> None:
    """업로드 파일 기본 검증"""
    if not file or not file.filename:
        raise AppException(400, "파일이 업로드되지 않았습니다")

    if not file.filename.lower().endswith(".zip"):
        raise AppException(400, "ZIP 파일만 업로드 가능합니다")

    if file.content_type not in [
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ]:
        raise AppException(400, "올바른 ZIP 파일 형식이 아닙니다")


def validate_file_size(size: int, max_size: Optional[int] = None) -> None:
    """파일 크기 검증"""
    max_allowed = max_size or MAX_FILE_SIZE

    if size == 0:
        raise AppException(400, "빈 파일입니다")

    if size > max_allowed:
        size_mb = max_allowed / 1024 / 1024
        raise AppException(400, f"파일 크기는 {int(size_mb)}MB를 초과할 수 없습니다")


def validate_zip_integrity(file_path: str) -> None:
    """ZIP 파일 무결성 검증"""
    path = Path(file_path)

    if not path.exists():
        raise AppException(400, "파일이 존재하지 않습니다")

    try:
        with zipfile.ZipFile(path, "r") as zf:
            bad_file = zf.testzip()
            if bad_file:
                raise AppException(400, f"손상된 파일이 포함되어 있습니다: {bad_file}")

            file_list = zf.namelist()
            if not file_list:
                raise AppException(400, "ZIP 파일이 비어있습니다")

            dangerous_files = [
                name
                for name in file_list
                if Path(name).suffix.lower() in DANGEROUS_EXTENSIONS
            ]
            if dangerous_files:
                raise AppException(
                    400,
                    f"허용되지 않은 파일 형식: {', '.join(dangerous_files[:3])}",
                )

            file_size = path.stat().st_size
            total_uncompressed = sum(info.file_size for info in zf.infolist())
            compression_ratio = total_uncompressed / file_size if file_size > 0 else 0

            if compression_ratio > MAX_COMPRESSION_RATIO:
                raise AppException(400, "비정상적인 압축률이 감지되었습니다")

            if total_uncompressed > MAX_UNCOMPRESSED_SIZE:
                raise AppException(400, "압축 해제 후 크기가 너무 큽니다 (최대 2GB)")

    except zipfile.BadZipFile:
        raise AppException(400, "올바른 ZIP 파일 형식이 아닙니다")


def validate_required_files(file_path: str, disaster_type: str) -> dict:
    """재난 유형별 필수 파일 검증"""
    required_files = REQUIRED_FILES_MAP.get(disaster_type, [])

    try:
        with zipfile.ZipFile(file_path, "r") as zf:
            file_list = zf.namelist()
            txt_files = [f for f in file_list if f.endswith(".txt")]

            if not txt_files:
                raise AppException(400, "위치 데이터 파일(.txt)이 없습니다")

            missing_groups = []

            for required in required_files:
                if isinstance(required, list):
                    found = any(
                        any(req in name for name in txt_files) for req in required
                    )
                    if not found:
                        missing_groups.append(" 또는 ".join(required))

                else:
                    found = any(required in name for name in txt_files)
                    if not found:
                        missing_groups.append(required)

            if missing_groups:
                raise AppException(
                    400,
                    f"필수 파일이 누락되었습니다: {', '.join(missing_groups)}",
                )

            return {"txt_files": txt_files, "disaster_type": disaster_type}

    except zipfile.BadZipFile:
        raise AppException(400, "손상된 ZIP 파일입니다")
