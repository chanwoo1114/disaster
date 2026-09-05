import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * 경로 분석: 선택 가능한 출발지 행정동 전용 레이어.
 * 반경 무관하게 VehiclePath가 있는 행정동만 보라색으로 표출하고, 이 레이어를 클릭 대상으로 쓴다.
 */

const SOURCE = 'origin-zones';
const FILL = 'origin-zones-fill';
const LINE = 'origin-zones-line';
const COLOR = '#ea580c'; // 선택 가능 출발지 = 진한 주황 (파랑의 보색)

export const ORIGIN_QUERY_LAYER = FILL;

export function addOriginZones(map: MLMap, data: FeatureCollection): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }
  map.addSource(SOURCE, { type: 'geojson', data, promoteId: 'code' });

  // 초기: 주황 채움 + 흰색 경계 (개별 행정동이 뭉치지 않고 분리돼 보이게)
  map.addLayer({
    id: FILL,
    type: 'fill',
    source: SOURCE,
    paint: { 'fill-color': COLOR, 'fill-opacity': 0.55 },
  });
  map.addLayer({
    id: LINE,
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': '#ffffff', 'line-width': 1.4, 'line-opacity': 0.9 },
  });
}

const SELECTED_FILL = ['case', ['boolean', ['feature-state', 'selected'], false], COLOR, '#ffffff'];
// 경계: 선택된 존은 진한 주황 굵게, 나머지는 흰색으로 개별 분리
const SELECTED_LINE = ['case', ['boolean', ['feature-state', 'selected'], false], '#9a3412', '#ffffff'];
const SELECTED_WIDTH = ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.2];

let _selectedOrigin: string | null = null;

/**
 * 출발지 선택 표시.
 * - code=null: 전부 보라 (선택 가능 상태)
 * - code 지정: 그 출발지만 보라, 나머지는 흰색
 */
export function setSelectedOrigin(map: MLMap, code: string | null): void {
  if (!map.getSource(SOURCE) || !map.getLayer(FILL)) return;
  if (_selectedOrigin) map.setFeatureState({ source: SOURCE, id: _selectedOrigin }, { selected: false });
  _selectedOrigin = code;

  if (code) {
    map.setFeatureState({ source: SOURCE, id: code }, { selected: true });
    map.setPaintProperty(FILL, 'fill-color', SELECTED_FILL as never);
    map.setPaintProperty(FILL, 'fill-opacity', 0.4);
    map.setPaintProperty(LINE, 'line-color', SELECTED_LINE as never);
    map.setPaintProperty(LINE, 'line-width', SELECTED_WIDTH as never);
  } else {
    map.setPaintProperty(FILL, 'fill-color', COLOR);
    map.setPaintProperty(FILL, 'fill-opacity', 0.55);
    map.setPaintProperty(LINE, 'line-color', '#ffffff');
    map.setPaintProperty(LINE, 'line-width', 1.4);
  }
}

export function removeOriginZones(map: MLMap): void {
  _selectedOrigin = null;
  for (const id of [LINE, FILL]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
