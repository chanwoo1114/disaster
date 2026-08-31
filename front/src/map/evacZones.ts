import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

/**
 * 원자력 대피 권역 표출
 * - 검은 선: PAZ 5 / UPZ 30 / 그림자 대피권역 45 / 대피범위 50 km 원
 * - 빨간 면: 피해범위 = PAZ 원 + 풍향 반대 3섹터(16방위, PAZ→풍속거리)
 *   풍향 코드: 1=북, 시계방향 2,3… / 풍속 코드: 1=10km, 2=20km, 3=30km
 */

const SOURCE = 'evac-zones';
const RING_LINE = 'evac-rings-line';
const DAMAGE_FILL = 'evac-damage-fill';
const DAMAGE_LINE = 'evac-damage-line';

export const NUCLEAR_RADII_KM = [5, 30, 45, 50];
const PAZ_KM = 5;
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
function damagePolygon(
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

function buildData(opts: EvacZoneOptions): FeatureCollection {
  const features: Feature[] = NUCLEAR_RADII_KM.map((r) => ({
    type: 'Feature',
    properties: { kind: 'ring', radius: r },
    geometry: circlePolygon(opts.lng, opts.lat, r),
  }));

  const windKm = WIND_SPEED_KM[opts.windSpeedCode ?? 0] ?? 0;
  features.push({
    type: 'Feature',
    properties: { kind: 'damage' },
    geometry: damagePolygon(opts.lng, opts.lat, opts.windDirection, windKm),
  });

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

  map.addLayer(
    {
      id: DAMAGE_FILL,
      type: 'fill',
      source: SOURCE,
      filter: ['==', ['get', 'kind'], 'damage'],
      paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.2 },
    },
    before,
  );
  map.addLayer(
    {
      id: DAMAGE_LINE,
      type: 'line',
      source: SOURCE,
      filter: ['==', ['get', 'kind'], 'damage'],
      paint: { 'line-color': '#dc2626', 'line-width': 2 },
    },
    before,
  );
  map.addLayer(
    {
      id: RING_LINE,
      type: 'line',
      source: SOURCE,
      filter: ['==', ['get', 'kind'], 'ring'],
      paint: { 'line-color': '#000000', 'line-width': 1.5, 'line-opacity': 0.8 },
    },
    before,
  );
}

export function removeEvacZones(map: MLMap): void {
  for (const id of [DAMAGE_FILL, DAMAGE_LINE, RING_LINE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
