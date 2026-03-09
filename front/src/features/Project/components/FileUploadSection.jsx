import SectionTitle from "../../../components/common/SectionTitle.jsx";
import FileUploadBox from "../disaster/FileUploadBox.jsx";

export default function FileUploadSection({
  onFileSelect,
  uploadedFile,
  onRemoveFile,
  isSubmitting,
  uploadProgress,
  error,
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <SectionTitle>파일 업로드</SectionTitle>
      <FileUploadBox onFileSelect={onFileSelect} disabled={isSubmitting} />

      {error && !uploadedFile && (
        <p className="text-red-500 text-xs mt-1.5">{error}</p>
      )}

      {uploadedFile && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isSubmitting && (
              <button
                type="button"
                onClick={onRemoveFile}
                className="ml-3 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
              >
                제거
              </button>
            )}
          </div>

          {isSubmitting && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>업로드 중...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
