import union from '@turf/union';

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

function addPolygonLayer(geometry, color, zIndex, strokeColor) {
  if (!geometry) return null;

  const format = new window.ol.format.GeoJSON();
  const feature = format.readFeature(geometry, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857'
  });

  const styleOpts = {
    fill: new window.ol.style.Fill({ color }),
  };
  if (strokeColor) {
    styleOpts.stroke = new window.ol.style.Stroke({ color: strokeColor, width: 1.5 });
  }

  const layer = new window.ol.layer.Vector({
    source: new window.ol.source.Vector({ features: [feature] }),
    style: new window.ol.style.Style(styleOpts),
    zIndex: zIndex
  });

  return layer;
}

export function addDisasterGeometry(map, bufferGeometry) {
  if (!map || !window.ol || !bufferGeometry) return null;

  const layers = [];

  const analysisLayer = addPolygonLayer(
    bufferGeometry.analysisGeometry,
    'rgba(255, 255, 255, 0.3)',
    101,
    '#000000'
  );

  const disasterLayer = addPolygonLayer(
    bufferGeometry.disasterGeometry,
    'rgba(255, 0, 0, 0.15)',
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

function addPolygonListLayer(geometries, color, zIndex, strokeColor) {
  if (!geometries || geometries.length === 0) return null;

  const format = new window.ol.format.GeoJSON();
  const features = geometries.map((geo) =>
    format.readFeature(geo, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
  );

  const styleOpts = {
    fill: new window.ol.style.Fill({ color }),
  };
  if (strokeColor) {
    styleOpts.stroke = new window.ol.style.Stroke({ color: strokeColor, width: 1.5 });
  }

  const layer = new window.ol.layer.Vector({
    source: new window.ol.source.Vector({ features }),
    style: new window.ol.style.Style(styleOpts),
    zIndex,
  });

  return layer;
}

function getOppositeSectors(windDirection) {
  const opposite = (windDirection - 1 + 8) % 16;
  return [
    (opposite + 15) % 16,
    opposite,
    (opposite + 1) % 16,
  ];
}

export function addNuclearGeometry(map, bufferGeometry, windDirection) {
  if (!map || !window.ol || !bufferGeometry) return null;

  const layers = [];
  const TRANSPARENT = 'rgba(0, 0, 0, 0)';
  const LINE_COLOR = '#000000';
  const RED_FILL = 'rgba(255, 0, 0, 0.15)';

  const analysisLayer = addPolygonLayer(bufferGeometry.analysisGeometry, TRANSPARENT, 100, LINE_COLOR);
  if (analysisLayer) { map.addLayer(analysisLayer); layers.push(analysisLayer); }

  const shadowLayer = addPolygonLayer(bufferGeometry.shadowGeometry, TRANSPARENT, 101, LINE_COLOR);
  if (shadowLayer) { map.addLayer(shadowLayer); layers.push(shadowLayer); }

  let oppositeSectors = [];
  if (bufferGeometry.upzGeometry && bufferGeometry.upzGeometry.length > 0) {
    const oppositeIndices = getOppositeSectors(windDirection);
    const normalSectors = [];

    bufferGeometry.upzGeometry.forEach((geo, i) => {
      if (oppositeIndices.includes(i)) {
        oppositeSectors.push(geo);
      } else {
        normalSectors.push(geo);
      }
    });

    const normalLayer = addPolygonListLayer(normalSectors, TRANSPARENT, 102, LINE_COLOR);
    if (normalLayer) { map.addLayer(normalLayer); layers.push(normalLayer); }

    const allRedGeos = [...oppositeSectors];
    if (bufferGeometry.pazGeometry) {
      allRedGeos.push(bufferGeometry.pazGeometry);
    }

    const features = allRedGeos.map((geo) => ({ type: 'Feature', properties: {}, geometry: geo }));
    const fc = { type: 'FeatureCollection', features };
    const merged = allRedGeos.length === 1 ? features[0] : union(fc);

    const redLayer = addPolygonLayer(merged.geometry, RED_FILL, 103, LINE_COLOR);
    if (redLayer) { map.addLayer(redLayer); layers.push(redLayer); }
  }

  const strokeGeos = [...oppositeSectors];
  if (bufferGeometry.pazGeometry) strokeGeos.push(bufferGeometry.pazGeometry);
  const strokeLayer = addPolygonListLayer(strokeGeos, TRANSPARENT, 105, LINE_COLOR);
  if (strokeLayer) { map.addLayer(strokeLayer); layers.push(strokeLayer); }

  return layers;
}
