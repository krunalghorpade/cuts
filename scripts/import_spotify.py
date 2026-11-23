"""Merge Spotify collection results (albums with uri, title, track, artists, art and lists)."""
import concurrent.futures
import json
import re
import sys
import threading
from urllib.error import HTTPError
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

from fetch_art import save_image

DIST = Path(__file__).resolve().parents[1] / "dist"
ORIGINAL = "0gwADXODSkvnsFaNMe55XP"


request_lock = threading.Lock()
next_request = 0.0


def pace_pages(cooldown=0):
    global next_request
    with request_lock:
        now = time.monotonic()
        next_request = max(next_request, now + cooldown)
        if cooldown:
            return
        delay = next_request - now
        next_request += 0.52
    time.sleep(delay)


class AlbumMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fields = {}

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if tag == "meta":
            self.fields[a.get("property") or a.get("name")] = a.get("content", "")


def import_album(album, existing):
    uri = album["uri"]
    album_id = uri.split(":")[-1]
    if not re.fullmatch(r"[a-zA-Z0-9]{22}", album_id):
        raise ValueError("Invalid Spotify album ID")
    url = "https://open.spotify.com/album/" + album_id
    if existing:
        date = existing["releaseDate"]
        artist = existing["creator"]
        art = album.get("art")
    else:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LowerLevel/1.0)"})
        for attempt in range(6):
            pace_pages()
            try:
                with urlopen(req, timeout=18) as res:
                    metadata = AlbumMetadata()
                    metadata.feed(res.read(1800000).decode("utf8"))
                date = metadata.fields.get("music:release_date", "")
                if not re.match(r"^[0-9]{4}", date):
                    raise ValueError("Spotify release date unavailable")
                break
            except HTTPError as exc:
                if exc.code != 429 or attempt == 5:
                    raise
                retry = exc.headers.get("Retry-After", "")
                pace_pages(int(retry) if retry.isdigit() else 60)
            except Exception:
                if attempt == 5:
                    raise
                time.sleep(1 + attempt)
        summary = metadata.fields.get("og:description", "").split(" · ")
        artist = summary[0] if len(summary) >= 3 else ", ".join(album["artists"])
        art = metadata.fields.get("og:image") or album.get("art")
    cover = DIST / "art" / "spotify" / (album_id + ".webp")
    if not cover.is_file() and art:
        try:
            save_image(art, cover, square=True)
        except Exception:
            pass
    year = int(date[:4])
    formats = [("vinyl", "LP")] if year < 1985 else [("cassettes", "Cassette"), ("cds", "CD")] if year <= 1995 else [("cds", "CD")]
    lists = list(dict.fromkeys((existing or {}).get("playlists", []) + album["lists"]))
    return [dict(id=uri+"-"+category, category=category, title=album["title"], album=album["title"],
                 creator=artist, year=str(year), format=fmt, source="Spotify", sourceUrl=url, albumUri=uri,
                 releaseDate=date, featuredTrack=album["track"], artwork=("./art/spotify/"+cover.name if cover.is_file() else art),
                 playlists=lists) for category, fmt in formats]


def main():
    incoming = json.loads(Path(sys.argv[1]).read_text())
    file = DIST / "spotify-items.json"
    old = json.loads(file.read_text())
    by_album = {}
    for item in old:
        item.setdefault("playlists", [ORIGINAL])
        by_album.setdefault(item["albumUri"], []).append(item)
    failures = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        tasks = {pool.submit(import_album, a, by_album.get(a["uri"], [None])[0]): a["uri"] for a in incoming}
        for i, job in enumerate(concurrent.futures.as_completed(tasks), 1):
            uri = tasks[job]
            try:
                by_album[uri] = job.result()
            except Exception as exc:
                failures[uri] = str(exc)
            if i % 150 == 0:
                print("Read", i, "albums", flush=True)
    result = sorted((entry for entries in by_album.values() for entry in entries),
                    key=lambda e: (e["title"].casefold(), e["creator"].casefold(), e["id"]))
    tmp = file.with_suffix(".tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":"))+"\n")
    tmp.replace(file)
    print(json.dumps({"albums": len(by_album), "cases": len(result), "failures": failures}))


if __name__ == "__main__":
    main()
