"""Import television/anime season listings and season artwork for My Room's IMDb catalog."""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import gzip
import hashlib
from html import unescape
import io
import json
from pathlib import Path
import re
import socket
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ART = DIST / "art/seasons"
MANIFEST = DIST / "box-set-seasons.json"
IMDB = "https://datasets.imdbws.com/title.episode.tsv.gz"
gate = threading.Lock()
next_maze_request = 0.0


def read_url(url, cache, *, attempts=4, timeout=32):
    path = cache / hashlib.sha256(url.encode()).hexdigest()
    if path.exists():
        return path.read_bytes()
    for attempt in range(attempts):
        if url.startswith("https://api.tvmaze.com"):
            global next_maze_request
            with gate:
                time.sleep(max(0, next_maze_request - time.monotonic()))
                next_maze_request = time.monotonic() + .59
        try:
            with urlopen(Request(url, headers={"User-Agent": "MyRoomSeasonCatalog/1.0"}), timeout=timeout) as res:
                data = res.read()
            with tempfile.NamedTemporaryFile(dir=cache, delete=False) as f:
                f.write(data)
            Path(f.name).replace(path)
            return data
        except HTTPError as e:
            if (e.code not in (429, 500, 502, 503, 504)) or attempt + 1 == attempts:
                raise
        except (TimeoutError, socket.timeout, URLError, ConnectionError):
            if attempt + 1 == attempts:
                raise
        time.sleep(2**attempt)


def season_rows(episodes, as_of, *, cinemeta=False):
    counts = defaultdict(set)
    for e in episodes:
        n, k = e.get("season"), e.get("episode" if cinemeta else "number")
        if not isinstance(n, int) or not isinstance(k, int) or n < 1 or k < 1:
            continue
        air = (e.get("released") or e.get("firstAired")) if cinemeta else e.get("airdate")
        # Omit unconfirmed and future airings. Ignore specials and season zero.
        if not air or air[:10] > as_of:
            continue
        counts[n].add(k)
    return [{"number": n, "label": f"Season {n}", "episodes": len(counts[n])} for n in sorted(counts)]


def cache_art(url, cache):
    digest = hashlib.sha256(url.encode()).hexdigest()[:20]
    dest = ART / f"{digest}.webp"
    if not dest.exists():
        with Image.open(io.BytesIO(read_url(url, cache))) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail((430, 580), Image.Resampling.LANCZOS)
        with tempfile.NamedTemporaryFile(dir=ART, delete=False) as f:
            image.save(f, format="WEBP", quality=80, method=4)
        Path(f.name).replace(dest)
    return "./" + dest.relative_to(DIST).as_posix()


def maze_seasons(item, maze_id, cache, as_of):
    url = f"https://api.tvmaze.com/shows/{maze_id}?embed[]=episodes&embed[]=seasons"
    data = json.loads(read_url(url, cache))
    if data["externals"].get("imdb") != item["id"]:
        return None
    seasons = season_rows(data["_embedded"]["episodes"], as_of)
    listings = {s["number"]: s for s in data["_embedded"]["seasons"]}
    for season in seasons:
        detail = listings[season["number"]]
        season["source"] = detail["url"]
        if not detail.get("image"):
            continue
        img = detail["image"]
        for size in ("original", "medium"):
            src = img.get(size)
            if not src:
                continue
            try:
                season.update(artwork=cache_art(src, cache), artworkSource=src)
                break
            except HTTPError as e:
                if e.code not in (403, 404, 410):
                    raise
    return {"source": data["url"] + "/seasons", "seasons": seasons}


def cinemeta_seasons(item, cache, as_of):
    iid = item["id"]
    url = f"https://v3-cinemeta.strem.io/meta/series/{iid}.json"
    data = json.loads(read_url(url, cache)).get("meta")
    if not data:
        return {"source": item["sourceUrl"], "seasons": []}
    if data.get("imdb_id", data.get("id")) != iid:
        raise ValueError("IMDb identifier mismatch for " + iid)
    return {"source": url, "seasons": season_rows(data.get("videos", []), as_of, cinemeta=True)}


def optional_data(url, cache):
    try:
        return read_url(url, cache, attempts=2, timeout=12)
    except HTTPError as e:
        if e.code in (403, 404, 410, 429, 500, 502, 503, 504):
            return None
        raise
    except (TimeoutError, socket.timeout, URLError, ConnectionError):
        return None


