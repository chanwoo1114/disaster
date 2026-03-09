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

      <WindSpeedInput
        value={windSpeed}
        onChange={onWindSpeedChange}
        maxLimit={upzRadius}
      />

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