import { SectionTitle } from "../../../components/common/SectionTitle.jsx"

function DisasterType({label, img, isSelected, onClick}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-center gap-0.5 w-32 " +
        (isSelected
            ? "bg-gray-200"
            : ""
        )
      }
    >
      <img src={img} alt={label} className="w-16 h-16"/>
      <span className="text-gray-500">{label}</span>
    </button>
  );
}

export default function DisasterTypeSection({
  disasterTypes,
  selectedDisaster,
  onSelectDisaster
}) {
  return (
    <div>
      <SectionTitle>
        Disaster Type
      </SectionTitle>
      <div className="flex items-center justify-between pb-6">
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
