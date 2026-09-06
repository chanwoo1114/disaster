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
import threading
from pathlib import Path
from typing import Optional

import pandas as pd
from pyproj import Transformer

from ..config import DATA_DIR
from .link_network import LinkNetwork

# node.csv 의 geom 은 EPSG:3857 (adm.csv 와 동일)
_NODE_TO_WGS84 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True).transform

logger = logging.getLogger(__name__)

# 헤더 줄에는 이름이 6개(OZoneID DZoneID Serial Type Seq LinkID)지만 데이터는 7열이다.
# 이름을 6개만 주면 pandas 가 남는 앞 열을 인덱스로 삼아 전 컬럼이 한 칸씩 밀려 들어가
# (dz 자리에 Serial 이 들어감) 예외 없이 조용히 틀린다. 반드시 7개를 준다.
# seq(1부터 연속 증가)·link 는 실측으로 확인했고, type/unknown 은 헤더 순서를 따랐다.
_COLS = ["oz", "dz", "serial", "type", "unknown", "seq", "link"]
_MAX_LINKS = 20000  # 안전 상한


def _find_path_file(session_dir: Path, zone: str) -> Optional[Path]:
    return next((p for p in session_dir.rglob(f"VehiclePath_{zone}.txt")), None)


def list_origins(session_dir: Path) -> list[str]:
    """VehiclePath 파일이 있는 출발지 존 코드 목록 (정렬).

    8자리는 행정동, 그 미만(예: 100000)은 special_facility.txt 의 특수시설
    (학교·병원·요양원)이다. 둘 다 출발지로 선택할 수 있다.
    """
    codes = set()
    for p in session_dir.rglob("VehiclePath_*.txt"):
        code = p.stem.split("_", 1)[1]
        if code.isdigit():
            codes.add(code)
    return sorted(codes)


def origin_zones_geojson(session_dir: Path) -> dict:
    """선택 가능한 출발지 GeoJSON (반경 무관, 코드로 직접 조회).

    행정동은 폴리곤(kind="adm"), 특수시설은 점(kind="facility")으로 한 컬렉션에
    담는다. 프론트는 kind 로 채움/점 레이어를 나눠 그린다.
    """
    from .adm_geometry import AdmGeometry
    from .zone_evac import _load_facilities

    codes = list_origins(session_dir)
    if not codes:
        return {"type": "FeatureCollection", "features": []}

    adm = AdmGeometry.load()  # code, name, geometry (EPSG:4326, 단순화됨)
    idx = adm.index.name
    lookup = adm.set_index("code") if idx != "code" else adm
    facilities = _load_facilities(session_dir)

    features = []
    for code in codes:
        if code in lookup.index:
            row = lookup.loc[code]
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue
            name = row["name"] if "name" in lookup.columns else ""
            features.append(
                {
                    "type": "Feature",
                    "id": code,
                    "properties": {"code": code, "name": str(name), "kind": "adm"},
                    "geometry": _round_geom(geom.__geo_interface__),
                }
            )
            continue

        fac = facilities.get(code)
        if fac is None:
            continue
        features.append(
            {
                "type": "Feature",
                "id": code,
                "properties": {
                    "code": code,
                    "name": fac["name"],
                    "kind": "facility",
                    "facilityType": fac["type"],
                },
                "geometry": {"type": "Point", "coordinates": [fac["lng"], fac["lat"]]},
            }
        )

    return {"type": "FeatureCollection", "features": features}


# ── 도착지 해석 ────────────────────────────────────────────────────────
# DZoneID 는 세 체계가 섞여 있다 (세션 60개 파일 전수 확인, 미매칭 0):
#   3자리 이하  → Shelter.txt 의 ShelterID (대피소)
#   8자리       → 행정동 코드
#   10자리      → node.csv 의 node_id
# 자릿수는 참고만 하고 실제 소속은 각 마스터 조회로 판정한다.

_shelter_cache: dict[str, dict] = {}
_shelter_cached_root: Optional[Path] = None


def _load_shelters(session_root: Path) -> dict:
    """Shelter.txt(들) → {ShelterID(str): {name, lng, lat, capacity}}. 세션당 1회."""
    global _shelter_cache, _shelter_cached_root
    if _shelter_cached_root == session_root:
        return _shelter_cache

    out: dict[str, dict] = {}
    for path in session_root.rglob("Shelter.txt"):
        try:
            df = pd.read_csv(
                path, sep="	", header=0, encoding="cp949", encoding_errors="replace"
            )
        except (ValueError, pd.errors.EmptyDataError, OSError):
            continue
        df.columns = [str(c).strip() for c in df.columns]
        if not {"ShelterID", "x", "y"}.issubset(df.columns):
            continue
        for r in df.itertuples(index=False):
            try:
                out.setdefault(
                    str(int(getattr(r, "ShelterID"))),
                    {
                        "name": str(getattr(r, "name", "")).strip(),
                        "lng": float(getattr(r, "x")),
                        "lat": float(getattr(r, "y")),
                        "capacity": int(float(getattr(r, "capacity", 0) or 0)),
                    },
                )
            except (TypeError, ValueError):
                continue

    _shelter_cache, _shelter_cached_root = out, session_root
    return out


