import type { DataDrivenPropertyValueSpecification, Map as MLMap } from 'maplibre-gl';
import type { LinkTraffic } from '../types';

export const LINK_SOURCE = 'links';
const LINE_LAYER = 'links-line';
const CASING_LAYER = 'links-casing';
const SELECTED_LAYER = 'links-selected';

/** 클릭 판정에 쓸 레이어 id */
export const LINK_QUERY_LAYERS = [LINE_LAYER, CASING_LAYER];

/** 소통 색상 */
export const TRAFFIC_COLORS = {
  jam: '#d32f2f',
  slow: '#fbc02d',
  free: '#2e7d32',
  nodata: '#9aa0a6',
};

export type RoadGroupKey = 'urban' | 'urbanExpwy' | 'highway';

/**
 * 도로 등급별 소통 등급 기준 (현재 속도, km/h).
 * 범례·지도 색·선택 카드가 이 표 하나로 결정되므로, 기준을 바꾸려면 여기만 고치면 된다.
 */
export const ROAD_GROUPS: { key: RoadGroupKey; label: string; slow: number; free: number }[] = [
  { key: 'urban', label: '도시부', slow: 15, free: 25 },
  { key: 'urbanExpwy', label: '도시고속', slow: 30, free: 50 },
  { key: 'highway', label: '고속도로', slow: 40, free: 80 },
];

/**
 * MOCT 도로등급 코드 → 기준 그룹.
 * 101 고속도로, 102 도시고속도로. 나머지(103 일반국도 ~ 108 기타)는 도시부 기준을 쓴다.
 */
export const RANK_TO_GROUP: Record<string, RoadGroupKey> = {
  '101': 'highway',
  '102': 'urbanExpwy',
};

export function roadGroup(rank: string | null): (typeof ROAD_GROUPS)[number] {
  const key = (rank && RANK_TO_GROUP[rank]) || 'urban';
  return ROAD_GROUPS.find((g) => g.key === key) ?? ROAD_GROUPS[0];
}

/** 3단계 소통 등급 (빠른 쪽부터) */
export const TRAFFIC_CLASSES = [
  { key: 'free', label: '원활', color: TRAFFIC_COLORS.free },
  { key: 'slow', label: '서행', color: TRAFFIC_COLORS.slow },
  { key: 'jam', label: '정체', color: TRAFFIC_COLORS.jam },
] as const;

export type TrafficClassKey = (typeof TRAFFIC_CLASSES)[number]['key'];

/** 범례 칸에 들어갈 속도 범위 문자열 */
export function rangeText(g: { slow: number; free: number }, key: TrafficClassKey): string {
  if (key === 'free') return `${g.free} 이상`;
  if (key === 'slow') return `${g.slow}~${g.free}`;
  return `${g.slow} 미만`;
}

/** 현재 속도 + 도로 등급 → 소통 등급 */
export function trafficClassOf(speed: number, rank: string | null): (typeof TRAFFIC_CLASSES)[number] {
  const g = roadGroup(rank);
  if (speed >= g.free) return TRAFFIC_CLASSES[0];
  if (speed >= g.slow) return TRAFFIC_CLASSES[1];
  return TRAFFIC_CLASSES[2];
}

/** 한 도로 그룹의 속도 → 색 step 표현식 */
function stepFor(g: { slow: number; free: number }): unknown[] {
  return [
    'step',
    ['coalesce', ['feature-state', 'speed'], 999],
    TRAFFIC_COLORS.jam,
    g.slow,
    TRAFFIC_COLORS.slow,
    g.free,
    TRAFFIC_COLORS.free,
  ];
}

function colorExpression() {
  // 도로 등급(properties.rank)으로 기준표를 고르고, 그 안에서 현재 속도로 색을 정한다
  const match: unknown[] = ['match', ['get', 'rank']];
  for (const [rank, key] of Object.entries(RANK_TO_GROUP)) {
    const g = ROAD_GROUPS.find((x) => x.key === key);
    if (g) match.push(rank, stepFor(g));
  }
  match.push(stepFor(roadGroup(null))); // 기본값 = 도시부

  return [
    'case',
    ['boolean', ['feature-state', 'nodata'], true],
    TRAFFIC_COLORS.nodata,
    match,
  ];
}

const WIDTH_STOPS: [number, number][] = [
  [8, 2.5],
  [10, 4],
  [12, 5.5],
  [15, 9],
  [18, 16],
];

