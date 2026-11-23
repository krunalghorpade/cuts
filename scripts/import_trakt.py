"""Update the movie shelves from a Trakt list export or the configured public list API."""
import argparse
import csv
import json
import os
import re
from pathlib import Path
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen

DIST = Path(__file__).resolve().parents[1] / "dist"
API = "https://api.trakt.tv"
LIST = "/users/krunal-ghorpade-324337/lists/my-watch-list/items"
CLIENT = os.environ.get("TRAKT_CLIENT_ID")


def request_json(url, headers=None):
    req = Request(url, headers={"User-Agent": "LowerLevel/1.0", **(headers or {})})
    with urlopen(req, timeout=20) as result:
        return json.load(result), result.headers


def trakt(path):
    return request_json(API+path, {"trakt-api-version": "2", "trakt-api-key": CLIENT})


def fetch_list():
    if not CLIENT:
        raise ValueError("Provide a Trakt export, or configure TRAKT_CLIENT_ID for a live import.")
    records = []
    page = 1
    while True:
        batch, headers = trakt(LIST+"?"+urlencode(dict(page=page, limit=100, extended="full")))
        records.extend(batch)
        if page >= int(headers.get("X-Pagination-Page-Count", 1)):
            return records
        page += 1


def read_export(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        if path.suffix.lower() == ".csv":
            return [{k.strip().lower().replace(" ", "_"): v for k,v in row.items() if k} for row in csv.DictReader(stream)]
        body = json.load(stream)
    if isinstance(body, list):
        return body
    if isinstance(body.get("items"), list):
        return body["items"]
    raise ValueError("Expected a Trakt list with an items array.")


def poster(media):
    urls = (media.get("images") or {}).get("poster", [])
    if isinstance(urls, dict):
        urls = list(urls.values())
    if isinstance(urls, str):
        urls = [urls]
    for url in urls:
        if not isinstance(url, str):
            continue
        url = url if url.startswith("https://") else "https://"+url.lstrip("/")
        host = urlsplit(url).hostname or ""
        if host in {"image.tmdb.org","walter.trakt.tv","media.trakt.tv","images.trakt.tv","static.tvmaze.com"}:
            return url
    return None


def clean(entry):
    kind = str(entry.get("type") or ("show" if "show" in entry else "movie" if "movie" in entry else "")).lower()
    if kind in {"season","episode"} and "show" in entry:
        kind = "show"
    kind = {"series":"show", "tv show":"show", "anime":"show", "film":"movie"}.get(kind,kind)
    if kind not in {"show","movie"}:
        raise ValueError("Unsupported list entry type: "+kind)
    m = dict(entry.get(kind) or entry)
    ids = dict(m.get("ids") or {})
    for key in ("trakt","slug","imdb","tmdb","tvdb"):
        if m.get(key+"_id") or m.get(key):
            ids.setdefault(key, m.get(key+"_id") or m[key])
    provider_id = ids.get("trakt") or ids.get("slug")
    route = ("/shows/" if kind=="show" else "/movies/")+quote(str(provider_id or ""),safe="")
    if provider_id and CLIENT and (not m.get("genres") or (kind=="show" and m.get("aired_episodes") is None)):
        full,_ = trakt(route+"?extended=full")
        m.update(full)
    title = m.get("title") or m.get("name")
    if not title:
        raise ValueError("Missing title in Trakt export")
    genres = m.get("genres") or []
    genres = re.split(r"[,|]",genres) if isinstance(genres,str) else genres
    genres = [str(g).strip() for g in genres if str(g).strip()]
    tags = {g.casefold() for g in genres}
    country = str(m.get("country") or "").casefold()
    language = str(m.get("language") or "").casefold()
    anime = str(entry.get("type","")).lower()=="anime" or "anime" in tags or (
        "animation" in tags and (country in {"jp","japan"} or language in {"ja","japanese"}))
    category = "anime" if anime else "shows" if kind=="show" else "movies"
    year = str(m.get("year") or "")
    eps = m.get("aired_episodes",m.get("episode_count",m.get("episodes")))
    eps = int(eps) if str(eps).isdigit() else None
    title_id = str(provider_id or ids.get("imdb") or (title.casefold()+"-"+year))
    return dict(id="trakt:"+kind+":"+title_id, category=category, title=title, year=year,
                creator=m.get("network") or "", genres=genres,
                format="Box set" if category!="movies" else "Blu-ray" if year.isdigit() and int(year)>=2006 else "DVD",
                source="Trakt", sourceUrl="https://app.trakt.tv"+route if provider_id else None,
                episodeCount=eps if kind=="show" else None, artwork=poster(m),
                mediaType=kind)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", nargs="?", type=Path)
    args = parser.parse_args()
    source = read_export(args.export) if args.export else fetch_list()
    items = {}
    for entry in source:
        item = clean(entry)
        items.setdefault(item["id"],item)
    file = DIST / "trakt-items.json"
    temp = file.with_suffix(".tmp")
    temp.write_text(json.dumps(list(items.values()), ensure_ascii=False, separators=(",",":"))+"\n")
    temp.replace(file)
    print("Imported",len(items),"unique Trakt titles")


if __name__=="__main__":
    main()
