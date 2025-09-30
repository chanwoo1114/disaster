import DisasterType from "./DisasterType.jsx";
import {useState} from "react";
import {disasterTypes} from "../data/disasters.js";
import {locationsByDisaster} from "../data/locations.js";
import LocationSelector from "./LocationSelector.jsx";

const SEOUL_CITY_HALL = { x: 126.9780, y: 37.5665 };

export default function ModalMap() {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [coordinates, setCoordinates] = useState({ x: "", y: "" });
  const [mapCenter, setMapCenter] = useState(SEOUL_CITY_HALL);

  function handleSelectDisaster(disaster) {
    setSelectedDisaster(disaster);
    setSelectedLocation("")
    setCoordinates({ x: "", y: "" });
    setMapCenter(SEOUL_CITY_HALL);
  }

  function handleLocationChange(location) {
    setSelectedLocation(location);

    if (location === "map-select") {
      setMapCenter(SEOUL_CITY_HALL);
      setCoordinates({x: SEOUL_CITY_HALL.x.toString(), y: SEOUL_CITY_HALL.y.toString()});
    } else if (location) {
      const currentLocation = locationsByDisaster[selectedDisaster] || [];
      const locationData = currentLocation.find(loc => loc.name === location);

      if (locationData) {
        setMapCenter({x: locationData.x, y: locationData.y});
        setCoordinates({x: locationData.x.toString(), y: locationData.y.toString()});
      }
    }
  }

  const currentLocation = selectedDisaster ? locationsByDisaster[selectedDisaster] || [] : [];
  const testStyle = "border rounded border-gray-800 bg-gray-100 p-0.5"

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
                />
                <input
                  className={testStyle + "text-sm"}
                  value={coordinates.y}
                />
            </div>
            <div className="w=2/3">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
