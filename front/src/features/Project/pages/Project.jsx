import { useNavigate } from "react-router-dom";
import { deleteProject } from "../../../services/api.js";
import { disasterTypes } from "../../../data/disasters.js";
import { locationsByDisaster } from "../../../data/locations.js";
import DisasterTypeSection from "../disaster/DisasterTypeSection.jsx";
import DisasterParameters from "../disaster/DisasterParameters.jsx";
import LocationSelector from "../map/LocationSelector.jsx";
import MiniMap from "../map/MiniMap.jsx";
import NuclearWindSettings from "../disaster/nuclear/NuclearWindSettings.jsx";
import SectionTitle from "../../../components/common/SectionTitle.jsx";
import FileUploadBox from "../disaster/FileUploadBox.jsx";
import { useProjectForm } from "../hooks/useProjectForm.js";

export default function Project({ onCancel, selectedProject, onSuccess }) {
  const isViewMode = !!selectedProject;
  const navigate = useNavigate();

  // 항상 호출 (React hooks 규칙)
  const formHook = useProjectForm({ onSuccess });
  const { register, handleSubmit, formState: { errors } } = formHook.form;

  // view: selectedProject에서, create: formHook에서
  const selectedDisaster = isViewMode ? selectedProject.disasterType : formHook.selectedDisaster;
  const currentLocations = selectedDisaster ? (locationsByDisaster[selectedDisaster] || []) : [];

  const matchedLocation = isViewMode
    ? currentLocations.find(loc => loc.x === selectedProject.lng && loc.y === selectedProject.lat)
    : null;

  const selectedLocation = isViewMode
    ? (matchedLocation?.name || 'map-select')
    : formHook.selectedLocation;

  const coordinates = isViewMode
    ? { x: selectedProject.lng, y: selectedProject.lat }
    : formHook.coordinates;

  const mapCenter = isViewMode
    ? { x: selectedProject.lng, y: selectedProject.lat }
    : formHook.mapCenter;

  const disasterParams = isViewMode
    ? {
        radius1: selectedProject.radius1,
        radius2: selectedProject.radius2,
        radius3: selectedProject.radius3,
        radius4: selectedProject.radius4,
        windDirection: selectedProject.windDirection,
        windSpeed: selectedProject.windSpeed,
      }
    : formHook.disasterParams;

  const isNuclear = selectedDisaster === 'nuclear';

  const noop = () => {};

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteProject(selectedProject.id);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('프로젝트 삭제 실패', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  const mainClass = 'w-1/2 p-4 overflow-y-auto';

  // view/create 공통 렌더링
  const Wrapper = isViewMode ? 'div' : 'form';
  const wrapperProps = isViewMode ? {} : { onSubmit: handleSubmit(formHook.onSubmit) };

  return (
    <div className="flex flex-col h-full">
      <Wrapper {...wrapperProps} className="flex flex-col h-full">
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽 컬럼 */}
          <div className={mainClass}>
            <div>
              <SectionTitle>프로젝트 정보</SectionTitle>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트명 {!isViewMode && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  {...(isViewMode
                    ? { value: selectedProject.projectName, readOnly: true }
                    : register('projectName')
                  )}
                  placeholder="프로젝트명을 입력하세요"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                    isViewMode
                      ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'
                      : errors.projectName
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={!isViewMode && formHook.isSubmitting}
                  maxLength={100}
                />
                {!isViewMode && errors.projectName && (
                  <p className="text-red-500 text-sm mt-1">{errors.projectName.message}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  {...(isViewMode
                    ? { value: selectedProject.projectDescription || '', readOnly: true }
                    : register('projectDescription')
                  )}
                  placeholder="프로젝트 설명을 입력하세요 (선택사항)"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none resize-none ${
                    isViewMode
                      ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1'
                  }`}
                  rows={3}
                  disabled={!isViewMode && formHook.isSubmitting}
                  maxLength={500}
                />
              </div>
            </div>

            <div className={isViewMode ? 'pointer-events-none' : ''}>
              <DisasterTypeSection
                disasterTypes={disasterTypes}
                selectedDisaster={selectedDisaster}
                onSelectDisaster={isViewMode ? noop : formHook.handleSelectDisaster}
              />
            </div>
            {!isViewMode && errors.disasterType && (
              <p className="text-red-500 text-sm mt-1">{errors.disasterType.message}</p>
            )}

            {selectedDisaster && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 h-[330px]">
                  <div className={`w-1/3 ${isViewMode ? 'pointer-events-none' : ''}`}>
                    <LocationSelector
                      locations={currentLocations}
                      selectedLocation={selectedLocation}
                      onLocationChange={isViewMode ? noop : (loc) => formHook.handleLocationChange(loc, currentLocations)}
                      coordinates={coordinates}
                      onCoordinatesChange={isViewMode ? noop : formHook.handleCoordinatesChange}
                    />
                    {!isViewMode && errors.selectedLocation && (
                      <p className="text-red-500 text-sm mt-1">{errors.selectedLocation.message}</p>
                    )}
                  </div>

                  <div className="flex-1 h-full">
                    <MiniMap
                      location={isViewMode ? (matchedLocation?.name || 'view') : selectedLocation}
                      center={mapCenter}
                      onMapClick={isViewMode ? noop : formHook.handleMapClick}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={isViewMode ? 'pointer-events-none' : ''}>
              {selectedDisaster && (
                <DisasterParameters
                  selectedDisaster={selectedDisaster}
                  disasterParams={disasterParams}
                  onParamChange={isViewMode ? noop : formHook.handleParamChange}
                />
              )}
            </div>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className={mainClass}>
            {isNuclear && selectedDisaster && (
              <div className={isViewMode ? 'pointer-events-none' : ''}>
                <NuclearWindSettings
                  windDirection={disasterParams.windDirection}
                  windSpeed={disasterParams.windSpeed || ''}
                  pazRadius={disasterParams.radius1}
                  upzRadius={disasterParams.radius2}
                  onWindDirectionChange={isViewMode ? noop : (value) => formHook.handleParamChange('windDirection', value)}
                  onWindSpeedChange={isViewMode ? noop : (value) => formHook.handleParamChange('windSpeed', value)}
                />
              </div>
            )}

            {!isViewMode && formHook.selectedLocation && (
              <div>
                <SectionTitle>파일 업로드</SectionTitle>
                <FileUploadBox onFileSelect={formHook.handleFileSelect} disabled={formHook.isSubmitting} />

                {formHook.uploadedFile && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {formHook.uploadedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(formHook.uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {!formHook.isSubmitting && (
                        <button
                          type="button"
                          onClick={() => formHook.setUploadedFile(null)}
                          className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          제거
                        </button>
                      )}
                    </div>

                    {formHook.isSubmitting && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>업로드 중...</span>
                          <span>{formHook.uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${formHook.uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 하단 바 */}
        {isViewMode ? (
          <div className="h-16 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => navigate('/result', { state: { project: selectedProject } })}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              결과 보기
            </button>
          </div>
        ) : (
          <div className="h-20 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={formHook.isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={formHook.isSubmitting}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {formHook.isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {formHook.uploadProgress < 100 ? '파일 업로드 중...' : '프로젝트 생성 중...'}
                </>
              ) : (
                '등록'
              )}
            </button>
          </div>
        )}
      </Wrapper>
    </div>
  );
}
