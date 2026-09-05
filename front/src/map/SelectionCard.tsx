import { Bus, Landmark, Route, X } from 'lucide-react';
import { TRAFFIC_COLORS, roadGroup, trafficClassOf } from './linkTraffic';
import { formatClock } from '../playback/Timeline';
import type { VehicleAuxInfo, ZonePopEntry } from '../types';

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

const AREA_LABELS: Record<string, string> = {
  PAZ: 'PAZ (예방적보호조치구역)',
  UPZW: 'UPZ 풍하 구역',
  UPZ: 'UPZ (긴급보호조치구역)',
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

export interface AdmCardData {
  kind: 'adm';
  code: string;
  name: string;
  timeSec: number;
  /** 특수시설이면 시설 구분(예: 학교), 행정동이면 null */
  facility?: string | null;
  /** 인구·이동 요약 (person/house/activity) */
  pop?: ZonePopEntry | null;
  /** EvacuationRateByZone 에 이 행정동의 결과가 있는지 */
  hasData: boolean;
  area: string | null;
  perm: number | null;
  temp: number | null;
  permPct: number | null;
  tempPct: number | null;
  shelterPct: number | null;
  shelterArr: number | null;
  /** 구역별 이탈률 (현재 시각) — 전부 표시용 */
  permByArea: Record<'PAZ' | 'UPZW' | 'UPZ', number> | null;
  tempByArea: Record<'PAZ' | 'UPZW' | 'UPZ', number> | null;
}

const MODE_COLORS: Record<string, string> = {
  도보: '#10b981',
  승용차: '#3b82f6',
  버스: '#f59e0b',
  기타: '#9ca3af',
};

const AREA_SHORT: [key: 'PAZ' | 'UPZW' | 'UPZ', label: string][] = [
  ['PAZ', 'PAZ'],
  ['UPZW', 'UPZ 풍하'],
  ['UPZ', 'UPZ'],
];

/** 구역별 이탈률 3종을 각각 미니 게이지로 표시. 소속 구역은 강조 */
function AreaRates({
  title,
  byArea,
  own,
}: {
  title: string;
  byArea: Record<'PAZ' | 'UPZW' | 'UPZ', number>;
  own: string | null;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-gray-600">{title}</p>
      <div className="space-y-1">
        {AREA_SHORT.map(([key, label]) => {
          const pct = byArea[key];
          const isOwn = own === key;
          return (
            <div key={key} className="grid grid-cols-[52px_1fr_38px] items-center gap-1.5">
              <span
                className={`text-[10px] ${isOwn ? 'font-semibold text-gray-800' : 'text-gray-500'}`}
              >
                {label}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <span
                  className={`block h-full rounded-full transition-[width] duration-500 ${
                    isOwn ? 'bg-blue-600' : 'bg-blue-300'
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </span>
              <span
                className={`text-right text-[11px] tabular-nums ${
                  isOwn ? 'font-semibold text-gray-900' : 'text-gray-600'
                }`}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type SelectionCardData = VehicleCardData | LinkCardData | AdmCardData;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-xs font-medium tabular-nums text-gray-800">{value}</span>
    </div>
  );
}

function Header({ data }: { data: SelectionCardData }) {
  if (data.kind === 'vehicle') {
    return (
      <>
        <Bus className="h-4 w-4 text-blue-600" /> 차량 {data.vehId}
      </>
    );
  }
  if (data.kind === 'link') {
    return (
      <>
        <Route className="h-4 w-4 text-blue-600" /> 링크 {data.linkId}
      </>
    );
  }
  return (
    <>
      <Landmark className="h-4 w-4 text-blue-600" /> {data.name || `행정동 ${data.code}`}
    </>
  );
}

export default function SelectionCard({ data, onClose }: { data: SelectionCardData; onClose: () => void }) {
  return (
    <div className="w-[230px] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Header data={data} />
        </span>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {data.kind === 'vehicle' && (
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
      )}

      {data.kind === 'link' && (
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
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: trafficClassOf(data.speed, data.rank).color }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {trafficClassOf(data.speed, data.rank).label} ({data.speed} km/h ·{' '}
                  {roadGroup(data.rank).label} 기준)
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {data.kind === 'adm' && (
        <div className="space-y-1">
          <p className="-mt-1 mb-1.5 font-mono text-[11px] text-gray-400">{data.code}</p>
          <Row label="시각" value={formatClock(data.timeSec)} />
          {data.facility && <Row label="구분" value={`특수시설 (${data.facility})`} />}

          {/* 인구·이동 요약 (person/house/activity) */}
          {data.pop && data.pop.pop > 0 && (
            <div className="mt-1 border-t border-gray-100 pt-1.5">
              <p className="mb-0.5 text-[11px] font-medium text-gray-600">인구·이동</p>
              <Row label="인구" value={`${data.pop.pop.toLocaleString()}명 / ${data.pop.house.toLocaleString()}가구`} />
              <Row
                label="교통약자"
                value={`${data.pop.vulnerable.toLocaleString()}명 (${((data.pop.vulnerable / data.pop.pop) * 100).toFixed(0)}%)`}
              />
              {data.pop.house > 0 && (
                <Row
                  label="차량 보유"
                  value={`${data.pop.carHouse.toLocaleString()}가구 (${((data.pop.carHouse / data.pop.house) * 100).toFixed(0)}%)`}
                />
              )}
              {(() => {
                const modes = Object.entries(data.pop.mode);
                const total = modes.reduce((s, [, v]) => s + v, 0);
                if (total === 0) return null;
                return (
                  <div className="mt-0.5">
                    <p className="mb-0.5 text-[10px] text-gray-400">대피 통행수단</p>
                    <div className="flex h-2 w-full overflow-hidden rounded-full">
                      {modes
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, v]) => (
                          <span
                            key={label}
                            title={`${label} ${((v / total) * 100).toFixed(0)}%`}
                            style={{
                              width: `${(v / total) * 100}%`,
                              backgroundColor: MODE_COLORS[label] ?? '#9ca3af',
                            }}
                          />
                        ))}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                      {modes
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, v]) => (
                          <span key={label} className="inline-flex items-center gap-1">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: MODE_COLORS[label] ?? '#9ca3af' }}
                            />
                            {label} {((v / total) * 100).toFixed(0)}%
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {!data.hasData ? (
            <p className="rounded bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500">
              이 행정동의 시뮬레이션 결과(존별 대피율)가 없습니다
            </p>
          ) : (
            <>
              {data.area && <Row label="소속 구역" value={AREA_LABELS[data.area] ?? data.area} />}
              {data.perm !== null && data.perm > 0 && (
                <Row label="상주 대피대상" value={`${data.perm.toLocaleString()}명`} />
              )}
              {data.temp !== null && data.temp > 0 && (
                <Row label="일시 대피대상" value={`${data.temp.toLocaleString()}명`} />
              )}

              {/* ① 구역 이탈률 — 각 구역(PAZ/UPZ풍하/UPZ) 경계를 빠져나간 비율 전부 */}
              <div className="mt-1 space-y-1.5 border-t border-gray-100 pt-1.5">
                {data.permByArea && data.perm !== null && data.perm > 0 ? (
                  <AreaRates title="이탈률 (상주)" byArea={data.permByArea} own={data.area} />
                ) : (
                  data.perm !== null &&
                  data.perm > 0 && <Row label="이탈률 (상주)" value={`${data.permPct?.toFixed(1)}%`} />
                )}
                {data.tempByArea && data.temp !== null && data.temp > 0 ? (
                  <AreaRates title="이탈률 (일시)" byArea={data.tempByArea} own={data.area} />
                ) : (
                  data.temp !== null &&
                  data.temp > 0 && <Row label="이탈률 (일시)" value={`${data.tempPct?.toFixed(1)}%`} />
                )}
              </div>

              {/* ② 구호소 도착 — 대피를 마치고 구호소에 도착 완료한 비율 */}
              <div className="mt-1 border-t border-gray-100 pt-1.5">
                <p className="mb-0.5 text-[11px] font-medium text-gray-600">구호소 도착</p>
                <Row
                  label="도착 완료"
                  value={`${(data.shelterArr ?? 0).toLocaleString()}명 · ${data.shelterPct?.toFixed(1)}%`}
                />
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
                    style={{ width: `${Math.min(100, data.shelterPct ?? 0)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
