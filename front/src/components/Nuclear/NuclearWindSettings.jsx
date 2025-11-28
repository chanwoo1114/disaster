import WindSpeedInput from "./WindSpeedInput.jsx";
import { SectionTitle } from "../common/SectionTitle.jsx"
import WindDirectionSelector from "./WindDirectionSelector.jsx";

export default function NuclearWindSettings({
  windDirection,
  windSpeed,
  onWindDirectionChange,
  onWindSpeedChange,
  pazRadius,
  upzRadius,
  inputStyle
}) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-300">
      <SectionTitle>
        풍향/풍속 설정
      </SectionTitle>

      {/* 풍속 입력 */}
      <div className="mb-4">
        <WindSpeedInput
          value={windSpeed}
          onChange={onWindSpeedChange}
          maxLimit={upzRadius}
          inputStyle={inputStyle}
        />
      </div>

      {/* 풍향 선택 */}
      <div>
        <WindDirectionSelector
          value={windDirection}
          onChange={onWindDirectionChange}
          windSpeed={windSpeed}
          pazRadius={pazRadius}
          upzRadius={upzRadius}
        />
      </div>
    </div>
  )
}