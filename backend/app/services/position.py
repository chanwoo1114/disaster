import json
import logging
from collections import defaultdict
from pathlib import Path

import pandas as pd

from ..config import PROJECTS_DIR
from ..schemas.exceptions import AppException
from .cache import cache

logger = logging.getLogger(__name__)

MESO_COLUMNS = ["time", "veh_id", "occupancy", "direction", "lng", "lat"]
MICRO_COLUMNS = [
    "time",
    "veh_id",
    "direction",
    "lng",
    "lat",
    "speed",
    "mode",
    "occupancy",
]
WALKING_COLUMNS = ["time", "person_id", "direction", "lng", "lat", "speed"]

DISASTER_COLUMNS_MAP = {
    "nuclear": MESO_COLUMNS,
    "chemistry": None,
    "storm": WALKING_COLUMNS,
    "flood": WALKING_COLUMNS,
}


def _resolve_columns(disaster_type: str, col_count: int) -> list[str]:
    if disaster_type == "chemistry":
        return MICRO_COLUMNS if col_count == 8 else MESO_COLUMNS

    columns = DISASTER_COLUMNS_MAP.get(disaster_type)
    if columns is None:
        raise AppException(400, f"지원하지 않는 재난 종류: {disaster_type}")

    return columns


def _seconds_to_hhmmss(seconds: int) -> str:
    h, remainder = divmod(seconds, 3600)
    m, s = divmod(remainder, 60)
    return f"{h:02d}{m:02d}{s:02d}"


def _build_cache_key(directory: str, time: int) -> str:
    return f"{directory}:{_seconds_to_hhmmss(time)}"


def _read_position_file(file: Path) -> pd.DataFrame | None:
    if file.stat().st_size == 0:
        return None
    try:
        df = pd.read_csv(file, encoding="CP949", sep=r"\s+", header=None, skiprows=1)
        return df if not df.empty else None
    except Exception:
        return None


def preload_position(disaster_type: str, directory: str) -> tuple[str, str, dict]:
    base_dir = PROJECTS_DIR / directory

    if not base_dir.exists():
        raise AppException(404, f"폴더를 찾을 수 없습니다: {directory}")

    txt_files = sorted(base_dir.glob("*.txt"))
    if not txt_files:
        raise AppException(404, f"텍스트 파일이 없습니다: {directory}")

    result = defaultdict(list)
    for file in txt_files:
        df = _read_position_file(file)
        if df is None:
            continue

        df.columns = _resolve_columns(disaster_type, len(df.columns))
        for time, group in df.groupby("time"):
            result[int(time)].extend(group.to_dict(orient="records"))

    if not result:
        raise AppException(404, f"유효한 위치 데이터가 없습니다: {directory}")

    first_time = _seconds_to_hhmmss(min(result.keys()) - 1)
    last_time = _seconds_to_hhmmss(max(result.keys()))

    return first_time, last_time, dict(result)


def upload_data(directory: str, position_data: dict):
    for time, data in position_data.items():
        key = _build_cache_key(directory, time)
        if key not in cache:
            cache[key] = data


def get_position_data(disaster_type: str, directory: str, time: int):
    key = _build_cache_key(directory, time)
    value = cache.get(key)

    if value is not None:
        return value

    _, _, position_data = preload_position(disaster_type, directory)
    upload_data(directory, position_data)

    value = cache.get(key)
    if value is None:
        raise AppException(404, f"해당 시간({time})의 데이터가 존재하지 않습니다")

    return value
