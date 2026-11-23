"""Stock the movie, series and anime racks from an IMDb list CSV."""
import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from fetch_art import DIST, imdb_art

# This series has no TVmaze match for its IMDb ID.
SERIES_METADATA = {
    "tt22297578": {"episodeCount": 8, "episodeSource": "https://www.netflix.com/title/81281063"}
}
SERIES_TYPES = {"tv series", "tv mini series", "tv miniseries"}


def read_json(url):
    with urlopen(url, timeout=12) as response:
        return json.load(response)


def series_metadata(title_id, previous):
    if title_id in SERIES_METADATA:
        return SERIES_METADATA[title_id]
    if previous.get("episodeCount") and previous.get("episodeSource"):
        return {k: previous[k] for k in ("episodeCount", "episodeSource", "isAnime") if k in previous}
    try:
        show = read_json("https://api.tvmaze.com/lookup/shows?imdb=" + title_id)
        if show["externals"]["imdb"] != title_id:
            return {}
        url = f"https://api.tvmaze.com/shows/{show['id']}/episodes"
        episodes = read_json(url)
        return {"episodeCount": len(episodes), "episodeSource": url,
                "isAnime": show["type"] == "Animation" and show["language"] == "Japanese"}
    except (URLError, TimeoutError, KeyError) as exc:
        print(f"No episode metadata for {title_id}: {exc}")
        return {}


def import_list(path):
    target = DIST / "imdb-items.json"
    previous = {i["id"]: i for i in json.loads(target.read_text())} if target.exists() else {}
    items = {}
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = csv.DictReader(stream)
        if not {"Const", "Title", "Title Type"}.issubset(rows.fieldnames or []):
            raise ValueError("Select an IMDb title-list CSV with Const, Title and Title Type columns.")
        for row in rows:
            title_id, title = row["Const"].strip(), row["Title"].strip()
            if not re.fullmatch(r"tt\d+", title_id) or not title:
                raise ValueError(f"Invalid IMDb title on CSV line {rows.line_num}")
            if title_id in items:
                continue
            kind = row["Title Type"].strip().casefold()
            if kind not in SERIES_TYPES | {"movie", "tv movie", "short", "tv short", "video"}:
                raise ValueError(f"Unsupported IMDb title type {row['Title Type']!r} for {title}")
            series = kind in SERIES_TYPES
            genres = [genre.strip() for genre in (row.get("Genres") or "").split(",") if genre.strip()]
            metadata = series_metadata(title_id, previous.get(title_id, {})) if series else {}
            anime = metadata.get("isAnime") or any(genre.casefold() == "anime" for genre in genres)
            category = "anime" if anime else "shows" if series else "movies"
            year = (row.get("Year") or "").strip()
            item = {"id": title_id, "title": title, "category": category,
                    "creator": (row.get("Directors") or "").strip(), "year": year,
                    "format": "Box set" if category != "movies" else "Blu-ray" if year.isdigit() and int(year) >= 2006 else "DVD",
                    "source": "IMDb", "sourceUrl": f"https://www.imdb.com/title/{title_id}/",
                    "rating": row.get("IMDb Rating", ""), "genres": genres, **metadata}
            _, item["artwork"], error = imdb_art(item)
            if error:
                print(f"Poster unavailable for {title}: {error}")
            items[title_id] = item
    if not items:
        raise ValueError("The export contains no titles.")
    staging = target.with_suffix(".tmp")
    staging.write_text(json.dumps(list(items.values()), ensure_ascii=False, separators=(",", ":")) + "\n")
    staging.replace(target)
    print("Imported", len(items), "unique titles:", dict(Counter(i["category"] for i in items.values())))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path)
    import_list(parser.parse_args().export)
