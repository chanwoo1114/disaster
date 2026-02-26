import { postSessionClear, postUploadChunkSession } from "./api.js";

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

export async function uploadFileInChunks(file, onProgress) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const sessionRes = await postSessionClear({
    fileName: file.name,
    totalChunks,
    totalSize: file.size,
  });
  const uploadId = sessionRes.data.uploadId;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk, file.name);

    await postUploadChunkSession(formData, { uploadId, chunkIndex: i });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  return uploadId;
}
