import { disasterTypes } from "../../../data/disasters.js";
import { locationsByDisaster } from "../../../data/locations.js";
import DisasterTypeSection from "../disaster/DisasterTypeSection.jsx";
import DisasterParameters from "../disaster/DisasterParameters.jsx";
import NuclearWindSettings from "../disaster/nuclear/NuclearWindSettings.jsx";
import ProjectInfoSection from "../components/ProjectInfoSection.jsx";
import LocationSection from "../components/LocationSection.jsx";
import FileUploadSection from "../components/FileUploadSection.jsx";
import { useProjectForm } from "../hooks/useProjectForm.js";
import { Loader2 } from 'lucide-react';

export default function ProjectCreate({ onCancel, onSuccess }) {
  const formHook = useProjectForm({ onSuccess });
  const { register, handleSubmit, formState: { errors } } = formHook.form;

  const {
    selectedDisaster,
    selectedLocation,
    coordinates,
    mapCenter,
    disasterParams,
    uploadedFile,
    uploadProgress,
    isSubmitting,
    handleSelectDisaster,
    handleLocationChange,
    handleCoordinatesChange,
    handleMapClick,
    handleParamChange,
    handleFileSelect,
    setUploadedFile,
    onSubmit,
  } = formHook;

  const currentLocations = selectedDisaster ? (locationsByDisaster[selectedDisaster] || []) : [];
  const isNuclear = selectedDisaster === 'nuclear';

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽 컬럼 */}
          <div className="w-1/2 p-6 overflow-y-auto space-y-6">
            <ProjectInfoSection
              isViewMode={false}
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
            />

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <DisasterTypeSection
                disasterTypes={disasterTypes}
                selectedDisaster={selectedDisaster}
                onSelectDisaster={handleSelectDisaster}
              />
              {errors.disasterType && (
                <p className="text-red-500 text-xs mt-1">{errors.disasterType.message}</p>
              )}
            </section>

            {selectedDisaster && (
              <LocationSection
                isViewMode={false}
                locations={currentLocations}
                selectedLocation={selectedLocation}
                onLocationChange={(loc) => handleLocationChange(loc, currentLocations)}
                coordinates={coordinates}
                onCoordinatesChange={handleCoordinatesChange}
                mapCenter={mapCenter}
                onMapClick={handleMapClick}
                error={errors.selectedLocation?.message}
              />
            )}
          </div>

          <div className="w-1/2 p-6 overflow-y-auto space-y-6">
            {selectedDisaster && (
              <section className="bg-white rounded-xl border border-gray-200 p-5">
                <DisasterParameters
                  selectedDisaster={selectedDisaster}
                  disasterParams={disasterParams}
                  onParamChange={handleParamChange}
                />
              </section>
            )}

            {isNuclear && (
              <section className="bg-white rounded-xl border border-gray-200 p-5">
                <NuclearWindSettings
                  windDirection={disasterParams.windDirection}
                  windSpeed={disasterParams.windSpeed || ''}
                  pazRadius={disasterParams.radius1}
                  upzRadius={disasterParams.radius2}
                  onWindDirectionChange={(value) => handleParamChange('windDirection', value)}
                  onWindSpeedChange={(value) => handleParamChange('windSpeed', value)}
                />
              </section>
            )}

            {selectedDisaster && (
              <FileUploadSection
                onFileSelect={handleFileSelect}
                uploadedFile={uploadedFile}
                onRemoveFile={() => setUploadedFile(null)}
                isSubmitting={isSubmitting}
                uploadProgress={uploadProgress}
                error={errors.uploadedFile?.message}
              />
            )}
          </div>
        </div>

        <div className="h-16 border-t border-gray-200 bg-white px-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress < 100 ? '파일 업로드 중...' : '프로젝트 생성 중...'}
              </>
            ) : (
              '등록'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
