import {transformCoordinates} from './mapNavigation.js';

export const addMarker = (mapInstance, x, y, options = {}) => {
  if (!mapInstance || !window.ol) return null;

  const {
    radius = 3,
    fillColor = 'red'
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

export const removeMarker = (mapInstance, markerLayer) => {
  if (mapInstance && markerLayer) {
    mapInstance.removeLayer(markerLayer);
  }
};
