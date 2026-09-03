import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { ADM_EVAC_COLORS } from './admZones';
import type { ZoneEvac } from '../types';

/**
 * 특수시설(학교 등) 대피율 점 표출
 * - EvacuationRateByZone 의 8자리 미만 ZoneID = special_facility 시설
 * - 행정동 대피율 토글(showZoneEvac)과 함께 켜지고, 같은 색 척도(흰→파랑)로
 *   시간에 따라 대피율이 변한다. feature-state evacPct 사용.
 */

const SOURCE = 'etc-facilities';
const CIRCLE = 'etc-facility-circle';

export const ETC_QUERY_LAYER = CIRCLE;

export function buildEtcGeoJSON(zoneEvac: ZoneEvac): FeatureCollection | null {
  const etc = zoneEvac.etc;
  if (!etc || Object.keys(etc).length === 0) return null;
  return {
    type: 'FeatureCollection',
    features: Object.entries(etc).map(([id, f]) => ({
      type: 'Feature',
      properties: { id, name: f.name, ftype: f.type },
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
    })),
  };
}

export function addEtcFacilityLayer(map: MLMap, data: FeatureCollection): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }

  map.addSource(SOURCE, { type: 'geojson', data, promoteId: 'id' });

  map.addLayer({
    id: CIRCLE,
    type: 'circle',
    source: SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7, 15, 10],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['coalesce', ['feature-state', 'evacPct'], 0],
        0, ADM_EVAC_COLORS.low,
        50, ADM_EVAC_COLORS.mid,
        100, ADM_EVAC_COLORS.high,
      ],
      'circle-stroke-color': '#1e3a8a',
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.95,
    },
  });
}

export function setEtcFacilityVisible(map: MLMap, visible: boolean): void {
  if (map.getLayer(CIRCLE)) {
    map.setLayoutProperty(CIRCLE, 'visibility', visible ? 'visible' : 'none');
  }
}

export function setEtcFacilityRates(map: MLMap, rates: ReadonlyMap<string, number>): void {
  if (!map.getSource(SOURCE)) return;
  for (const [id, pct] of rates) {
    map.setFeatureState({ source: SOURCE, id }, { evacPct: pct });
  }
}

export function removeEtcFacilityLayer(map: MLMap): void {
  if (map.getLayer(CIRCLE)) map.removeLayer(CIRCLE);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
