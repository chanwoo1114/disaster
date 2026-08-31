import { useEffect, useState } from 'react';
import { CheckCircle2, Crosshair, History, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { DISASTER_LABEL, DISASTER_TYPES } from '../data/disasters';
import { LOCATIONS } from '../data/locations';
import UploadZone from '../upload/UploadZone';
import { windDirectionLabel } from '../data/wind';
import type {
  DisasterType,
  LngLat,
  Location,
  Phase,
  ScenarioMeta,
  ScenarioSummary,
  SessionInfo,
  Target,
} from '../types';

/** 시나리오 버튼 부제: "발생 13시 · 풍향 동 · 풍속 1" */
function scenarioDetail(s: ScenarioMeta): string {
  if (!s.args) return '';
  const parts: string[] = [];
  if (s.args.hour != null) parts.push(`발생 ${s.args.hour}시`);
  const wind = windDirectionLabel(s.args.windDirection);
  if (wind) parts.push(`풍향 ${wind}`);
  if (s.args.windSpeed != null) parts.push(`풍속 ${s.args.windSpeed}`);
  return parts.join(' · ');
}

interface Props {
  disasterType: DisasterType | null;
  onDisasterType: (t: DisasterType) => void;
  target: Target | null;
  onSelectLocation: (loc: Location) => void;
  pickMode: boolean;
  onTogglePick: () => void;
  onManualCoord: (p: LngLat) => void;
  file: File | null;
  onFile: (f: File | null) => void;
  phase: Phase;
  progress: number;
  error: string | null;
  session: SessionInfo | null;
  scenario: string | null;
  onSelectScenario: (name: string | null) => void;
  preparing: boolean;
  summary: ScenarioSummary | null;
  showTraffic: boolean;
  showVehicles: boolean;
  showShelters: boolean;
  onToggleTraffic: () => void;
  onToggleVehicles: () => void;
  onToggleShelters: () => void;
  onStart: () => void;
  onReset: () => void;
  savedSessions: SessionInfo[];
  onLoadSession: (info: SessionInfo) => void;
  onDeleteSession: (id: string) => void;
}

function DataToggle({
  label,
  detail,
  available,
  checked,
  onToggle,
}: {
  label: string;
  detail: string;
  available: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
        !available
          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
          : checked
            ? 'border-blue-200 bg-blue-50/60 hover:bg-blue-50'
            : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <span>
        <span className={`block text-sm font-medium ${checked && available ? 'text-blue-800' : 'text-gray-800'}`}>
          {label}
        </span>
        <span className="block text-[11px] text-gray-500">{available ? detail : '데이터 없음'}</span>
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked && available ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked && available ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function StepLabel({ n, children, done }: { n: number; children: string; done: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
          done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {n}
      </span>
      <span className="text-sm font-semibold text-gray-800">{children}</span>
    </div>
  );
}

function CoordInput({
  label,
  value,
  onCommit,
  disabled,
}: {
  label: string;
  value: number | null;
  onCommit: (v: number) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : value.toFixed(6));
  useEffect(() => {
    setText(value === null ? '' : value.toFixed(6));
  }, [value]);

  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-gray-500">{label}</span>
      <input
        type="number"
        step="0.000001"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = parseFloat(text);
          if (!Number.isNaN(n) && n !== value) onCommit(n);
        }}
        placeholder="—"
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50"
      />
    </label>
  );
}

