import DisasterType from "../DisasterType.jsx";
import { SectionTitle } from "../common/SectionTitle.jsx"

export default function DisasterTypeSection({
  disasterTypes,
  selectedDisaster,
  onSelectDisaster
}) {
  return (
    <div className="mb-4">
      <SectionTitle>
        Disaster Type
      </SectionTitle>
      <div className="flex items-center gap-6">
        {disasterTypes.map(({key, label, img}) => (
          <DisasterType
            key={key}
            label={label}
            img={img}
            isSelected={selectedDisaster === key}
            onClick={() => onSelectDisaster(key)}
          />
        ))}
      </div>
    </div>
  );
}
