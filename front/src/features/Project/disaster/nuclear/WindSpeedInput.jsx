import { useState, useEffect, useRef } from 'react';
import SectionSubTitle from "../../../../components/common/SectionSubTitle.jsx";
import InputField from "../../../../components/common/InputField.jsx";

export default function WindSpeedInput({ value, onChange, maxLimit }) {
  const [warningMsg, setWarningMsg] = useState('');
  const warningTimerRef = useRef(null);

  useEffect(() => {
    setWarningMsg('');
  }, [maxLimit]);

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      onChange('');
      setWarningMsg('');
      return;
    }

    const numValue = parseFloat(inputValue);
    const limit = parseFloat(maxLimit) || 0;

    if (numValue > limit) {
      onChange(limit);

      setWarningMsg(`최대 UPZ 범위(${limit}km)를 초과할 수 없습니다.`);

      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      warningTimerRef.current = setTimeout(() => {
        setWarningMsg('');
      }, 3000);

    } else {
      onChange(inputValue);
      setWarningMsg('');
    }
  };

  return (
    <div>
      <SectionSubTitle>
        풍속
      </SectionSubTitle>
      <div className="relative">
        <InputField
          type="number"
          className={`w-full pr-[180px] transition-all duration-200 ${
            warningMsg ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
          }`}
          value={value}
          onChange={handleInputChange}
          max={maxLimit}
          unit="km (최대 UPZ 범위 한정)"
          step="0.1"
          paddingRight="pr-40"
        />
      </div>

      <div className={`text-xs text-red-500 mt-1 font-medium h-4 transition-opacity duration-300 ${warningMsg ? 'opacity-100' : 'opacity-0'}`}>
        {warningMsg}
      </div>
    </div>
  );
}
