// 좌표 변환 유틸
export const transformCoordinates = (x, y) => {
  if (!window.ol?.proj) {
    console.error('OpenLayers가 로드되지 않았습니다');
    return [x, y];
  }

  return window.ol.proj.transform(
    [x, y],
    'EPSG:4326',
    'EPSG:3857'
  );
};

// Linear Interpolation (lerp) 함수
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

// Easing 함수 (easeInOutCubic)
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 부드러운 애니메이션으로 지도 이동
export const moveMap = (mapInstance, x, y, zoom = 12, animate = true, duration = 600) => {
  if (!mapInstance?.getView) {
    console.error('유효하지 않은 지도 인스턴스입니다');
    return;
  }

  // 좌표 유효성 검사
  if (typeof x !== 'number' || typeof y !== 'number') {
    console.error('유효하지 않은 좌표입니다:', {x, y});
    return;
  }

  // 경도/위도 범위 검사
  if (x < -180 || x > 180 || y < -90 || y > 90) {
    console.error('좌표 범위를 벗어났습니다:', {x, y});
    return;
  }

  const transformed = transformCoordinates(x, y);
  const view = mapInstance.getView();

  // 애니메이션 없이 즉시 이동
  if (!animate) {
    view.setCenter(transformed);
    if (zoom !== null && zoom !== undefined) {
      view.setZoom(zoom);
    }
    return;
  }

  // 애니메이션으로 이동
  const startCenter = view.getCenter();
  const startZoom = view.getZoom();
  const endCenter = transformed;
  const endZoom = zoom !== null && zoom !== undefined ? zoom : startZoom;

  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    let progress = Math.min(elapsed / duration, 1); // 0 ~ 1

    // easing 함수 적용
    const t = easeInOutCubic(progress);

    // 중심 좌표 보간
    const currentCenter = [
      lerp(startCenter[0], endCenter[0], t),
      lerp(startCenter[1], endCenter[1], t)
    ];

    // 줌 레벨 보간
    const currentZoom = lerp(startZoom, endZoom, t);

    view.setCenter(currentCenter);
    view.setZoom(currentZoom);

    // 애니메이션 계속 진행
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  animate();
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
