import { useNavigate } from "react-router-dom";
import { deleteProject } from "../../../services/api.js";
import { disasterTypes } from "../../../data/disasters.js";
import { locationsByDisaster } from "../../../data/locations.js";
import DisasterTypeSection from "../disaster/DisasterTypeSection.jsx";
import DisasterParameters from "../disaster/DisasterParameters.jsx";
import NuclearWindSettings from "../disaster/nuclear/NuclearWindSettings.jsx";
import ProjectInfoSection from "../components/ProjectInfoSection.jsx";
import LocationSection from "../components/LocationSection.jsx";
import { Trash2, Eye } from 'lucide-react';

export default function ProjectView({ selectedProject, onSuccess }) {
  const navigate = useNavigate();
  const noop = () => {};

  const selectedDisaster = selectedProject.disasterType;
  const currentLocations = locationsByDisaster[selectedDisaster] || [];
  const matchedLocation = currentLocations.find(
    loc => loc.x === selectedProject.lng && loc.y === selectedProject.lat
  );

  const coordinates = { x: selectedProject.lng, y: selectedProject.lat };
  const mapCenter = { x: selectedProject.lng, y: selectedProject.lat };
  const selectedLocation = matchedLocation?.name || 'map-select';

  const disasterParams = {
    radius1: selectedProject.radius1,
    radius2: selectedProject.radius2,
    radius3: selectedProject.radius3,
    radius4: selectedProject.radius4,
    windDirection: selectedProject.windDirection,
    windSpeed: selectedProject.windSpeed,
  };

  const isNuclear = selectedDisaster === 'nuclear';

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteProject(selectedProject.id);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 p-6 overflow-y-auto space-y-6">
          <ProjectInfoSection
            isViewMode
            selectedProject={selectedProject}
          />

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="pointer-events-none">
              <DisasterTypeSection
                disasterTypes={disasterTypes}
                selectedDisaster={selectedDisaster}
                onSelectDisaster={noop}
              />
            </div>
          </section>

          {selectedDisaster && (
            <LocationSection
              isViewMode
              locations={currentLocations}
              selectedLocation={selectedLocation}
              coordinates={coordinates}
              mapCenter={mapCenter}
              matchedLocationName={matchedLocation?.name}
            />
          )}
        </div>

        <div className="w-1/2 p-6 overflow-y-auto space-y-6">
          {selectedDisaster && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="pointer-events-none">
                <DisasterParameters
                  selectedDisaster={selectedDisaster}
                  disasterParams={disasterParams}
                  onParamChange={noop}
                />
              </div>
            </section>
          )}

          {isNuclear && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="pointer-events-none">
                <NuclearWindSettings
                  windDirection={disasterParams.windDirection}
                  windSpeed={disasterParams.windSpeed || ''}
                  pazRadius={disasterParams.radius1}
                  upzRadius={disasterParams.radius2}
                  onWindDirectionChange={noop}
                  onWindSpeedChange={noop}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="h-16 border-t border-gray-200 bg-white px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
        <button
          type="button"
          onClick={() => navigate('/result', { state: { project: selectedProject } })}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          결과 보기
        </button>
      </div>
    </div>
  );
}
