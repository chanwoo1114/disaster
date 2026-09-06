import { useState } from 'react';
import { Loader2, Route } from 'lucide-react';
import type { PathDest, PathDestKind } from '../types';

/** 도착지 탭 — DZoneID 가 행정동/대피소/노드 세 체계로 섞여 있다 */
const KIND_LABELS: Record<PathDestKind, string> = {
  adm: '행정동',
  shelter: '대피소',
  node: '노드',
};

const DEST_TABS: { kind: PathDestKind; label: string }[] = [
  { kind: 'adm', label: '행정동' },
  { kind: 'shelter', label: '대피소' },
  { kind: 'node', label: '노드' },
];

export interface OriginOption {
  code: string;
  name: string;
  /** adm=행정동(폴리곤), facility=특수시설(점) */
  kind: 'adm' | 'facility';
  /** 특수시설일 때만: 학교 / 병원 / 요양원 */
  facilityType?: string;
}

interface Props {
  origins: OriginOption[];
  selectedOrigin: string | null;
  onSelectOrigin: (code: string | null) => void;
  dests: PathDest[] | null;
  loading: boolean;
  selectedDz: number | null;
  onSelectDest: (dz: number) => void;
  /** 지도 클릭이 어느 슬롯으로 갈지 */
  target: 'origin' | 'dest';
  onTarget: (t: 'origin' | 'dest') => void;
}

export default function PathPanel({
  origins,
  selectedOrigin,
  onSelectOrigin,
  dests,
  loading,
  selectedDz,
  onSelectDest,
  target,
  onTarget,
}: Props) {
  const adms = origins.filter((o) => o.kind === 'adm');
  const facilities = origins.filter((o) => o.kind === 'facility');
  const selected = origins.find((o) => o.code === selectedOrigin) ?? null;
  const [destTab, setDestTab] = useState<PathDestKind>('adm');

  const destCounts = DEST_TABS.map((t) => ({
    ...t,
    n: dests?.filter((d) => d.kind === t.kind).length ?? 0,
  }));
  // 항목이 있는 첫 탭으로 넘어간다 (출발지에 따라 없는 종류가 있다)
  const activeTab = destCounts.find((t) => t.kind === destTab && t.n > 0)
    ? destTab
    : (destCounts.find((t) => t.n > 0)?.kind ?? 'adm');
  const shown = dests?.filter((d) => d.kind === activeTab) ?? [];
  const selectedDest = dests?.find((d) => d.dz === selectedDz) ?? null;

  return (
    <div className="flex w-[248px] flex-col rounded-lg border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900">
        <Route className="h-4 w-4 text-violet-600" /> 경로 분석
      </div>

      {/* 출발지 선택 */}
      <div
        onClick={() => onTarget('origin')}
        className={`shrink-0 cursor-pointer border-b border-gray-100 px-3 py-2.5 transition ${
          target === 'origin' ? 'bg-orange-50/70' : 'hover:bg-gray-50'
        }`}
      >
        <label className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            <span className="mr-1 text-orange-600">●</span>출발지 ({origins.length})
          </span>
          {target === 'origin' && (
            <span className="rounded bg-orange-600 px-1.5 py-px text-[10px] text-white">지도 선택 중</span>
          )}
        </label>
        <select
          value={selectedOrigin ?? ''}
          onChange={(e) => onSelectOrigin(e.target.value || null)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-200"
        >
          <option value="">출발지를 선택하세요</option>
          {adms.length > 0 && (
            <optgroup label={`행정동 (${adms.length})`}>
              {adms.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name || o.code}
                </option>
              ))}
            </optgroup>
          )}
          {facilities.length > 0 && (
            <optgroup label={`특수시설 (${facilities.length})`}>
              {facilities.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name || o.code}
                  {o.facilityType ? ` · ${o.facilityType}` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {selected && (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span
              className={`rounded px-1 py-px text-[10px] ${
                selected.kind === 'facility'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {selected.kind === 'facility' ? selected.facilityType || '특수시설' : '행정동'}
            </span>
            <span className="font-mono">{selected.code}</span>
          </p>
        )}
      </div>

      {/* 도착지 선택 (종류 탭 + 목록) */}
      {!selectedOrigin ? (
        <p className="px-3 py-4 text-xs text-gray-400">
          지도의 주황색 행정동·시설 점을 클릭하거나 위 목록에서 출발지를 고르세요. 고르면 도착지 선택으로 넘어갑니다.
        </p>
      ) : (
        <div
          onClick={() => onTarget('dest')}
          className={`flex cursor-pointer flex-col px-3 py-2.5 transition ${
            target === 'dest' ? 'bg-teal-50/70' : 'hover:bg-gray-50'
          }`}
        >
          <label className="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
            <span>
              <span className="mr-1 text-teal-600">●</span>도착지 {dests ? `(${dests.length})` : ''}
            </span>
            {target === 'dest' && (
              <span className="rounded bg-teal-600 px-1.5 py-px text-[10px] text-white">지도 선택 중</span>
            )}
          </label>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 도착지 불러오는 중…
            </div>
          ) : !dests || dests.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">도착지가 없습니다</p>
          ) : (
            <>
              {/* 종류 탭 — 비어 있는 종류는 눌리지 않게 둔다 */}
              <div className="mb-2 flex gap-1 rounded-md bg-gray-100 p-0.5">
                {destCounts.map((t) => (
                  <button
                    key={t.kind}
                    type="button"
                    disabled={t.n === 0}
                    onClick={() => setDestTab(t.kind)}
                    className={`flex-1 rounded px-1.5 py-1 text-[11px] transition ${
                      t.kind === activeTab
                        ? 'bg-white font-medium text-violet-700 shadow-sm'
                        : t.n === 0
                          ? 'text-gray-300'
                          : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label} {t.n}
                  </button>
                ))}
              </div>

              <div className="-mx-1 max-h-[40vh] min-h-[120px] overflow-y-auto px-1">
                {shown.map((d) => (
                  <button
                    key={d.dz}
                    type="button"
                    onClick={() => onSelectDest(d.dz)}
                    className={`mb-0.5 flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                      d.dz === selectedDz
                        ? 'bg-violet-100 font-medium text-violet-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      링크 {d.linkCount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              {selectedDest && (
                <p className="mt-1.5 flex items-center gap-1.5 border-t border-gray-100 pt-1.5 text-[11px] text-gray-400">
                  <span className="rounded bg-teal-100 px-1 py-px text-[10px] text-teal-800">
                    {KIND_LABELS[selectedDest.kind]}
                  </span>
                  <span className="truncate text-gray-600">{selectedDest.name}</span>
                  <span className="ml-auto shrink-0 font-mono">{selectedDest.dz}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
