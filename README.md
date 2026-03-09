# 재난대피 시뮬레이터

재난 유형별(원자력, 화학, 태풍, 홍수) 대피 시뮬레이션을 시각화하는 웹 애플리케이션입니다.

## 구조

```
disaster/
├── backend/             # FastAPI 백엔드 서버
├── front/               # React 프론트엔드
├── docker-compose.yml   # 통합 Docker 실행
└── .env                 # 환경 변수
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, Vite 7, Tailwind CSS, OpenLayers, VWorld API |
| Backend | FastAPI, GeoPandas, Shapely, PyProj, Pandas |
| Infra | Docker, Nginx |

## 시작하기

### Docker (권장)

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일에 VITE_VWORLD_API_KEY 입력

# 빌드 및 실행
docker-compose up -d --build
```

- 프론트엔드: `http://localhost:5001`
- 백엔드 API: `http://localhost:8001`

### 로컬 개발

**백엔드**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**프론트엔드**
```bash
cd front
npm install
npm run dev
```

## 환경 변수

| 변수 | 설명 | 위치 |
|------|------|------|
| `VITE_VWORLD_API_KEY` | VWorld 지도 API 키 | 루트 `.env`, `front/.env` |
| `VITE_BACKEND_URL` | 백엔드 서버 URL | `front/.env` |

## 주요 기능

- **프로젝트 관리**: 재난 시나리오 생성/조회/삭제
- **지도 시각화**: 대피 범위, 도로 네트워크, 위험 구역 표시
- **시뮬레이션 재생**: 시간별 차량/보행자 위치 애니메이션
- **재난 유형별 처리**: 원자력(PAZ/UPZ 16방위 섹터), 화학, 태풍, 홍수

자세한 내용은 각 디렉토리의 README를 참조하세요.
- [Frontend README](./front/README.md)
- [Backend README](./backend/README.md)
