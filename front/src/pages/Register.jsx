import {useEffect, useRef, useState} from 'react';
import {initializeMap} from "../utils/mapInit.js";
import ModalMap from "../components/ModalMap.jsx";
import {useDisasterSubmit} from "../hooks/useDisasterSubmit.js";
import {useLocation} from "react-router-dom";

export default function Register() {
  const basemapType = 'GRAPHIC_WHITE';
  const location = useLocation();
  const mapInstance = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedData, setSelectedData] = useState(null);

  // 지도 초기화
  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    mapInstance.current = initializeMap('vmap', basemapType);
  }, []);


  const {submitDisaster, isSubmitting} = useDisasterSubmit(mapInstance);

  // 모달 완료 핸들러
  async function handleModalComplete(data) {
    // // ⭐ Custom Hook으로 제출
    // if (result.success) {
    //     // 성공: 데이터 저장 및 모달 닫기
    //     setSelectedData(data);
    //     setIsModalOpen(false);
    //     alert('재난 정보가 성공적으로 저장되었습니다!');
    // } else {
    //     // 실패: 에러 메시지 표시 (모달 유지)
    //     alert(`저장 실패: ${result.error}`);
    // }

    setSelectedData(data);
    setIsModalOpen(false);
    submitDisaster(data);

  }

  let mapClass = 'w-full h-full transition ';
  if (isModalOpen) {
    mapClass += 'blur-sm opacity-70 pointer-events-none';
  } else {
    mapClass += 'blur-0 opacity-100 pointer-events-auto';
  }

  return (
    <div className="relative w-screen h-screen">
      {/* 지도 영역 */}
      <div id="vmap" className={mapClass}/>

      {/* 모달 */}
      {isModalOpen && (
        <ModalMap onClose={handleModalComplete}/>
      )}
    </div>
  );
}
