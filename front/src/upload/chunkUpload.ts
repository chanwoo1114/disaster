import { CHUNK_SIZE } from '../config';
import { initUpload, uploadChunk } from '../api/client';

/**
 * ZIP 파일을 CHUNK_SIZE 단위로 잘라 순차 업로드하고 upload_id를 돌려준다.
 * 진행률은 0~100 정수.
 */
export async function uploadZipInChunks(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const { upload_id: uploadId } = await initUpload(file.name, totalChunks, file.size);

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new DOMException('업로드가 취소되었습니다', 'AbortError');
    const start = i * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    await uploadChunk(uploadId, i, chunk, file.name, signal);
    onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  return uploadId;
}
