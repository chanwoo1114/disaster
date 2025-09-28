import BackgroundVideo from "../assets/videos/video.mp4";
import { useNavigate } from "react-router-dom";

export default function Home () {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen">
      {/* 비디오 배경 */}
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={BackgroundVideo} type='video/mp4' />
      </video>

      <div className="absolute inset-0 bg-black bg-opacity-20"></div>

      <div className="relative flex flex-col items-center justify-center h-full space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center leading-tight">
          재난대피 시뮬레이터
        </h1>

        <button
          onClick={() => navigate('/map')}
          className="px-8 py-3 bg-white text-gray-900 text-lg font-medium rounded-lg shadow-lg hover:bg-gray-100 transition-colors duration-200"
        >
          시작하기
        </button>
      </div>
    </div>
  )
}