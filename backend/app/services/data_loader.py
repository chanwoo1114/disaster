import os
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Dict, List


class PositionService:
    _position_data: OrderedDict[str, List[Dict]] = OrderedDict()
    _max_cache_size = 20
    _max_memory_mb = 1024

    COLUMN_NAMES = {
        "nuclear": ["time", "person_id", "x", "y", "direction", "speed", "status"],
        "chemistry": [
            "time",
            "person_id",
            "x",
            "y",
            "exposure_level",
            "wind_direction",
        ],
        "flood": ["time", "person_id", "x", "y", "elevation", "risk_level"],
        "storm": ["time", "person_id", "direction", "x", "y", "speed"],
        "complex": ["time", "person_id", "x", "y", "status"],
    }

    """위치 데이터 로드"""

    @classmethod
    def load_position_data(cls, directory: str, disaster_type: str) -> List[Dict]:
        """위치 데이터 로드"""

        cache_key = f"{directory}:{disaster_type}"

        # 캐시 확인
        if cache_key in cls._position_data:
            cls._position_data.move_to_end(cache_key)
            print(f"✓ 캐시에서 로드: {cache_key}")
            return cls._position_data[cache_key]

        dir_path = Path(directory)
        if not dir_path.exists():
            raise FileNotFoundError(f"디렉토리 없음: {directory}")

        file_list = [f for f in os.listdir(dir_path) if f.endswith(".txt")]
        if not file_list:
            raise FileNotFoundError(f"txt 파일 없음: {directory}")

        column_names = cls.COLUMN_NAMES.get(disaster_type)
        if not column_names:
            raise ValueError(
                f"지원하지 않는 재난 유형: {disaster_type}. "
                f"가능한 값: {list(cls.COLUMN_NAMES.keys())}"
            )

        all_data = []

        for file_name in file_list:
            file_path = dir_path / file_name

            try:
                with open(file_path, "r", encoding="CP949") as f:
                    next(f)

                    for line in f:
                        values = line.strip().split()

                        if len(values) != len(column_names):
                            continue

                        row = dict(zip(column_names, values))
                        all_data.append(row)

            except Exception as e:
                print(f"  ✗ {file_name} 읽기 실패: {e}")
                continue

        if not all_data:
            raise ValueError(f"데이터가 비어있음: {directory}")

        data_size_mb = sys.getsizeof(all_data) / 1024 / 1024

        if len(cls._position_data) >= cls._max_cache_size:
            oldest_key, _ = cls._position_data.popitem(last=False)
            print(f"🗑 캐시 제거 (LRU): {oldest_key}")

        current_memory = cls._get_total_memory_usage()
        if current_memory + data_size_mb > cls._max_memory_mb:
            cls._free_memory(data_size_mb)

        cls._position_data[cache_key] = all_data

        return all_data

    """현재 캐시 메모리 사용량"""

    @classmethod
    def _get_total_memory_usage(cls) -> float:
        total_mb = 0
        for data in cls._position_data.values():
            total_mb += sys.getsizeof(data) / 1024 / 1024

        return total_mb

    """메모리 확보"""

    @classmethod
    def _free_memory(cls, need_mb: float):
        while cls._get_total_memory_usage() + need_mb > cls._max_memory_mb:
            if not cls._position_data:
                break

            oldest_key, _ = cls._position_data.popitem(last=False)

    """캐시 삭제"""

    @classmethod
    def clear_cache(cls, directory: str = None):
        if directory:
            cls._position_data.pop(directory, None)

        else:
            cls._position_data.clear()

    """특정 시간대 위치 데이터 조회"""

    @staticmethod
    def get_position_at_time(
        directory: str, time: str, disaster_type: str
    ) -> List[Dict]:
        all_data = PositionService.load_position_data(directory, disaster_type)
        filtered = [row for row in all_data if row.get("time") == time]
        return filtered
