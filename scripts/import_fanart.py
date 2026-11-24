"""Refresh the screen collection from Fanart.tv. Supply FANART_API_KEY or use the private prompt."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from getpass import getpass
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
from urllib.parse import urlsplit

from PIL import Image, ImageOps
import requests

DIST = Path(__file__).resolve().parents[1] / "dist"
MANIFEST = DIST / "fanart-items.json"
MEDIA = {"movies", "anime-movies", "shows", "anime"}
LOCAL = threading.local()


def request(url, headers=None):
    if not hasattr(LOCAL, "http"):
        LOCAL.http = requests.Session()
        LOCAL.http.headers["User-Agent"] = "KratexCut-collection/1.0"
    for attempt in range(4):
        try:
            res = LOCAL.http.get(url, headers=headers, timeout=(10, 35), allow_redirects=not headers)
            if (res.status_code == 429 or res.status_code >= 500) and attempt < 3:
                delay = res.headers.get("Retry-After", "")
                time.sleep(int(delay) if delay.isdigit() else 2 ** attempt)
                continue
            if res.is_redirect:
                raise ValueError("Unexpected API redirect")
            res.raise_for_status()
            return res
        except (requests.ConnectionError, requests.Timeout):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as dest:
        dest.write(data)
        staging = Path(dest.name)
    staging.chmod(0o644)
    staging.replace(path)


def candidates(records):
    usable = [r for r in records if str(r.get("id", "")).isdigit()
              and urlsplit(r.get("url", "")).hostname == "assets.fanart.tv"]
    def rank(r):
        lang = r.get("lang")
        return (0 if lang == "en" else 1 if lang in ("", "00", None) else 2,
                -int(r.get("likes") or 0), int(r["id"]))
    return sorted(usable, key=rank)


def fetch_print(records, kind):
    for art in candidates(records):
        url = art["url"].replace("http://", "https://", 1)
        # Image IDs overlap across the provider's TV and movie catalogs.
        fingerprint = hashlib.sha256(url.encode()).hexdigest()[:16]
        path = DIST / "art" / "fanart" / f"{art['id']}-{fingerprint}.webp"
        if not path.is_file():
            try:
                original = request(url).content
            except requests.HTTPError as e:
                if e.response.status_code in (404, 410):
                    continue
                raise
            with Image.open(BytesIO(original)) as src:
                img = ImageOps.exif_transpose(src)
                if kind == "disc" and abs(img.width / img.height - 1) > .08:
                    continue
                if kind != "disc" and img.width >= img.height:
                    continue
                img = img.convert("RGBA" if kind == "disc" else "RGB")
                img.thumbnail((512, 512) if kind == "disc" else (540, 780), Image.Resampling.LANCZOS)
                buf = BytesIO()
                img.save(buf, "WEBP", quality=83, method=4)
            save(path, buf.getvalue())
        entry = {"artwork": "./" + path.relative_to(DIST).as_posix(), "imageSource": url}
        if art.get("copyright") and art["copyright"].lower() != "unknown":
            entry["copyright"] = art["copyright"]
        return entry


def refresh(item, key, cache, season_info, existing_discs):
    iid = item["id"]
    if not re.fullmatch(r"tt\d+", iid):
        return {}
    film = item["category"] in ("movies", "anime-movies")
    resource = "movies" if film else "tv"
    cached = cache / f"{resource}-{iid}.json"
    if cached.is_file() and time.time() - cached.stat().st_mtime < 86400:
        data = json.loads(cached.read_text())
    else:
        try:
            data = request(f"https://webservice.fanart.tv/v3.2/{resource}/{iid}?source=imdb",
                           {"api-key": key}).json()
        except requests.HTTPError as e:
            if e.response.status_code != 404:
                raise
            data = {}
        save(cached, json.dumps(data).encode())
    if not data or data.get("imdb_id") and data["imdb_id"] != iid:
        return {}
    page_id = data.get("tmdb_id" if film else "thetvdb_id")
    if not str(page_id).isdigit():
        return {}
    row = {}
    front = fetch_print(data.get("movieposter" if film else "tvposter", []), "front")
    if front:
        row["front"] = front
    if film:
        kind = "bluray" if int(item.get("year") or 0) >= 2006 else "dvd"
        if existing_discs.get(iid, {}).get("format") != kind:
            discs = [d for d in data.get("moviedisc", []) if d.get("disc_type") == kind and str(d.get("disc")) == "1"]
            disc = fetch_print(discs, "disc")
            if disc:
                row["disc"] = dict(disc, format=kind, source=disc["imageSource"], credit="Disc artwork from Fanart.tv")
    else:
        for season in season_info.get(iid, {}).get("seasons", []):
            number = season.get("number")
            if not isinstance(number, int) or number < 1:
                continue
            matches = [s for s in data.get("seasonposter", []) if str(s.get("season")) == str(number)]
            art = fetch_print(matches, "front")
            if art:
                row.setdefault("seasons", {})[str(number)] = art
    if row:
        name = unicodedata.normalize("NFKD", data.get("name") or item["title"]).encode("ascii", "ignore").decode()
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        row["source"] = f"https://fanart.tv/{'movie' if film else 'series'}/{page_id}/" + (slug + "/" if slug else "")
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, help="Optional directory for one day of API metadata")
    args = parser.parse_args()
    key = os.environ.get("FANART_API_KEY") or getpass("Fanart.tv key: ")
    if not key:
        parser.error("An API key is required.")
    items = [i for i in json.loads((DIST / "imdb-items.json").read_text()) if i["category"] in MEDIA]
    seasons = json.loads((DIST / "box-set-seasons.json").read_text())
    discs = json.loads((DIST / "movie-medium-art.json").read_text())
    result = {}
    with tempfile.TemporaryDirectory() as temp, ThreadPoolExecutor(max_workers=8) as pool:
        cache = args.cache or Path(temp)
        def collect(item):
            try:
                return item["id"], refresh(item, key, cache, seasons, discs)
            except Exception as error:
                raise RuntimeError(f"Could not refresh {item['id']} ({item['title']})") from error
        for index, (iid, row) in enumerate(pool.map(collect, items), 1):
            if row:
                result[iid] = row
            if index % 40 == 0:
                print(f"Checked {index}/{len(items)} titles, {len(result)} with artwork", flush=True)
    save(MANIFEST, (json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n").encode())
    subprocess.run([sys.executable, str(Path(__file__).with_name("build_shelf_atlas.py")), "--film-only"], check=True)
    print(f"Refreshed artwork for {len(result)} titles", flush=True)


if __name__ == "__main__":
    main()
