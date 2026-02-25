import { Folder } from 'lucide-react';

export default function SidebarHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
      <Folder className="w-5 h-5 text-blue-600" />
      <h2 className="text-base font-semibold text-gray-900">프로젝트 목록</h2>
    </div>
  )
}