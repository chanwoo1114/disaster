import SectionTitle from "../../../components/common/SectionTitle.jsx";
import LocationSelector from "../map/LocationSelector.jsx";
import MiniMap from "../map/MiniMap.jsx";

export default function LocationSection({
  locations,
  selectedLocation,
  onLocationChange,
  coordinates,
  onCoordinatesChange,
  mapCenter,
  onMapClick,
  matchedLocationName,
  isViewMode,
  error,
}) {
  const noop = () => {};

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <SectionTitle>위치 선택</SectionTitle>
      <div className="flex gap-4 h-[330px]">
        <div className={`w-1/3 ${isViewMode ? 'pointer-events-none' : ''}`}>
          <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={isViewMode ? noop : onLocationChange}
            coordinates={coordinates}
            onCoordinatesChange={isViewMode ? noop : onCoordinatesChange}
          />
          {!isViewMode && error && (
            <p className="text-red-500 text-xs mt-1.5">{error}</p>
          )}
        </div>

        <div className="flex-1 h-full rounded-lg overflow-hidden border border-gray-200">
          <MiniMap
            location={isViewMode ? (matchedLocationName || 'view') : selectedLocation}
            center={mapCenter}
            onMapClick={isViewMode ? noop : onMapClick}
          />
        </div>
      </div>
    </section>
  );
}
