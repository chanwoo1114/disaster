import zipfile

from fastapi import HTTPException


def validate_zip_file(file):
    """Zip 파일 검증"""

    # 파일 존재 여부 확인
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="파일이 업로드되지 않았습니다")

    # 확장자 검사
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="ZIP 파일만 업로드 가능합니다")

    # Content-Type 확인
    if file.content_type not in [
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ]:
        raise HTTPException(status_code=400, detail="올바른 ZIP 파일 형식이 아닙니다")

    # 파일 크기 확인
    max_size = 500 * 1024 * 1024
    if hasattr(file, "size") and file.size:
        if file.size > max_size:
            raise HTTPException(
                status_code=400, detail="파일 크기는 500MB를 초과할 수 없습니다"
            )
        if file.size == 0:
            raise HTTPException(
                status_code=400, detail="빈 파일은 업로드할 수 없습니다"
            )

    try:
        with zipfile.ZipFile(file, "r") as zf:
            zf.extractall

    except zipfile.BadZipfile:
        raise HTTPException
