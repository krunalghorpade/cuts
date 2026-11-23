"""Refresh trailer sources for existing shelf items by their IMDb and IGDB identities."""
import json
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

DIST = Path(__file__).resolve().parents[1] / "dist"
ARCHIVE = "https://archive.org"
SNAPSHOT = DIST / "trailers.json"


def get(url):
    with urlopen(Request(url, headers={"User-Agent": "MyRoomTrailerCatalog/1.0"}), timeout=18) as reply:
        return json.load(reply)


def normalized(s):
    return " ".join(re.findall(r"\w+", s.casefold()))


def discover(group):
    # Match each title and its release year again locally. The search endpoint also returns sequels.
    games = group[0]["category"] == "cartridges"
    collection = "collection:gamevideos" if games else "collection:movie_trailers_unsorted"
    terms = []
    for item in group:
        title = re.sub(r'["\\]', " ", item["title"])
        terms.append(f'(title:"{title}" AND year:{int(item["year"])})')
    q = collection + " AND subject:trailer AND (" + " OR ".join(terms) + ")"
    args = {"q": q, "fl": "identifier,title,date,year,subject", "output": "json", "rows": 250}
    matches = defaultdict(list)
    page = 1
    while True:
        response = get(ARCHIVE + "/advancedsearch.php?" + urlencode({**args, "page": page}))["response"]
        for row in response["docs"]:
            title = row["title"]
            if games:
                title = re.sub(r"\s*[-:(]?\s*(?:official |gameplay )?trailer\b.*$", "", title, flags=re.I)
            year = str(row.get("date") or row.get("year") or "")[:4]
            matches[(normalized(title), year)].append(row)
        if page * args["rows"] >= response["numFound"]:
            break
        page += 1
    return {item["id"]: matches[(normalized(item["title"]), item["year"])] for item in group}


def select_stream(item, rows):
    for row in sorted(rows, key=lambda r: (len(r["identifier"]), r["identifier"])):
        key = row["identifier"]
        data = get(ARCHIVE + "/metadata/" + quote(key, safe=""))
        meta = data.get("metadata", {})
        if meta.get("access-restricted-item") in ("true", True) or data.get("is_dark"):
            continue
        if item["category"] == "cartridges":
            description = normalized(" ".join([str(meta.get(k, "")) for k in ("title", "subject", "description")]))
            if normalized(item.get("platform", "")) not in description:
                continue
        files = [f for f in data.get("files", []) if f["name"].lower().endswith((".mp4",".m4v",".webm"))
                 and "/" not in f["name"] and not f.get("private") and 20 <= float(f.get("length") or 0) <= 300]
        for file in sorted(files, key=lambda f: int(f.get("size") or 2**40)):
            url = ARCHIVE + "/download/" + quote(key, safe="") + "/" + quote(file["name"], safe="")
            try:
                with urlopen(Request(url, headers={"Range": "bytes=0-63"}), timeout=12) as media:
                    header = media.read(64)
            except HTTPError:
                continue
            if b"ftyp" in header or header.startswith(b"\x1aE\xdf\xa3"):
                return {"url": url, "source": ARCHIVE + "/details/" + key}
    return None


def catalog_promos(item, editions):
    # Use the same exact title record as the shelf importer. Only accept labeled
    # trailers and teasers whose video metadata is still publicly available.
    iid = item["id"]
    if not re.fullmatch(r"tt[0-9]+", iid):
        return []
    if iid in editions:
        # A LaunchBox-only edition can have packaging before it has a trailer ID.
        if not editions[iid].get("igdbId"):
            return []
        gid = int(editions[iid]["igdbId"])
        meta = get(f"https://app.lizardbyte.dev/GameDB/games/{gid}.json")
        if int(meta.get("id", -1)) != gid:
            return []
        candidates = [(v.get("video_id"), v.get("name", "")) for v in meta.get("videos", [])]
    else:
        kind = "series" if item["category"] in {"shows", "anime"} else "movie"
        meta = get(f"https://v3-cinemeta.strem.io/meta/{kind}/{iid}.json").get("meta", {})
        if meta.get("imdb_id", meta.get("id")) != iid:
            return []
        candidates = [(v.get("source"), v.get("type", "")) for v in meta.get("trailers", [])]
    results = []
    for vid, label in candidates:
        if not vid or not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid) or not re.search("trailer|teaser", label, re.I):
            continue
        query = urlencode({"url": "https://www.youtube.com/watch?v="+vid, "format": "json"})
        try:
            video_title = get("https://www.youtube.com/oembed?"+query)["title"]
        except (OSError, ValueError, KeyError):
            continue
        name = normalized(video_title)
        if not re.search(r"\b(trailer|teaser)\b", name) or re.search(r"\b(fan made|concept|full movie|walkthrough|reaction|review)\b", name):
            continue
        if normalized(item["title"]) not in name:
            continue
        if vid not in {v["id"] for v in results}:
            results.append({"id": vid, "title": video_title})
        if len(results) == 3:
            break
    return results


def main():
    items = json.loads((DIST / "imdb-items.json").read_text())
    ids = {item["id"] for item in items}
    existing = json.loads(SNAPSHOT.read_text()) if SNAPSHOT.exists() else {}
    result = {key: stream for key, stream in existing.items() if key in ids}
    groups = []
    for games in (False, True):
        pending = [i for i in items if not result.get(i["id"], {}).get("url") and not i.get("trailerUrl") and str(i.get("year", "")).isdigit()
                   and (i.get("legacyCartridge") if games else i["category"] in {"movies", "anime-movies", "shows", "anime"})]
        groups.extend(pending[start:start+8] for start in range(0, len(pending), 8))
    with ThreadPoolExecutor(3) as pool:
        matches = {}
        for group, future in [(group, pool.submit(discover, group)) for group in groups]:
            try:
                matches.update(future.result())
            except (OSError, ValueError) as exc:
                print("Trailer lookup failed for", group[0]["title"], exc, file=sys.stderr)
        def match(item):
            rows = matches.get(item["id"])
            if not rows:
                return
            try:
                stream = select_stream(item, rows)
            except (OSError, ValueError) as exc:
                print(item["title"], str(exc)[:90], file=sys.stderr)
                return
            if stream:
                return item["id"], stream
        for entry in pool.map(match, items):
            if entry:
                result.setdefault(entry[0], {}).update(entry[1])
    editions = json.loads((DIST / "game-editions.json").read_text())
    def find_promos(item):
        try:
            return item["id"], catalog_promos(item, editions)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            print("Trailer metadata lookup failed:", item["title"], str(exc)[:90], file=sys.stderr)
            return item["id"], []
    with ThreadPoolExecutor(3) as pool:
        for imdb_id, promos in pool.map(find_promos, (i for i in items if not result.get(i["id"], {}).get("youtube"))):
            if promos:
                result.setdefault(imdb_id, {})["youtube"] = promos
    temp = SNAPSHOT.with_suffix(".tmp")
    temp.write_text(json.dumps(result, indent=2) + "\n")
    temp.replace(SNAPSHOT)
    print(f"Verified trailer streams for {len(result)} catalog titles.")


if __name__ == "__main__":
    main()
