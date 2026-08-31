import { BACKEND_URL } from '../config';
import type {
  DisasterType,
  LinkTraffic,
  LinkTrafficSummary,
  ScenarioMeta,
  ScenarioSummary,
  SessionInfo,
  ShelterCollection,
  ShelterStatus,
  ShelterSummary,
  VehicleFrames,
  VehicleInfoMap,
  VehiclePositionsSummary,
} from '../types';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, '서버에 연결할 수 없습니다');
  }
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (body?.message) message = body.message;
    } catch {
      // 본문 없음
    }
    throw new ApiError(res.status, message);
  }
  return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await rawFetch(path, init);
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.success) throw new ApiError(res.status, body.message);
  return body.data as T;
}

function json(data: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

// ── 업로드 ────────────────────────────────────────────────────────────────

interface UploadInitRes {
  upload_id: string;
}

export function initUpload(fileName: string, totalChunks: number, totalSize: number) {
  return request<UploadInitRes>(
    '/upload/init',
    json({ file_name: fileName, total_chunks: totalChunks, total_size: totalSize }),
  );
}

export function uploadChunk(
  uploadId: string,
  index: number,
  chunk: Blob,
  fileName: string,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', chunk, fileName);
  const qs = new URLSearchParams({ upload_id: uploadId, chunk_index: String(index) });
  return request<unknown>(`/upload/chunk?${qs}`, { method: 'POST', body: form, signal });
}

// ── 세션 ──────────────────────────────────────────────────────────────────

interface LinkTrafficSummaryRes {
  radius_km: number;
  network_count: number;
  link_count: number;
  unmatched_count: number;
  hours: number[];
}

interface VehiclePositionsSummaryRes {
  frame_count: number;
  max_vehicles: number;
  first_time: number;
  last_time: number;
}

interface ShelterSummaryRes {
  count: number;
}

interface ScenarioArgsRes {
  season: number | null;
  day: number | null;
  hour: number | null;
  weather: number | null;
  wind_direction: number | null;
  wind_speed: number | null;
}

interface ScenarioRefRes {
  name: string;
  path: string;
  args: ScenarioArgsRes | null;
  center: { lng: number; lat: number } | null;
}

interface SessionRes {
  session_id: string;
  disaster_type: DisasterType;
  lng: number;
  lat: number;
  file_count: number;
  scenarios: ScenarioRefRes[];
  created_at: string;
  expires_at: string;
}

function toScenario(s: ScenarioRefRes): ScenarioMeta {
  return {
    name: s.name,
    args: s.args
      ? {
          season: s.args.season ?? null,
          day: s.args.day ?? null,
          hour: s.args.hour ?? null,
          weather: s.args.weather ?? null,
          windDirection: s.args.wind_direction ?? null,
          windSpeed: s.args.wind_speed ?? null,
        }
      : null,
    center: s.center ?? null,
  };
}

function toVehicleSummary(r: VehiclePositionsSummaryRes | null): VehiclePositionsSummary | null {
  if (!r) return null;
  return {
    frameCount: r.frame_count,
    maxVehicles: r.max_vehicles,
    firstTime: r.first_time,
    lastTime: r.last_time,
  };
}

function toSummary(r: LinkTrafficSummaryRes | null): LinkTrafficSummary | null {
  if (!r) return null;
  return {
    radiusKm: r.radius_km,
    networkCount: r.network_count,
    linkCount: r.link_count,
    unmatchedCount: r.unmatched_count,
    hours: r.hours,
  };
}

function toShelterSummary(r: ShelterSummaryRes | null): ShelterSummary | null {
  if (!r) return null;
  return { count: r.count };
}

function toSession(r: SessionRes): SessionInfo {
  return {
    sessionId: r.session_id,
    disasterType: r.disaster_type,
    lng: r.lng,
    lat: r.lat,
    fileCount: r.file_count,
    scenarios: r.scenarios.map(toScenario),
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  };
}

/** 만료되지 않은 기존 세션 목록 (최근순). 재업로드 없이 이어보기용 */
export async function listSessions(): Promise<SessionInfo[]> {
  const r = await request<SessionRes[]>('/session', { method: 'GET' });
  return r.map(toSession);
}

/** 시나리오 산출물 준비 — 없으면 서버가 생성 (수 초~수십 초) */
export async function prepareScenario(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<ScenarioSummary> {
  const r = await request<{
    link_traffic: LinkTrafficSummaryRes | null;
    vehicle_positions: VehiclePositionsSummaryRes | null;
    shelters: ShelterSummaryRes | null;
  }>(`/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/prepare`, {
    method: 'POST',
    signal,
  });
  return {
    linkTraffic: toSummary(r.link_traffic),
    vehiclePositions: toVehicleSummary(r.vehicle_positions),
    shelters: toShelterSummary(r.shelters),
  };
}

/** 대피소 포인트 GeoJSON. 없으면 null */
export async function fetchShelters(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<ShelterCollection | null> {
  try {
    const res = await rawFetch(
      `/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/file/shelters.geojson`,
      { signal },
    );
    return (await res.json()) as ShelterCollection;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return null;
  }
}

/** 대피소 대피율 시계열. 없으면(예: 데이터 없는 시나리오) null */
export async function fetchShelterStatus(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<ShelterStatus | null> {
  try {
    const res = await rawFetch(
      `/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/file/shelter-status.json`,
      { signal },
    );
    return (await res.json()) as ShelterStatus;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return null;
  }
}

export async function createSession(params: {
  uploadId: string;
  disasterType: DisasterType;
  lng: number;
  lat: number;
}): Promise<SessionInfo> {
  const r = await request<SessionRes>(
    '/session',
    json({
      upload_id: params.uploadId,
      disaster_type: params.disasterType,
      lng: params.lng,
      lat: params.lat,
    }),
  );
  return toSession(r);
}

export function deleteSession(sessionId: string) {
  return request<unknown>(`/session/${sessionId}`, { method: 'DELETE' });
}

// ── 링크 소통정보 ─────────────────────────────────────────────────────────

interface LinkTrafficMetaRes {
  hours: number[];
  times: number[];
  slot_seconds: number;
  radius_km: number;
  network_count: number;
  link_count: number;
  unmatched_count: number;
  link_ids: number[];
  fspeed: number[];
  bounds: [number, number, number, number];
  no_data: number;
}

/** 메타 + GeoJSON + 속도/교통량 바이너리를 한 번에 받아 typed array로 조립 */
export async function fetchLinkTraffic(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<LinkTraffic> {
  const base = `/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/file`;
  const [meta, geojson, speedsBuf, volsBuf] = await Promise.all([
    rawFetch(`${base}/link-traffic.json`, { signal }).then((r) => r.json() as Promise<LinkTrafficMetaRes>),
    rawFetch(`${base}/links.geojson`, { signal }).then((r) => r.json() as Promise<LinkTraffic['geojson']>),
    rawFetch(`${base}/link-speeds.bin`, { signal }).then((r) => r.arrayBuffer()),
    rawFetch(`${base}/link-vols.bin`, { signal }).then((r) => r.arrayBuffer()),
  ]);

  const L = meta.link_ids.length;
  const T = meta.times.length;
  const H = meta.hours.length;
  const speeds = new Uint8Array(speedsBuf);
  const vols = new Uint16Array(volsBuf);
  if (speeds.length !== T * L || vols.length !== H * L) {
    throw new ApiError(500, '링크 소통정보 데이터 크기가 맞지 않습니다');
  }

  return {
    times: meta.times,
    hours: meta.hours,
    slotSeconds: meta.slot_seconds,
    radiusKm: meta.radius_km,
    networkCount: meta.network_count,
    linkIds: meta.link_ids,
    fspeed: Uint8Array.from(meta.fspeed),
    speeds,
    vols,
    noData: meta.no_data,
    bounds: meta.bounds,
    geojson,
  };
}

// ── 차량 위치 ─────────────────────────────────────────────────────────────

interface VehicleMetaRes {
  version?: number;
  times: number[];
  offsets: number[];
  total: number;
}

/** 메타 + 바이너리를 받아 프레임별 subarray로 쓸 수 있는 typed array 묶음으로 조립 */
export async function fetchVehicleFrames(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<VehicleFrames> {
  const base = `/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/file`;
  const [meta, buf] = await Promise.all([
    rawFetch(`${base}/vehicle-positions.json`, { signal }).then((r) => r.json() as Promise<VehicleMetaRes>),
    rawFetch(`${base}/vehicle-positions.bin`, { signal }).then((r) => r.arrayBuffer()),
  ]);

  const N = meta.total;
  // v2 레이아웃: pos f32×2N + dir f32×N + veh_id u32×N + occ u16×N
  const expected = N * 8 + N * 4 + N * 4 + N * 2;
  if ((meta.version ?? 1) < 2 || buf.byteLength < expected) {
    throw new ApiError(500, '차량 데이터 형식이 예전 버전입니다. 새로 시작 후 다시 업로드해 주세요');
  }

  const positions = new Float32Array(buf, 0, N * 2);
  const directions = new Float32Array(buf, N * 8, N);
  const ids = new Uint32Array(buf, N * 12, N);
  const occupancy = new Uint16Array(buf, N * 16, N);
  const angles = new Float32Array(N);
  for (let i = 0; i < N; i++) angles[i] = -directions[i]; // 방위각(CW) → deck.gl 회전각(CCW)

  return {
    times: meta.times,
    offsets: meta.offsets,
    total: N,
    positions,
    angles,
    directions,
    ids,
    occupancy,
  };
}

/** 차량 연계 정보(출발/승차 기록). 없으면 빈 객체 */
export async function fetchVehicleInfo(
  sessionId: string,
  scenario: string,
  signal?: AbortSignal,
): Promise<VehicleInfoMap> {
  try {
    const res = await rawFetch(
      `/session/${sessionId}/scenario/${encodeURIComponent(scenario)}/file/vehicle-info.json`,
      { signal },
    );
    return (await res.json()) as VehicleInfoMap;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return {};
  }
}
