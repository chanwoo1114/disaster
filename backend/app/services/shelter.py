"""대피소(Shelter) 좌표 추출 → shelters.geojson

InputData/Shelter/*/Shelter.txt (탭 구분, cp949) 에서 좌표(x=경도, y=위도, 이미 WGS84)를
읽어 지도에 찍을 GeoJSON 포인트로 만든다. 여러 파일에 중복 등장하는 대피소는
ShelterID 로 한 번만 남긴다.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

GEOJSON_FILE = "shelters.geojson"
_SHELTER_GLOB = "Shelter.txt"

# 한국 경위도 대략 범위 (유효 좌표 필터)
_LNG_MIN, _LNG_MAX = 124.0, 132.0
_LAT_MIN, _LAT_MAX = 33.0, 39.0


def has_outputs(scen_dir: Path) -> bool:
    return (scen_dir / GEOJSON_FILE).exists()


def summary_from_meta(scen_dir: Path) -> Optional[dict]:
    path = scen_dir / GEOJSON_FILE
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            gj = json.load(f)
    except (OSError, ValueError):
        return None
    return {"count": len(gj.get("features", []))}


def _read_shelter_file(path: Path) -> Optional[pd.DataFrame]:
    """헤더 기반 파싱. Shelter.txt / EtcShelter.txt 모두 컬럼명으로 인식한다."""
    try:
        df = pd.read_csv(
            path, sep="\t", header=0, encoding="cp949", encoding_errors="replace",
        )
    except (ValueError, pd.errors.EmptyDataError, OSError):
        return None

    df.columns = [str(c).strip().lower() for c in df.columns]
    need = {"shelterid", "x", "y"}
    if not need.issubset(df.columns):
        return None
    return df


def build(search_root: Path, out_dir: Path) -> Optional[dict]:
    """search_root 하위의 Shelter.txt 를 모아 out_dir/shelters.geojson 생성.
    대피소가 없으면 None."""
    frames = []
    for path in search_root.rglob(_SHELTER_GLOB):
        df = _read_shelter_file(path)
        if df is not None and not df.empty:
            frames.append(df)
    if not frames:
        return None

    df = pd.concat(frames, ignore_index=True)

    df["x"] = pd.to_numeric(df["x"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["shelterid", "x", "y"])
    df = df[
        (df["x"] >= _LNG_MIN) & (df["x"] <= _LNG_MAX)
        & (df["y"] >= _LAT_MIN) & (df["y"] <= _LAT_MAX)
    ]
    if df.empty:
        return None

    df["shelterid"] = df["shelterid"].astype("int64")
    df = df.drop_duplicates("shelterid", keep="first")

    features = []
    for row in df.itertuples(index=False):
        d = row._asdict()
        cap = d.get("capacity")
        typ = d.get("type")
        features.append(
            {
                "type": "Feature",
                "id": int(d["shelterid"]),
                "properties": {
                    "shelter_id": int(d["shelterid"]),
                    "name": str(d.get("name") or "").strip(),
                    "capacity": int(cap) if pd.notna(cap) else 0,
                    "type": int(typ) if pd.notna(typ) else 0,
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(d["x"]), 6), round(float(d["y"]), 6)],
                },
            }
        )

    with open(out_dir / GEOJSON_FILE, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False)

    logger.info("대피소 %d개 추출 → %s", len(features), out_dir.name)
    return {"count": len(features)}


def build_or_load(search_root: Path, out_dir: Path) -> Optional[dict]:
    if has_outputs(out_dir):
        return summary_from_meta(out_dir)
    return build(search_root, out_dir)
