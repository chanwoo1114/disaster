export default function SectionSubTitle({ children, className = ''}) {
  return (
    <p className={`text-sm font-semibold text-gray-700 mb-1.5 ${className}`}>
      {children}
    </p>
  )
}