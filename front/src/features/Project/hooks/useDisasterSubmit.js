import {useState} from 'react';
import {postDisasterGeometry, postDisasterLinkGeometry, postNuclearGeometry} from "../../../services/api.js";
import {moveMap} from "../../../utils/mapNavigation.js";

import {createDisasterPayload, createNuclearPayload, isNuclearDisaster} from "../../../utils/disasterPayload.js";
import {addGeometries} from "../../../utils/mapGeometry.js"


export function useDisasterSubmit(mapInstance) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function submitDisaster(data) {
    if (!data) {
      return {success: false, error: 'No data provided'};
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. 재난 타입 확인
      const isNuclear = isNuclearDisaster(data.disaster);

      // 2. Payload 생성
      const payload = isNuclear
        ? createNuclearPayload(data)
        : createDisasterPayload(data);

      console.log(`${isNuclear ? 'Nuclear' : 'Disaster'} 데이터 전송:`, payload);

      // 재난 범위 API 호출
      const disasterResponse = isNuclear
        ? await postNuclearGeometry(payload)
        : await postDisasterGeometry(payload);

      const linkResponse = postDisasterLinkGeometry

      // 링크 API 호출
      console.log('✅ 서버 응답:', disasterResponse);

      moveMap(mapInstance.current, parseFloat(data.coordinates.x), parseFloat(data.coordinates.y), 14, true, 600);

      if (mapInstance.current && disasterResponse) {
        addGeometries(mapInstance, disasterResponse, isNuclear)
      }

      return {
        success: true,
        data: disasterResponse
      };

    } catch (err) {
      console.error('❌ 제출 실패:', err);
      const errorMessage = err.message || '알 수 없는 오류가 발생했습니다';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * 에러 초기화
   */
  function clearError() {
    setError(null);
  }

  return {
    submitDisaster,
    isSubmitting,
    error,
    clearError
  };
}