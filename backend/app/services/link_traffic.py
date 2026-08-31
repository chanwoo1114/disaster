"""LinkTravelInformation_{hour}.txt → 링크 소통정보 시계열 산출물

세션 폴더에 다음 4개를 만든다.
  links.geojson        대상지 반경 내 도로망 전체 (FeatureCollection, properties.link_id, has_data)
  link_traffic.json    메타: times(초), hours, link_ids(속도 행렬 열 순서), fspeed, 통계
  link_speeds.bin      uint8  [T × L]  5분 단위 속도(km/h). 255 = 데이터 없음
  link_vols.bin        uint16 [H × L]  시간대별 교통량(VVol+HVol)

links.geojson 은 반경 안의 모든 링크(회색 배경용)이고, 속도 행렬은 그중 소통정보가
있는 링크(has_data=true)만 열로 가진다.

파일 형식 (공백 구분, 헤더 1줄):
  LinkID FromNodeID ToNodeID Rank Time VVol HVol FSpeed Speed1 … Speed12
`_final` 파일은 컬럼이 달라(WalkVol BiCyVol) 건너뛴다.
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from .. import config
from .link_network import LinkNetwork

logger = logging.getLogger(__name__)

_FILE_RE = re.compile(r"^LinkTravelInformation_(\d+)\.txt$", re.IGNORECASE)
_BASE_COLS = ["link_id", "f_node", "t_node", "rank", "time", "vvol", "hvol", "fspeed"]
SLOTS_PER_HOUR = 12
SLOT_SECONDS = 300
NO_DATA = 255

META_FILE = "link_traffic.json"
GEOJSON_FILE = "links.geojson"
SPEEDS_FILE = "link_speeds.bin"
VOLS_FILE = "link_vols.bin"


def find_hour_files(session_dir: Path) -> Dict[int, Path]:
    files: Dict[int, Path] = {}
    for p in session_dir.iterdir():
        m = _FILE_RE.match(p.name)
        if m:
            files[int(m.group(1))] = p
    return dict(sorted(files.items()))


def _read_hour_file(path: Path) -> Optional[pd.DataFrame]:
    try:
        df = pd.read_csv(
            path, sep=r"\s+", header=None, skiprows=1, encoding="cp949", dtype=np.int64
        )
    except (ValueError, pd.errors.EmptyDataError):
        return None

    if df.empty or df.shape[1] != len(_BASE_COLS) + SLOTS_PER_HOUR:
        return None

    df.columns = _BASE_COLS + [f"s{i}" for i in range(SLOTS_PER_HOUR)]
    return df.drop_duplicates("link_id", keep="first")


def build(session_dir: Path, disaster_type: str, lng: float, lat: float) -> Optional[dict]:
    """산출물 생성. 링크 파일이 없으면 None."""
    hour_files = find_hour_files(session_dir)
    if not hour_files:
        return None

    frames: Dict[int, pd.DataFrame] = {}
    for hour, path in hour_files.items():
        df = _read_hour_file(path)
        if df is not None:
            frames[hour] = df
    if not frames:
        return None

    hours = sorted(frames)

    # ── 배경 도로망: 대상지 반경 안의 모든 링크 ──────────────────────────
    radius_km = config.NETWORK_RADIUS_KM.get(disaster_type, 50)
    network = LinkNetwork.within_radius(lng, lat, radius_km)
    if network.empty:
        logger.warning("반경 %dkm 안에 도로 링크가 없습니다: %s", radius_km, session_dir.name)
        return None

    # ── 소통정보가 있는 링크 (속도 행렬의 열) ─────────────────────────────
    all_ids = pd.Index(
        np.unique(np.concatenate([f["link_id"].to_numpy() for f in frames.values()]))
    )
    matched_mask = all_ids.isin(network.index)
    link_ids = all_ids[matched_mask]
    unmatched = int((~matched_mask).sum())

    L = len(link_ids)
    H = len(hours)
    T = H * SLOTS_PER_HOUR
    id_pos = pd.Series(np.arange(L), index=link_ids)

    speeds = np.full((T, L), NO_DATA, dtype=np.uint8)
    vols = np.zeros((H, L), dtype=np.uint16)
    fspeed = np.zeros(L, dtype=np.uint8)

    for hi, hour in enumerate(hours):
        df = frames[hour]
        df = df[df["link_id"].isin(id_pos.index)]
        if df.empty:
            continue
        cols = id_pos.loc[df["link_id"].to_numpy()].to_numpy()

        s = df[[f"s{i}" for i in range(SLOTS_PER_HOUR)]].to_numpy().clip(0, NO_DATA - 1)
        speeds[hi * SLOTS_PER_HOUR : (hi + 1) * SLOTS_PER_HOUR, cols] = s.T.astype(np.uint8)

        v = (df["vvol"] + df["hvol"]).to_numpy().clip(0, 65535)
        vols[hi, cols] = v.astype(np.uint16)

        fs = df["fspeed"].to_numpy().clip(0, NO_DATA - 1).astype(np.uint8)
        fspeed[cols] = np.where(fspeed[cols] == 0, fs, fspeed[cols])

    times = [h * 3600 + k * SLOT_SECONDS for h in hours for k in range(SLOTS_PER_HOUR)]

    # ── GeoJSON: 반경 내 전체 링크, 소통정보 유무 플래그 ─────────────────
    has_data = network.index.isin(link_ids)
    features: List[dict] = []
    for lid, flag, row in zip(network.index, has_data, network.itertuples(index=False)):
        features.append(
            {
                "type": "Feature",
                "id": int(lid),
                "properties": {
                    "link_id": int(lid),
                    "name": str(getattr(row, "road_name", "") or ""),
                    "rank": str(row.road_rank),
                    "lanes": int(row.lanes),
                    "max_spd": int(row.max_spd),
                    "has_data": bool(flag),
                },
                "geometry": _round_geom(row.geometry.__geo_interface__),
            }
        )

    data_bounds = (
        network.loc[link_ids].total_bounds.tolist() if L else network.total_bounds.tolist()
    )

    with open(session_dir / GEOJSON_FILE, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False)
    speeds.tofile(session_dir / SPEEDS_FILE)
    vols.tofile(session_dir / VOLS_FILE)

    meta = {
        "hours": hours,
        "times": times,
        "slot_seconds": SLOT_SECONDS,
        "radius_km": radius_km,
        "network_count": int(len(network)),
        "link_count": L,
        "unmatched_count": unmatched,
        "link_ids": [int(x) for x in link_ids],
        "fspeed": fspeed.tolist(),
        "bounds": data_bounds,
        "no_data": NO_DATA,
    }
    with open(session_dir / META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    logger.info(
        "링크 소통정보 생성: 반경 %dkm 도로망 %d개, 소통정보 %d개 (미매칭 %d), %d hours",
        radius_km, len(network), L, unmatched, H,
    )
    return {
        "radius_km": radius_km,
        "network_count": int(len(network)),
        "link_count": L,
        "unmatched_count": unmatched,
        "hours": hours,
    }


def _round_geom(geom: dict, ndigits: int = 5) -> dict:
    """좌표를 소수 5자리(~1m)로 잘라 GeoJSON 크기를 줄인다"""

    def rnd(coords):
        if isinstance(coords[0], (int, float)):
            return [round(c, ndigits) for c in coords]
        return [rnd(c) for c in coords]

    return {"type": geom["type"], "coordinates": rnd(geom["coordinates"])}


def has_outputs(session_dir: Path) -> bool:
    return all(
        (session_dir / f).exists() for f in (META_FILE, GEOJSON_FILE, SPEEDS_FILE, VOLS_FILE)
    )


def summary_from_meta(session_dir: Path) -> Optional[dict]:
    """이미 생성된 산출물의 메타에서 요약만 재구성"""
    path = session_dir / META_FILE
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        m = json.load(f)
    return {
        "radius_km": m["radius_km"],
        "network_count": m["network_count"],
        "link_count": m["link_count"],
        "unmatched_count": m["unmatched_count"],
        "hours": m["hours"],
    }
