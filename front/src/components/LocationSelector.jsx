export default function LocationSelector({
  locations,

}) {
  return (
    <select
      className="w-1/3 p-1 border border-gray-800 rounded"
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