function widthExpression(): DataDrivenPropertyValueSpecification<number> {
  const expr: unknown[] = ['interpolate', ['exponential', 1.5], ['zoom']];
  for (const [zoom, width] of WIDTH_STOPS) {
    expr.push(zoom, [
      'case',
      ['boolean', ['feature-state', 'nodata'], true],
      width * 0.6,
      width,
    ]);
  }
  return expr as unknown as DataDrivenPropertyValueSpecification<number>;
}

export function addLinkLayers(map: MLMap, geojson: LinkTraffic['geojson'], dark: boolean): void {
  removeLinkLayers(map);

  map.addSource(LINK_SOURCE, {
    type: 'geojson',
    data: geojson,
    promoteId: 'link_id',
  });

  map.addLayer({
    id: CASING_LAYER,
    type: 'line',
    source: LINK_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': dark ? '#0f172a' : '#ffffff',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 4, 10, 6, 12, 8, 15, 13, 18, 22],
      'line-opacity': 0.8,
    },
  });

  map.addLayer({
    id: LINE_LAYER,
    type: 'line',
    source: LINK_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      // @ts-expect-error 표현식 배열을 동적으로 조립
      'line-color': colorExpression(),
      // 소통정보 없는 회색 배경 도로망은 60% 두께로 가늘게.
      // 주의: ['zoom']은 최상위 interpolate에만 허용되므로 상태별 배율은 각 스톱 값에 넣는다
      'line-width': widthExpression(),
      'line-opacity': ['case', ['boolean', ['feature-state', 'nodata'], true], 0.75, 1],
    },
  });

  // 선택 강조 (평소엔 아무것도 매칭하지 않음)
  map.addLayer({
    id: SELECTED_LAYER,
    type: 'line',
    source: LINK_SOURCE,
    filter: ['==', ['get', 'link_id'], -1],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#0284c7',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 6, 12, 10, 15, 15, 18, 24],
      'line-opacity': 0.55,
    },
  });
}

export function setSelectedLink(map: MLMap, linkId: number | null): void {
  if (!map.getLayer(SELECTED_LAYER)) return;
  map.setFilter(SELECTED_LAYER, ['==', ['get', 'link_id'], linkId ?? -1]);
}

export function setLinkLayersVisible(map: MLMap, visible: boolean): void {
  const v = visible ? 'visible' : 'none';
  for (const id of [LINE_LAYER, CASING_LAYER, SELECTED_LAYER]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
  }
}

export function removeLinkLayers(map: MLMap): void {
  for (const id of [SELECTED_LAYER, LINE_LAYER, CASING_LAYER]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(LINK_SOURCE)) map.removeSource(LINK_SOURCE);
}

/**
 * 시간 인덱스의 속도를 feature-state로 반영.
 * 직전 값과 같은 링크는 건너뛰어 setFeatureState 호출을 줄인다.
 */
export class LinkTrafficPainter {
  private last: Float32Array; // 링크별 마지막 속도(km/h, 정수) (-1 = nodata, -2 = 초기)

  constructor(
    private map: MLMap,
    private traffic: LinkTraffic,
  ) {
    this.last = new Float32Array(traffic.linkIds.length).fill(-2);
  }

  apply(tIndex: number): void {
    const { linkIds, speeds, vols, noData, times, hours } = this.traffic;
    const L = linkIds.length;
    if (tIndex < 0 || tIndex >= times.length) return;

    const hour = Math.floor(times[tIndex] / 3600);
    const hi = hours.indexOf(hour);
    const rowS = tIndex * L;
    const rowV = hi * L;

    for (let i = 0; i < L; i++) {
      const sp = speeds[rowS + i];
      const vol = hi >= 0 ? vols[rowV + i] : 0;
      // 1 km/h 단위로 반올림해서 같은 값이면 setFeatureState를 건너뛴다
      const spd = sp === noData || vol === 0 ? -1 : Math.round(sp);
      if (spd === this.last[i]) continue;
      this.last[i] = spd;

      const ref = { source: LINK_SOURCE, id: linkIds[i] };
      if (spd < 0) this.map.setFeatureState(ref, { nodata: true, speed: 999 });
      else this.map.setFeatureState(ref, { nodata: false, speed: spd });
    }
  }

  /** 스타일이 다시 로드되면 feature-state도 초기화되므로 전부 다시 칠한다 */
  reset(): void {
    this.last.fill(-2);
  }
}
