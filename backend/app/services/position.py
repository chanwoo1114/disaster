import os
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Dict, List, Optional


class PositionService:
    _position_data: OrderedDict[str, List[Dict]] = OrderedDict()
    _max_cache_size = 20
    _max_memory_mb = 1024

    ALLOWED_FILES = ["VehicleLocation", "Vehicle_Position", "Person_Position"]

    COLUMN_MAPPING = {
        6: {
            "nuclear": ["time", "veh_id", "occupancy", "direction", "x", "y"],
            "flood": ["time", "person_id", "direction", "x", "y", "speed"],
            "storm": ["time", "person_id", "direction", "x", "y", "speed"],
        },
        8: {
            "chemistry": [
                "time",
                "veh_id",
                "direction",
                "x",
                "y",
                "speed",
                "mode",
                "occupancy",
            ]
        },
        5: {"complex": ["time", "person_id", "x", "y", "status"]},
    }

    @classmethod
    def _is_allowed_file(cls, filename: str) -> bool:
        name_without_ext = filename.rsplit(".", 1)[0]
        print(name_without_ext)
        for prefix in cls.ALLOWED_FILES:
            if name_without_ext.startswith(prefix):
                return True

        return False

    @classmethod
    def _detect_column_names(cls, num_cols: int) -> List[str]:
        """
        첫 번째 데이터 라인으로 컬럼 구조 자동 감지
        """
        if num_cols not in cls.COLUMN_MAPPING:
            raise ValueError(f"지원하지 않는 컬럼 개수: {num_cols}")

        column_types = cls.COLUMN_MAPPING[num_cols]

        return list(column_types.values())[0]

    @classmethod
    def load_position_data(
        cls, directory: str, disaster_type: Optional[str] = None
    ) -> List[Dict]:
        """
        위치 데이터 로드
        disaster_type이 없으면 자동 감지
        """
        cache_key = f"{directory}:{disaster_type}"

        if cache_key in cls._position_data:
            cls._position_data.move_to_end(cache_key)
            return cls._position_data[cache_key]

        dir_path = Path(directory)

        if not dir_path.exists():
            raise FileNotFoundError(f"디렉토리 없음: {directory}")

        all_files = [f for f in os.listdir(dir_path) if f.endswith(".txt")]
        file_list = [f for f in all_files if cls._is_allowed_file(f)]

        if not file_list:
            raise FileNotFoundError(
                f"허용된 txt 파일 없음: {directory}\n"
                f"찾은 파일: {all_files}\n"
                f"허용된 파일명: {cls.ALLOWED_FILES}"
            )

        all_data = []
        column_names = None

        for file_name in file_list:
            file_path = dir_path / file_name

            try:
                with open(file_path, "r", encoding="CP949") as f:
                    next(f)

                    first_line = next(f, None)
                    if not first_line:
                        continue

                    values = first_line.strip().split()
                    num_cols = len(values)

                    if column_names is None:
                        if disaster_type:
                            column_names = cls._get_column_names_by_type(disaster_type)
                        else:
                            column_names = cls._detect_column_names(
                                first_line, num_cols
                            )

                    if len(values) == len(column_names):
                        row = dict(zip(column_names, values))
                        all_data.append(row)

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

        current_memory = cls._get_total_memory_usage()
        if current_memory + data_size_mb > cls._max_memory_mb:
            cls._free_memory(data_size_mb)

        cls._position_data[cache_key] = all_data

        return all_data

    @classmethod
    def _get_column_names_by_type(cls, disaster_type: str) -> List[str]:
        """disaster_type으로 컬럼명 조회"""
        for mapping in cls.COLUMN_MAPPING.values():
            if disaster_type in mapping:
                return mapping[disaster_type]

        raise ValueError(
            f"지원하지 않는 재난 유형: {disaster_type}. "
            f"가능한 값: {cls._get_all_disaster_types()}"
        )

    @classmethod
    def _get_all_disaster_types(cls) -> List[str]:
        """모든 재난 유형 반환"""
        types = []
        for mapping in cls.COLUMN_MAPPING.values():
            types.extend(mapping.keys())
        return types

    @classmethod
    def _get_total_memory_usage(cls) -> float:
        """현재 캐시 메모리 사용량"""
        total_mb = 0
        for data in cls._position_data.values():
            total_mb += sys.getsizeof(data) / 1024 / 1024
        return total_mb

    @classmethod
    def _free_memory(cls, need_mb: float):
        """메모리 확보"""
        while cls._get_total_memory_usage() + need_mb > cls._max_memory_mb:
            if not cls._position_data:
                break
            oldest_key, _ = cls._position_data.popitem(last=False)

    @classmethod
    def clear_cache(cls, directory: str = None):
        """캐시 삭제"""
        if directory:
            cls._position_data.pop(directory, None)
        else:
            cls._position_data.clear()

    @staticmethod
    def get_position_at_time(
        directory: str, time: int, disaster_type: Optional[str] = None
    ) -> List[Dict]:
        """특정 시간대 위치 데이터 조회"""
        all_data = PositionService.load_position_data(directory, disaster_type)
        filtered = [row for row in all_data if row.get("time") == time]

        return filtered
