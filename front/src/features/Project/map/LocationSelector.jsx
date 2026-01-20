import { InputField } from "../../../components/common/InputField.jsx";

export default function LocationSelector({
  locations,
  selectedLocation,
  locationName,
  onLocationChange,
  coordinates,
  onCoordinatesChange,
  onLocationNameChange,
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
    <div>
      <div className="w-72">
        <select
          value={selectedLocation}
          className="w-full border rounded border-gray-200 bg-gray-100 p-1 text-gray-800"
          onChange={(event) => onLocationChange(event.target.value)}
        >
          <option value="">지역을 선택하세요</option>
          {locations.length > 0 && (
            <option value="map-select">지도에서 선택</option>
          )}
          {locations.map((location) => (
            <option key={location.name} value={location.name}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {selectedLocation && (
        <div className="flex flex-col gap-2 mt-2">
          <InputField
            type='text'
            placeholder="위치"
            onChange={(e) => onLocationNameChange && onLocationNameChange(e.target.value)}            readOnly={!isMapSelectMode}
            value={isMapSelectMode ? (locationName || '') : selectedLocation}
          />
          <InputField
            type='number'
            placeholder='위도'
            step="0.000001"
            onChange={handleXChange}
            readOnly={!isMapSelectMode}
            value={coordinates?.x || ''}
          />
          <InputField
            type='number'
            placeholder='경도'
            step="0.000001"
            onChange={handleYChange}
            readOnly={!isMapSelectMode}
            value={coordinates?.y || ''}
          />
        </div>
      )
      }
    </div>
  )
}