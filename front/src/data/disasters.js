import NuclearImage from "../assets/images/typ_nuclear2.png";
import ChemistryImage from "../assets/images/typ_chemistry2.png";
import StormImage from "../assets/images/typ_storm2.png";
import FloodImage from "../assets/images/typ_storm3.png";
import ComplexImage from "../assets/images/typ_complex2.png";

export const disasterTypes = [
  {
    key: "nuclear",
    label: "원자력",
    img: NuclearImage,
  },
  {
    key: "chemistry",
    label: "화학",
    img: ChemistryImage,
  },
  {
    key: "storm",
    label: "태풍",
    img: StormImage,
  },
  {
    key: "flood",
    label: "홍수",
    img: FloodImage,
  },
  {
    key: "complex",
    label: "복합",
    img: ComplexImage,
  }
];