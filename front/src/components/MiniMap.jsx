import {useEffect, useRef} from "react";
import {addMarker, moveMap, removeMarker} from "../utils/mapNavigation.js";
import {initializeMap} from "../utils/mapInit.js";
import {addMapClickListener} from "../utils/mapInteraction.js";

const SEOUL_CITY_HALL = {x: 126.9780, y: 37.5665};

export default function MiniMap({location, center, onMapClick}) {
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const clickListenerRemover = useRef(null);

  // 줌 인 함수
  const handleZoomIn = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      const currentZoom = view.getZoom();
      view.setZoom(currentZoom + 1);
    }
  };

  // 줌 아웃 함수
  const handleZoomOut = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      const currentZoom = view.getZoom();
      view.setZoom(currentZoom - 1);
    }
  };

  // 초기 지도 생성
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

  // location 변경 시 처리
  useEffect(() => {
    if (!mapInstance.current) return;

    // "map-select" 모드
    if (location === "map-select") {
      // 기존 마커 제거
      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
        markerLayer.current = null;
      }

      // 서울시청으로 애니메이션 이동
      moveMap(mapInstance.current, SEOUL_CITY_HALL.x, SEOUL_CITY_HALL.y, 12, true);

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

            // 클릭 시 애니메이션으로 이동 (현재 줌 유지)
            moveMap(mapInstance.current, coordinates.x, coordinates.y, currentZoom, true);

            if (onMapClick) {
              onMapClick(coordinates);
            }
          }
        );
      }
    }
    // 일반 지역 선택 (애니메이션 없이 즉시 이동)
    else if (center) {
      // 클릭 이벤트 리스너 제거
      if (clickListenerRemover.current) {
        clickListenerRemover.current();
        clickListenerRemover.current = null;
      }

      // 기존 마커 제거
      if (markerLayer.current) {
        removeMarker(mapInstance.current, markerLayer.current);
      }

      // 새 마커 생성
      markerLayer.current = addMarker(mapInstance.current, center.x, center.y);

      // 즉시 이동 (애니메이션 없음)
      moveMap(mapInstance.current, center.x, center.y, 12, false);
    }
  }, [location]);

  return (
    <div className="relative h-64">
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
