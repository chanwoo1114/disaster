# 로컬 실행 체크리스트

작업 시작 전에 이 순서대로 확인하세요. 특히 **1번**은 과거에 한 번 사고가 났던 지점입니다.

## 1. 대용량 데이터 확보 (가장 먼저)

**clone 직후에는 앱이 돌지 않습니다.** 두 단계가 필요합니다 —
LFS 실물을 받고, 그 중 `data.zip`을 백엔드 경로에 풀어야 합니다.

```bash
git lfs install        # 계정당 1회
git lfs pull           # file/ 의 ZIP 4개 내려받기 (859MB)

# data.zip 을 백엔드가 읽는 경로에 푼다
mkdir -p backend/app/data
unzip -o file/data.zip -d backend/app/data/
```

### `file/` 의 ZIP 4개 (Git LFS)

| 파일 | 크기 | 내용 | 없으면 |
|------|------|------|--------|
| `data.zip` | 441MB | `link.csv` · `adm.csv` · `links.parquet` · `node.csv` | 도로·행정구역 API 전부 실패 |
| `tt.zip` | 226MB | 업로드 테스트용 결과 | 3단계 업로드를 시험할 수 없음 |
| `micro.zip` | 98MB | 마이크로 시뮬레이션 결과 | 〃 |
| `macro.zip` | 94MB | 매크로 시뮬레이션 결과 | 〃 |

`data.zip`의 4개는 **압축을 푼 상태로 `backend/app/data/`에 있어야** 합니다.
이 경로는 `backend/app/config.py`의 `DATA_DIR`에 하드코딩돼 있어서
다른 곳에 두려면 코드를 함께 고쳐야 합니다.
풀어놓은 원본은 `.gitignore`로 제외되니 저장소에 다시 들어가지 않습니다.

> **왜 ZIP으로 묶어 두나** — 원본 4개는 합계 941MB인데 압축하면 441MB로
> 절반 이하가 됩니다(`links.parquet`은 이미 압축 포맷이라 거의 안 줄어듦).
> GitHub 무료 LFS 한도가 저장소 1GB·대역폭 1GB/월이라, 풀어서 올리면
> 한도를 넘겨 팀원 전체의 `git lfs pull`이 막힙니다. ZIP 4개 합계
> 859MB로 한도 안에 들어갑니다.

### 포인터인지 실물인지 판별

LFS 없이 clone하면 이 파일들은 **134바이트 포인터 텍스트**로 받아집니다.
"파일은 있는데 열면 깨지는" 제일 헷갈리는 실패 모드입니다.

```bash
ls -l file/data.zip           # 441MB여야 정상. 134바이트면 포인터
head -c 60 file/data.zip      # "version https://git-lfs..." 가 보이면 포인터
```

### 반대로, git에 들어 있는 에셋

`front/src/assets/images/**` 의 차량 스프라이트 396개는 저장소에 있습니다.
이게 비어 있다면 인덱스가 날아간 것(`git rm --cached -r .` 류)이니 복구하세요.

```bash
git diff HEAD --name-status | grep -v '^D'   # 반드시 먼저! 출력이 비어야 안전
git reset                                     # 인덱스를 HEAD로 되돌림
git checkout -- .                             # 유실된 파일을 HEAD에서 복원
```

> 첫 줄이 **비어 있을 때만** 나머지를 실행하세요. 뭔가 출력되면 커밋되지 않은 수정분이 있다는 뜻이고, `git checkout -- .` 이 그걸 덮어씁니다.
>
> OneDrive 동기화 폴더에서는 `git checkout` 이 수 분 걸릴 수 있습니다. 멈춘 게 아니니 기다리세요.

## 2. 환경 변수 — `.env` 파일이 두 개입니다

**가장 많이 헷갈리는 부분입니다.**

| 파일 | 읽는 주체 | git |
|------|-----------|-----|
| `front/.env` | 로컬 `npm run dev` (Vite) | ignored |
| 루트 `.env` | `docker-compose` 빌드 인자 | ignored |
| `.env.example` | 템플릿일 뿐, 아무도 안 읽음 | **추적됨 — 진짜 키를 넣지 말 것** |

로컬 개발이면 `front/.env`입니다. 루트 `.env`에만 키를 넣으면 지도가 빈 화면으로 뜹니다.

```bash
cp .env.example front/.env     # 그리고 VITE_VWORLD_API_KEY 입력
```

`.env`는 HMR이 적용되지 않습니다. 값을 바꿨으면 **dev 서버를 재시작**하세요.

### VWorld 키가 살아 있는지 1초 만에 확인

지도가 비어 보일 때, 키 만료인지 코드 문제인지 가르는 가장 빠른 방법:

```bash
curl -s "https://api.vworld.kr/req/wmts/1.0.0/<KEY>/white/10/403/875.png" | head -c 200
```

- PNG 바이너리가 나오면 → 키 정상
- `인증키가 만료되었습니다` XML이 나오면 → vworld.kr 마이페이지에서 재발급/연장

### 키가 없을 때

`front/src/map/vworldStyle.ts`의 폴백은 **일반(OSM) · 위성(Esri)만 동작**합니다.
밝음/어두움은 CARTO를 쓰는데 CARTO도 이제 키를 요구해서 워터마크가 깔립니다.

## 3. 의존성

```bash
# 백엔드
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt

# 프론트 — 반드시 front/ 안에서 실행
cd front && npm install
```

> `npm --prefix front install` 은 루트 `package.json`을 찾다가 ENOENT로 실패합니다. `cd front` 하세요.

## 4. 실행

```bash
# 백엔드 :8001
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# 프론트 :5173
cd front && npm run dev
```

확인:

- http://127.0.0.1:5173/ — 지도에 한국 지도가 보이고 우하단 attribution이 `© VWorld`
- http://127.0.0.1:8001/docs — 라우트 18개

## 5. 동작 확인

`file/tt.zip`을 1단계(재난 유형) · 2단계(대상지) 선택 후 3단계에 업로드하면 전체 흐름이 돕니다.
세션은 저장되지 않고 `backend/app/data/sessions/{id}/`에 6시간만 남습니다.
