export default function CoordinateInputs({coordinates, inputStyle}) {
  return (
    <>
      <input
        className={inputStyle}
        value={coordinates.x}
        placeholder="경도"
        readOnly
      />
      <input
        className={inputStyle}
        value={coordinates.y}
        placeholder="위도"
        readOnly
      />
    </>
  );
}
