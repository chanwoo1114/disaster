# 재난대피 시뮬레이터 (Backend)

FastAPI 기반. DB 없이 파일 시스템만 사용합니다.

## 실행

```bash
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

API 문서: `http://127.0.0.1:8001/docs`

## 구조

```
app/
├── main.py                  # 앱 진입점, 예외 핸들러, 세션 만료 정리 루프
├── config.py                # 경로·한도·세션 TTL
├── dependencies.py
├── router/
│   ├── upload.py            # POST /upload/init, /upload/chunk
│   ├── session.py           # POST /session, GET|DELETE /session/{id}
│   ├── geometry.py          # GET /geometry/nuclear-buffer, /disaster-buffer
│   ├── road.py              # GET /road/geometry
│   └── position.py          # POST /position/upload/{type}/{dir}, GET /position/{type}
├── services/
│   ├── chunk_upload.py      # 청크 저장/병합
│   ├── zip_file.py          # ZIP 이동/추출 (.txt만)
│   ├── session.py           # 세션 생성/조회/삭제/만료 정리
│   ├── disaster_geometry.py # 버퍼·16방위 섹터 생성
│   ├── road_geometry.py     # 도로 추출 (STRtree, 차선 offset)
│   ├── position.py          # 시간별 위치 조회 (TTL 캐시)
│   └── cache.py
├── schemas/                 # Pydantic 모델
├── validators/              # ZIP 보안 검증, 거리 검증
└── data/                    # git 제외
    ├── sessions/{id}/       # session.json + 추출된 .txt
    ├── uploads/, temp/      # 업로드 스테이징
    └── link.csv → link_*.parquet
```

## 세션 흐름

```
POST /upload/init     → upload_id
POST /upload/chunk    × N
POST /session         { upload_id, disaster_type, lng, lat }
                      → 청크 병합 → ZIP 무결성/압축폭탄 검증 → .txt 추출 → session.json
                      → { session_id, files, expires_at }
DELETE /session/{id}  → 폴더 삭제
```

- 세션은 생성 후 `SESSION_TTL_SECONDS`(6시간) 뒤 만료되며, 백그라운드 루프가 10분마다 만료 폴더를 삭제합니다.
- geometry / road / position API의 `directory` 파라미터에는 `session_id`를 넘깁니다.
- ZIP 내 필수 파일명 검사는 현재 하지 않습니다 (`.txt` 1개 이상만 요구). 파일 매핑 규칙은 추후 지정.

## 링크 소통정보 (LinkTravelInformation)

세션 생성 시 `LinkTravelInformation_{시}.txt`를 읽어 5분 단위 속도 시계열을 만들고, 표준 노드링크 지오메트리와 매칭합니다.

**사전 준비 (1회)** — 국토부 표준 노드링크 shapefile을 parquet으로 변환:
```bash
python scripts/build_link_network.py "C:/path/to/MOCT_LINK.shp"   # → app/data/links.parquet
```
S_1 데이터는 2024-11 버전(55.6만 링크)과 99.7% 매칭됩니다 (2025 버전은 96%).

**산출물** (`data/sessions/{id}/`):

| 파일 | 내용 |
|------|------|
| `links.geojson` | 매칭된 링크 지오메트리, `properties.link_id` |
| `link_traffic.json` | `times`(초), `hours`, `link_ids`(열 순서), `fspeed`, `bounds` |
| `link_speeds.bin` | `uint8 [T × L]` 속도 km/h, 255 = 없음 |
| `link_vols.bin` | `uint16 [H × L]` 시간대별 교통량 (VVol+HVol) |

`GET /session/{id}/traffic/{links.geojson | link-traffic.json | link-speeds.bin | link-vols.bin}`

## 파일 제한

| 항목 | 제한 |
|------|------|
| 최대 업로드 크기 | 500 MB (ZIP 1개) |
| 최대 압축 해제 크기 | 2 GB |
| 최대 압축비 | 100x |
| 세션 보관 | 6시간 |

## 위치 데이터 파일 형식

공백 구분, 첫 줄 헤더. 컬럼 수로 형식을 판별합니다.

| 형식 | 컬럼 |
|------|------|
| 메조 (6열) | `time veh_id occupancy direction lng lat` |
| 마이크로 (8열) | `time veh_id direction lng lat speed mode occupancy` |
| 보행 (6열, storm/flood) | `time person_id direction lng lat speed` |

`mode`: 1 승용차, 2 버스, 8 택시, 9 소형트럭, 10 중형트럭, 11 대형트럭
