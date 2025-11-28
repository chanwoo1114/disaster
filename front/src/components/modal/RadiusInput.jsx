export default function RadiusInput({label, value, onChange, inputStyle, defaultValue}) {
  return (
    <div>
      <label className="text-sm text-gray-700 mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          className={inputStyle + " w-full pr-40"}
          value={value}
          onChange={onChange}
          max={defaultValue}
          min={0}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none whitespace-nowrap">
          km (최대 {defaultValue}km 이내)
        </span>
      </div>
    </div>
  );
}