from ..schemas.exceptions import AppException


def validate_nuclear_distances(data):
    """방사능 대피 범위 거리 검증"""
    if all(
        v is None
        for v in [
            data.paz_distance,
            data.upz_distance,
            data.shadow_distance,
            data.analysis_distance,
        ]
    ):
        raise AppException(400, "최소 하나 이상의 거리 값을 입력해야 합니다.")

    if data.paz_distance is not None and data.upz_distance is not None:
        if data.upz_distance < data.paz_distance:
            raise AppException(
                400, "upz_distance는 paz_distance보다 크거나 같아야 합니다."
            )

    if data.upz_wind_distance is not None:
        if data.paz_distance is None or data.upz_distance is None:
            raise AppException(
                400,
                "upz_wind_distance를 사용하려면 paz_distance와 upz_distance가 필요합니다.",
            )

        upz_wind = data.upz_wind_distance
        if not (data.paz_distance <= upz_wind <= data.upz_distance):
            raise AppException(
                400,
                "upz_wind_distance는 paz_distance 이상 upz_distance 이하여야 합니다.",
            )

    if data.shadow_distance is not None and data.upz_distance is not None:
        if not (data.upz_distance <= data.shadow_distance <= 45):
            raise AppException(
                400, "shadow_distance는 upz_distance 이상 45이하여야 합니다."
            )

    if data.analysis_distance is not None and data.shadow_distance is not None:
        if not (data.shadow_distance <= data.analysis_distance <= 50):
            raise AppException(
                400,
                "analysis_distance는 shadow_distance 이상 50이하여야 합니다.",
            )

    return data


def validate_disaster_distances(data):
    """일반 재난 대피 범위 거리 검증"""
    max_disaster_distance = {"chemistry": 10, "flood": 2, "storm": 2, "complex": 10}
    max_analysis_distance = {"chemistry": 15, "flood": 3, "storm": 3, "complex": 15}

    max_disaster = max_disaster_distance.get(data.disaster_type, 10)
    if data.disaster_distance > max_disaster:
        raise AppException(
            400,
            f"{data.disaster_type} 재난의 disaster_distance는 {max_disaster}km 이하여야 합니다.",
        )

    max_analysis = max_analysis_distance.get(data.disaster_type, 15)
    if not (data.disaster_distance <= data.analysis_distance <= max_analysis):
        raise AppException(
            400,
            f"{data.disaster_type} 재난의 analysis_distance는 "
            f"disaster_distance({data.disaster_distance}) 이상 {max_analysis}km 이하여야 합니다.",
        )

    return data
