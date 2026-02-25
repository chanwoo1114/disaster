export default function WindDirectionGrid({ directions, value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {directions.map((dir) => {
        const isSelected = value === dir.value;

        return (
          <button
            key={dir.value}
            type="button"
            onClick={() => onChange(dir.value)}
            className={`px-2 py-2 rounded text-sm font-medium transition-all border ${
              isSelected
                ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="text-xs opacity-80">{dir.value}</div>
            <div className="text-xs font-bold">{dir.shortLabel}</div>
          </button>
        );
      })}
    </div>
  );
}