def _resolve_dest(code: str, adm_lookup, shelters: dict) -> dict:
    """도착지 코드 → {kind, name}.

    대피소·행정동에 없으면 노드로 본다. 전수 확인상 남는 건 전부 node_id 였고,
    node.csv(20만 행)를 조회 한 번 때문에 올리지 않으려는 의도적 선택이다.
    """
    if code in shelters:
        return {"kind": "shelter", "name": shelters[code]["name"] or f"대피소 {code}"}
    if adm_lookup is not None and code in adm_lookup.index:
        row = adm_lookup.loc[code]
        name = row["name"] if "name" in adm_lookup.columns else ""
        return {"kind": "adm", "name": str(name)}
    return {"kind": "node", "name": f"노드 {code}"}


def list_dests(session_dir: Path, zone: str) -> Optional[list[dict]]:
    """출발지의 도착지 목록. 각 도착지의 종류(행정동/대피소/노드)·이름·경로·링크 수."""
    from .adm_geometry import AdmGeometry

    path = _find_path_file(session_dir, zone)
    if path is None:
        return None
    try:
        df = pd.read_csv(path, sep=r"\s+", skiprows=1, header=None, names=_COLS)
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None
    if df.empty:
        return []

    shelters = _load_shelters(session_dir)
    try:
        adm = AdmGeometry.load()
        adm_lookup = adm.set_index("code") if adm.index.name != "code" else adm
    except Exception:  # 행정동 데이터가 없어도 대피소/노드는 나와야 한다
        adm_lookup = None

    dests = []
    for dz, grp in df.groupby("dz"):
        code = str(int(dz))
        dests.append(
            {
                "dz": int(dz),
                **_resolve_dest(code, adm_lookup, shelters),
                "serials": sorted(int(s) for s in grp["serial"].unique()),
                "types": sorted(int(t) for t in grp["type"].unique()),
                "linkCount": int(grp["link"].nunique()),
            }
        )
    # 종류별로 묶고 그 안에서 이름순 (프론트 탭 순서와 동일)
    order = {"adm": 0, "shelter": 1, "node": 2}
    dests.sort(key=lambda d: (order.get(d["kind"], 9), d["name"]))
    return dests


_node_lookup: Optional[dict] = None
_node_lock = threading.Lock()


def _load_nodes() -> dict:
    """node.csv → {node_id: (lng, lat)}. 20만 행이라 프로세스당 1회만 만든다.

    geom 은 EPSG:3857 POINT WKT. WKT 파싱 대신 숫자만 뽑아 벡터 변환한다
    (shapely.wkt.loads 를 20만 번 도는 것보다 훨씬 빠르다).
    """
    global _node_lookup
    if _node_lookup is not None:
        return _node_lookup
    with _node_lock:
        if _node_lookup is not None:
            return _node_lookup

        path = DATA_DIR / "node.csv"
        if not path.exists():
            logger.warning("node.csv 없음 — 노드 도착지는 좌표 없이 나간다")
            _node_lookup = {}
            return _node_lookup

        df = pd.read_csv(path, usecols=["geom", "node_id"], dtype={"node_id": str})
        xy = df["geom"].str.extract(r"POINT\s*\(([-\d.]+)\s+([-\d.]+)\)")
        x = pd.to_numeric(xy[0], errors="coerce")
        y = pd.to_numeric(xy[1], errors="coerce")
        ok = x.notna() & y.notna()
        lng, lat = _NODE_TO_WGS84(x[ok].to_numpy(), y[ok].to_numpy())
        _node_lookup = dict(zip(df.loc[ok, "node_id"], zip(lng.tolist(), lat.tolist())))
        logger.info("노드 좌표 %d개 로딩", len(_node_lookup))
    return _node_lookup


def dest_zones_geojson(session_dir: Path, zone: str) -> dict:
    """출발지의 도착지들을 지도에 찍을 GeoJSON.

    행정동은 폴리곤, 대피소·노드는 점. 프론트가 kind 로 레이어를 나눠 그린다.
    """
    from .adm_geometry import AdmGeometry

    dests = list_dests(session_dir, zone)
    if not dests:
        return {"type": "FeatureCollection", "features": []}

    shelters = _load_shelters(session_dir)
    nodes = _load_nodes()
    try:
        adm = AdmGeometry.load()
        adm_lookup = adm.set_index("code") if adm.index.name != "code" else adm
    except Exception:
        adm_lookup = None

    features = []
    for d in dests:
        code = str(d["dz"])
        props = {
            "dz": d["dz"],
            "code": code,
            "kind": d["kind"],
            "name": d["name"],
            "linkCount": d["linkCount"],
        }
        geom = None

        if d["kind"] == "adm" and adm_lookup is not None and code in adm_lookup.index:
            g = adm_lookup.loc[code].geometry
            if g is not None and not g.is_empty:
                geom = _round_geom(g.__geo_interface__)
        elif d["kind"] == "shelter" and code in shelters:
            sh = shelters[code]
            geom = {"type": "Point", "coordinates": [sh["lng"], sh["lat"]]}
            props["capacity"] = sh["capacity"]
        elif d["kind"] == "node" and code in nodes:
            lng, lat = nodes[code]
            geom = {"type": "Point", "coordinates": [round(lng, 6), round(lat, 6)]}

        if geom is None:
            continue
        features.append({"type": "Feature", "id": code, "properties": props, "geometry": geom})

    return {"type": "FeatureCollection", "features": features}


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
