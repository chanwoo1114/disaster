export const SectionTitle = ({ children, className = ''}) => {
  return (
    <p className={`font-bold text-lg text-gray-950 mb-2 ${className}`}>
      {children}
    </p>
  )
}