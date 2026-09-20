import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * 경로 분석: 선택한 출발지의 도착지 레이어.
 * 도착지는 세 체계가 섞여 있다 — 행정동(폴리곤) / 대피소·노드(점).
 *
 * 출발지(주황)와 같은 화면에 겹치므로 색을 청록으로 분리한다.
 *
 * 후보 행정동은 반드시 채운다. 예전엔 테두리만 그렸는데(채움 0.01), 그러면 배경의
 * 선택 불가 행정동(파랑 0.45)이 그대로 비쳐서 후보와 비후보가 같은 색으로 보였다.
 * 1px 청록 경계는 그 위 흰색 행정동 경계(1.2px)에 묻혀 구분이 안 됐다.
 */

const SOURCE = 'dest-zones';
const FILL = 'dest-zones-fill';
const LINE = 'dest-zones-line';
const POINT = 'dest-zones-point';
const COLOR = '#0d9488'; // 도착지 = 청록 (출발지 주황 · 경로 검정과 구분)

const IS_ADM = ['==', ['get', 'kind'], 'adm'];
const IS_POINT = ['!=', ['get', 'kind'], 'adm'];
const SELECTED = ['boolean', ['feature-state', 'selected'], false];

/** 클릭 대상 — 점을 먼저 잡아야 폴리곤에 가려지지 않는다 */
export const DEST_QUERY_LAYERS = [POINT, FILL];

export function addDestZones(map: MLMap, data: FeatureCollection): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }
  map.addSource(SOURCE, { type: 'geojson', data, promoteId: 'code' });

  // 후보도 채운다 — 배경(파랑)과 색이 갈려야 어디를 누를 수 있는지 보인다
  map.addLayer({
    id: FILL,
    type: 'fill',
    source: SOURCE,
    filter: IS_ADM as never,
    paint: {
      'fill-color': COLOR,
      'fill-opacity': ['case', SELECTED, 0.55, 0.3] as never,
    },
  });
  map.addLayer({
    id: LINE,
    type: 'line',
    source: SOURCE,
    filter: IS_ADM as never,
    paint: {
      'line-color': COLOR,
      'line-width': ['case', SELECTED, 3, 1.6] as never,
      'line-opacity': ['case', SELECTED, 1, 0.85] as never,
    },
  });
  map.addLayer({
    id: POINT,
    type: 'circle',
    source: SOURCE,
    filter: IS_POINT as never,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        9,
        ['case', SELECTED, 7, 3.5],
        14,
        ['case', SELECTED, 12, 7],
      ] as never,
      'circle-color': COLOR,
      'circle-opacity': ['case', SELECTED, 1, 0.75] as never,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['case', SELECTED, 2.5, 1.2] as never,
    },
  });
}

let _selected: string | null = null;

/** 선택된 도착지 강조. code=null 이면 해제 */
export function setSelectedDest(map: MLMap, code: string | null): void {
  if (!map.getSource(SOURCE)) return;
  if (_selected) map.setFeatureState({ source: SOURCE, id: _selected }, { selected: false });
  _selected = code;
  if (code) map.setFeatureState({ source: SOURCE, id: code }, { selected: true });
}

/** 도착지 지정 모드가 아닐 때는 후보를 흐리게 (지도가 덜 시끄럽게) */
export function setDestActive(map: MLMap, active: boolean): void {
  if (!map.getLayer(LINE)) return;
  map.setPaintProperty(FILL, 'fill-opacity', ['case', SELECTED, 0.55, active ? 0.3 : 0.08] as never);
  map.setPaintProperty(LINE, 'line-opacity', ['case', SELECTED, 1, active ? 0.85 : 0.25] as never);
  map.setPaintProperty(POINT, 'circle-opacity', ['case', SELECTED, 1, active ? 0.75 : 0.3] as never);
}

export function removeDestZones(map: MLMap): void {
  _selected = null;
  for (const id of [POINT, LINE, FILL]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
