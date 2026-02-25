import SidebarHeader from './SidebarHeader.jsx';
import ProjectList from '../../features/Project/ProjectList.jsx';
import { Plus } from 'lucide-react';

export default function Sidebar({
  projectData,
  selectedProject,
  setSelectedProject,
  loading,
  hasMore,
  scrollRef,
  handleScroll,
  onCreateProject
}) {
  return (
    <aside className="w-64 bg-white flex flex-col border-r border-gray-200">
      <SidebarHeader />

      <div className="px-4 py-3">
        <button
          onClick={onCreateProject}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>새 프로젝트</span>
        </button>
      </div>

      <ProjectList
        projectData={projectData}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        loading={loading}
        hasMore={hasMore}
        scrollRef={scrollRef}
        handleScroll={handleScroll}
      />
    </aside>
  );
}
