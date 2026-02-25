// 재난 범위 파라미터 생성
export function buildBufferParams(project) {
  const { lng, lat, disasterType } = project;

  if ( disasterType === 'nuclear') {
    return (
      {
        lng,
        lat,
        pazDistance: project.radius1,
        upzDistance: project.radius2,
        shadowDistance: project.radius3,
        analysisDistance: project.radius4,
        upzWindDistance: project.windSpeed,
        windDirection: project.windDirection,
      }
    )
  }

  return (
    {
      lng,
      lat,
      disasterType,
      disasterDistance: project.radius1,
      analysisDistance: project.radius2,
    }
  )
}

// 도로 파라미터 생성
export function buildRoadParams(project) {
  const { lng, lat, disasterType } = project;

  return {
    lng,
    lat,
    disasterType,
    analysisDistance: disasterType === 'nuclear' ? project.radius4 : project.radius2
  };
}

// 위치 파라미터 생성
export function positionUploadParams(project) {
  return {
    disasterType: project.disasterType,
    directory: project.uploadId,
  };
}