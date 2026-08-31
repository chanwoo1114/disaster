import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, PointLike } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import { Loader2 } from 'lucide-react';
import MapView from './map/MapView';
import BasemapSwitcher from './map/BasemapSwitcher';
import Legend from './map/Legend';
import SelectionCard, { type SelectionCardData } from './map/SelectionCard';
import SetupPanel from './setup/SetupPanel';
import Timeline, { formatClock } from './playback/Timeline';
import { usePlayback } from './playback/usePlayback';
import { createSession, deleteSession, fetchLinkTraffic, fetchVehicleFrames, fetchVehicleInfo, prepareScenario } from './api/client';
import { uploadZipInChunks } from './upload/chunkUpload';
import {
  LINK_QUERY_LAYERS,
  LinkTrafficPainter,
  addLinkLayers,
  removeLinkLayers,
  setLinkLayersVisible,
  setSelectedLink,
} from './map/linkTraffic';
import {
  VEHICLE_LAYER_ID,
  buildSelectionRing,
  buildVehicleLayer,
  findVehicleRow,
} from './map/vehicleLayer';
import { removeEvacZones, updateEvacZones } from './map/evacZones';
import { isDarkBasemap, type Basemap } from './map/vworldStyle';
import type {
  DisasterType,
  LinkProps,
  LinkTraffic,
  LngLat,
  Location,
  Phase,
  ScenarioSummary,
  Selection,
  SessionInfo,
  Target,
  VehicleFrames,
  VehicleInfoMap,
} from './types';

