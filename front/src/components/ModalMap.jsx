import {disasterTypes} from "../data/disasters.js";
import {locationsByDisaster} from "../data/locations.js";
import {useDisasterForm} from "../hooks/useDisasterForm.js";
import ModalLayout from "./modal/ModalLayout.jsx";
import DisasterTypeSection from "./modal/DisasterTypeSection.jsx";
import DisasterAreaSection from "./modal/DisasterAreaSection.jsx";
import DisasterParameters from "./modal/DisasterParameters.jsx";

export default function ModalMap({onClose}) {
  const {
    selectedDisaster,
    selectedLocation,
    coordinates,
    mapCenter,
    disasterParams,
    handleSelectDisaster,
    handleLocationChange,
    handleMapClick,
    handleParamChange,
  } = useDisasterForm();

  const currentLocation = selectedDisaster ? locationsByDisaster[selectedDisaster] || [] : [];
  const inputStyle = "border rounded border-gray-200 bg-gray-100 p-0.5 text-gray-800";

  function handleComplete() {
    const data = {
      disaster: selectedDisaster,
      location: selectedLocation,
      coordinates: {
        x: coordinates.x,
        y: coordinates.y
      },
      params: disasterParams
    };

    if (onClose) {
      onClose(data);
    }
  }

  return (
    <ModalLayout onClose={onClose}>
      <DisasterTypeSection
        disasterTypes={disasterTypes}
        selectedDisaster={selectedDisaster}
        onSelectDisaster={handleSelectDisaster}
      />

      <DisasterAreaSection
        locations={currentLocation}
        selectedLocation={selectedLocation}
        selectedDisaster={selectedDisaster}
        coordinates={coordinates}
        mapCenter={mapCenter}
        onLocationChange={(loc) => handleLocationChange(loc, locationsByDisaster)}
        onMapClick={handleMapClick}
        inputStyle={inputStyle}
      />

      {selectedDisaster && (
        <DisasterParameters
          selectedDisaster={selectedDisaster}
          disasterParams={disasterParams}
          onParamChange={handleParamChange}
          inputStyle={inputStyle}
        />
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Complete
        </button>
      </div>
    </ModalLayout>
  );
}
