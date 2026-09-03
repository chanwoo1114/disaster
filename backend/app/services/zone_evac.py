"""행정동(존)별 대피율 시계열(EvacuationRateByZone.txt) → zone-evac.json

ZoneID 가 행정동 코드(emd_code, 8자리)와 1:1로 일치함을 확인했으므로 (2026-09-02,
25/28개 — 나머지는 대피소성 ID), 행정동 클릭 시 코드로 바로 조회한다.

컬럼(18): Time ZoneID Perm.Evacuee Perm.ExitInPAZ %.. Perm.ExitInUPZW %.. Perm.ExitInUPZ %..
          Temp.Evacuee Temp.ExitInPAZ %.. Temp.ExitInUPZW %.. Temp.ExitInUPZ %..
          No.ArrivalInShelter %ArrivalInShelter
존은 하나의 구역(PAZ/UPZW/UPZ)에만 속하므로 이탈률은 세 구역 % 중 최댓값을 쓴다.

8자리 미만 ZoneID(예: 100000)는 행정동이 아니라 특수시설(학교 등)로,
InputData 의 special_facility.txt id 와 매칭된다 (2026-09-03 확인 — 양남중학교 등).
이들의 이름·좌표를 "etc" 로 함께 내보내 시설 점 표출에 쓴다.
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

ZONE_FILE = "zone-evac.json"
_GLOB = "EvacuationRateByZone.txt"
_COLS = [
    "time", "zone", "perm",
    "pe_paz", "pp_paz", "pe_upzw", "pp_upzw", "pe_upz", "pp_upz",
    "temp",
    "te_paz", "tp_paz", "te_upzw", "tp_upzw", "te_upz", "tp_upz",
    "sh_arr", "sh_pct",
]
_HHMM = re.compile(r"^(\d{1,2}):(\d{2})$")


def has_outputs(scen_dir: Path) -> bool:
    return (scen_dir / ZONE_FILE).exists()


def summary_from_meta(scen_dir: Path) -> Optional[dict]:
    path = scen_dir / ZONE_FILE
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return None
    return {"time_count": len(data.get("times", [])), "zone_count": len(data.get("zones", {}))}


def _to_seconds(v: str) -> Optional[int]:
    m = _HHMM.match(str(v).strip())
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60


def _load_facilities(session_root: Path) -> dict:
    """special_facility.txt → {id(str): {name, type, lng, lat}}"""
    path = next((p for p in session_root.rglob("special_facility.txt")), None)
    if path is None:
        return {}
    try:
        df = pd.read_csv(path, sep="	", header=0, encoding="cp949", encoding_errors="replace")
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return {}
    df.columns = [str(c).strip() for c in df.columns]
    need = {"id", "name", "x", "y"}
    if not need.issubset(df.columns):
        return {}
    out = {}
    for r in df.itertuples(index=False):
        try:
            out[str(int(getattr(r, "id")))] = {
                "name": str(getattr(r, "name")).strip(),
                "type": str(getattr(r, "type_name", "")).strip(),
                "lng": float(getattr(r, "x")),
                "lat": float(getattr(r, "y")),
            }
        except (TypeError, ValueError):
            continue
    return out


def build(scen_dir: Path, session_root: Optional[Path] = None) -> Optional[dict]:
    path = next((p for p in scen_dir.rglob(_GLOB)), None)
    if path is None:
        return None

    try:
        df = pd.read_csv(
            path, sep=r"\s+", header=None, skiprows=1, names=_COLS,
            encoding="cp949", encoding_errors="replace",
        )
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None
    if df.empty or df.shape[1] != len(_COLS):
        return None

    df["time"] = df["time"].map(_to_seconds)
    for c in _COLS[1:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["time", "zone"])
    if df.empty:
        return None

    df["zone"] = df["zone"].astype("int64").astype(str)
    df["perm_pct"] = df[["pp_paz", "pp_upzw", "pp_upz"]].max(axis=1)
    df["temp_pct"] = df[["tp_paz", "tp_upzw", "tp_upz"]].max(axis=1)

    times = sorted(int(t) for t in df["time"].unique())

    def grid(col: str) -> pd.DataFrame:
        return (
            df.pivot_table(index="time", columns="zone", values=col, aggfunc="last")
            .reindex(times).ffill().fillna(0)
        )

    g_perm = grid("perm_pct")
    g_temp = grid("temp_pct")
    g_spct = grid("sh_pct")
    g_sarr = grid("sh_arr")
    # 구역별 이탈률 계열 (PAZ/UPZW/UPZ 전부 — 카드에서 각각 표시)
    g_area = {
        ("perm", "PAZ"): grid("pp_paz"),
        ("perm", "UPZW"): grid("pp_upzw"),
        ("perm", "UPZ"): grid("pp_upz"),
        ("temp", "PAZ"): grid("tp_paz"),
        ("temp", "UPZW"): grid("tp_upzw"),
        ("temp", "UPZ"): grid("tp_upz"),
    }

    pops = df.groupby("zone").agg(perm=("perm", "max"), temp=("temp", "max"))
    exits = df.groupby("zone").agg(
        paz=("pe_paz", "max"), upzw=("pe_upzw", "max"), upz=("pe_upz", "max")
    )

    zones = {}
    for z in pops.index:
        ex = exits.loc[z]
        area = None
        if ex.max() > 0:
            area = {"paz": "PAZ", "upzw": "UPZW", "upz": "UPZ"}[ex.idxmax()]
        zones[z] = {
            "area": area,
            "perm": int(pops.loc[z, "perm"]),
            "temp": int(pops.loc[z, "temp"]),
            "permPct": [round(float(x), 2) for x in g_perm[z].tolist()],
            "tempPct": [round(float(x), 2) for x in g_temp[z].tolist()],
            "shelterPct": [round(float(x), 2) for x in g_spct[z].tolist()],
            "shelterArr": [int(x) for x in g_sarr[z].tolist()],
            "permByArea": {
                a: [round(float(x), 2) for x in g_area[("perm", a)][z].tolist()]
                for a in ("PAZ", "UPZW", "UPZ")
            },
            "tempByArea": {
                a: [round(float(x), 2) for x in g_area[("temp", a)][z].tolist()]
                for a in ("PAZ", "UPZW", "UPZ")
            },
        }

    # 8자리 미만 = 특수시설 존 → special_facility 에서 이름·좌표 부착
    etc = {}
    short_ids = [z for z in zones if len(z) < 8]
    if short_ids and session_root is not None:
        fac = _load_facilities(session_root)
        for z in short_ids:
            if z in fac:
                etc[z] = fac[z]

    out = {"times": times, "zones": zones, "etc": etc}
    with open(scen_dir / ZONE_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    logger.info("존별 대피율 %d시점 × %d존 → %s", len(times), len(zones), scen_dir.name)
    return {"time_count": len(times), "zone_count": len(zones)}


def build_or_load(scen_dir: Path, session_root: Optional[Path] = None) -> Optional[dict]:
    if has_outputs(scen_dir):
        return summary_from_meta(scen_dir)
    return build(scen_dir, session_root)
