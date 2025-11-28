// 중심점 추가
export function addCentroidPoint(map, centroid) {
  if (!map || !window.ol || !centroid) return null;

  try {
    const [lng, lat] = centroid.coordinates;

    const coords = window.ol.proj.transform(
      [lng, lat],
      'EPSG:4326',
      'EPSG:3857'
    );

    const marker = new window.ol.Feature({
      geometry: new window.ol.geom.Point(coords),
    });

    const styles = [
      new window.ol.style.Style({
        image: new window.ol.style.Circle({
          radius: 4,
          fill: new window.ol.style.Fill({color: 'red'}),
        })
      })
    ];

    marker.setStyle(styles);

    const vectorSource = new window.ol.source.Vector({
      features: [marker]
    });

    const vectorLayer = new window.ol.layer.Vector({
      source: vectorSource,
      zIndex: 1000
    });

    map.current.addLayer(vectorLayer);

    return vectorLayer;

  } catch {
    return null;
  }
}

// 폴리곤 추가
export function addPolygonGeometry(map, geoJson, options = {}) {
  if (!map || !window.ol || !geoJson) return null;

  const {
    strokeColor = null,
    strokeWidth = null,
    fillColor = null,
    zIndex = 500
  } = options;

  try {
    const format = new window.ol.format.GeoJSON();

    const feature = format.readFeature(geoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    const styleConfig = {};

    if (strokeColor || strokeWidth) {
      styleConfig.stroke = new window.ol.style.Stroke({
        color: strokeColor,
        width: strokeWidth
      });
    }

    if (fillColor) {
      styleConfig.fill = new window.ol.style.Fill({
        color: fillColor
      });
    }

    const style = new window.ol.style.Style(styleConfig);
    feature.setStyle(style);

    const vectorSource = new window.ol.source.Vector({
      features: [feature]
    });

    const vectorLayer = new window.ol.layer.Vector({
      source: vectorSource,
      zIndex: zIndex
    });

    map.current.addLayer(vectorLayer);
    return vectorLayer;

  } catch {
    return null;
  }
}


export function addGeometries(map, responseData, isNuclear) {
  if (!map || !responseData) return null;

  try {
    // 중심점 추가
    if (responseData.centroid) {
      const centroidLayer = addCentroidPoint(map, responseData.centroid)
    }

    // 재난 구분
    if (isNuclear) {
      console.log('test')
    } else {
      addPolygonGeometry(map, responseData.disaster_geometry, {
        fillColor: 'rgba(255, 0, 0, 0.5)',
        zIndex: 200
      })
      addPolygonGeometry(map, responseData.analysis_geometry, {
        fillColor: 'rgba(0, 100, 0, 0.5)',
        zIndex: 100
      })
    }


  } catch (error) {
    console.error('Geometry 레이어 추가 실패:', error);
  }

}