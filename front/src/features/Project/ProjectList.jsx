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
        projectData.map((project) => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
              selectedProject === project.id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            <h3 className="font-medium text-gray-900 text-sm mb-1">
              {project.project_name}
            </h3>
            <p className="text-xs text-gray-500">
              {project.created_at}
            </p>
          </div>
        ))
      }

      {loading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!hasMore && projectData.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-400">
          모든 프로젝트를 불러왔습니다
        </div>
      )}
    </div>
  )
}