# 재난대피 시뮬레이터 (Backend)

재난 유형별 대피 시뮬레이션 데이터를 처리하는 FastAPI 백엔드 서버입니다.

## 기술 스택

- **FastAPI 0.117** + **Uvicorn** (ASGI)
- **Pydantic 2** (데이터 검증)
- **GeoPandas** / **Shapely** / **PyProj** (지리 데이터 처리)
- **Pandas** + **PyArrow** (데이터 처리, Parquet)
- **cachetools** (TTL 기반 캐싱)
- **Docker** (컨테이너 배포)

## 시작하기

### 설치 및 실행

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker

```bash
docker-compose up -d
```

## 프로젝트 구조

```
app/
├── main.py                  # FastAPI 앱 진입점
├── config.py                # 설정 상수 (경로, 파일 제한 등)
├── dependencies.py          # 의존성 주입
├── router/                  # API 라우터
│   ├── project.py           # 프로젝트 CRUD, 파일 업로드
│   ├── geometry.py          # 대피 범위 지오메트리
│   ├── road.py              # 도로 네트워크
│   └── position.py          # 시간별 위치 데이터
├── services/                # 비즈니스 로직
│   ├── project.py           # JSONL 기반 프로젝트 저장소
│   ├── chunk_upload.py      # 청크 파일 업로드
│   ├── zip_file.py          # ZIP 파일 처리
│   ├── disaster_geometry.py # 버퍼/섹터 지오메트리 생성
│   ├── road_geometry.py     # 도로 네트워크 추출
│   ├── position.py          # 위치 데이터 조회
│   └── cache.py             # TTL 캐시
├── schemas/                 # Pydantic 모델
│   ├── common.py            # 공통 응답 래퍼
│   ├── project.py           # 프로젝트
│   ├── geometry.py          # 지오메트리 쿼리/응답
│   ├── road.py              # 도로
│   ├── position.py          # 위치 데이터
│   ├── upload.py            # 업로드 세션
│   └── exceptions.py        # 커스텀 예외
├── validators/              # 유효성 검증
│   ├── project_validator.py # 재난 유형별 파라미터 검증
│   ├── geometry_validator.py# 거리 파라미터 검증
│   └── zip_file_validator.py# ZIP 보안 검증
└── data/                    # 데이터 디렉토리
    ├── projects/            # 프로젝트별 폴더 (UUID)
    ├── uploads/             # 업로드 스테이징
    ├── temp/                # 임시 파일
    ├── metadata.json        # 프로젝트 메타데이터
    ├── link_4326.parquet    # 도로 데이터 (WGS84)
    └── link_5179.parquet    # 도로 데이터 (Korea 2000)
```

## API 엔드포인트

### 프로젝트 (`/project`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/project` | 프로젝트 목록 조회 (페이지네이션) |
| POST | `/project` | 프로젝트 생성 |
| DELETE | `/project/{id}` | 프로젝트 삭제 (soft delete) |
| POST | `/project/upload/init` | 업로드 세션 초기화 |
| POST | `/project/upload/chunk` | 파일 청크 업로드 |

### 지오메트리 (`/geometry`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/geometry/nuclear-buffer` | 방사능 대피 범위 (PAZ/UPZ/Shadow/Analysis) |
| GET | `/geometry/disaster-buffer` | 일반 재난 대피 범위 |

### 도로 (`/road`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/road/geometry` | 분석 범위 내 도로 네트워크 |

### 위치 데이터 (`/position`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/position/upload/{type}/{directory}` | 위치 데이터 업로드 |
| GET | `/position/{type}` | 시간별 위치 데이터 조회 |

## 위치 데이터 파일 형식

ZIP 파일 내에 `.txt` 형식의 위치 데이터 파일이 포함되어야 합니다. 공백 구분, 첫 줄은 헤더입니다.

### nuclear - `VehicleLocation.txt` (메조 시뮬레이션)

```
time veh_id occupancy direction lng lat
28800 1 3 90.0 129.2860 35.3299
28800 2 1 180.0 129.2870 35.3305
28801 1 3 92.5 129.2862 35.3301
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| time | int | 시간 (초 단위, 예: 28800 = 08:00:00) |
| veh_id | int | 차량 ID |
| occupancy | int | 승차 인원 |
| direction | float | 방향 (0~360도) |
| lng | float | 경도 |
| lat | float | 위도 |

### chemistry - `VehicleLocation.txt` 또는 `Vehicle_Position.txt` (마이크로 시뮬레이션)

```
time veh_id direction lng lat speed mode occupancy
28800 1 90.0 129.3378 35.5030 60 1 2
28800 2 45.0 129.3231 35.4898 40 2 30
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| time | int | 시간 (초 단위) |
| veh_id | int | 차량 ID |
| direction | float | 방향 (0~360도) |
| lng | float | 경도 |
| lat | float | 위도 |
| speed | int | 속도 (km/h) |
| mode | int | 수단 (1: 승용차, 2: 버스, 8: 택시, 9: 소형트럭, 10: 중형트럭, 11: 대형트럭) |
| occupancy | int | 승차 인원 |

> 컬럼이 6개인 경우 메조(nuclear) 형식으로 처리됩니다.

### storm / flood - `Person_Position.txt` (보행자 시뮬레이션)

```
time person_id direction lng lat speed
28800 1 90.0 128.7311 38.0087 5
28800 2 270.0 128.7320 38.0090 4
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| time | int | 시간 (초 단위) |
| person_id | int | 사람 ID |
| direction | float | 방향 (0~360도) |
| lng | float | 경도 |
| lat | float | 위도 |
| speed | int | 속도 (km/h) |

### 재난 유형별 필수 파일

| 재난 유형 | 필수 파일명 |
|-----------|------------|
| nuclear | `VehicleLocation` 포함 |
| chemistry | `VehicleLocation` 또는 `Vehicle_Position` 포함 |
| storm | `Person_Position` 포함 |
| flood | `Person_Position` 포함 |
| complex | `VehicleLocation` + `Person_Position` 모두 포함 |

## 지원 재난 유형

| 유형 | 반경 제한 | 비고 |
|------|-----------|------|
| nuclear | PAZ ≤5km, UPZ ≤30km, Shadow ≤45km, Analysis ≤50km | 풍향/풍속 필수, 16방위 섹터 |
| chemistry | 재난 ≤5km, 분석 ≤15km | 차량 시뮬레이션 |
| storm | 재난 ≤2km, 분석 ≤3km | 보행자 시뮬레이션 |
| flood | 재난 ≤2km, 분석 ≤3km | 보행자 시뮬레이션 |

## 주요 기능

- **청크 업로드**: 대용량 파일 분할 업로드 및 세션 관리
- **ZIP 보안 검증**: 위험 확장자 차단, 압축비 제한 (100x), 경로 탐색 방지
- **지오메트리 생성**: Shapely 기반 버퍼/섹터 생성, EPSG:4326 ↔ EPSG:5179 좌표 변환
- **도로 네트워크 분석**: STRtree 공간 인덱싱, 차선별/보행자별 offset 지오메트리
- **캐싱**: 지오메트리 결과 JSON 파일 캐싱, 위치 데이터 TTL 메모리 캐싱 (1시간)
- **JSONL 저장소**: 배치 기반 프로젝트 관리 (배치당 1,000건)

## 파일 제한

| 항목 | 제한 |
|------|------|
| 최대 업로드 크기 | 500 MB |
| 최대 압축 해제 크기 | 2 GB |
| 최대 압축비 | 100x |
| 캐시 TTL | 3,600초 (1시간) |
| 캐시 최대 항목 | 100,000건 |
