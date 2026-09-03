import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

/**
 * 원자력 대피 권역 표출
 * - PAZ 5km: 붉은 반투명 원판 (테두리 없음). 분할선보다 위에 그려 선이 원을 가로지르지 않는다
 * - 10/20/30km: 각각 16방위 쐐기로 분할해 아주 옅은 연파랑 면으로 표출 (img.png 참조).
 *   쐐기를 원판이 아니라 고리(0–10 / 10–20 / 20–30) 로 잘라 겹침을 없애고,
 *   농도는 안쪽일수록 진하게 준다 (10 > 20 > 30).
 * - 45/50km: 채움 없이 검은 점선 원만
 * - 16방위 분할선: 중심 → 30km (참조 SQL의 radial_distance = max(distances))
 * - 피해범위: PAZ 원 + 풍향 반대 3섹터(PAZ→풍속거리) 빨간 면
 *   풍향 코드: 1=북, 시계방향 2,3… / 풍속 코드: 1=10km, 2=20km, 3=30km
 */

const SOURCE = 'evac-zones';
const WEDGE_FILL = 'evac-wedge-fill';
const PAZ_FILL = 'evac-paz-fill';
const DAMAGE_FILL = 'evac-damage-fill';
const SECTOR_LINE = 'evac-sector-line';
const RING_LINE = 'evac-rings-line';
const DAMAGE_LINE = 'evac-damage-line';

export const EVAC_COLORS = {
  wedge: '#87a3c7',
  paz: '#dc2626',
  damage: '#dc2626',
  ring: '#000000',
};

const PAZ_KM = 5;
/** 16방위 쐐기로 분할해 채우는 권역 */
const WEDGE_KM = [10, 20, 30];
/** 채움·분할 없이 검은 점선 원만 그리는 바깥 권역 */
const RING_ONLY_KM = [45, 50];
/**
 * 16방위 분할선 길이. 참조 코드(get_multiple_circles_split_16_wedges)가
 * radial_distance = max(distances) 로 고정 방사선을 만들어 모든 원을 같은 경계로 자르므로,
 * 분할 대상 권역 중 가장 바깥(30km)까지 그린다.
 */
const SECTOR_LINE_KM = Math.max(...WEDGE_KM);
/** 행정동 조회 반경. 실질 분석은 30km까지만 한다 (45/50은 참고용 점선) */
export const ADM_RADIUS_KM = Math.max(...WEDGE_KM);
/** 쐐기 0번이 정북(0°) 중심 → 경계각은 -11.25° 부터 22.5° 간격 (참조 SQL과 동일) */
const SECTOR_DEG = 22.5;
const WIND_SPEED_KM: Record<number, number> = { 1: 10, 2: 20, 3: 30 };

const R_EARTH = 6371;
const D2R = Math.PI / 180;

/** 구면 상에서 (거리 km, 방위각°) 만큼 이동한 점 */
function destination(lng: number, lat: number, distKm: number, bearingDeg: number): [number, number] {
  const delta = distKm / R_EARTH;
  const theta = bearingDeg * D2R;
  const phi1 = lat * D2R;
  const lambda1 = lng * D2R;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
    );
  return [lambda2 / D2R, phi2 / D2R];
}

/** fromDeg→toDeg 방향(증가)으로 반지름 rKm 호를 찍는다 */
function arcPoints(
  lng: number,
  lat: number,
  rKm: number,
  fromDeg: number,
  toDeg: number,
  steps: number,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const b = fromDeg + ((toDeg - fromDeg) * i) / steps;
    pts.push(destination(lng, lat, rKm, b));
  }
  return pts;
}

function circlePolygon(lng: number, lat: number, rKm: number): Polygon {
  const ring = arcPoints(lng, lat, rKm, 0, 360, 128);
  return { type: 'Polygon', coordinates: [ring] };
}

/**
 * 피해범위 폴리곤.
 * 풍향이 있으면: PAZ 원 ∪ (반대 3섹터의 PAZ→풍속거리 부채꼴) 를 한 링으로 구성
 * 풍향이 없으면(무풍/미상): PAZ 원만
 */
