"""표준 노드링크(MOCT_LINK.shp) → app/data/links.parquet (EPSG:4326)

사용:
    python scripts/build_link_network.py "C:/path/to/MOCT_LINK.shp"

link_id 를 정수 인덱스로 하고 lanes / road_rank / max_spd / length / geometry 만 남긴다.
"""

import sys
import time
from pathlib import Path

import geopandas as gpd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config  # noqa: E402

KEEP = {
    "LINK_ID": "link_id",
    "F_NODE": "f_node",
    "T_NODE": "t_node",
    "LANES": "lanes",
    "ROAD_RANK": "road_rank",
    "MAX_SPD": "max_spd",
    "ROAD_NAME": "road_name",
    "LENGTH": "length",
}


def main(shp: str) -> None:
    src = Path(shp)
    if not src.exists():
        sys.exit(f"파일 없음: {src}")

    out = config.LINK_NETWORK_PATH
    out.parent.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    print(f"읽는 중: {src}")
    gdf = gpd.read_file(src, columns=list(KEEP))
    print(f"  {len(gdf):,} rows, {time.time() - t0:.1f}s, crs={gdf.crs.to_string()[:40]}")

    gdf = gdf.rename(columns=KEEP)
    gdf["link_id"] = gdf["link_id"].astype("int64")
    gdf["f_node"] = gdf["f_node"].astype("int64")
    gdf["t_node"] = gdf["t_node"].astype("int64")
    gdf["lanes"] = gdf["lanes"].fillna(1).astype("int16")
    gdf["road_rank"] = gdf["road_rank"].astype(str)
    gdf["max_spd"] = gdf["max_spd"].fillna(0).astype("int16")
    gdf["road_name"] = gdf["road_name"].fillna("").astype(str).str.strip().replace("-", "")
    gdf["length"] = gdf["length"].astype("float32")

    dup = gdf["link_id"].duplicated().sum()
    if dup:
        print(f"  중복 link_id {dup:,}건 → 첫 항목만 유지")
        gdf = gdf.drop_duplicates("link_id", keep="first")

    t1 = time.time()
    gdf = gdf.to_crs("EPSG:4326")
    print(f"  4326 변환 {time.time() - t1:.1f}s")

    gdf = gdf.set_index("link_id").sort_index()
    gdf.to_parquet(out, compression="zstd")
    print(f"저장: {out} ({out.stat().st_size / 1024 / 1024:.1f} MB, 총 {time.time() - t0:.1f}s)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
