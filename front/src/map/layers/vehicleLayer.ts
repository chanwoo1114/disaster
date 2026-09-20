import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { VehicleFrames, VehicleInfoMap } from '../../types';
// 메조 데이터에는 차량 타입 컬럼이 없어 전부 버스 아이콘으로 표출
import busIconUrl from '../../assets/images/bus/버스-01.png';

// 버스-01.png: 위(북쪽)를 향한 탑뷰 버스 50×50. 방향은 getAngle로 GPU에서 회전
// busMask 는 같은 그림을 실루엣으로 써서 getColor 로 출발지 색을 입히는 용도
const ICON_BOX = { x: 0, y: 0, width: 50, height: 50, anchorX: 25, anchorY: 25 };
const ICON_MAPPING = {
  bus: { ...ICON_BOX, mask: false },
  busMask: { ...ICON_BOX, mask: true },
};

export const VEHICLE_LAYER_ID = 'vehicles';

/**
 * 고른 출발지에 입히는 색. 차량은 지도에 흩어져 아무 두 색이나 맞붙을 수 있어
 * 인접쌍이 아닌 all-pairs 기준으로 골랐고, 밝음·어두움 배경 양쪽에서 통과하는
 * 조합이 다섯 개가 한계라 한 번에 다섯 곳까지만 색을 줄 수 있다.
 */
export const ORIGIN_COLORS = ['#2a78d6', '#e34948', '#1baf7a', '#c98500', '#008300'];
/** 고르지 않은 차량 — 색만 회색이고 진하기는 고른 차량과 같다 */
export const ORIGIN_BASE_COLOR = '#6b7280';

export interface VehicleOriginOption {
  code: string;
  name: string;
  /** 이 출발지에서 나온 차량 수 */
  count: number;
}

/** 색을 고를 수 있는 출발지 목록 (차량 많은 순). 출발지 정보가 없으면 빈 배열 */
export function listOriginOptions(info: VehicleInfoMap): VehicleOriginOption[] {
  const count = new Map<string, number>();
  const nameOf = new Map<string, string>();
  for (const aux of Object.values(info)) {
    const o = aux.o;
    if (!o) continue;
    count.set(o.code, (count.get(o.code) ?? 0) + 1);
    if (!nameOf.has(o.code)) nameOf.set(o.code, o.name);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([code, n]) => ({ code, name: nameOf.get(code) ?? code, count: n }));
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 행별 RGBA 를 미리 계산한다 (deck.gl 기본 colorFormat 이 RGBA).
 * 프레임마다 subarray 로 잘라 쓰므로 고른 출발지가 바뀔 때만 다시 만들면 된다.
 *
 * slots[i] 에 있는 출발지가 ORIGIN_COLORS[i] 를 쓴다. 슬롯을 그대로 두는 이유는
 * 한 곳을 빼도 나머지 색이 밀리지 않게 하려는 것 — 색은 순위가 아니라 출발지를 따라간다.
 *
 * hideOthers 면 고르지 않은 차량을 알파 0 으로 지운다. 알파가 alphaCutoff 아래면
 * 셰이더가 프래그먼트를 버려서 그려지지도, 클릭에 잡히지도 않는다.
 */
export function buildOriginColors(
  frames: VehicleFrames,
  info: VehicleInfoMap,
  slots: (string | null)[],
  hideOthers = false,
): Uint8Array {
  const colorOf = new Map<string, [number, number, number]>();
  slots.forEach((code, i) => {
    if (code) colorOf.set(code, rgb(ORIGIN_COLORS[i]));
  });

  const base = rgb(ORIGIN_BASE_COLOR);
  const baseAlpha = hideOthers ? 0 : 255;
  const rgbaByVeh = new Map<number, [number, number, number, number]>();
  for (const [veh, aux] of Object.entries(info)) {
    const picked = aux.o ? colorOf.get(aux.o.code) : undefined;
    if (picked) rgbaByVeh.set(Number(veh), [...picked, 255]);
  }

  const colors = new Uint8Array(frames.total * 4);
  for (let i = 0; i < frames.total; i++) {
    const [r, g, b, a] = rgbaByVeh.get(frames.ids[i]) ?? [base[0], base[1], base[2], baseAlpha];
    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = a;
  }
  return colors;
}

/** 프레임 하나의 차량을 그리는 IconLayer. 바이너리 attribute라 GC 부담이 없다 */
export function buildVehicleLayer(
  frames: VehicleFrames,
  frameIdx: number,
  colors?: Uint8Array,
): IconLayer | null {
  if (frameIdx < 0 || frameIdx >= frames.times.length) return null;
  const start = frames.offsets[frameIdx];
  const end = frames.offsets[frameIdx + 1];
  const n = end - start;
  if (n <= 0) return null;

  const attributes: Record<string, { value: Float32Array | Uint8Array; size: number }> = {
    getPosition: { value: frames.positions.subarray(start * 2, end * 2), size: 2 },
    getAngle: { value: frames.angles.subarray(start, end), size: 1 },
  };
  if (colors) attributes.getColor = { value: colors.subarray(start * 4, end * 4), size: 4 };

  return new IconLayer({
    id: VEHICLE_LAYER_ID,
    data: { length: n, attributes },
    iconAtlas: busIconUrl,
    iconMapping: ICON_MAPPING,
    getIcon: () => (colors ? 'busMask' : 'bus'),
    getSize: 30,
    sizeUnits: 'pixels',
    sizeMinPixels: 18,
    sizeMaxPixels: 56,
    billboard: false,
    pickable: true,
  });
}

/** 현재 프레임에서 veh_id의 전역 행 인덱스. 없으면 -1 */
export function findVehicleRow(frames: VehicleFrames, frameIdx: number, vehId: number): number {
  if (frameIdx < 0 || frameIdx >= frames.times.length) return -1;
  const start = frames.offsets[frameIdx];
  const end = frames.offsets[frameIdx + 1];
  for (let i = start; i < end; i++) {
    if (frames.ids[i] === vehId) return i;
  }
  return -1;
}

/** 선택된 차량을 감싸는 빨간 링. 숨겨진(알파 0) 차량이면 링도 그리지 않는다 */
export function buildSelectionRing(frames: VehicleFrames, row: number, colors?: Uint8Array): ScatterplotLayer | null {
  if (row < 0) return null;
  if (colors && colors[row * 4 + 3] === 0) return null;
  return new ScatterplotLayer({
    id: 'vehicle-selection',
    data: {
      length: 1,
      attributes: {
        getPosition: { value: frames.positions.subarray(row * 2, row * 2 + 2), size: 2 },
      },
    },
    filled: false,
    stroked: true,
    getRadius: 24,
    radiusUnits: 'pixels',
    getLineColor: [220, 38, 38, 255],
    lineWidthMinPixels: 3,
  });
}
