export default function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
  inputStyle
}) {
  return (
    <select
      value={selectedLocation}
      className={inputStyle}
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
  )
}