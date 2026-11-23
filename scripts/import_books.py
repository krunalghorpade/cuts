"""Import the owner's Open Library list and its cover art into the room."""
import io
import json
import re
import time
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from PIL import Image

DIST = Path(__file__).resolve().parents[1] / "dist"
BASE = "https://openlibrary.org"
LIST = "/people/krunal_ghorpade/lists/OL360679L"


def fetch(url):
    request = Request(url, headers={"User-Agent": "MyRoomBooks/1.0 (personal Open Library list)"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                return response.read()
        except (TimeoutError, URLError) as exc:
            if isinstance(exc, HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("Open Library request failed")


@lru_cache(maxsize=None)
def record(key):
    if not re.fullmatch(r"/(?:books/OL\d+M|authors/OL\d+A|works/OL\d+W)", key):
        raise ValueError(f"Invalid Open Library key {key!r}")
    return json.loads(fetch(BASE + key + ".json"))


def list_entries():
    entries = []
    url = BASE + LIST + "/seeds.json"
    while url:
        page = json.loads(fetch(url))
        entries.extend(page["entries"])
        link = page["links"].get("next")
        url = urljoin(url, link) if link else None
        if url and not url.startswith(BASE + LIST + "/seeds"):
            raise ValueError("Unexpected link in list pagination")
    if len(entries) != page["size"]:
        raise ValueError("Incomplete Open Library list")
    return entries


def cover_for(entry, metadata):
    match = re.search(r"/b/id/(\d+)", (entry.get("picture") or {}).get("url", ""))
    cover_id = match[1] if match else next((i for i in metadata.get("covers", []) if i > 0), None)
    if not cover_id:
        return None, None
    source = DIST / "art" / "books" / f"{cover_id}.webp"
    if not source.exists():
        try:
            data = fetch(f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false")
        except HTTPError as error:
            if error.code != 404:
                raise
            return None, None
        with Image.open(io.BytesIO(data)) as image:
            image.thumbnail((460, 640), Image.Resampling.LANCZOS)
            source.parent.mkdir(parents=True, exist_ok=True)
            image.convert("RGB").save(source, format="WEBP", quality=88)
    with Image.open(source) as image:
        return "./" + source.relative_to(DIST).as_posix(), image.width / image.height


def dimensions(metadata, ratio):
    description = str(metadata.get("physical_dimensions") or "").lower()
    values = [float(value) for value in re.findall(r"\d+(?:\.\d+)?", description)]
    unit = 25.4 if "inch" in description else 10 if "centimeter" in description or "cm" in description else None
    width, height = round(220 * (ratio or .65)), 220
    pages = metadata.get("number_of_pages")
    depth = max(5, round((pages or 280) * .052 + 3))
    if unit and len(values) in (2, 3):
        ordered = sorted((round(value * unit) for value in values), reverse=True)
        if 70 <= ordered[1] <= ordered[0] <= 550:
            height, width = ordered[:2]
            if len(ordered) == 3 and 2 <= ordered[2] <= 160:
                return [width, height, ordered[2]], False
    return [width, height, depth], True


def import_books():
    items = {}
    for entry in list_entries():
        if entry["type"] not in ("edition", "work"):
            continue
        key = entry["url"]
        metadata = record(key)
        work_key = (metadata.get("works") or [{"key": key}])[0]["key"]
        if work_key in items:
            continue
        authors = metadata.get("authors") or record(work_key).get("authors", [])
        names = [record(author.get("author", author)["key"])["name"] for author in authors]
        art, ratio = cover_for(entry, metadata)
        size, estimated = dimensions(metadata, ratio)
        date = metadata.get("publish_date") or metadata.get("first_publish_date") or ""
        year = re.search(r"\b\d{4}\b", date)
        items[work_key] = {"id": "openlibrary:" + work_key.rsplit("/", 1)[-1],
                           "category": "books", "title": metadata["title"], "creator": ", ".join(names),
                           "year": year[0] if year else "", "pages": metadata.get("number_of_pages"),
                           "format": metadata.get("physical_format") or "Book", "dimensions": size,
                           "estimatedSize": estimated, "source": "Open Library", "sourceUrl": BASE + key,
                           "artwork": art}
    target = DIST / "book-items.json"
    staging = target.with_suffix(".tmp")
    staging.write_text(json.dumps(list(items.values()), ensure_ascii=False, separators=(",", ":")) + "\n")
    staging.replace(target)
    print(f"Saved {len(items)} distinct books")


if __name__ == "__main__":
    import_books()
