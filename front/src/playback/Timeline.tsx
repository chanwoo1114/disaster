import { Pause, Play, SkipBack } from 'lucide-react';

interface Props {
  times: number[];
  index: number;
  onIndexChange: (i: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  info: string;
}

export const SPEEDS = [1, 2, 4, 8];

export function formatClock(sec: number): string {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function Timeline({
  times,
  index,
  onIndexChange,
  playing,
  onTogglePlay,
  speed,
  onSpeedChange,
  info,
}: Props) {
  const last = times.length - 1;
  const pct = last > 0 ? (index / last) * 100 : 0;

  // 정각마다 눈금
  const hourTicks: { pct: number; label: string }[] = [];
  if (last > 0) {
    for (let i = 0; i <= last; i++) {
      if (times[i] % 3600 === 0) hourTicks.push({ pct: (i / last) * 100, label: formatClock(times[i]) });
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 w-[min(960px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onIndexChange(0)}
          title="처음으로"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          title={playing ? '일시정지' : '재생'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>

        <div className="font-mono text-lg font-semibold tabular-nums text-gray-900">
          {formatClock(times[index] ?? 0)}
        </div>

        <div className="relative mx-2 flex-1 pt-1">
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            className="timeline-range w-full"
            style={{ ['--pct' as string]: `${pct}%` }}
          />
          <div className="relative mt-1 h-3.5">
            {hourTicks.map((t) => (
              <span
                key={t.label}
                className="absolute -translate-x-1/2 text-[10px] tabular-nums text-gray-400"
                style={{ left: `${t.pct}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 rounded-lg bg-gray-100 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`rounded-md px-2 py-1 font-mono text-xs font-semibold transition-colors ${
                speed === s ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
        <span className="font-medium text-gray-600">5분 간격 · {formatClock(times[0] ?? 0)}–{formatClock(times[last] ?? 0)}</span>
        <span className="tabular-nums">{info}</span>
      </div>
    </div>
  );
}
