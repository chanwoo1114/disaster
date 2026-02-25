const DISASTER_LABELS = {
  nuclear: { label: '원자력', color: 'bg-red-100 text-red-600' },
  chemistry: { label: '화학', color: 'bg-orange-100 text-orange-600' },
  storm: { label: '태풍', color: 'bg-sky-100 text-sky-600' },
  flood: { label: '홍수', color: 'bg-blue-100 text-blue-600' },
  complex: { label: '복합', color: 'bg-purple-100 text-purple-600' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function ProjectList({
  projectData,
  selectedProject,
  setSelectedProject,
  loading,
  hasMore,
  scrollRef,
  handleScroll
}) {
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {projectData.length > 0 &&
        projectData.map((project) => {
          const isSelected = selectedProject === project.id;
          const disaster = DISASTER_LABELS[project.disasterType] || { label: project.disasterType, color: 'bg-gray-100 text-gray-600' };

          return (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                  : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                  {project.projectName}
                </h3>
                <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${disaster.color}`}>
                  {disaster.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(project.createdAt)}
              </p>
            </div>
          );
        })
      }

      {loading && (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-blue-500"></div>
        </div>
      )}

      {!hasMore && projectData.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">
          모든 프로젝트를 불러왔습니다
        </div>
      )}

      {!loading && projectData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
          <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <p className="text-sm">프로젝트가 없습니다</p>
        </div>
      )}
    </div>
  )
}