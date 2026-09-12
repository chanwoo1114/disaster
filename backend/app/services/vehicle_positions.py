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

from ..config import DATA_DIR

logger = logging.getLogger(__name__)

_FILE_RE = re.compile(r"^VehicleLocation_(\d+)\.txt$", re.IGNORECASE)
_COLS = ["time", "veh_id", "occupancy", "direction", "lng", "lat"]

META_FILE = "vehicle_positions.json"
BIN_FILE = "vehicle_positions.bin"
INFO_FILE = "vehicle_info.json"

# 메타 version. 산출물 형식이나 vehicle_info 의 내용이 바뀌면 올린다 —
# 올리면 이전 세션의 캐시된 산출물이 무시되고 다시 생성된다.
# 4: adm.csv 도입 전 캐시는 출발지·도착지가 "행정동 37020360" 으로 굳어 있다
# 5: 특수시설 도착지에 facilityType(학교/병원/요양원) 추가
VERSION = 5

_AUX_HOUSE = "PermanentHouseAuto.txt"  # VehicleID HouseID StartTime Occupancy
_AUX_PERSON = "PermanentPersonAuto.txt"  # VehicleID PersonID StartTime Occupancy
_AUX_BUS = "BusOccupancy.txt"  # VehicleID HouseID BoardingTime No.Passenger No.Residents
# VehID AgentID HouseID 출발죤 도착죤 출발시간 도착시간 목적 차종 승차인원 경로번호 통행시간
_AUX_TRAVEL_GLOB = "VehicleTravelInfomation_*.txt"  # 원본 파일명의 오타(Infomation) 그대로


def has_outputs(session_dir: Path) -> bool:
    if not all((session_dir / f).exists() for f in (META_FILE, BIN_FILE)):
        return False
    try:
        with open(session_dir / META_FILE, "r", encoding="utf-8") as f:
            return int(json.load(f).get("version", 0)) >= VERSION
    except (OSError, ValueError, TypeError):
        return False


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


def _read_travel(session_dir: Path) -> Optional[pd.DataFrame]:
    """VehicleTravelInfomation_{hour}.txt → [veh, oz, dz, dep, arr, occ]

    헤더는 12개지만 HouseID 가 비어 12열/11열이 섞여 들어온다(실측 92,188행 중 480행).
    이름을 12개 고정으로 주면 11열 행은 뒤에 NaN 이 붙으면서 oz/dz 자리에 도착죤·
    출발시간이 들어와 조용히 틀린다. 마지막 열(통행시간) 유무로 두 형태를 갈라 읽는다.
    """
    frames = []
    for path in sorted(session_dir.glob(_AUX_TRAVEL_GLOB)):
        if path.stat().st_size == 0:
            continue
        try:
            raw = pd.read_csv(
                path, sep=r"\s+", header=None, skiprows=1, names=list(range(12)),
                encoding="cp949", encoding_errors="replace",
            )
        except (ValueError, pd.errors.EmptyDataError, OSError):
            continue
        if raw.empty:
            continue
        short = raw[11].isna()
        # (veh, oz, dz, dep, arr, occ) 가 놓인 열 번호 — HouseID 유무로 한 칸 밀린다
        for mask, cols in ((~short, (0, 3, 4, 5, 6, 9)), (short, (0, 2, 3, 4, 5, 8))):
            part = raw[mask]
            if part.empty:
                continue
            sub = part[list(cols)]
            sub.columns = ["veh", "oz", "dz", "dep", "arr", "occ"]
            frames.append(sub)

    if not frames:
        return None
    df = pd.concat(frames, ignore_index=True)
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["veh", "oz", "dz"])
    return df if not df.empty else None


_node_names: Optional[dict] = None


def _load_node_names() -> dict:
    """node.csv → {node_id: 노드명}. 20만 행이라 노드 도착지가 실제로 나올 때만 읽는다."""
    global _node_names
    if _node_names is None:
        try:
            df = pd.read_csv(
                DATA_DIR / "node.csv", usecols=["node_id", "node_nm"],
                dtype={"node_id": str},
            )
            names = df["node_nm"].fillna("").astype(str).str.strip()
            _node_names = {k: v for k, v in zip(df["node_id"], names) if v}
        except (OSError, ValueError, KeyError):
            logger.info("node.csv 가 없어 노드 도착지를 코드로 표시한다")
            _node_names = {}
    return _node_names


