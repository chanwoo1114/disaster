export const addMapClickListener = (mapInstance, callback) => {
  if (!mapInstance) return null;

  const clickHandler = (event) => {
    const clickedCoord = window.ol.proj.transform(
      event.coordinate,
      'EPSG:3857',
      'EPSG:4326'
    );

    if (callback) {
      callback({
        x: clickedCoord[0],
        y: clickedCoord[1]
      });
    }
  };

  mapInstance.on('singleclick', clickHandler);

  return () => {
    mapInstance.un('singleclick', clickHandler);
  }
};