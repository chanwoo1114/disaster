"""시나리오 부가정보 추출

- Scenario_{n}.arg : 발생 시각·풍향·풍속 등 (키가 한글, cp949)
- DESKSmallZone.txt : 존 중심좌표 + S_Area(대피 구역 코드) → 발원지(중심) 도출
  S_Area 양수 중 최솟값 구역(PAZ에 해당)이 발원지를 둘러싸므로 그 중심좌표를 쓴다.
"""

import logging
import re
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

_NUM_RE = re.compile(r"(\d+)\s*$")

# .arg 한글 키 → 영문 필드
_ARG_KEYS = {
    "계절": "season",
    "요일": "day",
    "시간": "hour",
    "날씨": "weather",
    "풍향": "wind_direction",
    "풍속": "wind_speed",
}


def parse_scenario_args(session_dir: Path, scenario_name: str) -> Optional[dict]:
    """시나리오 이름(S_1 등)에 대응하는 Scenario_{n}.arg 를 찾아 파싱"""
    m = _NUM_RE.search(scenario_name)
    if not m:
        return None
    target = f"Scenario_{int(m.group(1))}.arg"

    path = next((p for p in session_dir.rglob(target)), None)
    if path is None:
        return None

    result: dict = {}
    try:
        text = path.read_text(encoding="cp949", errors="replace")
    except OSError:
        return None

    for line in text.splitlines():
        if ":" not in line:
            continue
        key, _, rest = line.partition(":")
        key = key.strip()
        field = _ARG_KEYS.get(key)
        if not field:
            continue
        tokens = rest.split()
        if tokens:
            try:
                result[field] = int(tokens[0])
            except ValueError:
                pass

    return result or None


def derive_center(session_dir: Path) -> Optional[dict]:
    """DESKSmallZone 에서 발원지(대피 구역 중심) 좌표 도출"""
    path = next((p for p in session_dir.rglob("DESKSmallZone.txt")), None)
    if path is None:
        return None

    try:
        df = pd.read_csv(
            path, sep=r"\s+", header=None, skiprows=1, encoding="cp949",
            encoding_errors="replace",
        )
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None

    # 컬럼: MidZoneID SmallZoneID x y Pop House Employer EmployedPop Student S_Area wind Length attitude
    if df.shape[1] < 10:
        return None
    x, y, s_area = df[2], df[3], df[9]

    positive = s_area[s_area > 0]
    sel = df[s_area == positive.min()] if not positive.empty else df
    lng = float(sel[2].mean())
    lat = float(sel[3].mean())
    if not (124 <= lng <= 132 and 33 <= lat <= 39):
        return None

    logger.info("시나리오 중심 도출: (%.5f, %.5f) — %s", lng, lat, path.name)
    return {"lng": round(lng, 6), "lat": round(lat, 6)}
