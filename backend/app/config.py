from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PROJECTS_DIR = DATA_DIR / "projects"
TEMP_DIR = DATA_DIR / "temp"
UPLOADS_DIR = DATA_DIR / "uploads"

REDIS_TTL = 3600  # 1시간
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
MAX_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
MAX_COMPRESSION_RATIO = 100
MAX_PER_BATCH = 1000
