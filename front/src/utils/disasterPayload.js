// 방사능 재난 payload 생성
export function createNuclearPayload(data) {
  const longitude = parseFloat(data.coordinates.x);
  const latitude = parseFloat(data.coordinates.y);

  return {
    disaster_data: {
      lng: longitude,
      lat: latitude,
      disaster_type: "nuclear"
    },
    paz_distance: Number(data.params.radius1),
    upz_distance: Number(data.params.radius2),
    upz_wind_distance: Number(data.params.windSpeed),
    wind_direction: Number(data.params.windDirection),
    shadow_distance: Number(data.params.radius3),
    analysis_distance: Number(data.params.radius4)
  };
}

// 일반 재난 payload 생성
export function createDisasterPayload(data) {
  const longitude = parseFloat(data.coordinates.x);
  const latitude = parseFloat(data.coordinates.y);

  return {
    disaster_data: {
      lng: longitude,
      lat: latitude,
      disaster_type: data.disaster || "알수없음"
    },
    disaster_distance: Number(data.params.radius1),
    analysis_distance: Number(data.params.radius2)
  };
}

// 재난 타입 확인
export function isNuclearDisaster(disasterType) {
  return disasterType === "nuclear";
}

// 좌표 추출
export function extractCoordinates(data) {
  return {
    longitude: parseFloat(data.coordinates.x),
    latitude: parseFloat(data.coordinates.y)
  };
}
