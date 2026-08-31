const rawKey = import.meta.env.VITE_VWORLD_API_KEY as string | undefined;

/** VWorld 키가 없거나 플레이스홀더면 null → OSM 타일로 대체 */
export const VWORLD_API_KEY: string | null =
  rawKey && rawKey.trim() && rawKey !== 'your_vworld_api_key' ? rawKey.trim() : null;

export const BACKEND_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://127.0.0.1:8001';

/** 초기 카메라: 한반도 전체 */
export const DEFAULT_CENTER: [number, number] = [127.6, 36.2];
export const DEFAULT_ZOOM = 6.3;

export const MAX_UPLOAD_MB = 500;
export const CHUNK_SIZE = 5 * 1024 * 1024;
