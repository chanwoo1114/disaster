from .services.chunk_upload import ChunkUploadService
from .services.session import SessionService
from .services.zip_file import ZipFileService


def get_chunk_service() -> ChunkUploadService:
    return ChunkUploadService()


def get_zip_service() -> ZipFileService:
    return ZipFileService()


def get_session_service() -> SessionService:
    return SessionService()
