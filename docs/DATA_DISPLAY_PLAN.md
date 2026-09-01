# 통합 업로드(tt.zip 형식) 구조 분석 및 표출 설계

> 2026-08-31 기준. 앞으로 업로드되는 ZIP은 기존 `S_1.zip`(Result 폴더 하나)이 아니라
> 아래의 **전체 시뮬레이터 작업 폴더** 형태로 올라온다. (tt.zip: 216MB, 해제 1.6GB, 473파일)

## 1. ZIP 구조

```
tt/
├── Argument/            시나리오 설정(.arg): 재난유형·시각·풍향·풍속 등
│   └── Scenario/Scenario_{n}.arg
├── InputData/
│   ├── Agent/
│   │   ├── Population/{n}/house.txt, person.txt     인구·가구 (연령/차량보유/교통약자)
│   │   ├── DailyAgent/…/activity.txt                일상 활동 (165MB, 최대 파일)
│   │   └── EvacuationAgent/…/PAZ_House.txt, *_ReturnAgent.txt, paz_to_shelter.txt …
│   ├── Network/
│   │   ├── SubNetwork/S_x_y/Node_Sub.txt, Link_Sub.txt   시뮬 자체 네트워크(노드 좌표 포함)
│   │   ├── Signal/{n}/Intersection_{Topology,SignalPlan,PhasePlan}_*.txt
│   │   ├── MesoCell/LinkInformation_CT_*.txt
│   │   └── National/S_x_y/EtcShelter.txt, special_facility.txt, LinkAreaCode.txt
│   ├── SED/{x_y}/DESKSmallZone.txt, DESKMidZone.txt      존 중심좌표+인구
│   ├── Shelter/S_x_y/Shelter.txt, EvacZoneToShelter_*.txt
│   └── SubOD/{n}/outputBackgroundVehicleOD*.txt          배경 OD (Auto/Bus/트럭별)
├── Log/
└── Result/S_{1..4}/     ★ 시나리오별 출력 — 기존 S_1.zip 내용물과 동일 포맷
```

- **한 ZIP에 시나리오 여러 개**: tt.zip에는 S_1(8시간대), S_3(1시간대), S_4(16시간대)가 완전,
  S_2는 일부만. → 업로드 후 **시나리오 선택 UI** 필요.
- 시간대 수가 시나리오마다 다름 (S_1: 13~20시, S_4: 13~28시).

## 2. 핵심 발견 — 입력↔결과 조인으로 열리는 표출

| 조인 | 근거 | 열리는 것 |
|---|---|---|
| `Shelter.txt (x,y,capacity,name)` ⋈ `ShelterStatus (Time,ShelterID,Assign,Arrival)` | ShelterID | **대피소 지도 표출** — 위치·이름·수용력 + 시간별 도착률 게이지 |
| `DESKSmallZone (SmallZoneID,x,y,Pop)` ⋈ `EvacuationRateByZone (Time,ZoneID,대피율)` | ZoneID | **존별 대피율 표출** — 중심점 원(크기=인구, 색=대피율). 행정동 경계 확보 시 코로플레스 |
| `Scenario_{n}.arg (유형·시각·풍향·풍속)` | 시나리오 번호 | 설정 패널 자동 채움 (풍향·풍속 수동 입력 대체 가능) |
| `EvacZoneToShelter_Normal (Zone→Shelter, 인원, 비용)` + 좌표 | Zone/Shelter | 존→대피소 **배정 흐름선** |
| `special_facility (x,y,name,type)` | — | 학교 등 특수시설 점 표출 |
| `Link_Sub / Node_Sub` | LinkID | 시뮬 자체 네트워크 — MOCT 미매칭 링크(0.3%) 보완 가능 |
| `person.txt (age, transportation_vulnerable, disabled_pop)` ⋈ 존 | adm_cd | 교통약자 분포 표출(선택) |

## 3. 주요 파일 스키마 (헤더 실측)

