from fastapi import APIRouter, UploadFile, HTTPException, File
import os
import shutil
import zipfile

router = APIRouter(prefix="/file")

@router.post("/upload-zip/")
async def upload_zip_file(
        description: str,
        file: UploadFile = File(...)
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=404, detail="zip 파일만 업로드 가능합니다.")

    save_dir = f"{description}/"
    os.makedirs(save_dir, exist_ok=True)

    zip_path = os.path.join(save_dir, file.filename)

    with open(zip_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(save_dir)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="압축을 풀 수 없는 잘못된 zip 파일입니다.")
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)

    return {"message": "Success Extracted Zip"}