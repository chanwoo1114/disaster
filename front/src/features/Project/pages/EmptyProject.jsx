import DocumentIcon from "../../../components/common/DocumentIcon.jsx";
import ProjectAddButton from "../../../components/common/ProjectAddButton.jsx";

export default function EmptyProject({ onCreateProject }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6">
      <DocumentIcon className = "w-[640px] h-[640px]" />

      <div className="flex flex-col items-center gap-2">
        <h2 className="text-5xl font-bold text-gray-800">
          새로운 프로젝트를 만들어보세요
        </h2>
        <p className="text-2xl text-gray-500">
          Create your first project
        </p>
        <ProjectAddButton
          size="large"
          text="새 프로젝트"
          onClick={onCreateProject}
        />
      </div>
    </div>
  )
}