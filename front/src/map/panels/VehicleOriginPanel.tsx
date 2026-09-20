import { Bus, X } from 'lucide-react';

import { ORIGIN_BASE_COLOR, ORIGIN_COLORS, type VehicleOriginOption } from '../layers/vehicleLayer';

interface Props {
  origins: VehicleOriginOption[];
  /** slots[i] 의 출발지가 ORIGIN_COLORS[i] 색을 쓴다. 빈 슬롯은 null */
  slots: (string | null)[];
  onToggle: (code: string) => void;
  onClear: () => void;
  /** 고르지 않은 회색 차량을 지도에서 감출지 */
  hideOthers: boolean;
  onToggleHideOthers: () => void;
}

/**
 * 차량은 기본적으로 전부 회색이고, 여기서 고른 출발지만 색이 붙는다.
 * 색이 다섯 개뿐이라 동시에 고를 수 있는 출발지도 다섯 곳까지다.
 */
export default function VehicleOriginPanel({
  origins,
  slots,
  onToggle,
  onClear,
  hideOthers,
  onToggleHideOthers,
}: Props) {
  const colorOf = new Map(slots.flatMap((code, i) => (code ? [[code, ORIGIN_COLORS[i]] as const] : [])));
  const full = colorOf.size >= ORIGIN_COLORS.length;

  return (
    <div className="flex w-[248px] flex-col rounded-lg border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900">
        <Bus className="h-4 w-4 text-gray-500" />
        차량 출발지 색
        {colorOf.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto flex items-center gap-0.5 rounded px-1 py-px text-[11px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-3 w-3" /> 해제
          </button>
        )}
      </div>

      <p className="shrink-0 px-3 pt-2 text-[11px] leading-relaxed text-gray-500">
        고른 출발지의 차량에만 색이 붙습니다 ({colorOf.size}/{ORIGIN_COLORS.length}곳).
        {full && ' 더 고르려면 먼저 하나를 해제하세요.'}
      </p>

      {/* 고른 곳이 없으면 전부 사라져 버리니 그때는 잠가 둔다 */}
      <label
        className={`mt-1.5 flex shrink-0 items-center gap-2 px-3 pb-1 text-[11px] ${
          colorOf.size === 0 ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer text-gray-600'
        }`}
      >
        <input
          type="checkbox"
          checked={hideOthers}
          disabled={colorOf.size === 0}
          onChange={onToggleHideOthers}
          className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-400 disabled:opacity-40"
        />
        고르지 않은 차량 숨기기
      </label>

      <div className="max-h-[300px] overflow-y-auto px-3 py-2">
        {origins.map((o) => {
          const color = colorOf.get(o.code);
          const disabled = !color && full;
          return (
            <button
              key={o.code}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(o.code)}
              title={o.name}
              className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                color
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : disabled
                    ? 'text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: color ?? ORIGIN_BASE_COLOR }}
              />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="shrink-0 tabular-nums text-[10px] text-gray-400">
                {o.count.toLocaleString()}대
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
