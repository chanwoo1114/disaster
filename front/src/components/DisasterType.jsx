export default function DisasterType({ label, img, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-center gap-0.5 w-24 " +
        (isSelected
          ? "bg-gray-200"
          : ""
        )
      }
    >
      <img src={img} alt={label} className="w-16 h-16" />
      <span className="text-gray-500">{label}</span>
    </button>
  );
}