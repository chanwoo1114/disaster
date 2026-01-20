import RadiusInput from "./RadiusInput.jsx";
import { SectionTitle } from "../../../components/common/SectionTitle.jsx"

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

  return (
    <div>
      <SectionTitle>
        대피범위
      </SectionTitle>

      <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
