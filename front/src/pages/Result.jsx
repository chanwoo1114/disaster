import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { initializeMap } from "../utils/mapInit.js";
import { moveMap } from "../utils/mapNavigation.js";
import { addMarker } from "../utils/mapMarkers.js";
import {
  getDisasterGeometry,
  getDisasterLinkGeometry,
  postUploadLocation,
  getPositionData,
} from "../services/api.js";
import {
  buildBufferParams,
  buildRoadParams,
  positionUploadParams,
} from "../utils/apiParams.js";
import { addRoadGeometry, addDisasterGeometry } from "../utils/mapGeometry.js";
import { timeToSeconds, secondsToHHMMSS, formatSeconds } from "../utils/timeUtils.js";
import { initPositionLayer, updatePositions } from "../utils/mapPosition.js";


const DISASTER_LABEL = {
  nuclear: "방사능",
  chemistry: "화학",
  storm: "태풍",
  flood: "홍수",
};

export default function Result() {
  const location = useLocation();
  const mapInstance = useRef(null);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  const [apiData, setApiData] = useState({
    bufferGeometry: null,
    roadGeometry: null,
    selectedTime: null,
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [firstTime, setFirstTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [lastTime, setLastTime] = useState(null);

  const speeds = [1, 2, 4, 8];

  // 프로그레스 비율
  const progress =
    currentTime !== null &&
    firstTime !== null &&
    lastTime !== null &&
    lastTime !== firstTime
      ? ((currentTime - firstTime) / (lastTime - firstTime)) * 100
      : 0;

  // 프로그레스바 클릭
  const handleProgressClick = (e) => {
    if (!isLoaded || firstTime === null || lastTime === null) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    setCurrentTime(Math.round(firstTime + ratio * (lastTime - firstTime)));
  };

  // 맵 초기화
  useEffect(() => {
    mapInstance.current = initializeMap("result-map", "GRAPHIC_WHITE");
    moveMap(
      mapInstance.current,
      location.state.project.lng,
      location.state.project.lat
    );
    addMarker(
      mapInstance.current,
      location.state.project.lng,
      location.state.project.lat
    );
    initPositionLayer(mapInstance.current);
  }, []);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bufferParams = buildBufferParams(location.state.project);
        const roadParams = buildRoadParams(location.state.project);
        const uploadParams = positionUploadParams(location.state.project);

        const [bufferResponse, roadResponse, uploadResponse] =
          await Promise.all([
            getDisasterGeometry(bufferParams),
            getDisasterLinkGeometry(roadParams),
            postUploadLocation(uploadParams),
          ]);

        setApiData({
          bufferGeometry: bufferResponse.data,
          roadGeometry: roadResponse.data,
          selectedTime: uploadResponse.data,
        });

        setIsLoaded(true);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  // 시간 초기값 세팅 (초 단위로 변환)
  useEffect(() => {
    if (apiData.selectedTime) {
      const first = timeToSeconds(apiData.selectedTime.firstTime);
      const last = timeToSeconds(apiData.selectedTime.lastTime);
      setFirstTime(first);
      setCurrentTime(first);
      setLastTime(last);
    }
  }, [apiData.selectedTime]);

  // 지오메트리 렌더
  useEffect(() => {
    if (
      !mapInstance.current ||
      !apiData.bufferGeometry ||
      !apiData.roadGeometry
    )
      return;
    addDisasterGeometry(mapInstance.current, apiData.bufferGeometry);
    addRoadGeometry(mapInstance.current, apiData.roadGeometry);
  }, [apiData]);

  // 재생 타이머
  useEffect(() => {
    if (isPlaying && currentTime !== null) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + speed;
          if (lastTime && next >= lastTime) {
            setIsPlaying(false);
            return lastTime;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, lastTime]);

  // 위치 데이터 조회
  useEffect(() => {
    if (currentTime === firstTime || !isLoaded) return;

    const fetchPosition = async () => {
      try {
        const response = await getPositionData(
          location.state.project.disasterType,
          location.state.project.uploadId,
          currentTime
        );
        updatePositions(response.data);
      } catch (error) {
        console.log(error)
      }
    }

    fetchPosition();
  }, [currentTime]);

  return (
    <div className="relative h-screen">
      <div id="result-map" className="w-full h-full" />

      {/* 우측 상단 파란 시간 뱃지 */}
      <div className="absolute top-3 right-3 bg-blue-600/90 rounded-lg px-3.5 py-2 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
        <span
          className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-white animate-pulse" : "bg-blue-300"}`}
        />
        <span className="font-mono text-[13px] text-white tracking-wide">
          {formatSeconds(currentTime)}
        </span>
      </div>

      {/* 하단 바 */}
      <div
        className={`absolute bottom-3 left-3 right-3 bg-white rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.1)] border border-gray-200 transition-opacity ${isLoaded ? "opacity-100" : "opacity-50 pointer-events-none"}`}
      >
        {/* 재생/일시정지 */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.35)]"
        >
          {isPlaying ? (
            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 프로그레스바 */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 py-3 cursor-pointer"
        >
          <div className="h-[5px] bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full relative pointer-events-none"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 시간 */}
        <span className="font-mono text-[11px] text-slate-500 shrink-0">
          {formatSeconds(currentTime)} / {formatSeconds(lastTime)}
        </span>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* 배속 */}
        <div className="flex gap-1 shrink-0">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded-[5px] font-mono text-[12px] font-semibold transition ${
                speed === s
                  ? "bg-blue-500 text-white"
                  : "text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* 정보 */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[12px] text-slate-400">
            재난 <span className="text-slate-700 font-semibold">{DISASTER_LABEL[location.state.project.disasterType]}</span>
          </span>
          <span className="text-[12px] text-slate-400">
            차량 <span className="text-slate-700 font-semibold">1,024</span>
          </span>
        </div>
      </div>
    </div>
  );
}