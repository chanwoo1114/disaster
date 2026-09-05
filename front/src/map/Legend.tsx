import { Fragment } from 'react';

import { ADM_COLORS, ADM_EVAC_COLORS } from './admZones';
import { ROAD_GROUPS, TRAFFIC_CLASSES, TRAFFIC_COLORS, rangeText } from './linkTraffic';

interface Props {
  showTraffic: boolean;
  showShelters: boolean;
  showAdm: boolean;
  /** 존별 대피율 데이터가 있어 행정동이 대피율 색으로 칠해지는 상태 */
  showEvacRate: boolean;
  /** 색칠 기준 라벨 (구역 이탈률 / 구호소 도착률) */
  evacMetricLabel: string;
  /** 특수시설(학교 등) 점이 함께 표시되는 상태 */
  showEtc: boolean;
  /** 대피 경로 표시 상태 */
  showZonePath: boolean;
}

export default function Legend({
  showTraffic,
  showShelters,
  showAdm,
  showEvacRate,
  evacMetricLabel,
  showEtc,
  showZonePath,
}: Props) {
  if (!showTraffic && !showShelters && !showAdm && !showZonePath) return null;

  return (
    <div className="w-[248px] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur">
      <p className="mb-2 font-semibold text-gray-800">범례</p>

      {showTraffic && (
        <div className="mb-2">
          <p className="mb-1.5 text-[11px] text-gray-500">링크 소통 (현재 속도, km/h)</p>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-1.5 gap-y-1">
            <span />
            {ROAD_GROUPS.map((g) => (
              <span key={g.key} className="text-center text-[10px] text-gray-400">
                {g.label}
              </span>
            ))}

            {TRAFFIC_CLASSES.map((c) => (
              <Fragment key={c.key}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-1.5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-gray-700">{c.label}</span>
                </span>
                {ROAD_GROUPS.map((g) => (
                  <span key={g.key} className="text-center text-[10px] tabular-nums text-gray-500">
                    {rangeText(g, c.key)}
                  </span>
                ))}
              </Fragment>
            ))}

            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: TRAFFIC_COLORS.nodata }}
              />
              <span className="text-gray-700">정보 없음</span>
            </span>
            <span className="col-span-3 text-center text-[10px] text-gray-400">대상 정보 없음</span>
          </div>
        </div>
      )}

      {showShelters && (
        <div className="mb-2 border-t border-gray-100 pt-2">
          <p className="mb-1 text-[11px] text-gray-500">대피소 대피율</p>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 flex-1 rounded-full"
              style={{ background: 'linear-gradient(90deg,#ef4444,#f59e0b,#059669)' }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gray-400" />
            <span className="text-gray-700">자료 없음</span>
          </div>
        </div>
      )}

      {showAdm && (
        <div className="border-t border-gray-100 pt-2">
          <p className="mb-1 text-[11px] text-gray-500">행정동</p>

          {showEvacRate && (
            <div className="mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 flex-1 rounded-full border border-black/20"
                  style={{
                    background: `linear-gradient(90deg,${ADM_EVAC_COLORS.low},${ADM_EVAC_COLORS.mid},${ADM_EVAC_COLORS.high})`,
                  }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-gray-400">
                <span>{evacMetricLabel} 0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-4 shrink-0 rounded-sm border border-black/70"
                style={{ backgroundColor: ADM_COLORS.base, opacity: 0.85 }}
              />
              <span className="text-gray-700">행정동 경계</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-4 shrink-0 rounded-sm border border-black/70"
                style={{ backgroundColor: ADM_COLORS.hit, opacity: 0.6 }}
              />
              <span className="text-gray-700">피해범위 포함 (결과 없음)</span>
            </li>
            {showEtc && (
              <li className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border-2"
                  style={{ borderColor: '#1e3a8a', backgroundColor: ADM_EVAC_COLORS.mid }}
                />
                <span className="text-gray-700">특수시설 (학교 등, 대피율 색)</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {showZonePath && (
        <div className="border-t border-gray-100 pt-2">
          <p className="mb-1 text-[11px] text-gray-500">경로 분석</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-4 shrink-0 rounded-sm"
                style={{ backgroundColor: '#ea580c', opacity: 0.6 }}
              />
              <span className="text-gray-700">선택 가능한 출발지</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-4 shrink-0 rounded-sm"
                style={{ backgroundColor: '#2563eb', opacity: 0.45 }}
              />
              <span className="text-gray-700">선택 불가 행정동</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-5 shrink-0 rounded-full" style={{ backgroundColor: '#111827' }} />
              <span className="text-gray-700">대피 경로 (통행량↑ 굵게)</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