export default function SetupPanel({
  disasterType,
  onDisasterType,
  target,
  onSelectLocation,
  pickMode,
  onTogglePick,
  onManualCoord,
  file,
  onFile,
  phase,
  progress,
  error,
  session,
  scenario,
  onSelectScenario,
  preparing,
  summary,
  showTraffic,
  showVehicles,
  showShelters,
  onToggleTraffic,
  onToggleVehicles,
  onToggleShelters,
  onStart,
  onReset,
  savedSessions,
  onLoadSession,
  onDeleteSession,
}: Props) {
  const busy = phase === 'uploading' || phase === 'processing';
  const locations = disasterType ? LOCATIONS[disasterType] : [];
  const canStart = !!disasterType && !!target && !!file && phase === 'setup';

  const selectValue = !target ? '' : target.source === 'list' && target.name ? target.name : '__custom__';

  return (
    <aside className="absolute left-4 top-4 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur">
      <header className="border-b border-gray-100 px-5 py-3.5">
        <h1 className="text-base font-bold text-gray-900">재난대피 시뮬레이터</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          재난 유형과 대상지를 정한 뒤 시뮬레이션 결과 ZIP을 올리세요
        </p>
      </header>

      {phase === 'ready' && session ? (
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{DISASTER_LABEL[session.disasterType]}</span>
            </span>
            <span className="font-mono text-[11px]">
              {target?.name ?? `${session.lng.toFixed(4)}, ${session.lat.toFixed(4)}`}
            </span>
          </div>

          {/* 시나리오 선택 */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">시나리오</p>
              {scenario && session.scenarios.length > 1 && !preparing && (
                <button
                  type="button"
                  onClick={() => onSelectScenario(null)}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  변경
                </button>
              )}
            </div>

            {!scenario ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-gray-500">
                  결과 폴더에서 시나리오 {session.scenarios.length}개를 찾았습니다. 볼 시나리오를
                  선택하세요.
                </p>
                {session.scenarios.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onSelectScenario(s.name)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">{s.name}</span>
                      {scenarioDetail(s) && (
                        <span className="block truncate text-[11px] text-gray-500">{scenarioDetail(s)}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">›</span>
                  </button>
                ))}
              </div>
            ) : preparing || !summary ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                {scenario} 산출물 준비 중… (최초 선택 시 수십 초 걸릴 수 있습니다)
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
                <p className="text-sm font-semibold text-blue-800">{scenario}</p>
                {(() => {
                  const meta = session.scenarios.find((s) => s.name === scenario);
                  const detail = meta ? scenarioDetail(meta) : '';
                  return detail ? <p className="mt-0.5 text-[11px] text-blue-700/80">{detail}</p> : null;
                })()}
              </div>
            )}
          </section>

          {/* 표출 데이터 */}
          {scenario && summary && (
            <section>
              <p className="mb-2 text-sm font-semibold text-gray-800">표출 데이터</p>
              <div className="flex flex-col gap-2">
                <DataToggle
                  label="링크 소통정보"
                  detail={
                    summary.linkTraffic
                      ? `링크 ${summary.linkTraffic.linkCount.toLocaleString()}개 · ${summary.linkTraffic.hours[0]}시–${
                          summary.linkTraffic.hours[summary.linkTraffic.hours.length - 1] + 1
                        }시`
                      : ''
                  }
                  available={!!summary.linkTraffic}
                  checked={showTraffic}
                  onToggle={onToggleTraffic}
                />
                <DataToggle
                  label="차량 이동"
                  detail={
                    summary.vehiclePositions
                      ? `최대 ${summary.vehiclePositions.maxVehicles.toLocaleString()}대 · ${summary.vehiclePositions.frameCount}개 시점`
                      : ''
                  }
                  available={!!summary.vehiclePositions}
                  checked={showVehicles}
                  onToggle={onToggleVehicles}
                />
                <DataToggle
                  label="대피소"
                  detail={summary.shelters ? `${summary.shelters.count.toLocaleString()}개소` : ''}
                  available={!!summary.shelters}
                  checked={showShelters}
                  onToggle={onToggleShelters}
                />
              </div>
            </section>
          )}

          <p className="rounded-md bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
            세션 만료 {session.expiresAt.replace('T', ' ')} · 새로고침하면 처음부터 다시 시작합니다
          </p>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            새로 시작
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {/* 0. 기존 세션 이어보기 (재업로드 없이) */}
          {!busy && savedSessions.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-800">이어보기</span>
                <span className="text-[11px] text-gray-400">
                  업로드한 세션 {savedSessions.length}개
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {savedSessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <button
                      type="button"
                      onClick={() => onLoadSession(s)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-sm font-medium text-gray-800">
                        {DISASTER_LABEL[s.disasterType]}
                        <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                          시나리오 {s.scenarios.length}개
                        </span>
                      </span>
                      <span className="block truncate font-mono text-[11px] text-gray-500">
                        {s.lng.toFixed(4)}, {s.lat.toFixed(4)} · {s.createdAt.replace('T', ' ').slice(5, 16)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(s.sessionId)}
                      title="세션 삭제"
                      className="shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                또는 아래에서 새 시뮬레이션 결과를 업로드하세요
              </p>
            </section>
          )}

          {/* 1. 재난 유형 */}
          <section>
            <StepLabel n={1} done={!!disasterType}>
              재난 유형
            </StepLabel>
            <div className="grid grid-cols-5 gap-1.5">
              {DISASTER_TYPES.map((d) => {
                const active = disasterType === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    disabled={busy}
                    onClick={() => onDisasterType(d.key)}
                    title={d.agent}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-2 transition-colors disabled:opacity-60 ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <img src={d.img} alt="" className="h-9 w-9" />
                    <span
                      className={`text-[11px] font-medium ${active ? 'text-blue-700' : 'text-gray-600'}`}
                    >
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. 대상지 */}
          <section className={disasterType ? '' : 'pointer-events-none opacity-40'}>
            <StepLabel n={2} done={!!target}>
              대상지
            </StepLabel>
            <div className="flex gap-1.5">
              <select
                value={selectValue}
                disabled={busy || !disasterType}
                onChange={(e) => {
                  const loc = locations.find((l) => l.name === e.target.value);
                  if (loc) onSelectLocation(loc);
                }}
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
              >
                <option value="">대상지를 선택하세요</option>
                {locations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
                {selectValue === '__custom__' && <option value="__custom__">직접 지정</option>}
              </select>
              <button
                type="button"
                disabled={busy || !disasterType}
                onClick={onTogglePick}
                title="지도를 클릭해 대상지 지정"
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                  pickMode
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                지도에서
              </button>
            </div>
            {pickMode && (
              <p className="mt-1.5 text-[11px] text-blue-600">지도를 클릭하면 그 지점이 대상지가 됩니다</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <CoordInput
                label="경도"
                value={target?.lng ?? null}
                disabled={busy || !disasterType}
                onCommit={(lng) => onManualCoord({ lng, lat: target?.lat ?? 36 })}
              />
              <CoordInput
                label="위도"
                value={target?.lat ?? null}
                disabled={busy || !disasterType}
                onCommit={(lat) => onManualCoord({ lng: target?.lng ?? 127.5, lat })}
              />
            </div>
          </section>

          {/* 3. 파일 */}
          <section className={disasterType && target ? '' : 'pointer-events-none opacity-40'}>
            <StepLabel n={3} done={!!file}>
              시뮬레이션 결과 (ZIP)
            </StepLabel>
            <UploadZone disabled={busy || !target} file={file} onSelect={onFile} onClear={() => onFile(null)} />
          </section>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {busy ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {phase === 'uploading' ? '업로드 중' : 'ZIP 검증 및 추출 중'}
                </span>
                {phase === 'uploading' && <span className="font-mono">{progress}%</span>}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full bg-blue-600 transition-[width] duration-300 ${
                    phase === 'processing' ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${phase === 'processing' ? 100 : progress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={onReset}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canStart}
              onClick={onStart}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              시작하기
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
