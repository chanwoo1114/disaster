import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * 행정동(읍면동) 경계 표출
 * - 기본: 흰색 반투명 면 + 검은 실선
 * - 피해범위(PAZ 5km + 풍향 섹터)에 걸치는 행정동: 빨간 반투명 면
 *
 * hit 판정은 백엔드가 한다. 지도에 그려진 빨간 피해범위 폴리곤(evacZones)을 그대로
 * 보내서 판정하므로 면과 행정동 색이 어긋나지 않는다.
 *
 * 토글이 없는 필수 배경 레이어라 항상 맨 아래에 깔린다 — docs/FRONTEND_DISPLAY_RULES.md
 */

const SOURCE = 'adm-zones';
const FILL = 'adm-fill';
const LINE = 'adm-line';

export const ADM_COLORS = {
  base: '#ffffff',
  hit: '#dc2626',
  line: '#000000',
};

export function updateAdmZones(map: MLMap, data: FeatureCollection): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }

  map.addSource(SOURCE, { type: 'geojson', data });

  // 가장 아래에 깐다. 피해범위(빨간 면)·링크보다 밑이어야 위 레이어가 묻히지 않는다
  const before = ['evac-damage-fill', 'links-casing'].find((id) => map.getLayer(id));

  map.addLayer(
    {
      id: FILL,
      type: 'fill',
      source: SOURCE,
      paint: {
        'fill-color': ['case', ['get', 'hit'], ADM_COLORS.hit, ADM_COLORS.base],
        'fill-opacity': ['case', ['get', 'hit'], 0.45, 0.3],
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
}

export function removeAdmZones(map: MLMap): void {
  for (const id of [FILL, LINE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
