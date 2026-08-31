/** 16방위 코드(1~16) → 한글 라벨. 0은 무풍 */
export const WIND_DIRECTIONS = [
  '북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
  '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서',
];

export function windDirectionLabel(code: number | null | undefined): string | null {
  if (code == null) return null;
  if (code === 0) return '무풍';
  if (code >= 1 && code <= 16) return WIND_DIRECTIONS[code - 1];
  return String(code);
}
