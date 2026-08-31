# 재난대피 시뮬레이터

재난 유형(원자력·화학·태풍·홍수·복합)별 대피 시뮬레이션 결과를 지도 위에 표출하는 웹 애플리케이션입니다.

## 사용 흐름

```
접속 → 지도 표시 → ① 재난 유형 ② 대상지 ③ 결과 ZIP 업로드 → 표출/재생
페이지를 닫거나 새로고침하면 처음부터 다시 시작합니다 (저장 없음)
```

- 프로젝트 저장/목록 기능은 없습니다. 업로드 1건 = 임시 세션 1개이며, 서버 파일은 6시간 후 자동 삭제됩니다.
- DB 없음. 세션은 `backend/app/data/sessions/{id}/` 폴더 하나로 관리됩니다.

## 구조

```
disaster/
├── backend/             # FastAPI — 업로드/세션, 지오메트리, 도로, 위치 데이터
├── front/               # React + TypeScript + MapLibre GL + deck.gl
├── docker-compose.yml
└── .env.example
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS, MapLibre GL JS, deck.gl, VWorld 타일 |
| Backend | FastAPI, Pydantic v2, GeoPandas / Shapely / PyProj, pandas, PyArrow |
| Infra | Docker, Nginx |

## 시작하기

### 로컬 개발

```bash
cp .env.example front/.env      # VITE_VWORLD_API_KEY 입력 (없으면 OSM 지도로 동작)

# 백엔드
cd backend
python -m venv .venv && .venv/Scripts/activate     # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# 프론트엔드
cd front
npm install
npm run dev                                         # http://127.0.0.1:5173
```

두 서버 모두 `127.0.0.1`에만 바인딩되어 외부 PC에서는 접근할 수 없습니다.

### Docker

```bash
cp .env.example .env           # VITE_VWORLD_API_KEY 입력
docker-compose up -d --build   # 프론트 :5001, 백엔드 :8001
```

## 환경 변수

| 변수 | 설명 | 위치 |
|------|------|------|
| `VITE_VWORLD_API_KEY` | VWorld 지도 API 키. 비어 있으면 OSM 타일 사용 | `front/.env` (로컬) / 루트 `.env` (Docker) |
| `VITE_BACKEND_URL` | 백엔드 주소. 기본값 `http://127.0.0.1:8001` | `front/.env` |

## 도로 데이터

`backend/app/data/link.csv` (`link_id`, `geom`(WKT, EPSG:3857), `cartrk_co`)가 있어야 도로 조회가 동작합니다. 최초 요청 시 `link_4326.parquet` / `link_5179.parquet`로 변환되어 캐시됩니다. `backend/app/data/`는 git에 포함되지 않습니다.

자세한 내용은 각 디렉토리의 README를 참조하세요.
- [Frontend README](./front/README.md)
- [Backend README](./backend/README.md)