export default function App() {
  const [disasterType, setDisasterType] = useState<DisasterType | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  const [basemap, setBasemap] = useState<Basemap>('light');
  const [styleVersion, setStyleVersion] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const [scenario, setScenario] = useState<string | null>(null);
  const [scenSummary, setScenSummary] = useState<ScenarioSummary | null>(null);
  const [preparing, setPreparing] = useState(false);

  const [traffic, setTraffic] = useState<LinkTraffic | null>(null);
  const [vehicles, setVehicles] = useState<VehicleFrames | null>(null);
  const [vehInfo, setVehInfo] = useState<VehicleInfoMap>({});
  const [dataLoading, setDataLoading] = useState(false);

  // 처음에는 소통정보만 켜고 나머지는 사용자가 토글로 켠다
  const [showTraffic, setShowTraffic] = useState(true);
  const [showVehicles, setShowVehicles] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const painterRef = useRef<LinkTrafficPainter | null>(null);
  const indexRef = useRef(0);

  // 타임라인 축: 소통정보가 있으면 그것, 없으면 차량 스냅샷 시각
  const playTimes = traffic?.times ?? vehicles?.times ?? null;
  const playback = usePlayback(playTimes?.length ?? 0);
  indexRef.current = playback.index;

  const vehTimeIndex = useMemo(() => {
    const m = new Map<number, number>();
    vehicles?.times.forEach((t, i) => m.set(t, i));
    return m;
  }, [vehicles]);

  const currentVehicleFrame = useMemo(() => {
    if (!vehicles || !playTimes) return -1;
    return vehTimeIndex.get(playTimes[playback.index]) ?? -1;
  }, [vehicles, playTimes, playback.index, vehTimeIndex]);

  const currentVehicleCount = useMemo(() => {
    if (!vehicles || currentVehicleFrame < 0 || !showVehicles) return null;
    return vehicles.offsets[currentVehicleFrame + 1] - vehicles.offsets[currentVehicleFrame];
  }, [vehicles, currentVehicleFrame, showVehicles]);

  // 클릭 선택용 조회 테이블
  const linkPropsMap = useMemo(() => {
    const m = new Map<number, LinkProps>();
    traffic?.geojson.features.forEach((f) => m.set(f.properties.link_id, f.properties));
    return m;
  }, [traffic]);

  const linkIndexMap = useMemo(() => {
    const m = new Map<number, number>();
    traffic?.linkIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [traffic]);

  // 클릭 핸들러에서 최신 상태를 참조하기 위한 미러
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const trafficRef = useRef(traffic);
  trafficRef.current = traffic;
  const showTrafficRef = useRef(showTraffic);
  showTrafficRef.current = showTraffic;
  const showVehiclesRef = useRef(showVehicles);
  showVehiclesRef.current = showVehicles;
  const frameRef = useRef(currentVehicleFrame);
  frameRef.current = currentVehicleFrame;

  const handleMapReady = useCallback((map: MLMap, overlay: MapboxOverlay) => {
    mapRef.current = map;
    overlayRef.current = overlay;
    setMapReady(true);
  }, []);

  const handleStyleReload = useCallback(() => setStyleVersion((v) => v + 1), []);

  // ── 지도 클릭 → 차량 우선, 다음 링크 선택 ─────────────────────────────
  const handleMapClick = useCallback((e: { x: number; y: number } & LngLat) => {
    const overlay = overlayRef.current;
    const map = mapRef.current;

    const frames = vehiclesRef.current;
    if (overlay && frames && showVehiclesRef.current && frameRef.current >= 0) {
      const info = overlay.pickObject({ x: e.x, y: e.y, radius: 10, layerIds: [VEHICLE_LAYER_ID] });
      if (info && info.index >= 0) {
        const row = frames.offsets[frameRef.current] + info.index;
        setSelection({ kind: 'vehicle', vehId: frames.ids[row] });
        return;
      }
    }

    if (map && trafficRef.current && showTrafficRef.current) {
      const bbox: [PointLike, PointLike] = [
        [e.x - 5, e.y - 5],
        [e.x + 5, e.y + 5],
      ];
      const layers = LINK_QUERY_LAYERS.filter((id) => map.getLayer(id));
      if (layers.length) {
        const feats = map.queryRenderedFeatures(bbox, { layers });
        const f = feats.find((ft) => ft.properties && ft.properties.link_id != null);
        if (f) {
          setSelection({ kind: 'link', linkId: Number(f.properties!.link_id) });
          return;
        }
      }
    }

    setSelection(null);
  }, []);

  // 시나리오 전환/해제 시 표출 상태 초기화
  const resetScenarioData = useCallback(() => {
    overlayRef.current?.setProps({ layers: [] });
    setSelection(null);
    setTraffic(null);
    setVehicles(null);
    setVehInfo({});
    setScenSummary(null);
    setShowTraffic(true);
    setShowVehicles(false);
  }, []);

  // 대상지는 사용자가 처음 지정한 위치를 그대로 유지한다 (자동 이동 없음)
  const handleSelectScenario = useCallback(
    (name: string | null) => {
      resetScenarioData();
      setScenario(name);
    },
    [resetScenarioData],
  );

  // 시나리오가 하나뿐이면 자동 선택
  useEffect(() => {
    if (session && session.scenarios.length === 1) {
      handleSelectScenario(session.scenarios[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── 시나리오 선택 → 산출물 준비(prepare) ──────────────────────────────
  useEffect(() => {
    if (!session || !scenario) return;
    const controller = new AbortController();
    setPreparing(true);
    setError(null);
    prepareScenario(session.sessionId, scenario, controller.signal)
      .then(setScenSummary)
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : '시나리오 준비에 실패했습니다');
        setScenario(null);
      })
      .finally(() => setPreparing(false));
    return () => controller.abort();
  }, [session, scenario]);

  // ── 준비 완료 → 데이터 로드 ───────────────────────────────────────────
  useEffect(() => {
    if (!session || !scenario || !scenSummary) return;
    const controller = new AbortController();
    const tasks: Promise<unknown>[] = [];
    if (scenSummary.linkTraffic) {
      tasks.push(fetchLinkTraffic(session.sessionId, scenario, controller.signal).then(setTraffic));
    }
    if (scenSummary.vehiclePositions) {
      tasks.push(fetchVehicleFrames(session.sessionId, scenario, controller.signal).then(setVehicles));
      tasks.push(fetchVehicleInfo(session.sessionId, scenario, controller.signal).then(setVehInfo));
    }
    if (!tasks.length) return;

    setDataLoading(true);
    Promise.all(tasks)
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : '표출 데이터를 불러오지 못했습니다');
      })
      .finally(() => setDataLoading(false));
    return () => controller.abort();
  }, [session, scenario, scenSummary]);

  // ── 소통정보 → 지도 레이어 (배경 교체 시 styleVersion으로 다시 얹는다) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!traffic) {
      removeLinkLayers(map);
      painterRef.current = null;
      return;
    }

    addLinkLayers(map, traffic.geojson, isDarkBasemap(basemap));
    const painter = new LinkTrafficPainter(map, traffic);
    painterRef.current = painter;
    painter.apply(indexRef.current);

    return () => {
      if (map.getStyle()) removeLinkLayers(map);
      painterRef.current = null;
    };
    // basemap은 styleVersion을 통해 반영되므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traffic, mapReady, styleVersion]);

  // 소통정보 표시 토글
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !traffic) return;
    setLinkLayersVisible(map, showTraffic);
  }, [showTraffic, traffic, mapReady, styleVersion]);

  // ── 원자력 대피 권역: 원 4개(5/30/45/50km) 검은 선 + 풍향 반대 3섹터 피해범위 빨간 면 ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const meta = scenario && session ? session.scenarios.find((s) => s.name === scenario) : null;
    if (phase !== 'ready' || session?.disasterType !== 'nuclear' || !target || !meta) {
      if (map.getStyle()) removeEvacZones(map);
      return;
    }

    updateEvacZones(map, {
      lng: target.lng,
      lat: target.lat,
      windDirection: meta.args?.windDirection ?? null,
      windSpeedCode: meta.args?.windSpeed ?? null,
    });

    return () => {
      if (map.getStyle()) removeEvacZones(map);
    };
  }, [phase, session, scenario, target, mapReady, styleVersion]);

  // 선택된 링크 강조
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !traffic) return;
    setSelectedLink(map, selection?.kind === 'link' ? selection.linkId : null);
  }, [selection, traffic, mapReady, styleVersion]);

  // 처음 데이터를 받았을 때 카메라를 범위로
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !traffic) return;
    const [minX, minY, maxX, maxY] = traffic.bounds;
    map.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: { top: 60, bottom: 140, left: 400, right: 240 }, duration: 1200, maxZoom: 14 },
    );
  }, [traffic, mapReady]);

  // ── 재생 인덱스 → 소통 색 갱신 ────────────────────────────────────────
  useEffect(() => {
    painterRef.current?.apply(playback.index);
  }, [playback.index]);

  // ── 재생 인덱스/선택 → 차량 레이어 갱신 ───────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !mapReady) return;

    const layers = [];
    if (vehicles && showVehicles && currentVehicleFrame >= 0) {
      const iconLayer = buildVehicleLayer(vehicles, currentVehicleFrame);
      if (iconLayer) layers.push(iconLayer);
      if (selection?.kind === 'vehicle') {
        const row = findVehicleRow(vehicles, currentVehicleFrame, selection.vehId);
        const ring = buildSelectionRing(vehicles, row);
        if (ring) layers.push(ring);
      }
    }
    overlay.setProps({ layers });
  }, [vehicles, showVehicles, currentVehicleFrame, mapReady, selection]);

  // ── 설정 핸들러 ──────────────────────────────────────────────────────
  const handleDisasterType = (t: DisasterType) => {
    if (t === disasterType) return;
    setDisasterType(t);
    setTarget(null);
    setPickMode(false);
    setError(null);
  };

  const handleSelectLocation = (loc: Location) => {
    setTarget({ lng: loc.lng, lat: loc.lat, name: loc.name, source: 'list' });
    setPickMode(false);
    setError(null);
  };

  const handlePick = useCallback((p: LngLat) => {
    setTarget({ ...p, source: 'map' });
    setPickMode(false);
    setError(null);
  }, []);

  const handleManualCoord = (p: LngLat) => {
    setTarget({ ...p, source: 'manual' });
    setError(null);
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    setError(null);
  };

  const handleStart = async () => {
    if (!disasterType || !target || !file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setProgress(0);
    setPhase('uploading');

    try {
      const uploadId = await uploadZipInChunks(file, setProgress, controller.signal);
      if (controller.signal.aborted) return;

      setPhase('processing');
      const info = await createSession({ uploadId, disasterType, lng: target.lng, lat: target.lat });
      if (controller.signal.aborted) {
        void deleteSession(info.sessionId).catch(() => undefined);
        return;
      }

      setSession(info);
      setPhase('ready');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다');
      setPhase('setup');
    } finally {
      abortRef.current = null;
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (session) void deleteSession(session.sessionId).catch(() => undefined);

    playback.reset();
    resetScenarioData();
    setScenario(null);
    setSession(null);
    setFile(null);
    setTarget(null);
    setDisasterType(null);
    setPickMode(false);
    setProgress(0);
    setError(null);
    setPhase('setup');
  };

  // ── 선택 정보 카드 데이터 ─────────────────────────────────────────────
  const timeSec = playTimes?.[playback.index] ?? 0;
  let cardData: SelectionCardData | null = null;
  if (selection?.kind === 'vehicle' && vehicles) {
    const row =
      currentVehicleFrame >= 0 ? findVehicleRow(vehicles, currentVehicleFrame, selection.vehId) : -1;
    cardData = {
      kind: 'vehicle',
      vehId: selection.vehId,
      timeSec,
      aux: vehInfo[String(selection.vehId)] ?? null,
      present: row >= 0,
      occupancy: row >= 0 ? vehicles.occupancy[row] : null,
      direction: row >= 0 ? vehicles.directions[row] : null,
      lng: row >= 0 ? vehicles.positions[row * 2] : null,
      lat: row >= 0 ? vehicles.positions[row * 2 + 1] : null,
    };
  } else if (selection?.kind === 'link' && traffic) {
    const props = linkPropsMap.get(selection.linkId);
    const li = linkIndexMap.get(selection.linkId);
    let speed: number | null = null;
    let fspeed: number | null = null;
    let vol: number | null = null;
    if (li !== undefined) {
      const L = traffic.linkIds.length;
      const sp = traffic.speeds[playback.index * L + li];
      const hi = traffic.hours.indexOf(Math.floor(timeSec / 3600));
      vol = hi >= 0 ? traffic.vols[hi * L + li] : 0;
      speed = sp === traffic.noData ? null : sp;
      fspeed = traffic.fspeed[li] || null;
    }
    cardData = {
      kind: 'link',
      linkId: selection.linkId,
      timeSec,
      name: props?.name || null,
      rank: props?.rank ?? null,
      lanes: props?.lanes ?? null,
      maxSpd: props?.max_spd ?? null,
      hasData: li !== undefined,
      speed,
      fspeed,
      vol,
    };
  }

  const vehicleInfo = !vehicles || !showVehicles
    ? null
    : currentVehicleFrame >= 0
      ? `차량 ${(currentVehicleCount ?? 0).toLocaleString()}대`
      : `차량 ${formatClock(vehicles.times[0])}부터`;

  const timelineInfo = [
    showTraffic && traffic ? `링크 ${traffic.linkIds.length.toLocaleString()}개` : null,
    vehicleInfo,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="relative h-full w-full bg-gray-100">
      <MapView
        basemap={basemap}
        target={target}
        pickMode={pickMode}
        onPick={handlePick}
        onMapClick={handleMapClick}
        onReady={handleMapReady}
        onStyleReload={handleStyleReload}
      />

      <SetupPanel
        disasterType={disasterType}
        onDisasterType={handleDisasterType}
        target={target}
        onSelectLocation={handleSelectLocation}
        pickMode={pickMode}
        onTogglePick={() => setPickMode((v) => !v)}
        onManualCoord={handleManualCoord}
        file={file}
        onFile={handleFile}
        phase={phase}
        progress={progress}
        error={error}
        session={session}
        scenario={scenario}
        onSelectScenario={handleSelectScenario}
        preparing={preparing}
        summary={scenSummary}
        showTraffic={showTraffic}
        showVehicles={showVehicles}
        onToggleTraffic={() => setShowTraffic((v) => !v)}
        onToggleVehicles={() => setShowVehicles((v) => !v)}
        onStart={handleStart}
        onReset={handleReset}
      />

      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <BasemapSwitcher value={basemap} onChange={setBasemap} />
        <Legend showTraffic={!!traffic && showTraffic} showTarget={!!target} />
        {cardData && <SelectionCard data={cardData} onClose={() => setSelection(null)} />}
      </div>

      {pickMode && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-gray-900/85 px-4 py-2 text-sm text-white shadow-lg">
          지도를 클릭해 대상지를 지정하세요
        </div>
      )}

      {dataLoading && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900/85 px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          표출 데이터 불러오는 중…
        </div>
      )}

      {playTimes && (
        <Timeline
          times={playTimes}
          index={playback.index}
          onIndexChange={playback.seek}
          playing={playback.playing}
          onTogglePlay={playback.togglePlay}
          speed={playback.speed}
          onSpeedChange={playback.setSpeed}
          info={timelineInfo}
        />
      )}
    </div>
  );
}
