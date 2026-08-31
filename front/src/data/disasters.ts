import type { DisasterType } from '../types';
import nuclearImg from '../assets/images/typ_nuclear2.png';
import chemistryImg from '../assets/images/typ_chemistry2.png';
import stormImg from '../assets/images/typ_storm2.png';
import floodImg from '../assets/images/typ_storm3.png';
import complexImg from '../assets/images/typ_complex2.png';

export interface DisasterMeta {
  key: DisasterType;
  label: string;
  img: string;
  /** 표출 대상 */
  agent: '차량' | '보행자' | '차량+보행자';
}

export const DISASTER_TYPES: DisasterMeta[] = [
  { key: 'nuclear', label: '원자력', img: nuclearImg, agent: '차량' },
  { key: 'chemistry', label: '화학', img: chemistryImg, agent: '차량' },
  { key: 'storm', label: '태풍', img: stormImg, agent: '보행자' },
  { key: 'flood', label: '홍수', img: floodImg, agent: '보행자' },
  { key: 'complex', label: '복합', img: complexImg, agent: '차량+보행자' },
];

export const DISASTER_LABEL: Record<DisasterType, string> = Object.fromEntries(
  DISASTER_TYPES.map((d) => [d.key, d.label]),
) as Record<DisasterType, string>;
