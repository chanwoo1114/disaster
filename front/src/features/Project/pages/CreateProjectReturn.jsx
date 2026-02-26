import {disasterTypes} from "../../../data/disasters.js";
import {locationsByDisaster} from "../../../data/locations.js";

import DisasterTypeSection from "../disaster/DisasterTypeSection.jsx"
import {useDisasterForm} from "../hooks/useDisasterForm.js";
import DisasterParameters from "../disaster/DisasterParameters.jsx";
import LocationSelector from "../map/LocationSelector.jsx";
import MiniMap from "../map/MiniMap.jsx"
import NuclearWindSettings from "../disaster/nuclear/NuclearWindSettings.jsx";

export default function CreateProject () {
  const {
    selectedDisaster,
    selectedLocation,
    locationName,
    coordinates,
    mapCenter,
    disasterParams,
    handleSelectDisaster,
    handleLocationChange,
    handleMapClick,
    handleParamChange,
    handleCoordinatesChange,
    handleLocationNameChange,
  } = useDisasterForm();

  const currentLocations = selectedDisaster
    ? (locationsByDisaster[selectedDisaster] || [])
    : [];

  const isNuclear = selectedDisaster === 'nuclear';
  const inputStyle = "w-full rounded-lg border-gray-200 bg-gray-100 p-1"

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 px-4 py-2 overflow-y-auto">
          <DisasterTypeSection
            disasterTypes={disasterTypes}
            selectedDisaster={selectedDisaster}
            onSelectDisaster={handleSelectDisaster}
          />
          {selectedDisaster && (
            <div className="flex gap-4">
              <LocationSelector
                locations={currentLocations}
                selectedLocation={selectedLocation}
                locationName={locationName}
                onLocationChange={(location) => handleLocationChange(location, locationsByDisaster)}
                coordinates={coordinates}
                onCoordinatesChange={handleCoordinatesChange}
                onLocationNameChange={handleLocationNameChange}
              />

              {selectedLocation && (
                  <MiniMap
                    location={selectedLocation}
                    center={mapCenter}
                    onMapClick={handleMapClick}
                  />
              )}
            </div>
          )}
          <div>
            {selectedLocation && (
              <DisasterParameters
                selectedDisaster={selectedDisaster}
                disasterParams={disasterParams}
                onParamChange={handleParamChange}
              />
            )}
          </div>
        </div>
        <div className="w-1/2 px-4 py-2 overflow-y-auto">
          {isNuclear && selectedLocation && (
            <NuclearWindSettings
              windDirection={disasterParams.windDirection}
              windSpeed={disasterParams.windSpeed || ''}
              pazRadius={disasterParams.radius1}
              upzRadius={disasterParams.radius2}
              onWindDirectionChange={(value) => {
                handleParamChange('windDirection', value);
              }}
              onWindSpeedChange={(value) => {
                handleParamChange('windSpeed', value);
              }}
            />
          )}
        </div>
      </div>
      <div className="h-20 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
        <button
          type="button"
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          삭제
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          등록
        </button>
      </div>
    </div>
  )
}
