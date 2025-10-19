import {useState} from "react";
import {disasterTypes} from "../data/disasters.js";
import {locationsByDisaster} from "../data/locations.js";
import MiniMap from "./MiniMap.jsx";
import DisasterType from "./DisasterType.jsx";
import LocationSelector from "./LocationSelector.jsx";

const SEOUL_CITY_HALL = { x: 126.9780, y: 37.5665 };

export default function ModalMap() {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [coordinates, setCoordinates] = useState({ x: "", y: "" });
  const [mapCenter, setMapCenter] = useState("");

  // 재난 선택 핸들러
  function handleSelectDisaster(disaster) {
    setSelectedDisaster(disaster);
    setSelectedLocation("")
    setCoordinates({ x: "", y: "" });
    setMapCenter("");
  }

  // 재난 위치 변경 핸들러
  function handleLocationChange(location) {
    setSelectedLocation(location);

    if (location === "map-select") {
      setMapCenter(SEOUL_CITY_HALL);
      setCoordinates({ x: "", y: "" });
      return;
    }

    const currentLocation = locationsByDisaster[selectedDisaster] || [];
    const locationData = currentLocation.find(loc => loc.name === location);

    if (locationData) {
      setMapCenter({x: locationData.x, y: locationData.y});
      setCoordinates({
        x: locationData.x.toFixed(6),
        y: locationData.y.toFixed(6)
      });
    }
  }

  function handleMapClick(coords) {
    setCoordinates({
      x: coords.x.toFixed(6),
      y: coords.y.toFixed(6)
    });
    setMapCenter({
      x: coords.x,
      y: coords.y
    });
  }

  const isMapSelect = selectedLocation === "map-select";
  const currentLocation = selectedDisaster ? locationsByDisaster[selectedDisaster] || [] : [];
  const testStyle = "border rounded border-gray-800 bg-gray-100 p-0.5"

  // console.log("selectedDisaster: "+selectedDisaster)
  // console.log("selectedLocation: "+selectedLocation)
  // console.log("coordinates: ",coordinates)
  // console.log("mapCenter: ", mapCenter)

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded bg-white px-4 py-2">
            <p className="font-bold text-lg text-gray-950 mb-4">Disaster Type</p>
            <div className="flex items-center gap-6 mb-4">
              {disasterTypes.map(({ key, label, img}) => (
                <DisasterType
                  key={key}
                  label={label}
                  img={img}
                  isSelected={selectedDisaster === key}
                  onClick={() => handleSelectDisaster(key)}
                />
              ))}
            </div>
            <p className="font-bold text-lg text-gray-950 mb-1">Disaster Area</p>
            <div className="flex gap-4">
              <div className="w-1/3 p-1 flex flex-col gap-1">
                <LocationSelector
                  locations={currentLocation}
                  selectedLocation={selectedLocation}
                  onLocationChange={handleLocationChange}
                  inputStyle={testStyle}
                />
                <input
                  className={testStyle + "text-sm"}
                  value={coordinates.x}
                  placeholder="경도"
                  readOnly={!isMapSelect}
                />
                <input
                  className={testStyle + "text-sm"}
                  value={coordinates.y}
                  placeholder="위도"
                  readOnly={!isMapSelect}
                />
              </div>
              <div className="w-2/3">
                {selectedDisaster && selectedLocation && (
                  <MiniMap
                    location={selectedLocation}
                    center={mapCenter}
                    onMapClick={handleMapClick}
                  />
                )}
              </div>
            </div>
            <div>
              <button>
                Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
