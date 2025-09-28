import NuclearImage from "../assets/images/typ_nuclear2.png";
import ChemistryImage from "../assets/images/typ_chemistry2.png";
import StormImage from "../assets/images/typ_storm2.png";
import FloodImage from "../assets/images/typ_storm3.png";
import ComplexImage from "../assets/images/typ_complex2.png";

export const disasterTypes = [
  {
    key: "nuclear",
    label: "Nuclear",
    img: NuclearImage,
  },
  {
    key: "chemistry",
    label: "Chemistry",
    img: ChemistryImage,
  },
  {
    key: "storm",
    label: "Storm",
    img: StormImage,
  },
  {
    key: "flood",
    label: "Flood",
    img: FloodImage,
  },
  {
    key: "complex",
    label: "Complex",
    img: ComplexImage,
  }
];

export const getDisasterByKey = (key) => {
  return disasterTypes.find(disaster => disaster.key === key);
};
