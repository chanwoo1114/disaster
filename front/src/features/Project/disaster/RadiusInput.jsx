import SectionSubTitle from "../../../components/common/SectionSubTitle.jsx";
import InputField from "../../../components/common/InputField.jsx";

export default function RadiusInput({
  label,
  value,
  onChange,
  onBlur,
  defaultValue,
}) {
  return (
    <div>
      <SectionSubTitle>
        {label}
      </SectionSubTitle>
      <div className="relative">
        <InputField
          label={label}
          type="number"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          unit="km"
          maxValue={defaultValue}
        />
      </div>
    </div>
  );
}