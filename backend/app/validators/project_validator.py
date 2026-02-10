from pydantic import model_validator


class ProjectValidators:
    """프로젝트 검증"""

    @model_validator(mode="after")
    def validate_by_disaster_type(self):
        """재난 유형별 파라미터 검증"""
        if self.disaster_type == "nuclear":
            self._validate_nuclear()
        elif self.disaster_type == "chemistry":
            self._validate_chemistry()
        elif self.disaster_type in ["flood", "storm"]:
            self._validate_flood_storm()
        return self

    def _validate_nuclear(self):
        """원자력 재난 검증"""
        if self.radius1 > 5:
            raise ValueError("Nuclear의 PAZ 반경은 5km 이하여야 합니다")

        if self.radius2 <= self.radius1 or self.radius2 > 30:
            raise ValueError("Nuclear의 UPZ 반경은 PAZ보다 크고 30km 이하여야 합니다")

        if self.radius3 is not None:
            if self.radius3 <= self.radius2 or self.radius3 > 45:
                raise ValueError("그림자 대피 권역은 UPZ보다 크고 45km 이하여야 합니다")

        if self.radius4 is not None:
            if self.radius3 is None:
                raise ValueError(
                    "분석 권역을 설정하려면 그림자 대피 권역을 먼저 설정해야 합니다"
                )
            if self.radius4 <= self.radius3 or self.radius4 > 50:
                raise ValueError(
                    "분석 권역은 그림자 대피 권역보다 크고 50km 이하여야 합니다"
                )

        if self.wind_direction is None:
            raise ValueError("Nuclear의 경우 풍향은 필수입니다")

        if self.wind_speed is None:
            raise ValueError("Nuclear의 경우 풍속은 필수입니다")
        if self.wind_speed > self.radius2:
            raise ValueError(f"풍속은 UPZ 반경({self.radius2}km) 이하여야 합니다")

    def _validate_chemistry(self):
        """화학 재난 검증"""
        if self.radius1 > 5:
            raise ValueError("Chemistry의 대피 범위는 5km 이하여야 합니다")

        if self.radius2 <= self.radius1 or self.radius2 > 15:
            raise ValueError(
                "Chemistry의 분석 범위는 대피 범위보다 크고 15km 이하여야 합니다"
            )

        if self.radius3 is not None or self.radius4 is not None:
            raise ValueError("Chemistry는 radius3, radius4를 사용하지 않습니다")

        if self.wind_direction is not None or self.wind_speed is not None:
            raise ValueError("Chemistry는 풍향/풍속을 사용하지 않습니다")

    def _validate_flood_storm(self):
        """홍수/폭풍 재난 검증"""
        type_name = self.disaster_type.capitalize()

        if self.radius1 > 2:
            raise ValueError(f"{type_name}의 대피 범위는 2km 이하여야 합니다")

        if self.radius2 <= self.radius1 or self.radius2 > 3:
            raise ValueError(
                f"{type_name}의 분석 범위는 대피 범위보다 크고 3km 이하여야 합니다"
            )

        if self.radius3 is not None or self.radius4 is not None:
            raise ValueError(f"{type_name}는 radius3, radius4를 사용하지 않습니다")

        if self.wind_direction is not None or self.wind_speed is not None:
            raise ValueError(f"{type_name}는 풍향/풍속을 사용하지 않습니다")
