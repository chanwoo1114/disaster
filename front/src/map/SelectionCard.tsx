import { Bus, Route, X } from 'lucide-react';
import { TRAFFIC_CLASSES, TRAFFIC_COLORS } from './linkTraffic';
import { formatClock } from '../playback/Timeline';
import type { VehicleAuxInfo } from '../types';

const RANK_LABELS: Record<string, string> = {
  '101': '고속도로',
  '102': '도시고속도로',
  '103': '일반국도',
  '104': '특별·광역시도',
  '105': '국가지원지방도',
  '106': '지방도',
  '107': '시·군도',
  '108': '기타',
};

export interface VehicleCardData {
  kind: 'vehicle';
  vehId: number;
  timeSec: number;
  present: boolean;
  occupancy: number | null;
  direction: number | null;
  lng: number | null;
  lat: number | null;
  /** PermanentHouseAuto / BusOccupancy 연계 정보 */
  aux: VehicleAuxInfo | null;
}

export interface LinkCardData {
  kind: 'link';
  linkId: number;
  timeSec: number;
  /** 도로명 */
  name: string | null;
  rank: string | null;
  lanes: number | null;
  maxSpd: number | null;
  hasData: boolean;
  speed: number | null; // km/h, null = 자료 없음
  fspeed: number | null;
  vol: number | null; // 시간대 교통량
}

export type SelectionCardData = VehicleCardData | LinkCardData;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-xs font-medium tabular-nums text-gray-800">{value}</span>
    </div>
  );
}

function trafficClass(speed: number, fspeed: number) {
  const ratio = fspeed > 0 ? Math.min(1, speed / fspeed) : 1;
  for (const c of TRAFFIC_CLASSES) {
    if (ratio >= c.min) return c;
  }
  return TRAFFIC_CLASSES[TRAFFIC_CLASSES.length - 1];
}

export default function SelectionCard({ data, onClose }: { data: SelectionCardData; onClose: () => void }) {
  return (
    <div className="w-[220px] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          {data.kind === 'vehicle' ? (
            <>
              <Bus className="h-4 w-4 text-blue-600" /> 차량 {data.vehId}
            </>
          ) : (
            <>
              <Route className="h-4 w-4 text-blue-600" /> 링크 {data.linkId}
            </>
          )}
        </span>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {data.kind === 'vehicle' ? (
        <div className="space-y-1">
          <Row label="시각" value={formatClock(data.timeSec)} />
          {data.present ? (
            <>
              <Row label="탑승 인원" value={`${data.occupancy}명`} />
              <Row label="진행 방향" value={`${data.direction?.toFixed(1)}°`} />
              <Row label="좌표" value={`${data.lng?.toFixed(5)}, ${data.lat?.toFixed(5)}`} />
            </>
          ) : (
            <p className="rounded bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500">
              현재 시각에는 이 차량이 없습니다 (시간을 이동해 보세요)
            </p>
          )}

          {data.aux && (data.aux.start !== undefined || data.aux.bus) && (
            <div className="mt-1 space-y-1 border-t border-gray-100 pt-1.5">
              {data.aux.start !== undefined && (
                <Row label="출발 시각" value={formatClock(data.aux.start)} />
              )}
              {data.aux.house !== undefined && <Row label="가구 ID" value={String(data.aux.house)} />}
              {data.aux.bus && (
                <>
                  <Row
                    label="버스 승차"
                    value={`${data.aux.bus.n.toLocaleString()}회 · ${data.aux.bus.pax.toLocaleString()}명`}
                  />
                  <Row
                    label="승차 시간대"
                    value={`${formatClock(data.aux.bus.first)}–${formatClock(data.aux.bus.last)}`}
                  />
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {data.name && (
            <p className="-mt-1 mb-1.5 text-xs font-medium text-gray-600">{data.name}</p>
          )}
          <Row label="시각" value={formatClock(data.timeSec)} />
          {data.rank !== null && <Row label="도로 등급" value={RANK_LABELS[data.rank] ?? data.rank} />}
          {data.lanes !== null && <Row label="차로 수" value={`${data.lanes}차로`} />}
          {data.maxSpd !== null && data.maxSpd > 0 && <Row label="제한 속도" value={`${data.maxSpd} km/h`} />}
          {!data.hasData ? (
            <p className="rounded bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500">
              배경 도로망 링크 — 시뮬레이션 소통정보 없음
            </p>
          ) : data.speed === null || (data.vol ?? 0) === 0 ? (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TRAFFIC_COLORS.nodata }} />
              <span className="text-xs text-gray-600">이 시각 통행 없음</span>
            </div>
          ) : (
            <>
              <Row label="속도" value={`${data.speed} km/h`} />
              {data.fspeed !== null && data.fspeed > 0 && <Row label="자유 속도" value={`${data.fspeed} km/h`} />}
              <Row label="시간대 교통량" value={`${data.vol?.toLocaleString()}대/h`} />
              {data.fspeed !== null && data.fspeed > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: trafficClass(data.speed, data.fspeed).color }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {trafficClass(data.speed, data.fspeed).label} (
                    {Math.round((data.speed / data.fspeed) * 100)}%)
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
