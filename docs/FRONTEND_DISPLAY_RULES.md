# 프론트엔드 레이어 표출 규칙

> 2026-09-01 확정. 새 레이어·탭을 추가할 때마다 이 문서의 규칙을 따른다.

## 규칙

1. **새로 만드는 레이어/탭의 기본값은 무조건 꺼짐(off).**
   레이어를 하나 추가할 때 토글 상태를 `useState(false)`로 시작한다.
   "일단 보여주고 끄게 하자"는 금지 — 켜는 건 사용자가 한다.

   ⚠️ **기본값은 두 군데에 있다.** `useState(...)` 초기값과 `resetScenarioData()`의
   `setShow*(...)` 를 **반드시 같은 값으로** 맞춰야 한다. `resetScenarioData()`는 시나리오를
   선택·전환할 때마다 실행되므로, 여기만 `true`로 남아 있으면 초기값을 `false`로 고쳐도
   화면에서는 계속 켜진 채로 시작한다. (2026-09-01에 실제로 이 이유로 대피소가 계속 켜져 있었다.)

2. **최초 진입 시 켜져 있는 것은 소통정보(link traffic) 하나뿐이다.**
   시나리오를 준비(prepare)하고 지도에 처음 들어갔을 때 소통정보만 그려져 있어야 한다.
   대피소·차량·대피율·존·흐름선 등 이후 추가되는 모든 표출은 꺼진 상태로 시작한다.

**이유**: 레이어가 늘어날수록 첫 화면이 뭉개지고 렌더 비용도 커진다.
기준 화면을 소통정보 한 장으로 고정해 두면, 사용자가 보고 싶은 것만 얹어서 볼 수 있다.

## 현재 상태 (`front/src/App.tsx`)

| 상태 | 레이어 | 기본값 | 규칙 부합 |
|---|---|---|---|
| `showTraffic` | 소통정보 (링크 속도/교통량) | `true` | ✅ 유일하게 켜져 있어야 하는 것 |
| `showVehicles` | 차량 위치 | `false` | ✅ |
| `showShelters` | 대피소 | `false` | ✅ (2026-09-01 수정 — `useState` + `resetScenarioData` 양쪽) |
| (없음) | 행정동 경계 | 항상 표시 | — 토글 없는 필수 배경 레이어 (아래 예외 참조) |

토글 상태는 `App.tsx`에 모아 두고 `SetupPanel`로 `show*` / `onToggle*` 쌍을 내려보낸다.
`Legend`는 켜져 있는 레이어의 범례만 그린다 (`showTraffic && traffic` 처럼 데이터 유무와 AND).

## 예외 — 필수 배경 레이어

**행정동 경계**는 토글이 없고 항상 맨 아래에 깔린다. 지도를 읽는 기준선 역할이라
켜고 끄는 대상이 아니기 때문이다. `App.tsx`에 `showAdm` 상태가 없고,
`SetupPanel`에도 토글이 없으며, 세션·대상지가 정해지면 자동으로 조회해서 그린다.

레이어 순서상 **가장 아래**여야 한다 — 피해범위(빨간 면)와 링크가 위로 올라와야 묻히지 않는다.
`admZones.ts`가 `evac-damage-fill` → `links-casing` 순으로 존재하는 첫 레이어 앞에 삽입한다.

새 레이어를 이 예외로 만들려면 그럴 만한 이유가 있어야 한다. 기본은 어디까지나 "토글 + 꺼짐"이다.

## 레이어 추가 체크리스트

새 레이어 `foo`를 추가한다면:

- [ ] `App.tsx`에 `const [showFoo, setShowFoo] = useState(false);` — **반드시 `false`**
- [ ] `resetScenarioData()`에 `setShowFoo(false);` 추가 — **초기값과 동일하게**
- [ ] 지도 반영 effect: `setFooLayersVisible(map, showFoo)` (데이터 로드 effect와 토글 effect를 분리 —
      기존 `shelters` 처리 방식과 동일하게, 로드 effect 의존성에서 `showFoo`를 빼고 토글 effect에서 반영)
- [ ] `SetupPanel`에 `showFoo` / `onToggleFoo` prop 전달
- [ ] `Legend`에 `showFoo={!!fooData && showFoo}` 로 넘겨 범례 항목 추가
- [ ] 데이터가 없을 때 토글이 켜져도 아무 일이 없도록 `!!fooData &&` 가드
