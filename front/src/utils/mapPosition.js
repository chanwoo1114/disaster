const iconModules = import.meta.glob("../assets/images/**/*.png", { eager: true });

const MODE_MAP = {
  1:  { folder: "auto",    prefix: "auto" },
  2:  { folder: "bus",     prefix: "버스" },
  8:  { folder: "taxi",    prefix: "택시" },
  9:  { folder: "S_truck", prefix: "소형트럭" },
  10: { folder: "M_truck", prefix: "중형트럭" },
  11: { folder: "L_truck", prefix: "대형트럭" },
};

const directionToIndex = (direction) => {
  const normalized = ((direction % 360) + 360) % 360;
  if (normalized >= 355 || normalized < 5) return "01";
  const slot = Math.floor((normalized - 5) / 10);
  return String(36 - slot).padStart(2, "0");
};

const getIconSrc = (mode, direction) => {
  const config = MODE_MAP[mode];
  if (!config) return null;
  const idx = directionToIndex(direction);
  const key = Object.keys(iconModules).find((k) =>
    k.includes(`/${config.folder}/${config.prefix}-${idx}.png`)
  );
  return key ? iconModules[key].default : null;
};

let positionLayer = null;
let positionSource = null;

export const initPositionLayer = (map) => {
  positionSource = new window.ol.source.Vector();
  positionLayer = new window.ol.layer.Vector({
    source: positionSource,
    zIndex: 300,
  });
  map.addLayer(positionLayer);
};

const pedestrianStyle = new window.ol.style.Style({
  image: new window.ol.style.Circle({
    radius: 4,
    fill: new window.ol.style.Fill({ color: "#3B82F6" }),
    stroke: new window.ol.style.Stroke({ color: "#ffffff", width: 1.5 }),
  }),
});

export const updatePositions = (positionData, isVehicle = true) => {
  if (!positionSource) return;
  positionSource.clear();

  positionData.forEach((item) => {
    const feature = new window.ol.Feature({
      geometry: new window.ol.geom.Point(
        window.ol.proj.fromLonLat([item.lng, item.lat])
      ),
    });

    if (isVehicle) {
      const iconSrc = getIconSrc(item.mode, item.direction);
      if (!iconSrc) return;
      feature.setStyle(
        new window.ol.style.Style({
          image: new window.ol.style.Icon({
            src: iconSrc,
            scale: 0.5,
          }),
        })
      );
    } else {
      feature.setStyle(pedestrianStyle);
    }

    positionSource.addFeature(feature);
  });
};
