import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * 경로 분석: 선택 가능한 출발지 전용 레이어.
 * 반경 무관하게 VehiclePath 가 있는 존만 표출하고, 이 레이어를 클릭 대상으로 쓴다.
 * 행정동(kind=adm)은 폴리곤, 특수시설(kind=facility, 학교·병원·요양원)은 점이라
 * 한 소스를 kind 로 갈라 채움/점 레이어로 나눠 그린다.
 */

const SOURCE = 'origin-zones';
const FILL = 'origin-zones-fill';
const LINE = 'origin-zones-line';
const POINT = 'origin-zones-point';
const COLOR = '#ea580c'; // 선택 가능 출발지 = 진한 주황 (파랑의 보색)

const IS_ADM = ['==', ['get', 'kind'], 'adm'];
const IS_FACILITY = ['==', ['get', 'kind'], 'facility'];

/** 클릭 대상 레이어 — 점을 먼저 잡아야 폴리곤에 가려지지 않는다 */
export const ORIGIN_QUERY_LAYERS = [POINT, FILL];
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
    filter: IS_ADM as never,
    paint: { 'fill-color': COLOR, 'fill-opacity': 0.55 },
  });
  map.addLayer({
    id: LINE,
    type: 'line',
    source: SOURCE,
    filter: IS_ADM as never,
    paint: { 'line-color': '#ffffff', 'line-width': 1.4, 'line-opacity': 0.9 },
  });
  // 특수시설: 행정동 위에 얹히는 점 (작아서 흰 테두리로 배경과 분리)
  map.addLayer({
    id: POINT,
    type: 'circle',
    source: SOURCE,
    filter: IS_FACILITY as never,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 14, 8] as never,
      'circle-color': COLOR,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.6,
    },
  });
}

const SELECTED = ['boolean', ['feature-state', 'selected'], false];

let _selectedOrigin: string | null = null;
let _active = true; // 출발지 슬롯이 지도 클릭 대상인가

/**
 * 선택 상태·활성 슬롯을 한 번에 칠한다.
 * - 선택된 출발지는 어느 슬롯이 활성이든 진하게 유지한다 (도착지를 고르는 동안에도
 *   출발지가 어디였는지 보여야 한다).
 * - 후보는 도착지 지정 중일 때만 흐려진다.
 */
function applyPaint(map: MLMap): void {
  if (!map.getLayer(FILL)) return;
  const hasSel = _selectedOrigin != null;
  const candFill = hasSel ? (_active ? 0.22 : 0.1) : _active ? 0.55 : 0.25;
  const candLine = hasSel ? (_active ? 0.7 : 0.35) : _active ? 0.9 : 0.4;

  map.setPaintProperty(FILL, 'fill-color', COLOR);
  map.setPaintProperty(FILL, 'fill-opacity', ['case', SELECTED, 0.62, candFill] as never);
  map.setPaintProperty(LINE, 'line-color', ['case', SELECTED, '#7c2d12', '#ffffff'] as never);
  map.setPaintProperty(LINE, 'line-width', ['case', SELECTED, 3.5, 1.2] as never);
  map.setPaintProperty(LINE, 'line-opacity', ['case', SELECTED, 1, candLine] as never);
  map.setPaintProperty(POINT, 'circle-opacity', ['case', SELECTED, 1, candFill + 0.3] as never);
  map.setPaintProperty(POINT, 'circle-stroke-color', ['case', SELECTED, '#7c2d12', '#ffffff'] as never);
  map.setPaintProperty(POINT, 'circle-stroke-width', ['case', SELECTED, 3, 1.6] as never);
  map.setPaintProperty(
    POINT,
    'circle-radius',
    ['interpolate', ['linear'], ['zoom'], 9, ['case', SELECTED, 7, 4], 14, ['case', SELECTED, 12, 8]] as never,
  );
}

/** 출발지 선택 표시. code=null 이면 해제 */
export function setSelectedOrigin(map: MLMap, code: string | null): void {
  if (!map.getSource(SOURCE) || !map.getLayer(FILL)) return;
  if (_selectedOrigin) map.setFeatureState({ source: SOURCE, id: _selectedOrigin }, { selected: false });
  _selectedOrigin = code;
  if (code) map.setFeatureState({ source: SOURCE, id: code }, { selected: true });
  applyPaint(map);
}

/** 출발지 슬롯이 클릭 대상인지 — 아니면 후보를 흐리게 해서 도착지에 집중시킨다 */
export function setOriginActive(map: MLMap, active: boolean): void {
  _active = active;
  applyPaint(map);
}

export function removeOriginZones(map: MLMap): void {
  _selectedOrigin = null;
  _active = true;
  for (const id of [POINT, LINE, FILL]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
