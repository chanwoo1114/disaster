# 재난대피 시뮬레이터 (Frontend)

재난 유형별 대피 시뮬레이션을 시각화하는 웹 애플리케이션입니다.

## 기술 스택

- **React 19** + **Vite 7**
- **Tailwind CSS 3** (스타일링)
- **OpenLayers** + **VWorld API** (지도)
- **Axios** (API 통신)
- **Turf.js** (지리 데이터 처리)
- **Lucide React** (아이콘)

## 시작하기

### 환경 변수

`.env` 파일을 프로젝트 루트에 생성합니다.

```env
VITE_VWORLD_API_KEY=<VWorld API 키>
VITE_BACKEND_URL=<백엔드 서버 URL>
```

### 설치 및 실행

```bash
npm install
npm run dev
```

### 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (port 5173) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 실행 |

## 프로젝트 구조

```
src/
├── assets/              # 이미지, 동영상 리소스
├── components/
│   ├── common/          # 공통 UI (InputField, SectionTitle 등)
│   └── layout/          # 레이아웃 (Sidebar, MainContent)
├── constants/           # 상수 정의
├── data/                # 재난 유형, 위치 데이터
├── features/Project/    # 프로젝트 관리 기능
│   ├── components/      # 프로젝트 관련 컴포넌트
│   ├── disaster/        # 재난 유형별 설정 (nuclear 풍향 등)
│   ├── hooks/           # useProjectForm
│   ├── map/             # MiniMap, LocationSelector
│   └── pages/           # ProjectCreate, ProjectView
├── pages/               # 라우트 페이지 (Home, Register, Result)
├── services/            # API 통신 (api.js, chunkUpload.js)
└── utils/               # 유틸리티 (지도, 시간, API 파라미터)
```

## 페이지

### `/` - 홈
메인 랜딩 페이지

### `/register` - 프로젝트 등록
- 프로젝트 생성/조회/삭제
- 재난 유형 선택 및 파라미터 설정
- 지도 기반 위치 선택
- 시뮬레이션 데이터 파일 업로드

### `/result` - 시뮬레이션 결과
- 대피 범위 지오메트리 시각화
- 도로 네트워크 표시
- 시간별 차량/보행자 위치 재생
- 재생 속도 조절 (1x, 2x, 4x, 8x)

## 지원 재난 유형

| 유형 | 설명 | 표시 방식 |
|------|------|-----------|
| 원자력 (nuclear) | PAZ/UPZ/Shadow/Analysis 구역, 풍향 반대 3섹터 위험지역 | 차량 |
| 화학 (chemistry) | 재난/분석 범위 | 차량 |
| 태풍 (storm) | 재난/분석 범위 | 보행자 |
| 홍수 (flood) | 재난/분석 범위 | 보행자 |

## API 연동

백엔드와 통신하는 주요 엔드포인트:

```
GET    /project                       # 프로젝트 목록 조회
POST   /project                       # 프로젝트 생성
DELETE /project/{id}                   # 프로젝트 삭제
POST   /project/upload/init           # 업로드 세션 초기화
POST   /project/upload/chunk          # 청크 업로드
GET    /geometry/nuclear-buffer       # 방사능 대피 범위
GET    /geometry/disaster-buffer      # 일반 재난 대피 범위
GET    /road/geometry                 # 도로 지오메트리
POST   /position/upload/{type}/{dir}  # 위치 데이터 업로드
GET    /position/{type}               # 시간별 위치 데이터 조회
```
