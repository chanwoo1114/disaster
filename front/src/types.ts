import type { FeatureCollection, LineString, MultiLineString, Point } from 'geojson';

export type DisasterType = 'nuclear' | 'chemistry' | 'storm' | 'flood' | 'complex';

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Location extends LngLat {
  name: string;
}

/** 대상지. source에 따라 지도 카메라 이동 여부가 달라짐 (목록 선택 → 이동, 지도 클릭 → 유지) */
export interface Target extends LngLat {
  source: 'list' | 'map' | 'manual';
  name?: string;
}

export interface LinkTrafficSummary {
  radiusKm: number;
  networkCount: number;
  linkCount: number;
  unmatchedCount: number;
  hours: number[];
}

export interface VehiclePositionsSummary {
  frameCount: number;
  maxVehicles: number;
  firstTime: number;
  lastTime: number;
}

export interface ShelterSummary {
  count: number;
}

/** 대피소 포인트 속성 */
export interface ShelterProps {
  shelter_id: number;
  name: string;
  capacity: number;
  type: number;
}

export type ShelterCollection = FeatureCollection<Point, ShelterProps>;

/** 대피소별 대피율 시계열 (ShelterStatus.txt) */
export interface ShelterRateSeries {
  /** 수용 인원 */
  cap: number;
  /** 배정 인원 */
  assign: number;
  /** 시점별 누적 도착 인원 */
  arrival: number[];
  /** 시점별 대피율(%) */
  pct: number[];
}

export interface ShelterStatus {
  /** 시점(초) — arrival/pct 배열의 축 */
  times: number[];
  /** ShelterID(문자열) → 시계열 */
  shelters: Record<string, ShelterRateSeries>;
}

/** 특정 시점의 대피소 상태 스냅샷 (지도 색·팝업용) */
export interface ShelterRate {
  cap: number;
  assign: number;
  arrival: number;
  pct: number;
}

/** Scenario_{n}.arg 에서 읽은 설정 */
export interface ScenarioArgs {
  season: number | null;
  day: number | null;
  /** 재난 발생 시각(시) */
  hour: number | null;
  weather: number | null;
  /** 풍향 (0=무풍, 1~16 방위) */
  windDirection: number | null;
  windSpeed: number | null;
}

export interface ScenarioMeta {
  name: string;
  args: ScenarioArgs | null;
  /** 데이터에서 도출한 발원지 중심좌표 */
  center: LngLat | null;
}

export interface SessionInfo {
  sessionId: string;
  disasterType: DisasterType;
  lng: number;
  lat: number;
  fileCount: number;
  /** 발견된 시나리오 목록 (S_1, S_2 … 자연 정렬) */
  scenarios: ScenarioMeta[];
  createdAt: string;
  expiresAt: string;
}

/** 시나리오 준비(prepare) 결과 */
export interface ScenarioSummary {
  linkTraffic: LinkTrafficSummary | null;
  vehiclePositions: VehiclePositionsSummary | null;
  shelters: ShelterSummary | null;
}

/** 차량 위치 스냅샷 묶음. positions는 (lng,lat) interleave, 프레임 i = [offsets[i], offsets[i+1]) */
export interface VehicleFrames {
  times: number[];
  offsets: number[];
  total: number;
  positions: Float32Array;
  /** deck.gl getAngle용 (반시계 도 단위, = -direction) */
  angles: Float32Array;
  /** 원본 방향 (0~360, 북 기준 시계방향) */
  directions: Float32Array;
  ids: Uint32Array;
  occupancy: Uint16Array;
}

export interface LinkProps {
  link_id: number;
  /** 도로명 (없으면 빈 문자열) */
  name: string;
  rank: string;
  lanes: number;
  max_spd: number;
  /** 소통정보가 있는 링크인지 (false면 회색 배경 도로망) */
  has_data: boolean;
}

/** 차량 연계 정보 (PermanentHouseAuto / PermanentPersonAuto / BusOccupancy) */
export interface VehicleAuxInfo {
  /** 출발 시각(초) */
  start?: number;
  house?: number;
  person?: number;
  /** 버스 승차 기록 요약 */
  bus?: { n: number; pax: number; first: number; last: number };
}

export type VehicleInfoMap = Record<string, VehicleAuxInfo>;

/** 지도에서 선택된 객체 */
export type Selection = { kind: 'vehicle'; vehId: number } | { kind: 'link'; linkId: number };

/** 링크 소통정보 시계열. speeds는 [T × L] row-major, vols는 [H × L]. geojson은 반경 내 전체 도로망 */
export interface LinkTraffic {
  times: number[];
  hours: number[];
  slotSeconds: number;
  radiusKm: number;
  networkCount: number;
  linkIds: number[];
  fspeed: Uint8Array;
  speeds: Uint8Array;
  vols: Uint16Array;
  noData: number;
  bounds: [number, number, number, number];
  geojson: FeatureCollection<LineString | MultiLineString, LinkProps>;
}

export type Phase = 'setup' | 'uploading' | 'processing' | 'ready';
