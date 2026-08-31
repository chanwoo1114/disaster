import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { VehicleFrames } from '../types';
// 메조 데이터에는 차량 타입 컬럼이 없어 전부 버스 아이콘으로 표출
import busIconUrl from '../assets/images/bus/버스-01.png';

// 버스-01.png: 위(북쪽)를 향한 탑뷰 버스 50×50. 방향은 getAngle로 GPU에서 회전
const ICON_MAPPING = {
  bus: { x: 0, y: 0, width: 50, height: 50, anchorX: 25, anchorY: 25, mask: false },
};

export const VEHICLE_LAYER_ID = 'vehicles';

/** 프레임 하나의 차량을 그리는 IconLayer. 바이너리 attribute라 GC 부담이 없다 */
export function buildVehicleLayer(frames: VehicleFrames, frameIdx: number): IconLayer | null {
  if (frameIdx < 0 || frameIdx >= frames.times.length) return null;
  const start = frames.offsets[frameIdx];
  const end = frames.offsets[frameIdx + 1];
  const n = end - start;
  if (n <= 0) return null;

  return new IconLayer({
    id: VEHICLE_LAYER_ID,
    data: {
      length: n,
      attributes: {
        getPosition: { value: frames.positions.subarray(start * 2, end * 2), size: 2 },
        getAngle: { value: frames.angles.subarray(start, end), size: 1 },
      },
    },
    iconAtlas: busIconUrl,
    iconMapping: ICON_MAPPING,
    getIcon: () => 'bus',
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

/** 선택된 차량을 감싸는 빨간 링 */
export function buildSelectionRing(frames: VehicleFrames, row: number): ScatterplotLayer | null {
  if (row < 0) return null;
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
