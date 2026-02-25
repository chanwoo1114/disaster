// 도로 Geometry 추가
export function addRoadGeometry(map, geoJson) {
  if (!map || !window.ol || !geoJson) return null;

  const features = geoJson.features;
  if (!features || features.length === 0) return null;

  const featureCollection = {
    type: "FeatureCollection",
    features: features
  }

  const format = new window.ol.format.GeoJSON();
  const olFeatures = format.readFeatures(featureCollection, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857'
  });

  const vectorSource = new window.ol.source.Vector({
    features: olFeatures
  });

  const roadStyle = function(feature) {
    const laneTy = feature.get('laneTy');

    return new window.ol.style.Style({
      stroke: new window.ol.style.Stroke({
        color: '#000000',
        width: 2,
        lineDash: laneTy ? [] : [5, 5]
      })
    });
  };

  const vectorLayer = new window.ol.layer.Vector({
    source: vectorSource,
    style: roadStyle,
    zIndex: 200
  });

  map.addLayer(vectorLayer);

  return vectorLayer;
}

// Polygon 추가
function addPolygonLayer(geometry, color, zIndex) {
  if (!geometry) return null;

  const format = new window.ol.format.GeoJSON();
  const feature = format.readFeature(geometry, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857'
  });

  const layer = new window.ol.layer.Vector({
    source: new window.ol.source.Vector({ features: [feature] }),
    style: new window.ol.style.Style({
      fill: new window.ol.style.Fill({
        color: color
      })
    }),
    zIndex: zIndex
  });

  return layer;
}

// 재난 범위 추가
export function addDisasterGeometry(map, bufferGeometry) {
  if (!map || !window.ol || !bufferGeometry) return null;

  const layers = [];

  const analysisLayer = addPolygonLayer(
    bufferGeometry.analysisGeometry,
    'rgba(255, 255, 0, 0.25)',
    101
  );

  const disasterLayer = addPolygonLayer(
    bufferGeometry.disasterGeometry,
    'rgba(255, 0, 0, 0.35)',
    102
  );

  if (analysisLayer) {
    map.addLayer(analysisLayer);
    layers.push(analysisLayer);
  }

  if (disasterLayer) {
    map.addLayer(disasterLayer);
    layers.push(disasterLayer);
  }

  return layers;
}