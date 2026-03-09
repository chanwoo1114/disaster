import SectionTitle from "../../../components/common/SectionTitle.jsx"

function DisasterType({label, img, isSelected, onClick}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
      }`}
    >
      <img src={img} alt={label} className={`w-14 h-14 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}/>
      <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>{label}</span>
    </button>
  );
}

export default function DisasterTypeSection({
  disasterTypes,
  selectedDisaster,
  onSelectDisaster
}) {
  return (
    <div className="mb-4">
      <SectionTitle>
        재난 유형
      </SectionTitle>
      <div className="flex items-center gap-3 pb-2">
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
