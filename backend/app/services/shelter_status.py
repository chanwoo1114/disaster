"""대피소 대피율 시계열(ShelterStatus.txt) → shelter-status.json

시나리오 결과 폴더의 ShelterStatus.txt 를 읽어, 시점별 대피소 도착 인원/대피율을
지도 타임라인에 맞춰 쓸 수 있는 시계열로 만든다.

컬럼: Time  ShelterID  Capacity  No.of Assign  No.of Arrival  %Arrival
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

STATUS_FILE = "shelter-status.json"
_STATUS_GLOB = "ShelterStatus.txt"
_COLS = ["time", "shelter_id", "capacity", "assign", "arrival", "pct"]
_HHMM = re.compile(r"^(\d{1,2}):(\d{2})$")


def has_outputs(scen_dir: Path) -> bool:
    return (scen_dir / STATUS_FILE).exists()


def summary_from_meta(scen_dir: Path) -> Optional[dict]:
    path = scen_dir / STATUS_FILE
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return None
    return {"time_count": len(data.get("times", [])), "shelter_count": len(data.get("shelters", {}))}


def _to_seconds(v: str) -> Optional[int]:
    m = _HHMM.match(str(v).strip())
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60


def build(scen_dir: Path) -> Optional[dict]:
    """scen_dir 안의 ShelterStatus.txt → shelter-status.json. 데이터가 없으면 None."""
    path = next((p for p in scen_dir.rglob(_STATUS_GLOB)), None)
    if path is None:
        return None

    try:
        df = pd.read_csv(
            path, sep=r"\s+", header=None, skiprows=1, names=_COLS,
            encoding="cp949", encoding_errors="replace",
        )
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None
    if df.empty:
        return None

    df["time"] = df["time"].map(_to_seconds)
    for c in ("shelter_id", "capacity", "assign", "arrival"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["pct"] = pd.to_numeric(df["pct"], errors="coerce")
    df = df.dropna(subset=["time", "shelter_id"])
    if df.empty:
        return None

    df["shelter_id"] = df["shelter_id"].astype("int64")
    times = sorted(int(t) for t in df["time"].unique())

    # 시점 × 대피소 격자: 누적값이라 보고 없는 시점은 직전 값으로 채우고, 시작 전은 0
    arr = (
        df.pivot_table(index="time", columns="shelter_id", values="arrival", aggfunc="last")
        .reindex(times).ffill().fillna(0)
    )
    pct = (
        df.pivot_table(index="time", columns="shelter_id", values="pct", aggfunc="last")
        .reindex(times).ffill().fillna(0)
    )
    meta = df.groupby("shelter_id").agg(cap=("capacity", "max"), assign=("assign", "max"))

    shelters = {}
    for sid in meta.index:
        shelters[str(int(sid))] = {
            "cap": int(meta.loc[sid, "cap"]),
            "assign": int(meta.loc[sid, "assign"]),
            "arrival": [int(x) for x in arr[sid].tolist()],
            "pct": [round(float(x), 1) for x in pct[sid].tolist()],
        }

    out = {"times": times, "shelters": shelters}
    with open(scen_dir / STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    logger.info("대피율 시계열 %d시점 × %d대피소 → %s", len(times), len(shelters), scen_dir.name)
    return {"time_count": len(times), "shelter_count": len(shelters)}


def build_or_load(scen_dir: Path) -> Optional[dict]:
    if has_outputs(scen_dir):
        return summary_from_meta(scen_dir)
    return build(scen_dir)
