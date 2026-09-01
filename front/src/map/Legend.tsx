import { Fragment } from 'react';

import { ADM_COLORS } from './admZones';
import { ROAD_GROUPS, TRAFFIC_CLASSES, TRAFFIC_COLORS, rangeText } from './linkTraffic';

interface Props {
  showTraffic: boolean;
  showTarget: boolean;
  showShelters: boolean;
  showAdm: boolean;
}

export default function Legend({ showTraffic, showTarget, showShelters, showAdm }: Props) {
  if (!showTraffic && !showTarget && !showShelters && !showAdm) return null;

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
        <div className="mb-2 border-t border-gray-100 pt-2">
          <p className="mb-1 text-[11px] text-gray-500">행정동</p>
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
              <span className="text-gray-700">피해범위 포함</span>
            </li>
          </ul>
        </div>
      )}

      {showTarget && (
        <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
          <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0">
            <path d="M7 0a7 7 0 0 0-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 0 0-7-7z" fill="#ef4444" />
            <circle cx="7" cy="7" r="2.5" fill="#fff" />
          </svg>
          <span className="text-gray-700">대상지</span>
        </div>
      )}
    </div>
  );
}
