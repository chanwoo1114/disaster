import type { RasterSourceSpecification, StyleSpecification } from 'maplibre-gl';

/** 앱 레벨 배경지도 종류. 키 유무에 따라 실제 타일 소스가 달라진다 */
export type Basemap = 'light' | 'dark' | 'normal' | 'satellite';

export const BASEMAP_OPTIONS: { key: Basemap; label: string }[] = [
  { key: 'light', label: '밝음' },
  { key: 'dark', label: '어두움' },
  { key: 'normal', label: '일반' },
  { key: 'satellite', label: '위성' },
];

export function isDarkBasemap(b: Basemap): boolean {
  return b === 'dark' || b === 'satellite';
}

const VWORLD_WMTS = 'https://api.vworld.kr/req/wmts/1.0.0';

function raster(tiles: string[], attribution: string, maxzoom = 19): RasterSourceSpecification {
  return { type: 'raster', tiles, tileSize: 256, maxzoom, attribution };
}

function vworld(key: string, layer: string, ext: 'png' | 'jpeg'): RasterSourceSpecification {
  return raster([`${VWORLD_WMTS}/${key}/${layer}/{z}/{y}/{x}.${ext}`], '© VWorld');
}

function carto(theme: 'light_all' | 'dark_all'): RasterSourceSpecification {
  return raster(
    ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}.png`),
    '© OpenStreetMap contributors © CARTO',
  );
}

function osm(): RasterSourceSpecification {
  return raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], '© OpenStreetMap contributors');
}

function esriImagery(): RasterSourceSpecification {
  return raster(
    ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    'Tiles © Esri',
    18,
  );
}

/**
 * 배경지도 스타일 생성.
 * VWorld 키가 있으면 gray / midnight / Base / Satellite+Hybrid,
 * 없으면 CARTO light / CARTO dark / OSM / Esri 위성으로 대체.
 */
export function buildStyle(key: string | null, basemap: Basemap): StyleSpecification {
  const sources: StyleSpecification['sources'] = {};
  const layers: StyleSpecification['layers'] = [];

  const add = (id: string, src: RasterSourceSpecification, opacity = 1) => {
    sources[id] = src;
    layers.push({ id, type: 'raster', source: id, paint: { 'raster-opacity': opacity } });
  };

  if (key) {
    switch (basemap) {
      case 'light':
        add('base', vworld(key, 'white', 'png'));
        break;
      case 'dark':
        add('base', vworld(key, 'midnight', 'png'));
        break;
      case 'normal':
        add('base', vworld(key, 'Base', 'png'));
        break;
      case 'satellite':
        add('base', vworld(key, 'Satellite', 'jpeg'));
        add('label', vworld(key, 'Hybrid', 'png'));
        break;
    }
  } else {
    switch (basemap) {
      case 'light':
        add('base', carto('light_all'));
        break;
      case 'dark':
        add('base', carto('dark_all'));
        break;
      case 'normal':
        add('base', osm(), 0.85);
        break;
      case 'satellite':
        add('base', esriImagery());
        break;
    }
  }

  return { version: 8, sources, layers };
}
