from .services.chunk_upload import ChunkUploadService
from .services.project import ProjectStorage
from .services.zip_file import ZipFileService


def get_project_storage() -> ProjectStorage:
    return ProjectStorage()


def get_chunk_service() -> ChunkUploadService:
    return ChunkUploadService()


def get_zip_service() -> ZipFileService:
    return ZipFileService()
