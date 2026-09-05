"""존(출발지)별 대피 경로 링크망 → GeoJSON (온디맨드)

VehiclePath_{OZoneID}.txt : OZoneID DZoneID Serial Type Seq LinkID
한 존에서 각 목적지로 가는 경로가 링크 시퀀스로 들어있다. 대피 시뮬레이션 경로는
경로 하나가 수천 링크로 매우 길어(존당 32만 행) 개별 경로 LineString 으로 만들면
응답이 수백 MB가 된다. 그래서 "그 존의 대피 경로가 지나는 링크망"을 중복 제거해
표준 노드링크(links.parquet) 지오메트리로 하이라이트한다.

- 통행량(빈도)이 높은 링크일수록 굵게 표현할 수 있도록 count 를 함께 내보낸다.
- 존당 unique 링크 수천 개 수준이라 응답이 가볍다.
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from .link_network import LinkNetwork

logger = logging.getLogger(__name__)

_COLS = ["oz", "dz", "serial", "type", "seq", "link"]
_MAX_LINKS = 20000  # 안전 상한


def _find_path_file(session_dir: Path, zone: str) -> Optional[Path]:
    return next((p for p in session_dir.rglob(f"VehiclePath_{zone}.txt")), None)


def list_origins(session_dir: Path) -> list[str]:
    """VehiclePath 파일이 있는 출발지 존 코드 목록 (8자리 행정동만, 정렬)"""
    codes = set()
    for p in session_dir.rglob("VehiclePath_*.txt"):
        code = p.stem.split("_", 1)[1]
        if code.isdigit() and len(code) == 8:
            codes.add(code)
    return sorted(codes)


def origin_zones_geojson(session_dir: Path) -> dict:
    """선택 가능한 출발지 행정동들의 폴리곤 GeoJSON (반경 무관, 코드로 직접 조회)."""
    from .adm_geometry import AdmGeometry

    codes = list_origins(session_dir)
    if not codes:
        return {"type": "FeatureCollection", "features": []}

    adm = AdmGeometry.load()  # code, name, geometry (EPSG:4326, 단순화됨)
    idx = adm.index.name
    lookup = adm.set_index("code") if idx != "code" else adm

    features = []
    for code in codes:
        if code not in lookup.index:
            continue
        row = lookup.loc[code]
        geom = row.geometry
        name = row["name"] if "name" in lookup.columns else ""
        if geom is None or geom.is_empty:
            continue
        features.append(
            {
                "type": "Feature",
                "id": code,
                "properties": {"code": code, "name": str(name)},
                "geometry": _round_geom(geom.__geo_interface__),
            }
        )
    return {"type": "FeatureCollection", "features": features}


def list_dests(session_dir: Path, zone: str) -> Optional[list[dict]]:
    """출발지의 도착지 목록. 각 도착지의 경로(serial)·종류(type)·링크 수."""
    path = _find_path_file(session_dir, zone)
    if path is None:
        return None
    try:
        df = pd.read_csv(path, sep=r"\s+", skiprows=1, header=None, names=_COLS)
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None
    if df.empty:
        return []

    dests = []
    for dz, grp in df.groupby("dz"):
        dests.append(
            {
                "dz": int(dz),
                "serials": sorted(int(s) for s in grp["serial"].unique()),
                "types": sorted(int(t) for t in grp["type"].unique()),
                "linkCount": int(grp["link"].nunique()),
            }
        )
    dests.sort(key=lambda d: d["dz"])
    return dests


def build_zone_paths(session_dir: Path, zone: str, dz: Optional[int] = None) -> Optional[dict]:
    """zone(출발지)의 대피 경로가 지나는 링크망 FeatureCollection.
    dz 를 주면 그 도착지 O-D 경로만, 없으면 그 출발지의 전체 링크망."""
    path = _find_path_file(session_dir, zone)
    if path is None:
        return None

    try:
        df = pd.read_csv(path, sep=r"\s+", skiprows=1, header=None, names=_COLS)
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None
    if df.empty:
        return None

    if dz is not None:
        df = df[df["dz"] == dz]
        if df.empty:
            return None

    # 링크별 통행 빈도(이 존의 경로들이 몇 번 지나는지)
    counts = df["link"].value_counts()
    net = LinkNetwork.get()

    features = []
    for lid, cnt in counts.items():
        if lid not in net.index:
            continue
        geom = net.geometry.loc[lid]
        if geom is None or geom.is_empty:
            continue
        gj = geom.__geo_interface__
        features.append(
            {
                "type": "Feature",
                "properties": {"link_id": int(lid), "count": int(cnt)},
                "geometry": _round_geom(gj),
            }
        )
        if len(features) >= _MAX_LINKS:
            break

    if not features:
        return None

    max_count = int(counts.max())
    dest_count = int(df["dz"].nunique())
    logger.info("존 %s 대피 링크망 %d개 (목적지 %d)", zone, len(features), dest_count)
    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {"linkCount": len(features), "destCount": dest_count, "maxCount": max_count},
    }


def _round_geom(geom: dict, ndigits: int = 6) -> dict:
    def rnd(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], ndigits), round(c[1], ndigits)]
        return [rnd(x) for x in c]

    return {"type": geom["type"], "coordinates": rnd(geom["coordinates"])}
