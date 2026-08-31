"""VehicleLocation_{hour}.txt → 차량 위치 스냅샷 산출물

세션 폴더에 다음 2개를 만든다.
  vehicle_positions.json  메타: times(초, 5분 그리드), offsets(프레임별 시작 행), total, version
  vehicle_positions.bin   [pos f32 ×2N][dir f32 ×N][veh_id u32 ×N][occ u16 ×N]  (N = 전체 행 수)
                          (veh_id 를 occ 앞에 두어 u32 정렬(12N)이 항상 4의 배수가 되게 한다)

pos 는 (lng, lat) interleave 라 프레임 구간을 subarray 로 잘라 deck.gl 바이너리
attribute 에 바로 꽂을 수 있다.

파일 형식 (공백 구분, 헤더 1줄):
  Time VehicleID Occupancy direction x y
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_FILE_RE = re.compile(r"^VehicleLocation_(\d+)\.txt$", re.IGNORECASE)
_COLS = ["time", "veh_id", "occupancy", "direction", "lng", "lat"]

META_FILE = "vehicle_positions.json"
BIN_FILE = "vehicle_positions.bin"
INFO_FILE = "vehicle_info.json"

_AUX_HOUSE = "PermanentHouseAuto.txt"  # VehicleID HouseID StartTime Occupancy
_AUX_PERSON = "PermanentPersonAuto.txt"  # VehicleID PersonID StartTime Occupancy
_AUX_BUS = "BusOccupancy.txt"  # VehicleID HouseID BoardingTime No.Passenger No.Residents


def has_outputs(session_dir: Path) -> bool:
    return all((session_dir / f).exists() for f in (META_FILE, BIN_FILE))


def summary_from_meta(session_dir: Path) -> Optional[dict]:
    """이미 생성된 산출물의 메타에서 요약만 재구성"""
    path = session_dir / META_FILE
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        m = json.load(f)
    times = m["times"]
    offsets = m["offsets"]
    if not times:
        return None
    counts = [offsets[i + 1] - offsets[i] for i in range(len(times))]
    return {
        "frame_count": len(times),
        "max_vehicles": max(counts),
        "first_time": times[0],
        "last_time": times[-1],
    }


def _find_files(session_dir: Path) -> Dict[int, Path]:
    files: Dict[int, Path] = {}
    for p in session_dir.iterdir():
        m = _FILE_RE.match(p.name)
        if m:
            files[int(m.group(1))] = p
    return dict(sorted(files.items()))


def _read_file(path: Path) -> Optional[pd.DataFrame]:
    if path.stat().st_size == 0:
        return None
    try:
        df = pd.read_csv(path, sep=r"\s+", header=None, skiprows=1, encoding="cp949")
    except (ValueError, pd.errors.EmptyDataError):
        return None
    if df.empty or df.shape[1] != len(_COLS):
        return None
    df.columns = _COLS
    return df


def _read_aux(path: Path, ncols: int) -> Optional[pd.DataFrame]:
    if not path.exists() or path.stat().st_size == 0:
        return None
    try:
        df = pd.read_csv(path, sep=r"\s+", header=None, skiprows=1, encoding="cp949")
    except (ValueError, pd.errors.EmptyDataError):
        return None
    return df if df.shape[1] == ncols else None


def _build_info(session_dir: Path, veh_ids: set) -> None:
    """차량별 연계 정보(출발/승차 기록)를 vehicle_info.json 으로 저장.
    VehicleLocation 에 등장하는 차량만 남겨 파일 크기를 억제한다."""
    info: dict = {}

    def entry(v) -> dict:
        return info.setdefault(str(int(v)), {})

    house = _read_aux(session_dir / _AUX_HOUSE, 4)
    if house is not None:
        house.columns = ["veh", "house", "start", "occ"]
        for r in house[house["veh"].isin(veh_ids)].itertuples(index=False):
            d = entry(r.veh)
            d["start"] = int(r.start)
            d["house"] = int(r.house)

    person = _read_aux(session_dir / _AUX_PERSON, 4)
    if person is not None:
        person.columns = ["veh", "person", "start", "occ"]
        for r in person[person["veh"].isin(veh_ids)].itertuples(index=False):
            d = entry(r.veh)
            d.setdefault("start", int(r.start))
            d["person"] = int(r.person)

    bus = _read_aux(session_dir / _AUX_BUS, 5)
    if bus is not None:
        bus.columns = ["veh", "house", "btime", "pax", "res"]
        sub = bus[bus["veh"].isin(veh_ids)]
        if not sub.empty:
            agg = sub.groupby("veh").agg(
                n=("btime", "size"),
                pax=("pax", "sum"),
                first=("btime", "min"),
                last=("btime", "max"),
            )
            # 주의: r.first / r.last 는 pandas 메서드와 이름이 겹치므로 인덱싱으로 접근
            for veh, r in agg.iterrows():
                entry(veh)["bus"] = {
                    "n": int(r["n"]),
                    "pax": int(r["pax"]),
                    "first": int(r["first"]),
                    "last": int(r["last"]),
                }

    with open(session_dir / INFO_FILE, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False)
    logger.info("차량 연계 정보: %d대", len(info))


def build(session_dir: Path) -> Optional[dict]:
    """산출물 생성. VehicleLocation 파일이 없으면 None."""
    files = _find_files(session_dir)
    if not files:
        return None

    frames = [df for df in (_read_file(p) for p in files.values()) if df is not None]
    if not frames:
        return None

    df = pd.concat(frames, ignore_index=True)
    df = df.sort_values("time", kind="stable")

    times_arr = df["time"].to_numpy(dtype=np.int64)
    unique_times, counts = np.unique(times_arr, return_counts=True)
    offsets = np.concatenate([[0], np.cumsum(counts)]).astype(np.int64)
    total = int(offsets[-1])

    pos = np.empty(total * 2, dtype=np.float32)
    pos[0::2] = df["lng"].to_numpy(dtype=np.float32)
    pos[1::2] = df["lat"].to_numpy(dtype=np.float32)
    dirs = df["direction"].to_numpy(dtype=np.float32)
    ids = np.clip(df["veh_id"].to_numpy(), 0, 2**32 - 1).astype(np.uint32)
    occ = np.clip(df["occupancy"].to_numpy(), 0, 65535).astype(np.uint16)

    with open(session_dir / BIN_FILE, "wb") as f:
        f.write(pos.tobytes())
        f.write(dirs.tobytes())
        f.write(ids.tobytes())
        f.write(occ.tobytes())

    meta = {
        "version": 2,
        "times": [int(t) for t in unique_times],
        "offsets": [int(o) for o in offsets],
        "total": total,
    }
    with open(session_dir / META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    try:
        _build_info(session_dir, set(int(v) for v in df["veh_id"].unique()))
    except Exception:
        logger.exception("차량 연계 정보 생성 실패 (무시)")

    max_vehicles = int(counts.max())
    summary = {
        "frame_count": int(len(unique_times)),
        "max_vehicles": max_vehicles,
        "first_time": int(unique_times[0]),
        "last_time": int(unique_times[-1]),
    }
    logger.info(
        "차량 위치 생성: %d rows, %d frames (최대 %d대), %d–%d초",
        total, len(unique_times), max_vehicles, unique_times[0], unique_times[-1],
    )
    return summary
