import NuclearImage from "../assets/images/typ_nuclear2.png"
import ChemistryImage from "../assets/images/typ_chemistry2.png"
import StormImage from "../assets/images/typ_storm2.png"
import FloodImage from "../assets/images/typ_storm3.png"
import ComplexImage from "../assets/images/typ_complex2.png"

export default function ModalMap() {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded bg-white p-6">
            <div className="flex items-center gap-3">
              <img src={NuclearImage} alt="Nuclear Image" />
              <img src={ChemistryImage} alt="Nuclear Image" />
              <img src={StormImage} alt="Nuclear Image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
