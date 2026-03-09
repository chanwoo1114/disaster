export const transformCoordinates = (x, y) => {
  if (!window.ol?.proj) {
    return [x, y];
  }

  return window.ol.proj.transform(
    [x, y],
    'EPSG:4326',
    'EPSG:3857'
  );
};

function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const moveMap = (mapInstance, x, y, zoom = 12, animate = true, duration = 600) => {
  if (!mapInstance?.getView) return;

  if (typeof x !== 'number' || typeof y !== 'number') return;

  if (x < -180 || x > 180 || y < -90 || y > 90) return;

  const transformed = transformCoordinates(x, y);
  const view = mapInstance.getView();

  if (!animate) {
    view.setCenter(transformed);
    if (zoom !== null && zoom !== undefined) {
      view.setZoom(zoom);
    }
    return;
  }

  const startCenter = view.getCenter();
  const startZoom = view.getZoom();
  const endCenter = transformed;
  const endZoom = zoom !== null && zoom !== undefined ? zoom : startZoom;

  const startTime = Date.now();

  function animateStep() {
    const elapsed = Date.now() - startTime;
    let progress = Math.min(elapsed / duration, 1);

    const t = easeInOutCubic(progress);

    const currentCenter = [
      lerp(startCenter[0], endCenter[0], t),
      lerp(startCenter[1], endCenter[1], t)
    ];

    const currentZoom = lerp(startZoom, endZoom, t);

    view.setCenter(currentCenter);
    view.setZoom(currentZoom);

    if (progress < 1) {
      requestAnimationFrame(animateStep);
    }
  }

  animateStep();
};
