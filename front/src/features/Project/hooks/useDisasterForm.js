import {useState} from "react";

const SEOUL_CITY_HALL = {x: 126.9780, y: 37.5665};

export function useDisasterForm() {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState({x: "", y: ""});
  const [mapCenter, setMapCenter] = useState("");
  const [disasterParams, setDisasterParams] = useState({
    radius1: "",
    radius2: "",
    radius3: "",
    radius4: "",
    windDirection: "",
    windSpeed: ""
  });

  function handleSelectDisaster(disaster) {
    setSelectedDisaster(disaster);
    setSelectedLocation("");
    setLocationName("");
    setCoordinates({x: "", y: ""});
    setMapCenter("");
    setDisasterParams({
      radius1: "",
      radius2: "",
      radius3: "",
      radius4: "",
      windDirection: "",
      windSpeed: ""
    });
  }

  function handleLocationChange(location, locationsByDisaster) {
    setSelectedLocation(location);

    if (location === "map-select") {
      setMapCenter(SEOUL_CITY_HALL);
      setLocationName("");
      setCoordinates({x: "", y: ""});
      return;
    }

    const currentLocation = locationsByDisaster[selectedDisaster] || [];
    const locationData = currentLocation.find(loc => loc.name === location);

    if (locationData) {
      setLocationName(location);
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

  function handleParamChange(paramName, value) {
    setDisasterParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  }

  function handleCoordinatesChange(newCoordinates) {
    setCoordinates(newCoordinates);

    const x = parseFloat(newCoordinates.x);
    const y = parseFloat(newCoordinates.y);

    if (newCoordinates.x !== '' && newCoordinates.y !== '' && !isNaN(x) && !isNaN(y)) {
      console.log('test')
      setMapCenter({ x, y });
    }
  }

  function handleLocationNameChange(name) {
    setLocationName(name);
  }

  return {
    selectedDisaster,
    selectedLocation,
    locationName,
    coordinates,
    mapCenter,
    disasterParams,
    handleSelectDisaster,
    handleLocationChange,
    handleMapClick,
    handleParamChange,
    handleCoordinatesChange,
    handleLocationNameChange,
  };
}
