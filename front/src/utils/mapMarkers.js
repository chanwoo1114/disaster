import {transformCoordinates} from './mapNavigation.js';

// 마커 생성
export const addMarker = (mapInstance, x, y, options = {}) => {
  if (!mapInstance || !window.ol) return null;

  const {
    radius = 4,
    fillColor = 'red',
    strokeColor = '#fff',
    strokeWidth = 2
  } = options;

  const transformed = transformCoordinates(x, y);

  const marker = new window.ol.Feature({
    geometry: new window.ol.geom.Point(transformed)
  });

  const markerStyle = new window.ol.style.Style({
    image: new window.ol.style.Circle({
      radius,
      fill: new window.ol.style.Fill({
        color: fillColor
      }),
      stroke: new window.ol.style.Stroke({
        color: strokeColor,
        width: strokeWidth
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

// 모든 마커 제거
export const clearAllMarkers = (mapInstance) => {
  if (!mapInstance) return;

  const layers = mapInstance.getLayers().getArray();
  layers.forEach(layer => {
    if (layer instanceof window.ol.layer.Vector) {
      mapInstance.removeLayer(layer);
    }
  });
};
