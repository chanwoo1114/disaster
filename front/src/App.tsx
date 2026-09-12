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
import { createSession, deleteSession, fetchAdmZones, fetchDestZones, fetchLinkTraffic, fetchOriginZones, fetchPathDests, fetchShelters, fetchShelterStatus, fetchVehicleFrames, fetchVehicleInfo, fetchZoneEvac, fetchZonePath, fetchZonePopulation, listSessions, prepareScenario } from './api/client';
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
import { ADM_RADIUS_KM, damagePolygonOf, removeEvacZones, updateEvacZones } from './map/evacZones';
import { ADM_FILL_LAYER, clearAdmEvacRates, removeAdmZones, setAdmEvacRates, setAdmNeutral, setSelectedAdm, updateAdmZones } from './map/admZones';
import {
  ORIGIN_QUERY_LAYERS,
  addOriginZones,
  removeOriginZones,
  setOriginActive,
  setSelectedOrigin,
} from './map/originZones';
import {
  DEST_QUERY_LAYERS,
  addDestZones,
  removeDestZones,
  setDestActive,
  setSelectedDest,
} from './map/destZones';
import PathPanel from './map/PathPanel';
import {
  ETC_QUERY_LAYER,
  addEtcFacilityLayer,
  buildEtcGeoJSON,
  removeEtcFacilityLayer,
  setEtcFacilityRates,
  setEtcFacilityVisible,
} from './map/etcFacilities';
import { addShelterLayers, removeShelterLayers, setShelterLayersVisible, setShelterRates } from './map/shelters';
import { removeZonePaths, updateZonePaths } from './map/zonePaths';
import { isDarkBasemap, type Basemap } from './map/vworldStyle';
import type {
  AdmZones,
  DisasterType,
  LinkProps,
  LinkTraffic,
  LngLat,
  Location,
  Phase,
  ScenarioSummary,
  Selection,
  SessionInfo,
  ShelterCollection,
  ShelterRate,
  ShelterStatus,
  Target,
  VehicleFrames,
  VehicleInfoMap,
  ZoneEvac,
  ZonePopulation,
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
  const [savedSessions, setSavedSessions] = useState<SessionInfo[]>([]);

  const [basemap, setBasemap] = useState<Basemap>('light');
  const [styleVersion, setStyleVersion] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const [scenario, setScenario] = useState<string | null>(null);
  const [scenSummary, setScenSummary] = useState<ScenarioSummary | null>(null);
  const [preparing, setPreparing] = useState(false);

  const [traffic, setTraffic] = useState<LinkTraffic | null>(null);
  const [vehicles, setVehicles] = useState<VehicleFrames | null>(null);
  const [vehInfo, setVehInfo] = useState<VehicleInfoMap>({});
  const [shelters, setShelters] = useState<ShelterCollection | null>(null);
  const [shelterStatus, setShelterStatus] = useState<ShelterStatus | null>(null);
  const [admZones, setAdmZones] = useState<AdmZones | null>(null);
  const [zoneEvac, setZoneEvac] = useState<ZoneEvac | null>(null);
  const [zonePop, setZonePop] = useState<ZonePopulation | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // 최초 진입 시 소통정보만 켠다. 새 레이어는 무조건 false로 시작 — docs/FRONTEND_DISPLAY_RULES.md
  const [showTraffic, setShowTraffic] = useState(true);
  const [showVehicles, setShowVehicles] = useState(false);
  const [showShelters, setShowShelters] = useState(false);
  const [showZoneEvac, setShowZoneEvac] = useState(false);
  const [showEtcFacilities, setShowEtcFacilities] = useState(false);
  const [showZonePath, setShowZonePath] = useState(false); // 경로 분석 모드
  const [originZones, setOriginZones] = useState<import('geojson').FeatureCollection | null>(null);
  const [pathOrigin, setPathOrigin] = useState<string | null>(null);
  const [pathDests, setPathDests] = useState<import('./types').PathDest[] | null>(null);
  const [pathDestsLoading, setPathDestsLoading] = useState(false);
  const [pathDz, setPathDz] = useState<number | null>(null);
  const [destZones, setDestZones] = useState<import('geojson').FeatureCollection | null>(null);
  /** 지도 클릭이 어느 슬롯으로 가는지. 출발지를 고르면 자동으로 도착지로 넘어간다 */
  const [pathTarget, setPathTarget] = useState<'origin' | 'dest'>('origin');
  /** 지도 색칠 기준 — exit: 구역 이탈률(상주), shelter: 구호소 도착률 */
  const [zoneMetric, setZoneMetric] = useState<'exit' | 'shelter'>('exit');
  const [selection, setSelection] = useState<Selection | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const painterRef = useRef<LinkTrafficPainter | null>(null);
  const indexRef = useRef(0);

  // 타임라인 축: 소통정보 > 차량 스냅샷 > 대피율 시점 순으로 사용
  const playTimes = traffic?.times ?? vehicles?.times ?? shelterStatus?.times ?? null;
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
  // 대피율/특수시설/경로 토글이 켜져 있으면 행정동 클릭을 링크보다 우선한다
  const admPriorityRef = useRef(false);
  admPriorityRef.current = showZoneEvac || showEtcFacilities || showZonePath;
  // 경로 분석 모드: 행정동 클릭 = 출발지 선택
  const pathModeRef = useRef(false);
  pathModeRef.current = showZonePath;
  const pathTargetRef = useRef<'origin' | 'dest'>('origin');
  pathTargetRef.current = pathTarget;

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

    // 경로 분석 모드: 활성 슬롯(출발지/도착지)에 해당하는 레이어만 잡는다
    if (map && pathModeRef.current) {
      const toDest = pathTargetRef.current === 'dest';
      const layers = (toDest ? DEST_QUERY_LAYERS : ORIGIN_QUERY_LAYERS).filter((id) => map.getLayer(id));
      if (layers.length) {
        // 점은 작아서 정확히 누르기 어려우므로 약간의 여유를 준다
        const bbox: [PointLike, PointLike] = [
          [e.x - 6, e.y - 6],
          [e.x + 6, e.y + 6],
        ];
        const feats = map.queryRenderedFeatures(bbox, { layers });
        // 점이 면 위에 있으므로 점을 우선 선택
        const f = feats.find((ft) => ft.properties?.kind !== 'adm') ?? feats[0];
        if (f?.properties?.code != null) {
          setSelection(null);
          if (toDest) setPathDz(Number(f.properties.code));
          else setPathOrigin(String(f.properties.code));
          return;
        }
      }
    }

    // 특수시설 점은 항상 우선 (작아서 정확히 눌러야 하므로)
    if (map && map.getLayer(ETC_QUERY_LAYER)) {
      const bbox: [PointLike, PointLike] = [
        [e.x - 6, e.y - 6],
        [e.x + 6, e.y + 6],
      ];
      const feats = map.queryRenderedFeatures(bbox, { layers: [ETC_QUERY_LAYER] });
      const f = feats[0];
      if (f?.properties?.id != null) {
        setSelection({
          kind: 'adm',
          code: String(f.properties.id),
          name: String(f.properties.name ?? ''),
        });
        return;
      }
    }

    const pickLink = (): boolean => {
      if (!map || !trafficRef.current || !showTrafficRef.current) return false;
      const bbox: [PointLike, PointLike] = [
        [e.x - 5, e.y - 5],
        [e.x + 5, e.y + 5],
      ];
      const layers = LINK_QUERY_LAYERS.filter((id) => map.getLayer(id));
      if (!layers.length) return false;
      const feats = map.queryRenderedFeatures(bbox, { layers });
      const f = feats.find((ft) => ft.properties && ft.properties.link_id != null);
      if (f) {
        setSelection({ kind: 'link', linkId: Number(f.properties!.link_id) });
        return true;
      }
      return false;
    };

    // 대피율/특수시설 모드가 아닐 때만 링크를 먼저 잡는다
    if (!admPriorityRef.current && pickLink()) return;

    // 행정동 폴리곤 (배경 레이어라 어디를 눌러도 잡힌다)
    if (map && map.getLayer(ADM_FILL_LAYER)) {
      const feats = map.queryRenderedFeatures([e.x, e.y] as PointLike, { layers: [ADM_FILL_LAYER] });
      const f = feats[0];
      if (f?.properties?.code != null) {
        const code = String(f.properties.code);
        // 경로 분석 모드에서 여기까지 왔으면 출발지가 아닌 행정동 → 무시
        if (pathModeRef.current) return;
        setSelection({ kind: 'adm', code, name: String(f.properties.name ?? '') });
        return;
      }
    }

    // adm 우선 모드에서 행정동이 안 잡혔으면 링크라도 시도
    if (admPriorityRef.current && pickLink()) return;

    setSelection(null);
  }, []);

  // 시나리오 전환/해제 시 표출 상태 초기화
  const resetScenarioData = useCallback(() => {
    overlayRef.current?.setProps({ layers: [] });
    setSelection(null);
    setTraffic(null);
    setVehicles(null);
    setVehInfo({});
    setShelters(null);
    setShelterStatus(null);
    setScenSummary(null);
    setAdmZones(null);
    setZoneEvac(null);
    setZonePop(null);
    // useState 초기값과 반드시 같게 유지 — 소통정보만 켠다 (docs/FRONTEND_DISPLAY_RULES.md)
    setShowTraffic(true);
    setShowVehicles(false);
    setShowShelters(false);
    setShowZoneEvac(false);
    setShowEtcFacilities(false);
    setShowZonePath(false);
    setOriginZones(null);
    setPathOrigin(null);
    setPathDests(null);
    setPathDz(null);
    setZoneMetric('exit');
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
    if (scenSummary.shelters) {
      tasks.push(fetchShelters(session.sessionId, scenario, controller.signal).then(setShelters));
      tasks.push(fetchShelterStatus(session.sessionId, scenario, controller.signal).then(setShelterStatus));
    }
    // 행정동 클릭 카드용 존별 대피율 — 없으면 null (관용적 fetch)
    tasks.push(fetchZoneEvac(session.sessionId, scenario, controller.signal).then(setZoneEvac));
    // 존별 인구·이동 요약 (세션 공통) — 한 번만 받으면 됨
    if (!zonePop) {
      tasks.push(fetchZonePopulation(session.sessionId, controller.signal).then(setZonePop));
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

  // ── 대피소 포인트 레이어 (배경 교체 시 styleVersion으로 다시 얹는다) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!shelters) {
      removeShelterLayers(map);
      return;
    }
    addShelterLayers(map, shelters);
    setShelterLayersVisible(map, showShelters);
    return () => {
      if (map.getStyle()) removeShelterLayers(map);
    };
    // showShelters는 아래 토글 effect에서 반영하므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelters, mapReady, styleVersion]);

  // 대피소 표시 토글
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !shelters) return;
    setShelterLayersVisible(map, showShelters);
  }, [showShelters, shelters, mapReady, styleVersion]);

  // 현재 재생 시각의 대피소 대피율 스냅샷 (ShelterID → rate)
  const currentShelterRates = useMemo(() => {
    const m = new Map<number, ShelterRate>();
    if (!shelterStatus) return m;
    const now = playTimes?.[playback.index] ?? -Infinity;
    // 현재 시각 이하의 마지막 시점 인덱스 (없으면 -1 = 아직 대피 전)
    let idx = -1;
    for (let i = 0; i < shelterStatus.times.length; i++) {
      if (shelterStatus.times[i] <= now) idx = i;
      else break;
    }
    for (const [id, s] of Object.entries(shelterStatus.shelters)) {
      m.set(Number(id), {
        cap: s.cap,
        assign: s.assign,
        arrival: idx >= 0 ? s.arrival[idx] : 0,
        pct: idx >= 0 ? s.pct[idx] : 0,
      });
    }
    return m;
  }, [shelterStatus, playTimes, playback.index]);

  // 대피율 스냅샷 → 마커 색·팝업 반영
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !shelters) return;
    setShelterRates(map, currentShelterRates);
  }, [currentShelterRates, shelters, mapReady, styleVersion]);

  // ── 원자력 대피 권역: 원 4개(5/30/45/50km) 검은 선 + 풍향 반대 3섹터 피해범위 빨간 면 ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const meta = scenario && session ? session.scenarios.find((s) => s.name === scenario) : null;
    // 경로 분석 모드에서는 대피 권역(원·쐐기·피해범위)을 전부 숨긴다
    if (showZonePath || phase !== 'ready' || session?.disasterType !== 'nuclear' || !target || !meta) {
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
  }, [phase, session, scenario, target, showZonePath, mapReady, styleVersion]);

  // ── 행정동 경계: 토글 없이 항상 맨 아래에 깔리는 필수 레이어 ──
  useEffect(() => {
    if (admZones || !session || !target || phase !== 'ready') return;

    const meta = scenario ? session.scenarios.find((s) => s.name === scenario) : null;
    // 지도에 그려진 것과 같은 피해범위 폴리곤을 그대로 보내 hit 판정을 맡긴다
    const damage =
      session.disasterType === 'nuclear' && meta
        ? damagePolygonOf({
            lng: target.lng,
            lat: target.lat,
            windDirection: meta.args?.windDirection ?? null,
            windSpeedCode: meta.args?.windSpeed ?? null,
          })
        : null;

    const ctrl = new AbortController();
    fetchAdmZones(session.sessionId, target.lng, target.lat, ADM_RADIUS_KM, damage, ctrl.signal)
      .then(setAdmZones)
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : '행정동을 불러오지 못했습니다');
          });

    return () => ctrl.abort();
  }, [admZones, session, scenario, target, phase]);

  // 행정동 레이어 (배경 교체 시 styleVersion으로 다시 얹는다)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!admZones) {
      removeAdmZones(map);
      return;
    }
    updateAdmZones(map, admZones);
    return () => {
      if (map.getStyle()) removeAdmZones(map);
    };
  }, [admZones, mapReady, styleVersion]);

  // 선택된 링크 강조
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !traffic) return;
    setSelectedLink(map, selection?.kind === 'link' ? selection.linkId : null);
  }, [selection, traffic, mapReady, styleVersion]);

  // 선택된 행정동 강조
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !admZones) return;
    setSelectedAdm(map, selection?.kind === 'adm' ? selection.code : null);
  }, [selection, admZones, mapReady, styleVersion]);

  // ── 경로 분석 모드: 선택 가능한 출발지 행정동 GeoJSON 로드 ────────────
  useEffect(() => {
    if (!session || !showZonePath || originZones) return;
    const controller = new AbortController();
    fetchOriginZones(session.sessionId, controller.signal)
      .then(setOriginZones)
      .catch(() => undefined);
    return () => controller.abort();
  }, [session, showZonePath, originZones]);

  // 출발지 행정동 전용 레이어 표출 (모드 on일 때만) + 행정동 채움 중립화
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!showZonePath || !originZones) {
      removeOriginZones(map);
      if (admZones && map.getLayer(ADM_FILL_LAYER)) setAdmNeutral(map, false);
      return;
    }
    // 경로 분석: 선택 불가 행정동 = 회색, 출발지 = 보라(origin-zones), 경계 흰색으로 통일
    if (admZones && map.getLayer(ADM_FILL_LAYER)) setAdmNeutral(map, true);
    addOriginZones(map, originZones);
    setSelectedOrigin(map, pathOrigin);
    return () => {
      if (map.getStyle()) {
        removeOriginZones(map);
        if (admZones && map.getLayer(ADM_FILL_LAYER)) setAdmNeutral(map, false);
      }
    };
    // pathOrigin 강조는 아래 별도 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showZonePath, originZones, admZones, mapReady, styleVersion]);

  // 선택된 출발지 강조 (카메라 이동 없음)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showZonePath || !originZones) return;
    setSelectedOrigin(map, pathOrigin);
    setOriginActive(map, pathTarget === 'origin');
  }, [pathOrigin, pathTarget, showZonePath, originZones, mapReady, styleVersion]);

  // 출발지 선택 → 도착지 목록 로드
  useEffect(() => {
    if (!session || !pathOrigin) {
      setPathDests(null);
      setDestZones(null);
      setPathTarget('origin');
      return;
    }
    const controller = new AbortController();
    setPathDestsLoading(true);
    setPathDz(null);
    // 출발지가 정해지면 다음에 할 일은 도착지 선택뿐이라 슬롯을 자동으로 넘긴다
    setPathTarget('dest');
    fetchPathDests(session.sessionId, pathOrigin, controller.signal)
      .then(setPathDests)
      .catch(() => setPathDests([]))
      .finally(() => setPathDestsLoading(false));
    fetchDestZones(session.sessionId, pathOrigin, controller.signal)
      .then(setDestZones)
      .catch(() => setDestZones(null));
    return () => controller.abort();
  }, [session, pathOrigin]);

  // 도착지 레이어 표출 + 선택 강조
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!showZonePath || !destZones) {
      removeDestZones(map);
      return;
    }
    addDestZones(map, destZones);
    setDestActive(map, pathTarget === 'dest');
    setSelectedDest(map, pathDz == null ? null : String(pathDz));
    return () => {
      if (map.getStyle()) removeDestZones(map);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showZonePath, destZones, mapReady, styleVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showZonePath || !destZones) return;
    setSelectedDest(map, pathDz == null ? null : String(pathDz));
    setDestActive(map, pathTarget === 'dest');
  }, [pathDz, pathTarget, showZonePath, destZones, mapReady, styleVersion]);

  // 출발지+도착지 → 그 O-D 경로 링크망 표출 (도착지까지 선택해야 표시)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !session) return;
    if (!showZonePath || !pathOrigin || pathDz == null) {
      removeZonePaths(map);
      return;
    }
    const controller = new AbortController();
    fetchZonePath(session.sessionId, pathOrigin, pathDz, controller.signal)
      .then((data) => {
        const m = mapRef.current;
        if (!m || controller.signal.aborted) return;
        if (data.features.length) updateZonePaths(m, data);
        else removeZonePaths(m);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (map.getStyle()) removeZonePaths(map);
    };
  }, [session, showZonePath, pathOrigin, pathDz, mapReady, styleVersion]);

  // 현재 시각의 행정동별 상주 대피율 (코로플레스용)
  const currentZoneRates = useMemo(() => {
    const m = new Map<string, number>();
    if (!zoneEvac) return m;
    const now = playTimes?.[playback.index] ?? -Infinity;
    let zi = -1;
    for (let i = 0; i < zoneEvac.times.length; i++) {
      if (zoneEvac.times[i] <= now) zi = i;
      else break;
    }
    for (const [code, z] of Object.entries(zoneEvac.zones)) {
      const series = zoneMetric === 'shelter' ? z.shelterPct : z.permPct;
      m.set(code, zi >= 0 ? series[zi] : 0);
    }
    return m;
  }, [zoneEvac, playTimes, playback.index, zoneMetric]);

  // 대피율 → 행정동 색 반영 (토글 on일 때만, 재생에 따라 흰색 → 파랑으로 채워진다)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !admZones) return;
    if (!showZoneEvac || currentZoneRates.size === 0) {
      clearAdmEvacRates(map);
      return;
    }
    setAdmEvacRates(map, currentZoneRates);
  }, [currentZoneRates, admZones, showZoneEvac, mapReady, styleVersion]);

  // 특수시설 점 대피율 색 (별도 토글)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !etcGeo || !showEtcFacilities) return;
    setEtcFacilityRates(map, currentZoneRates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentZoneRates, showEtcFacilities, mapReady, styleVersion]);

  // 특수시설(학교 등) 점 레이어 — 행정동 대피율 토글과 함께 표시
  const etcGeo = useMemo(() => (zoneEvac ? buildEtcGeoJSON(zoneEvac) : null), [zoneEvac]);

  // 출발지 드롭다운 옵션 (이름 정렬)
  const originOptions = useMemo(() => {
    if (!originZones) return [];
    return originZones.features
      .map((f) => ({
        code: String(f.properties?.code),
        name: String(f.properties?.name ?? ''),
        kind: f.properties?.kind === 'facility' ? ('facility' as const) : ('adm' as const),
        facilityType: String(f.properties?.facilityType ?? ''),
      }))
      // 행정동 먼저, 그 안에서 이름순
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, 'ko') : a.kind === 'adm' ? -1 : 1));
  }, [originZones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!etcGeo) {
      removeEtcFacilityLayer(map);
      return;
    }
    addEtcFacilityLayer(map, etcGeo);
    setEtcFacilityVisible(map, showEtcFacilities);
    return () => {
      if (map.getStyle()) removeEtcFacilityLayer(map);
    };
    // showEtcFacilities는 아래 토글 effect에서 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etcGeo, mapReady, styleVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !etcGeo) return;
    setEtcFacilityVisible(map, showEtcFacilities);
  }, [showEtcFacilities, etcGeo, mapReady, styleVersion]);

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

  // 설정 화면일 때 기존 세션 목록을 불러온다 (재업로드 없이 이어보기)
  const refreshSessions = useCallback(() => {
    listSessions()
      .then(setSavedSessions)
      .catch(() => setSavedSessions([]));
  }, []);

  useEffect(() => {
    if (phase === 'setup') refreshSessions();
  }, [phase, refreshSessions]);

  // 기존 세션을 그대로 이어본다 — 업로드 단계를 건너뛰고 바로 ready 로
  const handleLoadSession = useCallback(
    (info: SessionInfo) => {
      resetScenarioData();
      setScenario(null);
      setFile(null);
      setDisasterType(info.disasterType);
      setTarget({ lng: info.lng, lat: info.lat, source: 'manual' });
      setSession(info);
      setError(null);
      setPhase('ready');
    },
    [resetScenarioData],
  );

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

  // 세션은 서버에 남긴다(이어보기용). 로컬 상태만 초기화하고 설정 화면으로.
  const handleReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;

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

  // 목록에서 기존 세션 삭제 (서버 폴더까지 제거)
  const handleDeleteSession = useCallback(
    (id: string) => {
      void deleteSession(id)
        .catch(() => undefined)
        .finally(refreshSessions);
      setSavedSessions((prev) => prev.filter((s) => s.sessionId !== id));
    },
    [refreshSessions],
  );

  // ── 선택 정보 카드 데이터 ─────────────────────────────────────────────
  const timeSec = playTimes?.[playback.index] ?? 0;
  let cardData: SelectionCardData | null = null;
  if (selection?.kind === 'vehicle' && vehicles) {
    const row =
      currentVehicleFrame >= 0 ? findVehicleRow(vehicles, currentVehicleFrame, selection.vehId) : -1;
    cardData = {
      kind: 'vehicle',
      vehId: selection.vehId,
      aux: vehInfo[String(selection.vehId)] ?? null,
      present: row >= 0,
      occupancy: row >= 0 ? vehicles.occupancy[row] : null,
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
  } else if (selection?.kind === 'adm') {
    const z = zoneEvac?.zones[selection.code] ?? null;
    // 현재 시각 이하의 마지막 시점 (없으면 아직 대피 전 = 0)
    let zi = -1;
    if (zoneEvac && z) {
      for (let i = 0; i < zoneEvac.times.length; i++) {
        if (zoneEvac.times[i] <= timeSec) zi = i;
        else break;
      }
    }
    cardData = {
      kind: 'adm',
      code: selection.code,
      name: selection.name,
      timeSec,
      facility: zoneEvac?.etc?.[selection.code]?.type ?? null,
      pop: zonePop?.zones[selection.code] ?? null,
      hasData: !!z,
      area: z?.area ?? null,
      perm: z?.perm ?? null,
      temp: z?.temp ?? null,
      permPct: z ? (zi >= 0 ? z.permPct[zi] : 0) : null,
      tempPct: z ? (zi >= 0 ? z.tempPct[zi] : 0) : null,
      shelterPct: z ? (zi >= 0 ? z.shelterPct[zi] : 0) : null,
      shelterArr: z ? (zi >= 0 ? z.shelterArr[zi] : 0) : null,
      permByArea: z?.permByArea
        ? {
            PAZ: zi >= 0 ? z.permByArea.PAZ[zi] : 0,
            UPZW: zi >= 0 ? z.permByArea.UPZW[zi] : 0,
            UPZ: zi >= 0 ? z.permByArea.UPZ[zi] : 0,
          }
        : null,
      tempByArea: z?.tempByArea
        ? {
            PAZ: zi >= 0 ? z.tempByArea.PAZ[zi] : 0,
            UPZW: zi >= 0 ? z.tempByArea.UPZW[zi] : 0,
            UPZ: zi >= 0 ? z.tempByArea.UPZ[zi] : 0,
          }
        : null,
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
        disasterType={session?.disasterType ?? disasterType}
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
        showShelters={showShelters}
        onToggleTraffic={() => setShowTraffic((v) => !v)}
        onToggleVehicles={() => setShowVehicles((v) => !v)}
        onToggleShelters={() => setShowShelters((v) => !v)}
        showZoneEvac={showZoneEvac}
        zoneEvacDetail={
          zoneEvac
            ? `행정동 ${Object.keys(zoneEvac.zones).length}곳 · ${zoneEvac.times.length}개 시점`
            : null
        }
        onToggleZoneEvac={() => setShowZoneEvac((v) => !v)}
        zoneMetric={zoneMetric}
        onZoneMetric={setZoneMetric}
        showEtcFacilities={showEtcFacilities}
        etcDetail={
          etcGeo
            ? `${etcGeo.features.length}곳 (학교 등)`
            : null
        }
        onToggleEtcFacilities={() => setShowEtcFacilities((v) => !v)}
        showZonePath={showZonePath}
        onToggleZonePath={() =>
          setShowZonePath((v) => {
            if (v) {
              // 끄면 경로 선택 상태 초기화
              setPathOrigin(null);
              setPathDests(null);
              setPathDz(null);
              setDestZones(null);
              setPathTarget('origin');
            }
            return !v;
          })
        }
        onStart={handleStart}
        onReset={handleReset}
        savedSessions={savedSessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="pointer-events-none absolute bottom-32 right-4 top-4 flex flex-col items-end gap-2 overflow-y-auto [&>*]:pointer-events-auto [&>*]:shrink-0">
        <BasemapSwitcher value={basemap} onChange={setBasemap} />
        {showZonePath && (
          <PathPanel
            origins={originOptions}
            selectedOrigin={pathOrigin}
            onSelectOrigin={setPathOrigin}
            dests={pathDests}
            loading={pathDestsLoading}
            selectedDz={pathDz}
            onSelectDest={setPathDz}
            target={pathTarget}
            onTarget={setPathTarget}
          />
        )}
        {cardData && <SelectionCard data={cardData} onClose={() => setSelection(null)} />}
        <Legend
          showTraffic={!!traffic && showTraffic}
          showShelters={!!shelters && showShelters}
          showAdm={!!admZones}
          showEvacRate={!!admZones && !!zoneEvac && showZoneEvac}
          evacMetricLabel={zoneMetric === 'shelter' ? '구호소 도착률' : '구역 이탈률'}
          showEtc={!!etcGeo && showEtcFacilities}
          showZonePath={showZonePath}
        />
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