def _zone_namer(session_root: Optional[Path]):
    """존 코드 → {code, name, kind}. 코드 체계가 섞여 있어 마스터 조회로 판정한다.

    대피소(2~3자리)·특수시설(6자리)은 세션 안에 이름이 있고, 행정동(8자리)은
    app/data/adm.csv 가 있어야 이름이 나온다. 없으면 코드를 그대로 보여준다.
    """
    shelters: dict = {}
    facilities: dict = {}
    if session_root is not None:
        from .zone_evac import _load_facilities
        from .zone_paths import _load_shelters

        try:
            shelters = _load_shelters(session_root)
            facilities = _load_facilities(session_root)
        except Exception:
            logger.exception("대피소·시설 이름 로딩 실패 (코드로 대체)")

    adm_lookup = None
    try:
        from .adm_geometry import AdmGeometry

        adm = AdmGeometry.load()
        adm_lookup = adm.set_index("code") if adm.index.name != "code" else adm
    except Exception:  # adm.csv 가 없어도 대피소·시설 이름은 나와야 한다
        logger.info("행정동 이름 원본이 없어 출발지·도착지를 코드로 표시한다")

    def _adm_name(code: str) -> Optional[str]:
        if adm_lookup is None or code not in adm_lookup.index:
            return None
        row = adm_lookup.loc[code]
        if isinstance(row, pd.DataFrame):  # 코드 중복 시 첫 행
            row = row.iloc[0]
        return str(row["name"]).strip() if "name" in adm_lookup.columns else None

    cache: dict = {}

    def name_of(code: str) -> dict:
        hit = cache.get(code)
        if hit is not None:
            return hit
        if code in shelters:
            out = {"kind": "shelter", "name": shelters[code]["name"] or f"대피소 {code}"}
        elif code in facilities:
            # facilityType(학교/병원/요양원)은 카드에서 이름 옆 괄호로 쓴다
            out = {
                "kind": "facility",
                "name": facilities[code]["name"] or f"시설 {code}",
                "facilityType": facilities[code]["type"],
            }
        else:
            adm_name = _adm_name(code)
            if adm_name:
                out = {"kind": "adm", "name": adm_name}
            elif len(code) == 8:  # 8자리는 행정동 코드 체계 — 이름만 못 찾은 것
                out = {"kind": "adm", "name": f"행정동 {code}"}
            else:
                node_name = _load_node_names().get(code)
                out = {"kind": "node", "name": node_name or f"노드 {code}"}
        out["code"] = code
        cache[code] = out
        return out

    return name_of


def _add_travel_info(
    session_dir: Path, session_root: Optional[Path], info: dict, veh_ids: set
) -> None:
    """차량별 출발지·도착지·승차인원을 info 에 채운다.

    한 차량이 통행을 여러 번 하므로(실측 최대 4회) 가장 먼저 출발한 통행의 출발지와
    가장 늦게 도착한 통행의 도착지를 그 차량의 여정으로 본다.
    """
    df = _read_travel(session_dir)
    if df is None:
        return

    df = df[df["veh"].isin(veh_ids)]  # VehicleLocation 에 없는 차량은 표출되지 않는다
    if df.empty:
        return

    name_of = _zone_namer(session_root)
    first = df.sort_values("dep", kind="stable").drop_duplicates("veh", keep="first")
    last = df.sort_values("arr", kind="stable").drop_duplicates("veh", keep="last")
    dest_by_veh = {int(r.veh): int(r.dz) for r in last.itertuples(index=False)}

    for r in first.itertuples(index=False):
        d = info.setdefault(str(int(r.veh)), {})
        d["o"] = name_of(str(int(r.oz)))
        dz = dest_by_veh.get(int(r.veh))
        if dz is not None:
            d["d"] = name_of(str(int(dz)))
        if pd.notna(r.occ):
            d["occ"] = int(r.occ)
    logger.info("차량 출발지·도착지: %d대", len(first))


def _build_info(session_dir: Path, veh_ids: set, session_root: Optional[Path] = None) -> None:
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

    _add_travel_info(session_dir, session_root, info, veh_ids)

    with open(session_dir / INFO_FILE, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False)
    logger.info("차량 연계 정보: %d대", len(info))


def build(session_dir: Path, session_root: Optional[Path] = None) -> Optional[dict]:
    """산출물 생성. VehicleLocation 파일이 없으면 None.

    session_root 는 대피소·특수시설 이름 원본(InputData/…)이 시나리오 폴더가 아니라
    세션 전체에 있어서 받는다. 없으면 출발지·도착지가 코드로 남는다.
    """
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
        "version": VERSION,
        "times": [int(t) for t in unique_times],
        "offsets": [int(o) for o in offsets],
        "total": total,
    }
    with open(session_dir / META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    try:
        _build_info(
            session_dir, set(int(v) for v in df["veh_id"].unique()), session_root
        )
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
