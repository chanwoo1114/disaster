import { useState, useEffect } from 'react';

export default function WindSpeedInput({ value, onChange, inputStyle, maxLimit }) {
  // 경고 메시지 상태 관리
  const [warningMsg, setWarningMsg] = useState('');

  // maxLimit이 변경되면 경고 메시지 초기화 (선택사항)
  useEffect(() => {
    setWarningMsg('');
  }, [maxLimit]);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // 1. 빈 값 처리
    if (inputValue === '') {
      onChange('');
      setWarningMsg('');
      return;
    }

    const numValue = parseFloat(inputValue);
    const limit = parseFloat(maxLimit) || 0;

    // 2. 한계값 초과 시 로직
    if (numValue > limit) {
      // 값을 한계값으로 강제 고정
      onChange(limit);

      // ⭐ 경고 메시지 표시
      setWarningMsg(`최대 UPZ 범위(${limit}km)를 초과할 수 없습니다.`);

      // 3초 뒤에 메시지 자동으로 사라지게 하기 (UX 팁)
      setTimeout(() => {
        setWarningMsg('');
      }, 3000);

    } else {
      // 정상 범위면 값 반영하고 경고 끄기
      onChange(inputValue);
      setWarningMsg('');
    }
  };

  return (
    <div>
      <label className="text-sm text-gray-700 mb-1 block font-medium">
        풍속
      </label>

      <div className="relative">
        <input
          type="number"
          // 경고가 있을 때 테두리를 빨간색으로 변경 (ring-red-500)
          className={`${inputStyle} w-full pr-[180px] transition-all duration-200 ${
            warningMsg ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
          }`}
          value={value}
          onChange={handleInputChange}
          placeholder="0"
          min="0"
          max={maxLimit}
          step="0.1"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none ">
          km (최대 UPZ 범위 한정)
        </span>
      </div>

      {/* ⭐ 경고 메시지 노출 영역 (애니메이션 효과) */}
      <div className={`text-xs text-red-500 mt-1 font-medium h-4 transition-opacity duration-300 ${warningMsg ? 'opacity-100' : 'opacity-0'}`}>
        {warningMsg}
      </div>
    </div>
  );
}