export function damagePolygon(
  lng: number,
  lat: number,
  windDirection: number | null,
  windKm: number,
): Polygon {
  if (windDirection == null || windDirection < 1 || windDirection > 16 || windKm <= PAZ_KM) {
    return circlePolygon(lng, lat, PAZ_KM);
  }

  // 반대 섹터 중심각: 섹터 1(북)이 0° 중심, 시계방향. 반대 = +8섹터
  const centerDeg = ((windDirection - 1 + 8) % 16) * SECTOR_DEG;
  const a0 = centerDeg - SECTOR_DEG * 1.5; // 3섹터 = 67.5°
  const a1 = centerDeg + SECTOR_DEG * 1.5;

  const ring: [number, number][] = [
    // 바깥(풍속거리) 호: a0 → a1
    ...arcPoints(lng, lat, windKm, a0, a1, 48),
    // 안쪽(PAZ) 호: a1 → a0+360 (섹터 밖 구간을 크게 돌아 PAZ 원 전체 포함)
    ...arcPoints(lng, lat, PAZ_KM, a1, a0 + 360, 128),
  ];
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

export interface EvacZoneOptions {
  lng: number;
  lat: number;
  /** 0=무풍, 1~16 (1=북, 시계방향) */
  windDirection: number | null;
  /** 1=10km, 2=20km, 3=30km */
  windSpeedCode: number | null;
}

/** EvacZoneOptions → 지도에 그려지는 것과 동일한 피해범위 폴리곤 (행정동 hit 판정에 재사용) */
export function damagePolygonOf(opts: EvacZoneOptions): Polygon {
  const windKm = WIND_SPEED_KM[opts.windSpeedCode ?? 0] ?? 0;
  return damagePolygon(opts.lng, opts.lat, opts.windDirection, windKm);
}

function buildData(opts: EvacZoneOptions): FeatureCollection {
  const { lng, lat } = opts;
  const features: Feature[] = [];

  // 10/20/30km × 16방위 = 48개 쐐기. 고리로 잘라 겹치지 않게 한다
  WEDGE_KM.forEach((rOuter, band) => {
    const rInner = band === 0 ? 0 : WEDGE_KM[band - 1];
    for (let i = 0; i < 16; i++) {
      const a0 = i * SECTOR_DEG - SECTOR_DEG / 2;
      const a1 = a0 + SECTOR_DEG;
      const ring: [number, number][] = [
        ...arcPoints(lng, lat, rOuter, a0, a1, 12),
        // 안쪽 호를 역방향으로 이어 고리를 닫는다. 최내곽은 중심점 하나로 부채꼴이 된다
        ...(rInner > 0 ? arcPoints(lng, lat, rInner, a1, a0, 12) : [[lng, lat] as [number, number]]),
      ];
      ring.push(ring[0]);
      features.push({
        type: 'Feature',
        properties: { kind: 'wedge', radius: rOuter, innerRadius: rInner, sector: i },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
  });

  features.push({
    type: 'Feature',
    properties: { kind: 'paz' },
    geometry: circlePolygon(lng, lat, PAZ_KM),
  });
  features.push({
    type: 'Feature',
    properties: { kind: 'damage' },
    geometry: damagePolygonOf(opts),
  });

  // 검은 점선 원: 분할 권역 경계 + 바깥 권역
  for (const r of [...WEDGE_KM, ...RING_ONLY_KM]) {
    features.push({
      type: 'Feature',
      properties: { kind: 'ring', radius: r },
      geometry: { type: 'LineString', coordinates: arcPoints(lng, lat, r, 0, 360, 128) },
    });
  }

  // 16방위 분할선: 중심 → 30km 가는 점선 (PAZ 원판이 위에 얹혀 안쪽은 가려진다)
  for (let i = 0; i < 16; i++) {
    const bearing = i * SECTOR_DEG - SECTOR_DEG / 2;
    features.push({
      type: 'Feature',
      properties: { kind: 'sector' },
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], destination(lng, lat, SECTOR_LINE_KM, bearing)],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function updateEvacZones(map: MLMap, opts: EvacZoneOptions): void {
  const data = buildData(opts);
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }

  map.addSource(SOURCE, { type: 'geojson', data });

  // 링크 레이어가 이미 있으면 그 아래에 깐다
  const before = map.getLayer('links-casing') ? 'links-casing' : undefined;

  const add = (layer: Parameters<MLMap['addLayer']>[0]) => map.addLayer(layer, before);

  // ① 아주 옅은 쐐기 (안쪽일수록 진하게: 10km 0.22 > 20km 0.13 > 30km 0.07)
  add({
    id: WEDGE_FILL,
    type: 'fill',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'wedge'],
    paint: {
      'fill-color': EVAC_COLORS.wedge,
      'fill-opacity': ['match', ['get', 'radius'], 10, 0.22, 20, 0.13, 30, 0.07, 0.1],
    },
  });
  // ② 16방위 분할선: 가는 점선 (img.png 스타일)
  add({
    id: SECTOR_LINE,
    type: 'line',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'sector'],
    paint: {
      'line-color': EVAC_COLORS.ring,
      'line-width': 1,
      'line-opacity': 0.6,
      'line-dasharray': [2, 2],
    },
  });
  add({
    id: RING_LINE,
    type: 'line',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'ring'],
    paint: {
      'line-color': EVAC_COLORS.ring,
      'line-width': 1,
      'line-opacity': 0.6,
      'line-dasharray': [2, 2],
    },
  });
  // ③ PAZ 5km: 붉은 원판을 분할선 위에 얹는다 — 검은 선 없이 전부 빨간색
  add({
    id: PAZ_FILL,
    type: 'fill',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'paz'],
    paint: { 'fill-color': EVAC_COLORS.paz, 'fill-opacity': 0.25 },
  });
  add({
    id: DAMAGE_FILL,
    type: 'fill',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'damage'],
    paint: { 'fill-color': EVAC_COLORS.damage, 'fill-opacity': 0.4 },
  });
  add({
    id: DAMAGE_LINE,
    type: 'line',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'damage'],
    paint: { 'line-color': EVAC_COLORS.damage, 'line-width': 1.5 },
  });
}

export function removeEvacZones(map: MLMap): void {
  for (const id of [DAMAGE_LINE, DAMAGE_FILL, PAZ_FILL, RING_LINE, SECTOR_LINE, WEDGE_FILL]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
