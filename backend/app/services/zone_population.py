"""존(행정동)별 인구·이동 요약 → zone-population.json

InputData 의 인구/활동 원본을 행정동(adm_cd, 8자리)별로 1회 집계한다.
전국 규모(person ~190만, activity ~390만)라 세션 준비 시 한 번만 계산해 저장한다.

- person.txt : AgentID house_id ... age usecar sex job ... transportation_vulnerable adm_cd disabled_pop
- house.txt  : house_id members home_id usecar area adm_cd
- activity.txt: AgentID seq Purpose OZoneID DZoneID Mode ActStartTime DurationTime TravelStartTime
  Mode 는 통행수단 코드(0~3). 존을 출발지(OZoneID)로 하는 통행의 수단 분담을 집계.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

POP_FILE = "zone-population.json"

# activity Mode 코드 → 라벨 (Mode_*.arg: 도보/승용차/버스 계열)
MODE_LABELS = {0: "도보", 1: "승용차", 2: "버스", 3: "기타"}


def has_outputs(session_dir: Path) -> bool:
    return (session_dir / POP_FILE).exists()


def _find(session_dir: Path, name: str) -> Optional[Path]:
    return next((p for p in session_dir.rglob(name)), None)


def build(session_dir: Path) -> Optional[dict]:
    """세션 폴더 전체에서 인구/가구/활동을 찾아 존별 요약 생성. 세션 단위(시나리오 무관)."""
    person_p = _find(session_dir, "person.txt")
    house_p = _find(session_dir, "house.txt")
    if person_p is None and house_p is None:
        return None

    zones: dict[str, dict] = {}

    def z(code: str) -> dict:
        return zones.setdefault(
            code,
            {
                "pop": 0, "vulnerable": 0, "disabled": 0,
                "house": 0, "carHouse": 0,
                "mode": {},
            },
        )

    # ── person ──────────────────────────────────────────────────────────
    if person_p is not None:
        try:
            pe = pd.read_csv(
                person_p, sep="\t",
                usecols=["transportation_vulnerable", "adm_cd", "disabled_pop"],
            )
            pe["adm_cd"] = pe["adm_cd"].astype("int64").astype(str)
            g = pe.groupby("adm_cd").agg(
                pop=("adm_cd", "size"),
                vulnerable=("transportation_vulnerable", "sum"),
                disabled=("disabled_pop", "sum"),
            )
            for code, r in g.iterrows():
                d = z(code)
                d["pop"] = int(r["pop"])
                d["vulnerable"] = int(r["vulnerable"])
                d["disabled"] = int(r["disabled"])
        except (ValueError, KeyError, pd.errors.EmptyDataError):
            logger.warning("person.txt 집계 실패")

    # ── house ───────────────────────────────────────────────────────────
    if house_p is not None:
        try:
            ho = pd.read_csv(house_p, sep="\t", usecols=["usecar", "adm_cd"])
            ho["adm_cd"] = ho["adm_cd"].astype("int64").astype(str)
            g = ho.assign(car=(ho["usecar"] > 0).astype(int)).groupby("adm_cd").agg(
                house=("adm_cd", "size"), carHouse=("car", "sum")
            )
            for code, r in g.iterrows():
                d = z(code)
                d["house"] = int(r["house"])
                d["carHouse"] = int(r["carHouse"])
        except (ValueError, KeyError, pd.errors.EmptyDataError):
            logger.warning("house.txt 집계 실패")

    # ── activity: 존을 출발지로 하는 통행의 수단 분담 ─────────────────────
    act_p = _find(session_dir, "activity.txt")
    if act_p is not None:
        try:
            ac = pd.read_csv(act_p, sep="\t", usecols=["OZoneID", "Mode"])
            ac["OZoneID"] = ac["OZoneID"].astype("int64").astype(str)
            mode_ct = ac.groupby(["OZoneID", "Mode"]).size()
            for (code, mode), cnt in mode_ct.items():
                if len(code) != 8:
                    continue
                z(code)["mode"][MODE_LABELS.get(int(mode), f"수단{mode}")] = int(cnt)
        except (ValueError, KeyError, pd.errors.EmptyDataError):
            logger.warning("activity.txt 집계 실패")

    if not zones:
        return None

    out = {"zones": zones}
    with open(session_dir / POP_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    logger.info("존별 인구 요약 %d개 존 → %s", len(zones), session_dir.name)
    return {"zone_count": len(zones)}


def build_or_load(session_dir: Path) -> Optional[dict]:
    if has_outputs(session_dir):
        try:
            with open(session_dir / POP_FILE, "r", encoding="utf-8") as f:
                return {"zone_count": len(json.load(f).get("zones", {}))}
        except (OSError, ValueError):
            return None
    return build(session_dir)
