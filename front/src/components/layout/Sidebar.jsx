import SidebarHeader from './SidebarHeader.jsx';
import ProjectList from '../../features/Project/ProjectList.jsx';
import ProjectAddButton from "../common/ProjectAddButton.jsx";

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
    <aside className="w-96 bg-white flex flex-col border-r border-gray-200">
      <SidebarHeader />

      <div className="p-4">
        <ProjectAddButton
          size="small"
          text="새 프로젝트"
          onClick={onCreateProject}
        />
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
