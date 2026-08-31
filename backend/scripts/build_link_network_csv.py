"""link.csv(WKT geom 포함) → app/data/links.parquet (EPSG:4326)

표준노드링크 shp 대신, geom(WKT)이 들어있는 link.csv 로부터 곧바로 만든다.
좌표계는 EPSG:3857(웹 메르카토르)로 가정하고 4326으로 변환한다.

사용:
    python scripts/build_link_network_csv.py [link.csv 경로]
    (경로 생략 시 app/data/link.csv)
"""

import sys
import time
from pathlib import Path

import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config  # noqa: E402

# link.csv 컬럼 → parquet 필드
KEEP = {
    "link_id": "link_id",
    "cartrk_co": "lanes",       # 차로수
    "road_grad": "road_rank",   # 도로등급 (101 고속국도 … 107 시군도)
    "top_lmtt_ve": "max_spd",   # 최고제한속도
    "rn": "road_name",          # 도로명
}
GEOM_COL = "geom"
SRC_CRS = "EPSG:3857"


def main(csv_path: str) -> None:
    src = Path(csv_path)
    if not src.exists():
        sys.exit(f"파일 없음: {src}")

    out = config.LINK_NETWORK_PATH
    out.parent.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    print(f"읽는 중: {src}")
    df = pd.read_csv(
        src,
        usecols=list(KEEP) + [GEOM_COL],
        dtype={"link_id": str},
        low_memory=False,
    )
    print(f"  {len(df):,} rows, {time.time() - t0:.1f}s")

    # WKT → geometry, 좌표계 부여 후 4326 변환
    t1 = time.time()
    geom = gpd.GeoSeries.from_wkt(df[GEOM_COL], crs=SRC_CRS)
    gdf = gpd.GeoDataFrame(df.drop(columns=[GEOM_COL]), geometry=geom, crs=SRC_CRS)
    gdf = gdf.rename(columns=KEEP)
    print(f"  WKT 파싱 {time.time() - t1:.1f}s")

    # geometry 없는 행 제거
    before = len(gdf)
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    if len(gdf) != before:
        print(f"  빈 geometry {before - len(gdf):,}건 제거")

    # 타입 정리
    gdf["link_id"] = gdf["link_id"].astype("int64")
    gdf["lanes"] = pd.to_numeric(gdf["lanes"], errors="coerce").fillna(1).astype("int16")
    gdf["road_rank"] = gdf["road_rank"].astype(str)
    gdf["max_spd"] = pd.to_numeric(gdf["max_spd"], errors="coerce").fillna(0).astype("int16")
    gdf["road_name"] = gdf["road_name"].fillna("").astype(str).str.strip()

    dup = gdf["link_id"].duplicated().sum()
    if dup:
        print(f"  중복 link_id {dup:,}건 → 첫 항목만 유지")
        gdf = gdf.drop_duplicates("link_id", keep="first")

    t2 = time.time()
    gdf = gdf.to_crs("EPSG:4326")
    print(f"  4326 변환 {time.time() - t2:.1f}s")

    gdf = gdf.set_index("link_id").sort_index()
    gdf.to_parquet(out, compression="zstd")
    print(f"저장: {out} ({out.stat().st_size / 1024 / 1024:.1f} MB, 총 {time.time() - t0:.1f}s)")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else str(config.DATA_DIR / "link.csv")
    main(path)
