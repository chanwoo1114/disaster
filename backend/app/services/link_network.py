import logging
import threading
from typing import Optional

import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import transform

from .. import config
from ..schemas.exceptions import AppException
from .disaster_geometry import _TO_METERS, _TO_WGS84

logger = logging.getLogger(__name__)


class LinkNetwork:
    """전국 표준 노드링크. 프로세스당 1회 로드해 link_id 로 조회한다."""

    _gdf: Optional[gpd.GeoDataFrame] = None
    _lock = threading.Lock()

    @classmethod
    def get(cls) -> gpd.GeoDataFrame:
        if cls._gdf is None:
            with cls._lock:
                if cls._gdf is None:
                    path = config.LINK_NETWORK_PATH
                    if not path.exists():
                        raise AppException(
                            500,
                            "도로 링크 데이터가 없습니다. "
                            "scripts/build_link_network.py 로 links.parquet 을 먼저 생성하세요",
                        )
                    logger.info("링크 네트워크 로딩: %s", path)
                    gdf = gpd.read_parquet(path)
                    if gdf.index.name != "link_id":
                        gdf = gdf.set_index("link_id")
                    # 공간 인덱스를 미리 만들어 첫 반경 조회 지연을 없앤다
                    _ = gdf.sindex
                    cls._gdf = gdf
                    logger.info("링크 네트워크 %d건 로드 완료", len(gdf))
        return cls._gdf

    @classmethod
    def within_radius(cls, lng: float, lat: float, radius_km: float) -> gpd.GeoDataFrame:
        """대상지 반경 원에 걸치는(intersects) 링크 전부"""
        gdf = cls.get()
        circle_m = transform(_TO_METERS, Point(lng, lat)).buffer(radius_km * 1000)
        circle = transform(_TO_WGS84, circle_m)
        idx = gdf.sindex.query(circle, predicate="intersects")
        return gdf.iloc[idx]

    @classmethod
    def is_available(cls) -> bool:
        return config.LINK_NETWORK_PATH.exists()