```
Shelter.txt              ShelterID Type x y capacity name SmallZoneID S_Area wind attitude
EtcShelter.txt           ShelterID id type x y capacity name SmallZoneID S_Area wind wind_speed attitude
DESKSmallZone.txt        MidZoneID SmallZoneID x y Pop House Employer EmployedPop Student S_Area wind Length attitude
EvacZoneToShelter_*.txt  EvacZoneID ShelterID No.Evacuees pathCost pathLength
special_facility.txt     id name type_name type x y p_1 p_2 p_3 t_bus t_ab pr_time b_time s_area wind wind_speed distance ori_id
PAZ_House.txt            ZoneID HouseID Pop currPop Return notReturn Car EvacStartTime ShelterID
paz_to_shelter.txt       AgentID OZoneID DZoneID Mode TravelStartTime
Node_Sub.txt             SerialNo NodeID Type x y turn_p area wind capa altitude
Link_Sub.txt             SerialNo LinkID FromNodeID ToNodeID Lane Rank Type RoadNo Speed Length area slope
Intersection_Topology    진입로명 시작노드 종료노드 회전  (헤더 한글, cp949)
Intersection_SignalPlan  교차로명 주기 현시수 현시시간…
house.txt                house_id members home_id usecar area adm_cd
person.txt               AgentID house_id members home_id area host age usecar sex job no_act class transportation_vulnerable adm_cd disabled_pop
outputBackgroundVehicleOD  OZoneID DZoneID Auto Bus STruck MTruck LTruck
Scenario_{n}.arg         지역/유형/시각/기상 + 풍향/풍속 (탭 구분 한글 키, cp949)
Result/S_x/*             기존 S_1.zip과 동일 (VehicleLocation/LinkTravelInformation/… — backend/README 참조)
```

## 4. 표출 우선순위

> 아래 레이어를 추가할 때의 기본 표출 규칙(새 레이어는 기본 꺼짐, 최초에는 소통정보만)은
> [FRONTEND_DISPLAY_RULES.md](FRONTEND_DISPLAY_RULES.md) 참조.

**P1 — 다음 단계에서 바로**
1. **시나리오 선택**: 세션 생성 시 `Result/S_*` 스캔 → 각각 산출물 생성, 패널에 시나리오 드롭다운
2. **대피소 레이어**: Shelter ⋈ ShelterStatus. 점(크기=수용력) + 시간 연동 도착률 색/게이지, 클릭 카드(이름·수용력·배정·도착·%)
3. **대피율 그래프**: EvacuationRateByTime → 타임라인 위 미니 차트 (PAZ/UPZW/UPZ/대피소 4선 + 현재 시각 마커)

**P2**
4. 존별 대피율: DESKSmallZone 중심점 원 표출 (경계 shapefile 확보 시 코로플레스로 승격 — `Downloads/BND_ADM_DONG_PG.zip` 후보)
5. 시나리오 설정 자동 인식: Scenario_*.arg 파싱 → 재난유형·풍향·풍속 표시
6. 존→대피소 배정 흐름선

**P3**
7. 특수시설 점, 물자 수송 경로(DisasterSuppliesAccessPath → 링크 폴리라인), 교차로 회전량

## 5. 파이프라인 변경 필수 사항

1. **⚠️ ZIP 평탄화 제거** — 현재 `zip_file.py`가 폴더를 무시하고 파일명만으로 추출 →
   tt.zip은 같은 이름 파일이 시나리오/폴더별로 수십 개라 **서로 덮어써서 데이터가 섞인다.**
   폴더 구조를 유지해 추출하도록 바꿔야 함 (경로 탐색 방지 로직은 유지).
2. `.txt`만 추출 중 → `.arg`도 허용 목록에 추가 (시나리오 설정 파싱용).
3. 세션 산출물을 시나리오별 하위 폴더로: `sessions/{id}/scenarios/S_1/…`
4. 공통 입력(Shelter, DESKSmallZone 등)은 세션당 1회 파싱 → `shelters.json`, `zones.json`.
5. 기존 단일 `Result` 형태(S_1.zip)도 하위 호환: 루트에 `VehicleLocation_*`가 보이면 단일 시나리오로 처리.
6. 인코딩: 일부 파일(신호, .arg)은 헤더가 cp949 한글 — 헤더는 버리고 컬럼 위치로 파싱(현행 방식 유지).