def supplement_posters(item, result, cache):
    """Use a TMDB season poster only when IMDb identity and season numbering agree."""
    missing = [s for s in result["seasons"] if "artwork" not in s]
    if not missing:
        return
    iid = item["id"]
    data = optional_data(f"https://v3-cinemeta.strem.io/meta/series/{iid}.json", cache)
    if not data:
        return
    meta = json.loads(data).get("meta", {})
    tmdb = str(meta.get("moviedb_id", ""))
    if not tmdb.isdigit() or meta.get("imdb_id", meta.get("id")) != iid:
        return
    show_url = f"https://www.themoviedb.org/tv/{tmdb}"
    show = optional_data(show_url + "?language=en-US", cache)
    if not show or iid.encode() not in re.findall(rb"imdb[.]com/title/(tt[0-9]+)", show):
        return
    for row in missing:
        n = row["number"]
        url = f"{show_url}/season/{n}?language=en-US"
        raw = optional_data(url, cache)
        if not raw:
            continue
        page = raw.decode()
        count = re.search(r'Episodes\s*<span>(\d+)</span>', page)
        episode_links = set(re.findall(fr'/tv/{tmdb}/season/{n}/episode/(\d+)\?', page))
        poster = re.search(r'<meta property="og:image" content="([^"]+)">', page)
        if not count or int(count[1]) != row["episodes"] or len(episode_links) != row["episodes"] or not poster:
            continue
        src = unescape(poster[1])
        if not re.fullmatch(r"https://media[.]themoviedb[.]org/t/p/w500/[a-zA-Z0-9_-]+[.](jpg|png)", src):
            continue
        try:
            local = cache_art(src, cache)
        except HTTPError as e:
            if e.code in (403, 404, 410):
                continue
            raise
        row.update(artwork=local, artworkSource=src, artworkPage=url)


def imdb_seasons(wanted, archive):
    counts = defaultdict(lambda: defaultdict(set))
    with gzip.open(archive, "rb") as stream:
        next(stream)
        for row in stream:
            _, parent, season, episode = row.rstrip().split(b"\t")
            if parent in wanted and season.isdigit() and episode.isdigit() and int(season) > 0 and int(episode) > 0:
                counts[parent.decode()][int(season)].add(int(episode))
    return {
        key: {"source": "https://www.imdb.com/title/" + key + "/episodes/",
              "episodeBasis": "IMDb numbered episode listings",
              "seasons": [{"number": n, "label": f"Season {n}", "episodes": len(numbers[n])}
                          for n in sorted(numbers)]}
        for key, numbers in counts.items()
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, help="Optional persistent HTTP response cache")
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today())
    parser.add_argument("--imdb-episodes", type=Path, help="Path to the official title.episode.tsv.gz snapshot")
    args = parser.parse_args()
    items = [i for i in json.loads((DIST / "imdb-items.json").read_text()) if i["category"] in ("shows", "anime")]
    matched = json.loads((ROOT / "scripts/imdb-editions.json").read_text())
    ART.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        cache = args.cache or Path(tmp)
        cache.mkdir(parents=True, exist_ok=True)
        imdb_ids = {i["id"].encode() for i in items if matched.get(i["id"], {}).get("episodeSource") == IMDB}
        imdb = {}
        if imdb_ids:
            archive = args.imdb_episodes or cache / "title.episode.tsv.gz"
            if not archive.exists():
                archive.write_bytes(read_url(IMDB, cache))
            imdb = imdb_seasons(imdb_ids, archive)

        def lookup(item):
            iid = item["id"]
            src = matched.get(iid, {}).get("episodeSource", "")
            maze = re.fullmatch(r"https://api\.tvmaze\.com/shows/(\d+)/episodes", src)
            if maze:
                result = maze_seasons(item, int(maze[1]), cache, args.as_of.isoformat())
                if result is not None:
                    return iid, result
            if iid in imdb:
                return iid, imdb[iid]
            try:
                return iid, cinemeta_seasons(item, cache, args.as_of.isoformat())
            except HTTPError as e:
                if e.code not in (403, 404):
                    raise
            return iid, {"source": item["sourceUrl"], "seasons": []}

        with ThreadPoolExecutor(max_workers=6) as pool:
            result = dict(pool.map(lookup, items))
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda i: supplement_posters(i, result[i["id"]], cache), items))

    for title in result.values():
        title["asOf"] = args.as_of.isoformat()
        title.setdefault("episodeBasis", "Aired numbered episodes")
    with tempfile.NamedTemporaryFile(dir=MANIFEST.parent, mode="w", delete=False) as out:
        json.dump(result, out, indent=2, ensure_ascii=False, sort_keys=False)
        out.write("\n")
    Path(out.name).replace(MANIFEST)
    seasons = [s for title in result.values() for s in title["seasons"]]
    print(f"{len(result)} titles, {len(seasons)} seasons, {sum('artwork' in s for s in seasons)} season images")
    for item in items:
        if not result[item["id"]]["seasons"]:
            print("No confirmed seasons:", item["id"], item["title"])


if __name__ == "__main__":
    main()
