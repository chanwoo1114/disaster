export function buildBufferParams(project) {
  const { lng, lat, disasterType } = project;

  if ( disasterType === 'nuclear') {
    return (
      {
        directory: project.uploadId,
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
      directory: project.uploadId,
      lng,
      lat,
      disasterType,
      disasterDistance: project.radius1,
      analysisDistance: project.radius2,
    }
  )
}

export function buildRoadParams(project) {
  const { lng, lat, disasterType } = project;

  return {
    directory: project.uploadId,
    lng,
    lat,
    disasterType,
    analysisDistance: disasterType === 'nuclear' ? project.radius4 : project.radius2
  };
}

export function positionUploadParams(project) {
  return {
    disasterType: project.disasterType,
    directory: project.uploadId,
  };
}
