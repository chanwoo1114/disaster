import json
from collections import defaultdict
from pathlib import Path

import pandas as pd

from ..schemas.exceptions import AppException
from .redis_config import get_redis_client

MESO_COLUMNS = ["time", "veh_id", "occupancy", "direction", "x", "y"]
MICRO_COLUMNS = ["time", "veh_id", "direction", "x", "y", "speed", "mode", "occupancy"]
WALKING_COLUMNS = ["time", "person_id", "direction", "x", "y", "speed"]

DISASTER_COLUMNS_MAP = {
    "nuclear": MESO_COLUMNS,
    "chemistry": None,
    "storm": WALKING_COLUMNS,
    "flood": WALKING_COLUMNS,
}

DATA_DIR = Path(__file__).parent.parent / "data" / "projects"
REDIS_TTL = 3600


def _resolve_columns(disaster_type: str, col_count: int) -> list[str]:
    if disaster_type == "chemistry":
        return MICRO_COLUMNS if col_count == 8 else MESO_COLUMNS

    columns = DISASTER_COLUMNS_MAP.get(disaster_type)
    if columns is None:
        raise AppException(400, f"지원하지 않는 재난 종류: {disaster_type}")

    return columns


class CacheService:
    @staticmethod
    def preload_position(disaster_type: str, directory: str) -> tuple[int, dict]:
        base_dir = DATA_DIR / directory

        if not base_dir.exists():
            raise AppException(404, f"폴더를 찾을 수 없습니다: {directory}")

        txt_files = sorted(base_dir.glob("*.txt"))
        if not txt_files:
            raise AppException(404, f"텍스트 파일이 없습니다: {directory}")

        result = defaultdict(list)
        for file in txt_files:
            df = pd.read_csv(
                file, encoding="CP949", sep=r"\s+", header=None, skiprows=1
            )
            df.columns = _resolve_columns(disaster_type, len(df.columns))

            for time, group in df.groupby("time"):
                result[int(time)].extend(group.to_dict(orient="records"))

        first_time = PositionService._seconds_to_hhmmss(min(result.keys()))
        return first_time, dict(result)


class PositionService:
    @staticmethod
    def _seconds_to_hhmmss(seconds: int) -> str:
        h, remainder = divmod(seconds, 3600)
        m, s = divmod(remainder, 60)
        return f"{h:02d}{m:02d}{s:02d}"

    @staticmethod
    def _build_redis_key(directory: str, time: int) -> str:
        return f"{directory}:{PositionService._seconds_to_hhmmss(time)}"

    @staticmethod
    def upload_data(directory: str, position_data: dict):
        redis_client = get_redis_client()
        pipe = redis_client.pipeline()

        for time, data in position_data.items():
            key = PositionService._build_redis_key(directory, time)
            pipe.set(key, json.dumps(data), ex=REDIS_TTL, nx=True)

        pipe.execute()

    @staticmethod
    def get_position_data(disaster_type: str, directory: str, time: int):
        redis_client = get_redis_client()
        key = PositionService._build_redis_key(directory, time)

        value = redis_client.get(key)

        if value:
            return json.loads(value)

        _, position_data = CacheService.preload_position(disaster_type, directory)
        PositionService.upload_data(directory, position_data)

        value = redis_client.get(key)
        if not value:
            raise AppException(404, f"해당 시간({time})의 데이터가 존재하지 않습니다")

        return json.loads(value)
