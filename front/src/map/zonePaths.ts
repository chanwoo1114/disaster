import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { ZonePaths } from '../types';

/**
 * 클릭한 존의 대피 경로 링크망.
 * 두께는 통행량(count) 절대 기준의 고정 스케일 — 출발지/도착지를 바꿔도
 * 같은 통행량이면 같은 두께로 보이도록 (O-D별 정규화 금지).
 * 링크·차량보다 위, 카드 선택 링크(하늘색)와 구분되는 보라색.
 */

const SOURCE = 'zone-paths';
const LINE = 'zone-paths-line';
const COLOR = '#111827'; // 경로 = 거의 검정 (배경 파랑·주황과 구분)

// 통행량 → 굵기 배율 (절대 기준, 1회 통행 기준선 ~ 500회 이상 최대)
const WIDTH_BY_COUNT: unknown = [
  'interpolate',
  ['linear'],
  ['get', 'count'],
  1,
  1,
  50,
  2,
  200,
  3,
  500,
  4,
];

export function updateZonePaths(map: MLMap, data: ZonePaths): void {
  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
  } else {
    map.addSource(SOURCE, { type: 'geojson', data });
    map.addLayer({
      id: LINE,
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLOR,
        'line-opacity': 0.85,
        // 줌 배율 × 통행량 배율 (통행량은 절대 기준)
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          ['*', 0.8, WIDTH_BY_COUNT],
          14,
          ['*', 2, WIDTH_BY_COUNT],
        ] as never,
      },
    });
  }
}

export function removeZonePaths(map: MLMap): void {
  if (map.getLayer(LINE)) map.removeLayer(LINE);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}
