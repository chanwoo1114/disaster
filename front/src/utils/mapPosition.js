// 이미지 전부 로드 (Vite)
const iconModules = import.meta.glob("../assets/images/**/*.png", { eager: true });


// mode → 폴더명, 파일 접두사 (접두사는 실제 파일명에 맞게 수정)
const MODE_MAP = {
  1:  { folder: "auto",    prefix: "auto" },
  2:  { folder: "bus",     prefix: "버스" },
  8:  { folder: "taxi",    prefix: "택시" },
  9:  { folder: "S_truck", prefix: "소형트럭" },
  10: { folder: "M_truck", prefix: "중형트럭" },
  11: { folder: "L_truck", prefix: "대형트럭" },
};

// direction(각도) → 01~36
const directionToIndex = (direction) => {
  const normalized = ((direction % 360) + 360) % 360;
  if (normalized >= 355 || normalized < 5) return "01";
  const slot = Math.floor((normalized - 5) / 10);
  return String(36 - slot).padStart(2, "0");
};

// 아이콘 경로 가져오기
const getIconSrc = (mode, direction) => {
  const config = MODE_MAP[mode];
  if (!config) return null;
  const idx = directionToIndex(direction);
  const key = Object.keys(iconModules).find((k) =>
    k.includes(`/${config.folder}/${config.prefix}-${idx}.png`)
  );
  return key ? iconModules[key].default : null;
};

// 레이어 참조
let positionLayer = null;
let positionSource = null;

// 레이어 생성 (한 번만)
export const initPositionLayer = (map) => {
  positionSource = new window.ol.source.Vector();
  positionLayer = new window.ol.layer.Vector({
    source: positionSource,
    zIndex: 300,
  });
  map.addLayer(positionLayer);
};

// 위치 데이터 업데이트 (매 초)
export const updatePositions = (positionData) => {
  if (!positionSource) return;
  // 기존 전부 삭제
  positionSource.clear();

  // 새 데이터 추가
  positionData.forEach((item) => {
    const iconSrc = getIconSrc(item.mode, item.direction);
    if (!iconSrc) return;

    const feature = new window.ol.Feature({
      geometry: new window.ol.geom.Point(
        window.ol.proj.fromLonLat([item.lng, item.lat])
      ),
    });

    feature.setStyle(
      new window.ol.style.Style({
        image: new window.ol.style.Icon({
          src: iconSrc,
          scale: 0.5,
        }),
      })
    );

    positionSource.addFeature(feature);
  });
};