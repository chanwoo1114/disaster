from ..schemas.exceptions import AppException


def validate_nuclear(data) -> None:
    """원자력 재난 파라미터 검증"""
    if data.radius1 > 5:
        raise AppException(400, "Nuclear의 PAZ 반경은 5km 이하여야 합니다")

    if data.radius2 <= data.radius1 or data.radius2 > 30:
        raise AppException(
            400, "Nuclear의 UPZ 반경은 PAZ보다 크고 30km 이하여야 합니다"
        )

    if data.radius3 is not None:
        if data.radius3 <= data.radius2 or data.radius3 > 45:
            raise AppException(
                400, "그림자 대피 권역은 UPZ보다 크고 45km 이하여야 합니다"
            )

    if data.radius4 is not None:
        if data.radius3 is None:
            raise AppException(
                400,
                "분석 권역을 설정하려면 그림자 대피 권역을 먼저 설정해야 합니다",
            )
        if data.radius4 <= data.radius3 or data.radius4 > 50:
            raise AppException(
                400, "분석 권역은 그림자 대피 권역보다 크고 50km 이하여야 합니다"
            )

    if data.wind_direction is None:
        raise AppException(400, "Nuclear의 경우 풍향은 필수입니다")

    if data.wind_speed is None:
        raise AppException(400, "Nuclear의 경우 풍속은 필수입니다")
    if data.wind_speed > data.radius2:
        raise AppException(400, f"풍속은 UPZ 반경({data.radius2}km) 이하여야 합니다")


def validate_chemistry(data) -> None:
    """화학 재난 파라미터 검증"""
    if data.radius1 > 5:
        raise AppException(400, "Chemistry의 대피 범위는 5km 이하여야 합니다")

    if data.radius2 <= data.radius1 or data.radius2 > 15:
        raise AppException(
            400, "Chemistry의 분석 범위는 대피 범위보다 크고 15km 이하여야 합니다"
        )

    if data.radius3 is not None or data.radius4 is not None:
        raise AppException(400, "Chemistry는 radius3, radius4를 사용하지 않습니다")

    if data.wind_direction is not None or data.wind_speed is not None:
        raise AppException(400, "Chemistry는 풍향/풍속을 사용하지 않습니다")


def validate_flood_storm(data) -> None:
    """홍수/태풍 재난 파라미터 검증"""
    type_name = data.disaster_type.capitalize()

    if data.radius1 > 2:
        raise AppException(400, f"{type_name}의 대피 범위는 2km 이하여야 합니다")

    if data.radius2 <= data.radius1 or data.radius2 > 3:
        raise AppException(
            400, f"{type_name}의 분석 범위는 대피 범위보다 크고 3km 이하여야 합니다"
        )

    if data.radius3 is not None or data.radius4 is not None:
        raise AppException(400, f"{type_name}는 radius3, radius4를 사용하지 않습니다")

    if data.wind_direction is not None or data.wind_speed is not None:
        raise AppException(400, f"{type_name}는 풍향/풍속을 사용하지 않습니다")


def validate_project_by_disaster_type(data):
    """재난 유형별 파라미터 검증"""
    if data.disaster_type == "nuclear":
        validate_nuclear(data)
    elif data.disaster_type == "chemistry":
        validate_chemistry(data)
    elif data.disaster_type in ["flood", "storm"]:
        validate_flood_storm(data)
    return data
