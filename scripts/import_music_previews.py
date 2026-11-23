"""Match room albums to playable samples from Spotify's public album embeds."""
import argparse
import json
import re
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

DIST = Path(__file__).resolve().parents[1] / "dist"
OUTPUT = DIST / "music-previews.json"
EMBED_DATA = re.compile(rb'<script[^>]*\bid="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
SERVICE_ID = re.compile(r"[A-Za-z0-9]{22}")
PREVIEW_HOSTS = {"p.scdn.co", "audio-fa.scdn.co", "audio-ak-spotify-com.akamaized.net"}
lock = threading.Lock()
resume_after = 0.0


def retry_seconds(header, fallback):
    if not header:
        return fallback
    try:
        return max(0, float(header))
    except ValueError:
        return max(0, parsedate_to_datetime(header).timestamp() - time.time())


def request(url, size=None):
    """Read embed metadata, or a small byte range to confirm the published sample."""
    global resume_after
    headers = {"User-Agent": "MyRoomCatalog/1.0"}
    if size:
        headers["Range"] = f"bytes=0-{size - 1}"
    for attempt in range(3):
        with lock:
            delay = resume_after - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        try:
            with urlopen(Request(url, headers=headers), timeout=14) as response:
                return response.read(size or 4_000_000)
        except HTTPError as err:
            if err.code != 429 and not 500 <= err.code < 600:
                raise
            if err.code == 429:
                delay = retry_seconds(err.headers.get("Retry-After"), 5 * (attempt + 1))
                with lock:
                    resume_after = max(resume_after, time.monotonic() + delay)
            if attempt == 2:
                raise
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(2 ** attempt)


def entity(uri):
    provider, kind, item_id = uri.split(":")
    if provider != "spotify" or kind not in {"album", "track"} or not SERVICE_ID.fullmatch(item_id):
        raise ValueError("Invalid catalog URI")
    match = EMBED_DATA.search(request(f"https://open.spotify.com/embed/{kind}/{item_id}"))
    if not match:
        raise ValueError("Spotify embed metadata unavailable")
    item = json.loads(match[1])["props"]["pageProps"]["state"]["data"]["entity"]
    if item.get("uri") != uri:
        raise ValueError("Spotify returned a different release")
    return item


def sample(track):
    uri = track.get("uri") or ""
    url = (track.get("audioPreview") or {}).get("url") or ""
    parts = urlsplit(url)
    if (not re.fullmatch(r"spotify:track:[A-Za-z0-9]{22}", uri)
            or parts.scheme != "https" or parts.hostname not in PREVIEW_HOSTS):
        return None
    try:
        header = request(url, 128)
    except (OSError, ValueError):
        return None
    if not (header.startswith(b"ID3") or len(header) >= 2 and header[0] == 255 and header[1] & 224 == 224):
        return None
    return {"title": track["title"], "url": url, "trackUri": uri}


def album_preview(entry):
    album = entity(entry["albumUri"])
    wanted = (entry.get("featuredTrack") or "").casefold()
    tracks = sorted(album.get("trackList") or [], key=lambda track: track.get("title", "").casefold() != wanted)
    for track in tracks:
        found = sample(track)
        if found:
            return found
    # A track embed may expose a preview absent from the album embed.
    for track in tracks[:2]:
        uri = track.get("uri")
        if not uri or not uri.startswith("spotify:track:"):
            continue
        try:
            found = sample(entity(uri))
        except (OSError, ValueError, KeyError):
            continue
        if found:
            return found
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Recheck previously matched releases")
    args = parser.parse_args()
    items = json.loads((DIST / "spotify-items.json").read_text())
    albums = {item["albumUri"]: item for item in items}
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    index = {uri: sample for uri, sample in previous.items() if uri in albums}
    pending = [item for uri, item in albums.items() if args.refresh or uri not in index]

    def save():
        staging = OUTPUT.with_suffix(".tmp")
        staging.write_text(json.dumps(index, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")
        staging.replace(OUTPUT)

    with ThreadPoolExecutor(max_workers=5) as workers:
        jobs = {workers.submit(album_preview, item): item["albumUri"] for item in pending}
        for count, future in enumerate(as_completed(jobs), 1):
            uri = jobs[future]
            try:
                result = future.result()
            except (OSError, KeyError, ValueError) as exc:
                print(f"{uri}: {exc}", flush=True)
                continue
            if result:
                index[uri] = result
            elif args.refresh:
                index.pop(uri, None)
            if count % 75 == 0:
                save()
                print(f"Checked {count}/{len(jobs)} • matched {len(index)} albums", flush=True)
    save()
    formats = Counter(i["category"] for i in items if i["albumUri"] in index)
    print(f"Playable samples for {len(index)}/{len(albums)} albums • shelf coverage {dict(formats)}")


if __name__ == "__main__":
    main()
