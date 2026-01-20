export const SectionSubTitle = ({ children, className = ''}) => {
  return (
    <p className={`text-base font-bold text-gray-750 mb-2 ${className}`}>
      {children}
    </p>
  )
}