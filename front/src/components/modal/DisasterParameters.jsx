import RadiusInput from "./RadiusInput.jsx";
import NuclearWindSettings from "../Nuclear/NuclearWindSettings.jsx";
import { SectionTitle } from "../common/SectionTitle.jsx"

export default function DisasterParameters({
  selectedDisaster,
  disasterParams,
  onParamChange,
  inputStyle
}) {
  const disasterFieldConfigs = {
    nuclear: [
      {key: 'radius1', label: 'PAZ', defaultValue: "5"},
      {key: 'radius2', label: 'UPZ', defaultValue: "30"},
      {key: 'radius3', label: '그림자 대피 권역', defaultValue: "45"},
      {key: 'radius4', label: '분석 권역', defaultValue: "50"}
    ],
    chemistry: [
      {key: 'radius1', label: '대피 권역', defaultValue: "10"},
      {key: 'radius2', label: '분석 권역', defaultValue: "15"}
    ],
    flood: [
      {key: 'radius1', label: '대피 권역', defaultValue: "2"},
      {key: 'radius2', label: '분석 권역', defaultValue: "3"}
    ],
    storm: [
      {key: 'radius1', label: '대피 권역', defaultValue: "2"},
      {key: 'radius2', label: '분석 권역', defaultValue: "3"}
    ],
    complex: [
      {key: 'radius1', label: '대피 권역', defaultValue: "15"},
      {key: 'radius2', label: '분석 권역', defaultValue: "30"}
    ]
  };

  const fields = disasterFieldConfigs[selectedDisaster] || [
    {key: 'radius1', label: '대피 권역', defaultValue: "10"},
    {key: 'radius2', label: '분석 권역', defaultValue: "20"}
  ];

  const isNuclear = selectedDisaster === 'nuclear';

  return (
    <div className="mt-4">
      <SectionTitle className="mb-0.5">
        대피범위
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map((field) => (
          <RadiusInput
            key={field.key}
            label={field.label}
            value={disasterParams[field.key]}
            onChange={(e) => onParamChange(field.key, e.target.value)}
            inputStyle={inputStyle}
            defaultValue={field.defaultValue}
          />
        ))}
      </div>

      {isNuclear && (
        <NuclearWindSettings
          windDirection={disasterParams.windDirection}
          windSpeed={disasterParams.windSpeed || ''}
          pazRadius={disasterParams.radius1}
          upzRadius={disasterParams.radius2}
          onWindDirectionChange={(value) => {
            console.log('DisasterParameters - windDirection 변경:', value);
            onParamChange('windDirection', value);
          }}
          onWindSpeedChange={(value) => {
            console.log('DisasterParameters - windSpeed 변경:', value);
            onParamChange('windSpeed', value);
          }}
          inputStyle={inputStyle}
        />
      )}
    </div>
  );
}
