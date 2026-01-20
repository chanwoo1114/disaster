export function InputField({
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = 'text',
  step,
  unit,
  maxValue,
  paddingRight,
  className = '',
}) {
  const prClass = paddingRight || (unit ? 'pr-20' : '');

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        readOnly={readOnly}
        step={step || (type === 'number' ? '0.000001' : undefined)}
        className={`w-full border rounded-md px-3 py-2 text-sm ${prClass} ${
          readOnly
            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${className}`}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          {maxValue ? `최대 ${maxValue}${unit}` : unit}
        </span>
      )}
    </div>
  )
}
