import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * 행정동(읍면동) 경계 표출
 * - 기본: 흰색 반투명 면 + 검은 실선
 * - 피해범위(PAZ 5km + 풍향 섹터)에 걸치는 행정동: 빨간 반투명 면
 * - 클릭 선택된 행정동: 파란 굵은 외곽선 (결과데이터 카드와 연동)
 *
 * hit 판정은 백엔드가 한다. 지도에 그려진 빨간 피해범위 폴리곤(evacZones)을 그대로
 * 보내서 판정하므로 면과 행정동 색이 어긋나지 않는다.
 *
 * 토글이 없는 필수 배경 레이어라 항상 맨 아래에 깔린다 — docs/FRONTEND_DISPLAY_RULES.md
 */

const SOURCE = 'adm-zones';
const FILL = 'adm-fill';
const LINE = 'adm-line';
const SELECTED = 'adm-selected';
const SELECTABLE = 'adm-selectable';

/** 클릭 판정에 쓸 레이어 id */
export const ADM_FILL_LAYER = FILL;

export const ADM_COLORS = {
  base: '#ffffff',
  hit: '#dc2626',
  line: '#000000',
  selected: '#2563eb',
  selectable: '#7c3aed', // 경로 분석: 출발지로 선택 가능한 행정동
};

/** 존별 대피율(상주 %) 코로플레스 색 — 0% 흰색 → 100% 진파랑 */
export const ADM_EVAC_COLORS = {
  low: '#eff6ff',
  mid: '#60a5fa',
  high: '#1e40af',
};

export function updateAdmZones(map: MLMap, data: FeatureCollection): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }

  // code를 feature id로 승격 — 대피율 feature-state 반영용
  map.addSource(SOURCE, { type: 'geojson', data, promoteId: 'code' });

  // 가장 아래에 깐다. 피해범위(빨간 면)·링크보다 밑이어야 위 레이어가 묻히지 않는다
  const before = ['evac-damage-fill', 'links-casing'].find((id) => map.getLayer(id));

  map.addLayer(
    {
      id: FILL,
      type: 'fill',
      source: SOURCE,
      paint: {
        // 대피율(feature-state.evacPct)이 있으면 코로플레스, 없으면 hit/기본색
        'fill-color': [
          'case',
          ['>=', ['coalesce', ['feature-state', 'evacPct'], -1], 0],
          [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'evacPct'], 0],
            0, ADM_EVAC_COLORS.low,
            50, ADM_EVAC_COLORS.mid,
            100, ADM_EVAC_COLORS.high,
          ],
          ['get', 'hit'],
          ADM_COLORS.hit,
          ADM_COLORS.base,
        ],
        'fill-opacity': [
          'case',
          ['>=', ['coalesce', ['feature-state', 'evacPct'], -1], 0],
          0.55,
          ['get', 'hit'],
          0.45,
          0.3,
        ],
      },
    },
    before,
  );

  map.addLayer(
    {
      id: LINE,
      type: 'line',
      source: SOURCE,
      paint: {
        'line-color': ADM_COLORS.line,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 12, 1.8, 15, 2.6],
        'line-opacity': 0.85,
      },
    },
    before,
  );

  // 경로 분석: 출발지로 선택 가능한 행정동 강조 (보라 채움, feature-state.selectable)
  map.addLayer(
    {
      id: SELECTABLE,
      type: 'fill',
      source: SOURCE,
      filter: ['==', ['boolean', ['feature-state', 'selectable'], false], true],
      paint: { 'fill-color': ADM_COLORS.selectable, 'fill-opacity': 0.3 },
    },
    before,
  );

  // 선택 강조 — 평소엔 아무 것도 매칭하지 않는다
  map.addLayer(
    {
      id: SELECTED,
      type: 'line',
      source: SOURCE,
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'line-color': ADM_COLORS.selected,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 12, 3.5, 15, 5],
        'line-opacity': 0.95,
      },
    },
    before,
  );
}

/** 경로 분석: 출발지 선택 가능한 존들을 feature-state로 강조. codes=null 이면 전부 해제 */
export function setSelectableAdms(map: MLMap, codes: readonly string[] | null): void {
  if (!map.getSource(SOURCE)) return;
  map.removeFeatureState({ source: SOURCE }, 'selectable');
  if (codes) {
    for (const c of codes) map.setFeatureState({ source: SOURCE, id: c }, { selectable: true });
  }
}

/** 행정동별 현재 대피율(%)을 feature-state로 반영. 코로플레스 색이 이 값을 따른다 */
export function setAdmEvacRates(map: MLMap, rates: ReadonlyMap<string, number>): void {
  if (!map.getSource(SOURCE)) return;
  for (const [code, pct] of rates) {
    map.setFeatureState({ source: SOURCE, id: code }, { evacPct: pct });
  }
}

/** 대피율 색칠 해제 — 모든 feature-state 제거 (선택 강조는 filter 기반이라 영향 없음) */
export function clearAdmEvacRates(map: MLMap): void {
  if (!map.getSource(SOURCE)) return;
  map.removeFeatureState({ source: SOURCE });
}

export function setSelectedAdm(map: MLMap, code: string | null): void {
  if (!map.getLayer(SELECTED)) return;
  map.setFilter(SELECTED, ['==', ['get', 'code'], code ?? '']);
}

/**
 * 경로 분석 모드: 선택 불가능한 행정동을 중립 회색으로, 경계는 흰색으로.
 * 출발지(보라, origin-zones)와 대비되고, 경계가 흰색으로 통일돼 이중으로 보이지 않는다.
 * neutral=false 로 되돌리면 원래 hit/대피율 색·검은 경계를 복원한다.
 */
export function setAdmNeutral(map: MLMap, neutral: boolean): void {
  if (!map.getLayer(FILL)) return;
  if (neutral) {
    map.setPaintProperty(FILL, 'fill-color', '#2563eb'); // 선택 불가 = 파랑 (주황의 보색)
    map.setPaintProperty(FILL, 'fill-opacity', 0.45);
    map.setPaintProperty(LINE, 'line-color', '#ffffff');
    if (map.getLayer(SELECTED)) map.setLayoutProperty(SELECTED, 'visibility', 'none');
  } else {
    map.setPaintProperty(FILL, 'fill-color', [
      'case',
      ['>=', ['coalesce', ['feature-state', 'evacPct'], -1], 0],
      [
        'interpolate',
        ['linear'],
        ['coalesce', ['feature-state', 'evacPct'], 0],
        0, ADM_EVAC_COLORS.low,
        50, ADM_EVAC_COLORS.mid,
        100, ADM_EVAC_COLORS.high,
      ],
      ['get', 'hit'],
      ADM_COLORS.hit,
      ADM_COLORS.base,
    ] as never);
    map.setPaintProperty(FILL, 'fill-opacity', [
      'case',
      ['>=', ['coalesce', ['feature-state', 'evacPct'], -1], 0],
      0.55,
      ['get', 'hit'],
      0.45,
      0.3,
    ] as never);
    map.setPaintProperty(LINE, 'line-color', ADM_COLORS.line);
    if (map.getLayer(SELECTED)) map.setLayoutProperty(SELECTED, 'visibility', 'visible');
  }
}

export function removeAdmZones(map: MLMap): void {
  for (const id of [SELECTED, SELECTABLE, FILL, LINE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
