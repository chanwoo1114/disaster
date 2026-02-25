import SectionSubTitle from "../../../../components/common/SectionSubTitle.jsx";
import WindDirectionGrid from "./WindDirectionGrid.jsx";
import WindDirectionVisualization from "./WindDirectionVisualization.jsx";

export default function WindDirectionSelector({ value, onChange, windSpeed, pazRadius, upzRadius }) {
  const directions = [
    { value: 1, label: '북풍', shortLabel: '북', angle: 0 },
    { value: 2, label: '북북동풍', shortLabel: '북북동', angle: 22.5 },
    { value: 3, label: '북동풍', shortLabel: '북동', angle: 45 },
    { value: 4, label: '동북동풍', shortLabel: '동북동', angle: 67.5 },
    { value: 5, label: '동풍', shortLabel: '동', angle: 90 },
    { value: 6, label: '동남동풍', shortLabel: '동남동', angle: 112.5 },
    { value: 7, label: '남동풍', shortLabel: '남동', angle: 135 },
    { value: 8, label: '남남동풍', shortLabel: '남남동', angle: 157.5 },
    { value: 9, label: '남풍', shortLabel: '남', angle: 180 },
    { value: 10, label: '남남서풍', shortLabel: '남남서', angle: 202.5 },
    { value: 11, label: '남서풍', shortLabel: '남서', angle: 225 },
    { value: 12, label: '서남서풍', shortLabel: '서남서', angle: 247.5 },
    { value: 13, label: '서풍', shortLabel: '서', angle: 270 },
    { value: 14, label: '서북서풍', shortLabel: '서북서', angle: 292.5 },
    { value: 15, label: '북서풍', shortLabel: '북서', angle: 315 },
    { value: 16, label: '북북서풍', shortLabel: '북북서', angle: 337.5 }
  ];

  return (
    <div className="flex flex-col gap-3 h-auto">
      <SectionSubTitle>
        풍향 선택 (1~16)
      </SectionSubTitle>
      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-[300px]">
          <WindDirectionGrid
            directions={directions}
            value={value}
            onChange={onChange}
          />
        </div>

        <div className="flex-shrink-0">
          <WindDirectionVisualization
            directions={directions}
            value={value}
            windSpeed={windSpeed}
            pazRadius={pazRadius}
            upzRadius={upzRadius}
          />
        </div>
      </div>
    </div>
  );
}
