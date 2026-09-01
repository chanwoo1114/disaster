/**
 * 대상지 마커용 방사능 표지(ISO 트레포일).
 * 원자력 재난일 때만 기본 빨간 핀 대신 이 아이콘을 쓴다.
 */

const SIZE = 34;

// 트레포일 규격: 날개 3개가 60°씩, 60° 간격. 아래·좌상·우상 방향
const BLADE_CENTERS_DEG = [90, 210, 330];
const BLADE_HALF_DEG = 30;
const R_INNER = 22;
const R_OUTER = 44;
const R_DOT = 11;

/** SVG 좌표계(y 아래 방향) 기준 극좌표 → 직교좌표 */
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [50 + r * Math.cos(rad), 50 + r * Math.sin(rad)];
}

function blade(centerDeg: number): string {
  const a0 = centerDeg - BLADE_HALF_DEG;
  const a1 = centerDeg + BLADE_HALF_DEG;
  const [ix0, iy0] = polar(R_INNER, a0);
  const [ox0, oy0] = polar(R_OUTER, a0);
  const [ox1, oy1] = polar(R_OUTER, a1);
  const [ix1, iy1] = polar(R_INNER, a1);

  return [
    `M ${ix0} ${iy0}`,
    `L ${ox0} ${oy0}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${ox1} ${oy1}`,
    `L ${ix1} ${iy1}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${ix0} ${iy0}`,
    'Z',
  ].join(' ');
}

/** maplibre Marker 의 element 로 넘길 DOM 노드 */
export function createRadiationMarkerElement(): HTMLElement {
  const el = document.createElement('div');
  el.style.width = `${SIZE}px`;
  el.style.height = `${SIZE}px`;
  el.style.cursor = 'pointer';
  el.setAttribute('aria-label', '원자력 대상지');

  const blades = BLADE_CENTERS_DEG.map(
    (d) => `<path d="${blade(d)}" fill="#111827" />`,
  ).join('');

  el.innerHTML = `
    <svg viewBox="0 0 100 100" width="${SIZE}" height="${SIZE}"
         style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">
      <circle cx="50" cy="50" r="47" fill="#facc15" stroke="#111827" stroke-width="5" />
      ${blades}
      <circle cx="50" cy="50" r="${R_DOT}" fill="#111827" />
    </svg>`;

  return el;
}
