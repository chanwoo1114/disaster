import EmptyProject from "../../features/Project/pages/EmptyProject.jsx";
import Project from "../../features/Project/pages/Project.jsx";

export default function MainContent({
  viewMode,
  selectedProjectData,
  onCreateProject,
  onCancelCreate,
  onSuccess,
}) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {viewMode ? (
          <Project
            onCancel={onCancelCreate}
            selectedProject={selectedProjectData}
            onSuccess={onSuccess}
          />
        ) : (
          <EmptyProject onCreateProject={onCreateProject} />
        )}
      </div>
    </div>
  );
}
