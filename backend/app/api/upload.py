import os
import re
import shutil
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, File, Response, UploadFile, status

from ..schemas.upload import FileApiResponse, FileUploadResponse

router = APIRouter(prefix="/file")


@router.post(
    "/upload-zip/",
    response_model=FileApiResponse,
    summary="ZIP 파일 업로드 및 압축해재",
)
async def upload_zip_file(response: Response, file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return FileApiResponse(
            success=False, message="zip 파일만 업로드 가능합니다.", data=None
        )

    unique_id = str(uuid.uuid4())
    base_dir = Path.cwd()
    save_dir = base_dir / unique_id
    zip_path = save_dir / file.filename

    try:
        save_dir.mkdir(parents=True, exist_ok=True)

        with open(zip_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for member in zip_ref.namelist():
                member_path = (save_dir / member).resolve()
                if not str(member_path).startswith(str(save_dir.resolve())):
                    raise ValueError(
                        "ZIP 파일 내부에 허용되지 않은 경로가 포함되어 있습니다."
                    )

            zip_ref.extractall(save_dir)

        response.status_code = status.HTTP_200_OK
        return FileApiResponse(
            success=True,
            message="파일 업로드 및 압축 해제 성공",
            data=FileUploadResponse(uuid=unique_id),
        )

    except zipfile.BadZipFile:
        if save_dir.exists():
            shutil.rmtree(save_dir)

        response.status_code = status.HTTP_400_BAD_REQUEST
        return FileApiResponse(
            success=False, message="압축을 풀 수 없는 잘못된 zip 파일입니다.", data=None
        )

    except ValueError as ve:
        if save_dir.exists():
            shutil.rmtree(save_dir)

        response.status_code = status.HTTP_400_BAD_REQUEST
        return FileApiResponse(success=False, message=str(ve), data=None)

    except Exception as e:
        if save_dir.exists():
            shutil.rmtree(save_dir)

        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return FileApiResponse(
            success=False,
            message=f"파일 처리 중 오류가 발생했습니다: {str(e)}",
            data=None,
        )

    finally:
        if zip_path.exists():
            zip_path.unlink()
