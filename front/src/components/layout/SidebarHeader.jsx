export default function SidebarHeader() {
  return (
    <div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <h2 className="text-lg font-bold">프로젝트</h2>
        </div>
      </div>

      <div className="border-b border-gray-200"></div>
    </div>
  )
}