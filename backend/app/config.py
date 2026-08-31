from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
TEMP_DIR = DATA_DIR / "temp"
UPLOADS_DIR = DATA_DIR / "uploads"

CACHE_TTL = 3600
CACHE_MAXSIZE = 100_000

MAX_FILE_SIZE = 500 * 1024 * 1024
MAX_UNCOMPRESSED_SIZE = 10 * 1024 * 1024 * 1024  # 500MB ZIP × 압축비 ~20x 여유
MAX_COMPRESSION_RATIO = 100

# 업로드 세션 보관 시간. 지나면 폴더째 삭제
SESSION_TTL_SECONDS = 6 * 3600
SESSION_CLEANUP_INTERVAL = 10 * 60

# 전국 표준 노드링크 (scripts/build_link_network.py 로 생성)
LINK_NETWORK_PATH = DATA_DIR / "links.parquet"

# 배경 도로망 추출 반경 (km). 대상지 중심 원에 걸치는 링크를 모두 가져온다
NETWORK_RADIUS_KM = {
    "nuclear": 50,
    "complex": 50,
    "chemistry": 15,
    "storm": 3,
    "flood": 3,
}
