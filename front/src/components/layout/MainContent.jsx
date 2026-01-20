import MainHeader from "./MainHeader.jsx";
import ProjectAddButton from "../common/ProjectAddButton.jsx";
import DocumentIcon from "../common/DocumentIcon.jsx";
import EmptyProject from "../../features/Project/pages/EmptyProject.jsx";
import CreateProject from "../../features/Project/pages/CreateProject.jsx"

export default function MainContent({
  mainName,
  viewMode,
  selectedProject,
  onCreateProject
}) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <MainHeader mainName={mainName} />

      {viewMode === 'empty' && (
        <EmptyProject onCreateProject={onCreateProject} />
      )}

      {viewMode === 'create' && (
        <CreateProject

        />
      )}

    </div>
  );
}