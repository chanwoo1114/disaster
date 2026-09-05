import { Loader2, Route } from 'lucide-react';
import type { PathDest } from '../types';

/** 경로 종류(type) 코드 라벨 — 의미 확정 시 이 표만 바꾸면 된다 */
const TYPE_LABELS: Record<number, string> = {
  1: '종류 1',
  3: '종류 3',
  4: '종류 4',
};

export interface OriginOption {
  code: string;
  name: string;
}

interface Props {
  origins: OriginOption[];
  selectedOrigin: string | null;
  onSelectOrigin: (code: string | null) => void;
  dests: PathDest[] | null;
  loading: boolean;
  selectedDz: number | null;
  onSelectDest: (dz: number) => void;
}

export default function PathPanel({
  origins,
  selectedOrigin,
  onSelectOrigin,
  dests,
  loading,
  selectedDz,
  onSelectDest,
}: Props) {
  return (
    <div className="flex max-h-[70vh] w-[248px] flex-col rounded-lg border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900">
        <Route className="h-4 w-4 text-violet-600" /> 경로 분석
      </div>

      {/* 출발지 선택 */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <label className="mb-1 block text-[11px] text-gray-500">출발지 ({origins.length})</label>
        <select
          value={selectedOrigin ?? ''}
          onChange={(e) => onSelectOrigin(e.target.value || null)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-200"
        >
          <option value="">출발지를 선택하세요</option>
          {origins.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name || o.code}
            </option>
          ))}
        </select>
        {selectedOrigin && (
          <p className="mt-1 font-mono text-[11px] text-gray-400">{selectedOrigin}</p>
        )}
      </div>

      {/* 도착지 선택 (드롭다운) */}
      {!selectedOrigin ? (
        <p className="px-3 py-4 text-xs text-gray-400">
          출발지를 선택하면 도착지 목록이 표시됩니다. 지도의 주황색 행정동을 클릭해도 됩니다.
        </p>
      ) : (
        <div className="px-3 py-2.5">
          <label className="mb-1 block text-[11px] text-gray-500">
            도착지 {dests ? `(${dests.length})` : ''}
          </label>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 도착지 불러오는 중…
            </div>
          ) : !dests || dests.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">도착지가 없습니다</p>
          ) : (
            <>
              <select
                value={selectedDz ?? ''}
                onChange={(e) => e.target.value && onSelectDest(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-200"
              >
                <option value="">도착지를 선택하세요</option>
                {dests.map((d) => (
                  <option key={d.dz} value={d.dz}>
                    도착지 {d.dz} · 링크 {d.linkCount.toLocaleString()}
                  </option>
                ))}
              </select>

              {/* 선택된 도착지의 경로 종류 */}
              {selectedDz != null &&
                (() => {
                  const d = dests.find((x) => x.dz === selectedDz);
                  if (!d) return null;
                  return (
                    <div className="mt-2 rounded-md bg-violet-50 px-2.5 py-2">
                      <p className="mb-1 text-[11px] font-medium text-violet-800">
                        도착지 {d.dz} — 경로 종류
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {d.types.map((t) => (
                          <span key={t} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-600">
                            {TYPE_LABELS[t] ?? `종류 ${t}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
