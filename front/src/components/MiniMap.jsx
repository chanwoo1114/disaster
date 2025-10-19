import { useEffect, useRef } from "react";
import {addMarker, removeMarker} from "../utils/mapNavigation.js";
import {initializeMap} from "../utils/mapInit.js";
import {moveMap} from "../utils/mapNavigation.js";
import {addMapClickListener} from "../utils/mapInteraction.js";

const SEOUL_CITY_HALL = { x: 126.9780, y: 37.5665 };

export default function MiniMap({ location, center, onMapClick }) {
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const clickListenerRemover = useRef(null);

  useEffect(() => {
    mapInstance.current = initializeMap('minimap', 'GRAPHIC');

    if (mapInstance.current && location === "map-select") {
      moveMap(mapInstance.current, center.x, center.y);
    } else if (mapInstance.current && center ) {
      markerLayer.current = addMarker(mapInstance.current, center.x, center.y);
      moveMap(mapInstance.current, center.x, center.y);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (mapInstance.current && location === "map-select") {
      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
        markerLayer.current = null;
      }

      moveMap(mapInstance.current, SEOUL_CITY_HALL.x, SEOUL_CITY_HALL.y);

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

            moveMap(mapInstance.current, coordinates.x, coordinates.y, currentZoom);

            if (onMapClick) {
              onMapClick(coordinates);
            }
          }
        );
      }
    } else if (center) {
      if (clickListenerRemover.current) {
        clickListenerRemover.current();
        clickListenerRemover.current = null;
      }

      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
      }

      markerLayer.current = addMarker(mapInstance.current, center.x, center.y);

      moveMap(mapInstance.current, center.x, center.y);
    }
  }, [location]);

  return (
    <div
      id='minimap'
      className="h-64"
    />
  )
}