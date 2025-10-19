// 좌표 변환 유틸
export const transformCoordinates = (x, y) => {
  return window.ol.proj.transform(
    [x, y],
    'EPSG:4326',
    'EPSG:3857'
  );
};

// 좌표 이동 (줌을 null로 전달하면 현재 줌 유지)
export const moveMap = (mapInstance, x, y, zoom = 12) => {
  if (mapInstance?.getView) {
    const transformed = transformCoordinates(x, y);
    mapInstance.getView().setCenter(transformed);

    // zoom이 명시적으로 전달되었을 때만 줌 설정
    if (zoom !== null && zoom !== undefined) {
      mapInstance.getView().setZoom(zoom);
    }
  }
};

// 마커 생성
export const addMarker = (mapInstance, x, y) => {
  if (!mapInstance || !window.ol) return null;

  const transformed = transformCoordinates(x, y);

  const marker = new window.ol.Feature({
    geometry: new window.ol.geom.Point(transformed)
  });

  const markerStyle = new window.ol.style.Style({
    image: new window.ol.style.Circle({
      radius: 4,
      fill: new window.ol.style.Fill({
        color: 'red'
      })
    })
  });

  marker.setStyle(markerStyle);

  const vectorSource = new window.ol.source.Vector({
    features: [marker]
  });

  const vectorLayer = new window.ol.layer.Vector({
    source: vectorSource
  });

  mapInstance.addLayer(vectorLayer);

  return vectorLayer;
};

// 마커 제거
export const removeMarker = (mapInstance, markerLayer) => {
  if (mapInstance && markerLayer) {
    mapInstance.removeLayer(markerLayer);
  }
};
