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
    
  }

  const currentLocation = selectedDisaster ? locationsByDisaster[selectedDisaster] || [] : [];

  console.log(selectedDisaster)
  console.log(selectedLocation)
  console.log(currentLocation)

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
            <p className="font-bold text-lg text-gray-950 mb-2">Disaster Area</p>
            <div>
              <LocationSelector
                locations={currentLocation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
