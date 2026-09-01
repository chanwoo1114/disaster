import { useEffect, useRef } from 'react';
import maplibregl, { type IControl, type Map as MLMap, Marker } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { buildStyle, type Basemap } from './vworldStyle';
import { DEFAULT_CENTER, DEFAULT_ZOOM, VWORLD_API_KEY } from '../config';
import { createRadiationMarkerElement } from './radiationIcon';
import type { DisasterType, LngLat, Target } from '../types';

interface Props {
  basemap: Basemap;
  target: Target | null;
  /** 원자력이면 대상지 마커를 방사능 표지로 바꾼다 */
  disasterType: DisasterType | null;
  pickMode: boolean;
  onPick: (p: LngLat) => void;
  /** 대상지 선택 모드가 아닐 때의 일반 클릭 (화면 픽셀 좌표 포함) */
  onMapClick?: (e: { x: number; y: number } & LngLat) => void;
  /** 지도·deck.gl 오버레이가 준비되면 호출. 이후 단계에서 레이어를 꽂는 진입점 */
  onReady?: (map: MLMap, overlay: MapboxOverlay) => void;
  /** 배경지도 교체로 스타일이 다시 로드됐을 때. 사용자 레이어를 다시 얹어야 한다 */
  onStyleReload?: () => void;
}

/**
 * MapLibre 지도 컨테이너.
 * React 렌더 트리 밖에서 imperative하게 동작하며, props 변화는 effect로만 반영한다.
 */
export default function MapView({
  basemap,
  target,
  disasterType,
  pickMode,
  onPick,
  onMapClick,
  onReady,
  onStyleReload,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // 마커 종류가 바뀌면 다시 만들어야 해서 현재 종류를 들고 있는다
  const markerKindRef = useRef<'nuclear' | 'default' | null>(null);
  const basemapRef = useRef(basemap);

  // 콜백/모드는 ref로 들고 있어 클릭 핸들러를 다시 바인딩하지 않는다
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pickModeRef = useRef(pickMode);
  pickModeRef.current = pickMode;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onStyleReloadRef = useRef(onStyleReload);
  onStyleReloadRef.current = onStyleReload;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(VWORLD_API_KEY, basemapRef.current),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay as unknown as IControl);

    map.on('click', (e) => {
      if (pickModeRef.current) {
        onPickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        return;
      }
      onMapClickRef.current?.({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.once('load', () => onReadyRef.current?.(map, overlay));

    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 배경지도 교체 — setStyle은 모든 소스/레이어를 날리므로 완료 후 상위에 알린다
  useEffect(() => {
    const map = mapRef.current;
    if (!map || basemapRef.current === basemap) return;
    basemapRef.current = basemap;
    map.once('style.load', () => onStyleReloadRef.current?.());
    map.setStyle(buildStyle(VWORLD_API_KEY, basemap));
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = pickMode ? 'crosshair' : '';
  }, [pickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!target) {
      markerRef.current?.remove();
      markerRef.current = null;
      markerKindRef.current = null;
      return;
    }

    const kind = disasterType === 'nuclear' ? 'nuclear' : 'default';
    if (markerRef.current && markerKindRef.current !== kind) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker(
        kind === 'nuclear'
          ? { element: createRadiationMarkerElement() }
          : { color: '#ef4444' },
      )
        .setLngLat([target.lng, target.lat])
        .addTo(map);
      markerKindRef.current = kind;
    } else {
      markerRef.current.setLngLat([target.lng, target.lat]);
    }

    // 목록에서 골랐을 때만 카메라 이동. 지도 클릭은 사용자가 이미 보고 있는 곳이므로 유지
    if (target.source === 'list') {
      map.flyTo({ center: [target.lng, target.lat], zoom: 12, duration: 1200, essential: true });
    }
  }, [target, disasterType]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
