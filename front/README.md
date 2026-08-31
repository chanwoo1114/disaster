# 재난대피 시뮬레이터 (Frontend)

## 기술 스택

- **React 19** + **TypeScript** + **Vite 7**
- **MapLibre GL JS** — WebGL 베이스맵 (VWorld 래스터 타일, 키 없으면 OSM)
- **deck.gl** — 대용량 차량/보행자 레이어 (MapboxOverlay로 MapLibre에 부착)
- **Tailwind CSS 3**, **Lucide React**

## 실행

```bash
npm install
npm run dev         # http://127.0.0.1:5173 (127.0.0.1 전용)
npm run build       # tsc --noEmit && vite build
npm run typecheck
```

`.env`:
```env
VITE_VWORLD_API_KEY=<VWorld API 키>
VITE_BACKEND_URL=http://127.0.0.1:8001
```

## 구조

```
src/
├── main.tsx / App.tsx      # 단일 페이지. 설정 상태와 업로드 흐름을 App이 소유
├── config.ts               # 환경 변수, 초기 카메라, 업로드 한도
├── types.ts
├── api/client.ts           # fetch 래퍼 (/upload, /session)
├── map/
│   ├── MapView.tsx         # MapLibre 지도 + deck.gl 오버레이. imperative, ref 기반
│   └── vworldStyle.ts      # VWorld WMTS → MapLibre style 변환
├── setup/SetupPanel.tsx    # ① 재난 유형 ② 대상지 ③ ZIP 업로드 패널
├── upload/
│   ├── UploadZone.tsx      # 드래그&드롭
│   └── chunkUpload.ts      # 5MB 청크 순차 업로드
├── data/                   # 재난 유형, 대상지 후보
└── assets/images/          # 재난 아이콘, 차량 스프라이트
```

## 화면 흐름

1. 접속 즉시 지도 표시 (한반도 전체)
2. 패널에서 재난 유형 선택 → 대상지 목록 선택 / "지도에서" 클릭 / 좌표 직접 입력
3. ZIP 드롭 → **시작하기** → 청크 업로드 → 세션 생성 → 준비 완료
4. **새로 시작** 또는 새로고침 → 초기 상태 (서버 세션 삭제 요청)

## 설계 메모

- 지도는 React 렌더 트리 밖에서 동작합니다. 매 프레임 바뀌는 값(재생 시각 등)은 절대 React state로 두지 말고 `MapView`의 `onReady`로 받은 `map`/`overlay` 핸들에 직접 반영하세요.
- deck.gl 레이어는 `overlay.setProps({ layers })`로 교체합니다. 다음 단계(위치 데이터 표출)에서 여기에 `IconLayer`/`ScatterplotLayer`를 꽂습니다.
