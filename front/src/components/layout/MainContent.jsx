import EmptyProject from "../../features/Project/pages/EmptyProject.jsx";
import ProjectView from "../../features/Project/pages/ProjectView.jsx";
import ProjectCreate from "../../features/Project/pages/ProjectCreate.jsx";

export default function MainContent({
  mode,
  selectedProjectData,
  onCreateProject,
  onCancelCreate,
  onSuccess,
}) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {mode === 'view' && selectedProjectData ? (
          <ProjectView
            selectedProject={selectedProjectData}
            onSuccess={onSuccess}
          />
        ) : mode === 'create' ? (
          <ProjectCreate
            onCancel={onCancelCreate}
            onSuccess={onSuccess}
          />
        ) : (
          <EmptyProject onCreateProject={onCreateProject} />
        )}
      </div>
    </div>
  );
}
