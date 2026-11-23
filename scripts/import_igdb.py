"""Refresh matched IGDB cover artwork without changing the IMDb shelf inventory."""
import io
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

DIST = Path(__file__).resolve().parents[1] / "dist"
EDITIONS = DIST / "game-editions.json"
GAME_INDEX = "https://app.lizardbyte.dev/GameDB/games/"


def read(url, limit):
    with urlopen(Request(url, headers={"User-Agent": "MyRoomCatalog/1.0"}), timeout=20) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Unexpected response size from " + urlsplit(url).hostname)
    return data


def update(match):
    imdb_id, edition = match
    if not re.fullmatch(r"tt\d+", imdb_id):
        raise ValueError("Invalid IMDb ID")
    igdb_id = int(edition["igdbId"])
    # The public GameDB snapshot indexes IGDB records. The image bytes come directly from IGDB.
    record = json.loads(read(f"{GAME_INDEX}{igdb_id}.json", 2_000_000))
    if record["id"] != igdb_id:
        raise ValueError("IGDB ID mismatch")
    cover = urlsplit(record["cover"]["url"])
    if cover.hostname != "images.igdb.com" or "/t_thumb/" not in cover.path:
        raise ValueError("Unexpected cover location for " + record["name"])
    source = "https://images.igdb.com" + cover.path.replace("/t_thumb/", "/t_cover_big/")
    path = DIST / "art" / "igdb" / f"{imdb_id}.webp"
    if not path.exists() or source != edition.get("artworkSource"):
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(read(source, 8_000_000)))).convert("RGB")
        image.thumbnail((420, 560), Image.Resampling.LANCZOS)
        path.parent.mkdir(parents=True, exist_ok=True)
        staged = path.with_suffix(".tmp")
        image.save(staged, "WEBP", quality=85, method=5)
        staged.replace(path)
    return imdb_id, {**edition, "igdbUrl": record["url"], "artworkSource": source,
                     "artwork": "./" + path.relative_to(DIST).as_posix()}


def main():
    with ThreadPoolExecutor(max_workers=4) as pool:
        updated = dict(pool.map(update, json.loads(EDITIONS.read_text()).items()))
    staged = EDITIONS.with_suffix(".tmp")
    staged.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n")
    staged.replace(EDITIONS)
    print(f"Verified IGDB artwork for {len(updated)} matched games.")


if __name__ == "__main__":
    main()
