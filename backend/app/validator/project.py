from pydantic import field_validator, model_validator


class ProjectValidators:
    """프로젝트 생성 검증"""

    @field_validator("project_name")
    @classmethod
    def validate_project_name(cls, v):
        """프로젝트명 검증"""
        if not v or not v.strip():
            raise ValueError("프로젝트명은 필수입니다.")
        return v.strip()

    @field_validator("project_description")
    @classmethod
    def validate_description(cls, v):
        """설명 정리"""
        return v.strip() if v else ""

    @model_validator(mode="after")
    def validate_parameters_by_disaster_type(self):
        """재난 타입별 파라미터 검증"""
        disaster_type = self.disaster_type

        if disaster_type == "nuclear":
            self._validate_nuclear()
        elif disaster_type == "chemistry":
            self._validate_chemistry()
        elif disaster_type in ["flood", "storm"]:
            self._validate_flood_storm()

        return self

    def _validate_nuclear(self):
        """원자력 재난 검증"""
        # PAZ: 0 ~ 5km
        if self.radius1 <= 0 or self.radius1 > 5:
            raise ValueError("Nuclear의 PAZ 반경은 0 ~ 5km 사이여야 합니다")

        # UPZ: PAZ ~ 30km
        if self.radius2 <= self.radius1 or self.radius2 > 30:
            raise ValueError("Nuclear의 UPZ 반경은 PAZ보다 크고 30km 이하여야 합니다")

        # 그림자 대피 권역: UPZ ~ 45km (선택)
        if self.radius3 is not None:
            if self.radius3 <= self.radius2 or self.radius3 > 45:
                raise ValueError("그림자 대피 권역은 UPZ보다 크고 45km 이하여야 합니다")

        # 분석 권역: 그림자 대피 권역 ~ 50km (선택)
        if self.radius4 is not None:
            if self.radius3 is None:
                raise ValueError(
                    "분석 권역을 설정하려면 그림자 대피 권역을 먼저 설정해야 합니다"
                )
            if self.radius4 <= self.radius3 or self.radius4 > 50:
                raise ValueError(
                    "분석 권역은 그림자 대피 권역보다 크고 50km 이하여야 합니다"
                )

        # 풍향 필수
        if self.wind_direction is None:
            raise ValueError("Nuclear의 경우 풍향은 필수입니다")

        # 풍향 범위: 1~16
        if self.wind_direction < 1 or self.wind_direction > 16:
            raise ValueError("풍향은 1~16 사이의 값이어야 합니다")

        # 풍속 필수 및 범위
        if self.wind_speed is None:
            raise ValueError("Nuclear의 경우 풍속은 필수입니다")
        if self.wind_speed <= 0 or self.wind_speed > self.radius2:
            raise ValueError(
                f"풍속은 0보다 크고 UPZ 반경({self.radius2}km) 이하여야 합니다"
            )

    def _validate_chemistry(self):
        """화학 재난 검증"""
        # 대피 범위: 0 ~ 5km
        if self.radius1 <= 0 or self.radius1 > 5:
            raise ValueError("Chemistry의 대피 범위는 0 ~ 5km 사이여야 합니다")

        # 분석 범위: 대피 범위 ~ 15km
        if self.radius2 <= self.radius1 or self.radius2 > 15:
            raise ValueError(
                "Chemistry의 분석 범위는 대피 범위보다 크고 15km 이하여야 합니다"
            )

        # radius3, radius4, wind 필드는 사용 안함
        if self.radius3 is not None or self.radius4 is not None:
            raise ValueError("Chemistry는 radius3, radius4를 사용하지 않습니다")
        if self.wind_direction is not None or self.wind_speed is not None:
            raise ValueError("Chemistry는 풍향/풍속을 사용하지 않습니다")

    def _validate_flood_storm(self):
        """홍수/폭풍 재난 검증"""
        disaster_type = self.disaster_type

        # 대피 범위: 0 ~ 2km
        if self.radius1 <= 0 or self.radius1 > 2:
            raise ValueError(
                f"{disaster_type.capitalize()}의 대피 범위는 0 ~ 2km 사이여야 합니다"
            )

        # 분석 범위: 대피 범위 ~ 3km
        if self.radius2 <= self.radius1 or self.radius2 > 3:
            raise ValueError(
                f"{disaster_type.capitalize()}의 분석 범위는 대피 범위보다 크고 3km 이하여야 합니다"
            )

        # radius3, radius4, wind 필드는 사용 안함
        if self.radius3 is not None or self.radius4 is not None:
            raise ValueError(
                f"{disaster_type.capitalize()}는 radius3, radius4를 사용하지 않습니다"
            )
        if self.wind_direction is not None or self.wind_speed is not None:
            raise ValueError(
                f"{disaster_type.capitalize()}는 풍향/풍속을 사용하지 않습니다"
            )
