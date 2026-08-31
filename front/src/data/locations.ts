import type { DisasterType, Location } from '../types';

const nuclear: Location[] = [
  { name: '고리원전', lng: 129.28595, lat: 35.32991 },
  { name: '새울원전', lng: 129.30873, lat: 35.33384 },
  { name: '월성원전', lng: 129.47574, lat: 35.71601 },
  { name: '한울원전', lng: 129.38261, lat: 37.092648 },
  { name: '한빛원전', lng: 126.416245, lat: 35.4112 },
  { name: '대전원전', lng: 127.3717, lat: 36.4257 },
];

const chemistry: Location[] = [
  { name: '태광산업(주) 석유화학3공장', lng: 129.33775, lat: 35.502983 },
  { name: '금호석유화학(주) 울산고무공장', lng: 129.32312, lat: 35.48984 },
  { name: 'SK에너지(주) 본공장', lng: 129.3568, lat: 35.504223 },
  { name: '대한유화(주) 온산공장', lng: 129.33931, lat: 35.456894 },
  { name: '한국바스프(주) 여수공장', lng: 127.649826, lat: 34.82321 },
  { name: '금호미쓰이화학(주)', lng: 127.64733, lat: 34.817554 },
  { name: '한화솔루션(주) 티디아이', lng: 127.65703, lat: 34.807777 },
  { name: '롯데케미칼㈜ 대산공장', lng: 126.3702, lat: 36.997883 },
  { name: '현대오일뱅크', lng: 126.40084, lat: 37.0078 },
];

const storm: Location[] = [
  { name: '양양 기사운리 마을회관', lng: 128.73108, lat: 38.008682 },
  { name: '목포시', lng: 126.39544, lat: 34.79337 },
  { name: '속초 대포항', lng: 128.60811, lat: 38.172913 },
  { name: '서천군', lng: 126.69463, lat: 36.015915 },
];

const flood: Location[] = [
  { name: '울진군', lng: 129.44225, lat: 36.678787 },
  { name: '구례군', lng: 127.48194, lat: 35.200253 },
  { name: '안동시', lng: 128.75804, lat: 36.55456 },
  { name: '나주시', lng: 126.708725, lat: 34.9996 },
  { name: '예천군', lng: 128.44865, lat: 36.65339 },
  { name: '삼척시', lng: 129.17467, lat: 37.437256 },
];

export const LOCATIONS: Record<DisasterType, Location[]> = {
  nuclear,
  chemistry,
  storm,
  flood,
  // 복합 재난은 원전 + 화학 사업장을 모두 후보로
  complex: [...nuclear, ...chemistry],
};
