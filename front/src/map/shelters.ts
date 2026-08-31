import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  Map as MLMap,
} from 'maplibre-gl';
import { Popup } from 'maplibre-gl';
import type { ShelterCollection, ShelterProps, ShelterRate } from '../types';

/**
 * 대피소 표출 — 대피율(현재 시점)에 따라 색이 바뀌는 원형 마커.
 * 회색=데이터 없음, 빨강(0%)→노랑(50%)→초록(100%). 클릭 시 이름·대피율 팝업.
 */

const SOURCE = 'shelters';
const CIRCLE = 'shelters-circle';

let popup: Popup | null = null;
let clickHandler: ((e: MapLayerMouseEvent) => void) | null = null;
let enterHandler: (() => void) | null = null;
let leaveHandler: (() => void) | null = null;

// 현재 시점 스냅샷 (팝업에서 참조)
let ratesById = new Map<number, ShelterRate>();
// feature-state 를 걸어둔 대피소 id (시점 전환 시 정리용)
const stated = new Set<number>();

function bar(pct: number): string {
  const w = Math.max(0, Math.min(100, pct));
  return `
    <div style="height:6px;border-radius:3px;background:#e5e7eb;overflow:hidden;margin-top:4px">
      <div style="height:100%;width:${w}%;background:#059669"></div>
    </div>`;
}

function popupHtml(p: ShelterProps): string {
  const name = p.name || `대피소 ${p.shelter_id}`;
  const rate = ratesById.get(p.shelter_id);
  const capLine = `수용 ${(p.capacity || 0).toLocaleString()}명`;

  let body = `<div style="font-size:11px;color:#4b5563">${capLine}</div>`;
  if (rate) {
    body = `
      <div style="font-size:11px;color:#4b5563">
        배정 ${rate.assign.toLocaleString()}명 · 도착 ${rate.arrival.toLocaleString()}명
      </div>
      <div style="font-size:12px;font-weight:600;color:#065f46;margin-top:2px">
        대피율 ${rate.pct.toFixed(1)}%
      </div>
      ${bar(rate.pct)}`;
  }
  return `
    <div style="font-family:system-ui,sans-serif;min-width:150px">
      <div style="font-weight:600;font-size:13px;color:#065f46;margin-bottom:2px">${name}</div>
      ${body}
      <div style="font-size:10px;color:#9ca3af;margin-top:3px">ID ${p.shelter_id}</div>
    </div>`;
}

const CIRCLE_COLOR = [
  'interpolate',
  ['linear'],
  ['coalesce', ['feature-state', 'pct'], -1],
  -1, '#9ca3af', // 데이터 없음(회색)
  0, '#ef4444', // 0% 빨강
  50, '#f59e0b', // 50% 주황
  100, '#059669', // 100% 초록
] as unknown as DataDrivenPropertyValueSpecification<string>;

export function addShelterLayers(map: MLMap, data: ShelterCollection): void {
  const existing = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(SOURCE, { type: 'geojson', data });
  map.addLayer({
    id: CIRCLE,
    type: 'circle',
    source: SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 8, 17, 11],
      'circle-color': CIRCLE_COLOR,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.95,
    },
  });

  clickHandler = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0] as MapGeoJSONFeature | undefined;
    if (!f) return;
    const p = f.properties as unknown as ShelterProps;
    popup?.remove();
    popup = new Popup({ closeButton: true, closeOnClick: true, offset: 10 })
      .setLngLat(e.lngLat)
      .setHTML(popupHtml(p))
      .addTo(map);
  };
  enterHandler = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  leaveHandler = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('click', CIRCLE, clickHandler);
  map.on('mouseenter', CIRCLE, enterHandler);
  map.on('mouseleave', CIRCLE, leaveHandler);
}

/** 현재 시점의 대피율 스냅샷을 마커 색(feature-state)과 팝업에 반영 */
export function setShelterRates(map: MLMap, rates: Map<number, ShelterRate>): void {
  if (!map.getSource(SOURCE)) return;
  ratesById = rates;

  // 이전 시점에만 있던 대피소는 상태 해제
  for (const id of stated) {
    if (!rates.has(id)) {
      map.setFeatureState({ source: SOURCE, id }, { pct: null });
      stated.delete(id);
    }
  }
  rates.forEach((r, id) => {
    map.setFeatureState({ source: SOURCE, id }, { pct: r.pct });
    stated.add(id);
  });
}

export function setShelterLayersVisible(map: MLMap, visible: boolean): void {
  if (map.getLayer(CIRCLE)) {
    map.setLayoutProperty(CIRCLE, 'visibility', visible ? 'visible' : 'none');
  }
  if (!visible) popup?.remove();
}

export function removeShelterLayers(map: MLMap): void {
  popup?.remove();
  popup = null;
  ratesById = new Map();
  stated.clear();
  if (clickHandler) map.off('click', CIRCLE, clickHandler);
  if (enterHandler) map.off('mouseenter', CIRCLE, enterHandler);
  if (leaveHandler) map.off('mouseleave', CIRCLE, leaveHandler);
  clickHandler = enterHandler = leaveHandler = null;
  if (map.getLayer(CIRCLE)) map.removeLayer(CIRCLE);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
