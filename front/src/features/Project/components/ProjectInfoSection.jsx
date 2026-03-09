import SectionTitle from "../../../components/common/SectionTitle.jsx";

export default function ProjectInfoSection({
  isViewMode,
  register,
  errors,
  selectedProject,
  isSubmitting,
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <SectionTitle>프로젝트 정보</SectionTitle>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          프로젝트명 {!isViewMode && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          {...(isViewMode
            ? { value: selectedProject.projectName, readOnly: true }
            : register('projectName')
          )}
          placeholder="프로젝트명을 입력하세요"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
            isViewMode
              ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'
              : errors?.projectName
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/50'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          }`}
          disabled={!isViewMode && isSubmitting}
          maxLength={100}
        />
        {!isViewMode && errors?.projectName && (
          <p className="text-red-500 text-xs mt-1.5">{errors.projectName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">설명</label>
        <textarea
          {...(isViewMode
            ? { value: selectedProject.projectDescription || '', readOnly: true }
            : register('projectDescription')
          )}
          placeholder="프로젝트 설명을 입력하세요 (선택사항)"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none resize-none transition-colors ${
            isViewMode
              ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 focus:ring-1'
          }`}
          rows={3}
          disabled={!isViewMode && isSubmitting}
          maxLength={500}
        />
      </div>
    </section>
  );
}
