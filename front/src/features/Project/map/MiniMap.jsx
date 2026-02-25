import {useEffect, useRef} from "react";
import {moveMap} from "../../../utils/mapNavigation.js";
import {addMarker, removeMarker} from "../../../utils/mapMarkers.js";
import {initializeMap} from "../../../utils/mapInit.js";
import {addMapClickListener} from "../../../utils/mapInteraction.js";
import {SEOUL_CITY_HALL} from "../../../constants/index.js";

export default function MiniMap({location, center, onMapClick}) {
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const clickListenerRemover = useRef(null);

  const handleZoomIn = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      const currentZoom = view.getZoom();
      view.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      const currentZoom = view.getZoom();
      view.setZoom(currentZoom - 1);
    }
  };

  useEffect(() => {
    mapInstance.current = initializeMap('minimap', 'GRAPHIC');

    return () => {
      if (clickListenerRemover.current) {
        clickListenerRemover.current();
      }
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (location === "map-select") {
      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
        markerLayer.current = null;
      }

      // 클릭 이벤트 리스너 등록
      if (!clickListenerRemover.current) {
        clickListenerRemover.current = addMapClickListener(
          mapInstance.current,
          (coordinates) => {
            const currentZoom = mapInstance.current.getView().getZoom();

            if (markerLayer.current) {
              removeMarker(mapInstance.current, markerLayer.current);
            }

            markerLayer.current = addMarker(
              mapInstance.current,
              coordinates.x,
              coordinates.y
            );

            moveMap(mapInstance.current, coordinates.x, coordinates.y, currentZoom, true);

            if (onMapClick) {
              onMapClick(coordinates);
            }
          }
        );
      }

      if (center && center.x && center.y) {
        const isSeoulCityHall = center.x === SEOUL_CITY_HALL.x && center.y === SEOUL_CITY_HALL.y;

        if (!isSeoulCityHall) {
          if (markerLayer.current) {
            removeMarker(mapInstance.current, markerLayer.current);
          }
          markerLayer.current = addMarker(mapInstance.current, center.x, center.y);
          moveMap(mapInstance.current, center.x, center.y, 12, true);
        } else {
          moveMap(mapInstance.current, SEOUL_CITY_HALL.x, SEOUL_CITY_HALL.y, 12, true);
        }
      } else {
        moveMap(mapInstance.current, SEOUL_CITY_HALL.x, SEOUL_CITY_HALL.y, 12, true);
      }
    }
    else if (center && center.x && center.y) {
      if (clickListenerRemover.current) {
        clickListenerRemover.current();
        clickListenerRemover.current = null;
      }

      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
      }

      markerLayer.current = addMarker(mapInstance.current, center.x, center.y);

      moveMap(mapInstance.current, center.x, center.y, 12, false);
    }
  }, [location, center]);

  return (
    <div className="relative w-full h-full">
      <div
        id='minimap'
        className={`w-full h-full ${location === "map-select" ? 'cursor-pointer' : ''}`}
      />

      {/* 줌 컨트롤 버튼 */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white hover:bg-gray-100 shadow-md rounded flex items-center justify-center font-bold text-gray-700 border border-gray-300 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white hover:bg-gray-100 shadow-md rounded flex items-center justify-center font-bold text-gray-700 border border-gray-300 transition-colors"
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  )
}
