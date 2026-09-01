"""행정동(읍면동) 경계 표출.

`app/data/adm.csv` (EPSG:3857 WKT, 전국 3,518개)를 읽어 대상지 반경 내 행정동을 돌려준다.
피해범위 폴리곤은 프론트(`evacZones.ts`)가 계산한 것을 그대로 받아서 교차 판정만 하므로,
지도에 그려진 빨간 면과 빨갛게 칠해지는 행정동이 어긋날 일이 없다.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

import geopandas as gpd
import pandas as pd
from shapely import wkt
from shapely.geometry import mapping, shape
from shapely.strtree import STRtree

from ..config import DATA_DIR, SESSIONS_DIR
from ..schemas.exceptions import AppException

logger = logging.getLogger(__name__)

# 표출용 단순화 허용오차(m). 50km 내 127개 기준 11.5MB → 1.5MB, 도시 축척에서 육안 차이 없음.
# 교차 판정은 단순화 전 원본(5179)으로 하므로 정확도에는 영향이 없다.
SIMPLIFY_TOLERANCE_M = 10


class AdmGeometry:
    """행정동 경계 로딩 + 공간 인덱스 (프로세스당 1회)"""

    _adm_4326: Optional[gpd.GeoDataFrame] = None  # 표출용 (단순화됨)
    _adm_5179: Optional[gpd.GeoDataFrame] = None  # 판정용 (원본, 미터 좌표계)
    _index: Optional[STRtree] = None

    @classmethod
    def load(cls) -> gpd.GeoDataFrame:
        if cls._adm_4326 is None:
            parquet_4326 = DATA_DIR / "adm_4326.parquet"
            parquet_5179 = DATA_DIR / "adm_5179.parquet"

            if parquet_4326.exists() and parquet_5179.exists():
                logger.info("Parquet 파일에서 행정동 데이터 로딩")
                cls._adm_4326 = gpd.read_parquet(parquet_4326)
                cls._adm_5179 = gpd.read_parquet(parquet_5179)

            else:
                logger.info("CSV 파일에서 행정동 데이터 로딩 (fallback)")
                csv_path = DATA_DIR / "adm.csv"

                if not csv_path.exists():
                    raise AppException(
                        404, f"행정동 데이터 파일을 찾을 수 없습니다: {csv_path}"
                    )

                df = pd.read_csv(
                    csv_path, usecols=["geom", "emd_code_2023", "emd_code_nm_2023"]
                )
                df["geometry"] = df["geom"].apply(wkt.loads)
                df = df.drop(columns=["geom"])
                df = df.rename(
                    columns={"emd_code_2023": "code", "emd_code_nm_2023": "name"}
                )
                df["code"] = df["code"].astype(str)

                gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:3857")
                g5179 = gdf.to_crs("EPSG:5179")

                simplified = g5179.copy()
                simplified["geometry"] = g5179.geometry.simplify(SIMPLIFY_TOLERANCE_M)

                cls._adm_5179 = g5179
                cls._adm_4326 = simplified.to_crs("EPSG:4326")

                cls._adm_5179.to_parquet(parquet_5179)
                cls._adm_4326.to_parquet(parquet_4326)
                logger.info("Parquet 파일로 변환 저장 완료")

            cls._index = STRtree(cls._adm_5179.geometry)
            logger.info("행정동 %d개 로딩 완료", len(cls._adm_5179))

        return cls._adm_4326

    @classmethod
    def index(cls) -> STRtree:
        if cls._index is None:
            cls.load()
        return cls._index


def _cache_name(lng: float, lat: float, radius_km: float, damage: Optional[dict]) -> str:
    """대상지·반경·피해범위가 같으면 같은 캐시를 쓴다 (시나리오마다 풍향이 달라 해시로 구분)"""
    key = json.dumps(
        {"lng": lng, "lat": lat, "r": radius_km, "d": damage}, sort_keys=True
    )
    return f"adm_zones_{hashlib.md5(key.encode()).hexdigest()[:12]}.json"


def _load_cache(directory: str, filename: str) -> Optional[dict]:
    path = SESSIONS_DIR / directory / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_cache(directory: str, filename: str, data: dict) -> None:
    cache_dir = SESSIONS_DIR / directory
    cache_dir.mkdir(parents=True, exist_ok=True)
    with open(cache_dir / filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def get_adm_zones(
    directory: str,
    lng: float,
    lat: float,
    analysis_distance: float,
    damage_geometry: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """대상지 반경 내 행정동 Feature 리스트.

    각 Feature의 `properties.hit` 이 True 면 피해범위(5km PAZ + 풍향 섹터)에 걸치는 행정동이다.
    """
    filename = _cache_name(lng, lat, analysis_distance, damage_geometry)
    cached = _load_cache(directory, filename)
    if cached is not None:
        return cached["features"]

    adm_4326 = AdmGeometry.load()
    adm_5179 = AdmGeometry._adm_5179
    tree = AdmGeometry.index()

    center = (
        gpd.GeoSeries(gpd.points_from_xy([lng], [lat]), crs="EPSG:4326")
        .to_crs("EPSG:5179")
        .iloc[0]
    )
    analysis = center.buffer(analysis_distance * 1000)

    candidates = tree.query(analysis)
    in_radius = [i for i in candidates if adm_5179.geometry.iloc[i].intersects(analysis)]

    damage = None
    if damage_geometry:
        damage = (
            gpd.GeoSeries([shape(damage_geometry)], crs="EPSG:4326")
            .to_crs("EPSG:5179")
            .iloc[0]
        )

    features: List[Dict[str, Any]] = []
    for i in in_radius:
        hit = bool(damage is not None and adm_5179.geometry.iloc[i].intersects(damage))
        row = adm_4326.iloc[i]
        features.append(
            {
                "type": "Feature",
                "properties": {"code": row["code"], "name": row["name"], "hit": hit},
                "geometry": mapping(row.geometry),
            }
        )

    logger.info(
        "행정동 조회: 반경 %skm 내 %d개, 피해범위 교차 %d개",
        analysis_distance,
        len(features),
        sum(1 for f in features if f["properties"]["hit"]),
    )

    _save_cache(directory, filename, {"features": features})
    return features
