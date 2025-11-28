import LocationSelector from "../LocationSelector.jsx";
import MiniMap from "../MiniMap.jsx";
import CoordinateInputs from "./CoordinateInputs.jsx";
import { SectionTitle } from "../common/SectionTitle.jsx"

export default function DisasterAreaSection({
  locations,
  selectedLocation,
  selectedDisaster,
  coordinates,
  mapCenter,
  onLocationChange,
  onMapClick,
  inputStyle
}) {
  return (
    <div className="mb-4">
      <SectionTitle>
        Disaster Area
      </SectionTitle>
      <div className="flex gap-4 items-start">
        <div className="w-1/3 max-w-xs flex flex-col gap-1">
          <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={onLocationChange}
            inputStyle={inputStyle}
          />
          <CoordinateInputs
            coordinates={coordinates}
            inputStyle={inputStyle}
          />
        </div>
        <div className="flex-1">
          {selectedDisaster && selectedLocation && (
            <MiniMap
              location={selectedLocation}
              center={mapCenter}
              onMapClick={onMapClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
