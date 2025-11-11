from fastapi import APIRouter, UploadFile, HTTPException, File
import os
import shutil

upload = APIRouter(prefix="/file", tags=["file"])

@upload.post("/upload-zip/")
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

    return {"message": "Success Upload File"}