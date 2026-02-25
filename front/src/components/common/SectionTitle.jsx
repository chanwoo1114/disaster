export default function SectionTitle({ children, className = ''}) {
  return (
    <p className={`font-bold text-xl text-gray-950 mb-2 ${className}`}>
      {children}
    </p>
  )
}