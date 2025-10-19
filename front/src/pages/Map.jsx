import { useLocation } from "react-router-dom";
import {useEffect, useRef, useState} from 'react';
import { initializeMap } from "../utils/mapInit.js";
import ModalMap from "../components/ModalMap.jsx";

export default function Map() {
  const basemapType='GRAPHIC_WHITE'
  const location = useLocation();
  const mapInstance = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    mapInstance.current = initializeMap('vmap', basemapType);
  }, []);

  function handleModalComplete(data) {
    setSelectedData(data);
    setIsModalOpen(false);
  }

  let mapClass = 'w-full h-full transition ';
  if (isModalOpen) {
    mapClass += 'blur-sm opacity-70 pointer-events-none';
  } else {
    mapClass += 'blur-0 opacity-100 pointer-events-auto';
  }

  return (
    <div className="relative w-screen h-screen">
      <div id="vmap" className={mapClass} />
      {isModalOpen && (
        <ModalMap
          onComplete={handleModalComplete}
        />
      )}
    </div>
  );
}
