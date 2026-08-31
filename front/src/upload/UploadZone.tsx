import { useRef, useState, type DragEvent } from 'react';
import { FileArchive, UploadCloud } from 'lucide-react';
import { MAX_UPLOAD_MB } from '../config';

interface Props {
  disabled: boolean;
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadZone({ disabled, file, onSelect, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setLocalError('ZIP 파일만 업로드할 수 있습니다');
      return;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setLocalError(`파일 크기는 ${MAX_UPLOAD_MB}MB를 초과할 수 없습니다`);
      return;
    }
    setLocalError(null);
    onSelect(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(e.dataTransfer.files?.[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <FileArchive className="h-5 w-5 shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
          <p className="text-xs text-gray-500">{formatMB(file.size)}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-gray-500 hover:text-red-600"
          >
            제거
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
            : dragging
              ? 'cursor-copy border-blue-500 bg-blue-50 text-blue-600'
              : 'cursor-pointer border-gray-300 bg-white text-gray-500 hover:border-blue-400 hover:bg-blue-50/40'
        }`}
      >
        <UploadCloud className="h-7 w-7" />
        <p className="text-sm font-medium">ZIP 파일을 드롭하거나 클릭</p>
        <p className="text-xs">최대 {MAX_UPLOAD_MB}MB · 파일 1개</p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {localError && <p className="mt-1.5 text-xs text-red-500">{localError}</p>}
    </div>
  );
}
