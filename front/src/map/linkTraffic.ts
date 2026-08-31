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

/** 3단계 분류 (속도 / 자유속도). 범례와 지도 색이 이 표 하나로 결정된다 */
export const TRAFFIC_CLASSES = [
  { label: '원활', range: '70% 이상', min: 0.7, color: TRAFFIC_COLORS.free },
  { label: '서행', range: '40–70%', min: 0.4, color: TRAFFIC_COLORS.slow },
  { label: '정체', range: '40% 미만', min: 0, color: TRAFFIC_COLORS.jam },
];

function colorExpression() {
  // step: 기준값 오름차순으로 나열해야 하므로 정체 → 원활 순
  const asc = [...TRAFFIC_CLASSES].sort((a, b) => a.min - b.min);
  const steps: (string | number)[] = [asc[0].color];
  for (const c of asc.slice(1)) steps.push(c.min, c.color);
  return [
    'case',
    ['boolean', ['feature-state', 'nodata'], true],
    TRAFFIC_COLORS.nodata,
    ['step', ['coalesce', ['feature-state', 'ratio'], 1], ...steps],
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
  private last: Float32Array; // 링크별 마지막 ratio (-1 = nodata, -2 = 초기)

  constructor(
    private map: MLMap,
    private traffic: LinkTraffic,
  ) {
    this.last = new Float32Array(traffic.linkIds.length).fill(-2);
  }

  apply(tIndex: number): void {
    const { linkIds, speeds, vols, fspeed, noData, times, hours } = this.traffic;
    const L = linkIds.length;
    if (tIndex < 0 || tIndex >= times.length) return;

    const hour = Math.floor(times[tIndex] / 3600);
    const hi = hours.indexOf(hour);
    const rowS = tIndex * L;
    const rowV = hi * L;

    for (let i = 0; i < L; i++) {
      const sp = speeds[rowS + i];
      const vol = hi >= 0 ? vols[rowV + i] : 0;
      let ratio: number;
      if (sp === noData || vol === 0) {
        ratio = -1;
      } else {
        const fs = fspeed[i] || sp || 1;
        ratio = Math.min(1, sp / fs);
        ratio = Math.round(ratio * 100) / 100;
      }
      if (ratio === this.last[i]) continue;
      this.last[i] = ratio;

      const ref = { source: LINK_SOURCE, id: linkIds[i] };
      if (ratio < 0) this.map.setFeatureState(ref, { nodata: true, ratio: 1 });
      else this.map.setFeatureState(ref, { nodata: false, ratio });
    }
  }

  /** 스타일이 다시 로드되면 feature-state도 초기화되므로 전부 다시 칠한다 */
  reset(): void {
    this.last.fill(-2);
  }
}
