import { FolderPlus } from 'lucide-react';

export default function EmptyProject({ onCreateProject }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 mb-6 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl">
          <FolderPlus className="w-12 h-12 text-blue-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          프로젝트를 시작하세요
        </h2>
        <p className="text-gray-500 mb-8">
          재난 대피 시뮬레이션 프로젝트를<br />생성하고 분석을 시작할 수 있습니다
        </p>

        <button
          onClick={onCreateProject}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          <FolderPlus className="w-5 h-5" />
          새 프로젝트 시작하기
        </button>
      </div>
    </div>

  )
}