export default function ProjectAddButton({size, text, onClick}) {
  const sizeStyles  = {
    small: "px-4 py-2.5",
    large: "px-6 py-3"
  }

  const iconSizes = {
    small: "w-5 h-5",
    large: "w-12 h-12"
  }

  const fontSizes = {
    small: "text-base",
    large: "text-2xl"
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${sizeStyles[size]}`}
    >
      <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className={`font-medium ${fontSizes[size]}`}>{text}</span>
    </button>
  )
}