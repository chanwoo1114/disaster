import InputField from "../../../components/common/InputField.jsx";
import { MapPin } from 'lucide-react';

export default function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
  coordinates,
  onCoordinatesChange,
}) {
  const isMapSelectMode = selectedLocation === 'map-select';

  const handleXChange = (e) => {
    if (onCoordinatesChange) {
      onCoordinatesChange({
        x: e.target.value,
        y: coordinates?.y || ''
      })
    }
  }

  const handleYChange = (e) => {
    if (onCoordinatesChange) {
      onCoordinatesChange({
        x: coordinates?.x || '',
        y: e.target.value
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <select
          value={selectedLocation}
          className="w-full border rounded-lg border-gray-300 bg-white pl-8 pr-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 appearance-none cursor-pointer"
          onChange={(event) => onLocationChange(event.target.value)}
        >
          <option value="">지역을 선택하세요</option>
          {locations.length > 0 && (
            <option value="map-select">지도에서 직접 선택</option>
          )}
          {locations.map((location) => (
            <option key={location.name} value={location.name}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {selectedLocation && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">경도 (X)</label>
            <InputField
              type='number'
              placeholder='경도'
              step="0.000001"
              onChange={handleXChange}
              readOnly={!isMapSelectMode}
              value={coordinates?.x || ''}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">위도 (Y)</label>
            <InputField
              type='number'
              placeholder='위도'
              step="0.000001"
              onChange={handleYChange}
              readOnly={!isMapSelectMode}
              value={coordinates?.y || ''}
            />
          </div>
        </div>
      )}
    </div>
  )
}
