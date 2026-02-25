import WindSpeedInput from "./WindSpeedInput.jsx";
import SectionTitle from "../../../../components/common/SectionTitle.jsx"
import WindDirectionSelector from "./WindDirectionSelector.jsx";

export default function NuclearWindSettings({
  windDirection,
  windSpeed,
  onWindDirectionChange,
  onWindSpeedChange,
  pazRadius,
  upzRadius,
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionTitle>
        풍향/풍속 설정
      </SectionTitle>
      {/* 풍속 입력 */}
      <WindSpeedInput
        value={windSpeed}
        onChange={onWindSpeedChange}
        maxLimit={upzRadius}
      />

      {/* 풍향 선택 */}
      <WindDirectionSelector
        value={windDirection}
        onChange={onWindDirectionChange}
        windSpeed={windSpeed}
        pazRadius={pazRadius}
        upzRadius={upzRadius}
      />
    </div>
  )
}