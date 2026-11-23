"""Import My Games from a saved Backloggd list or a CSV with verified physical formats."""
import argparse
import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

LIST_URL = "https://backloggd.com/u/krunalghorpade/list/my-games/"
DIST = Path(__file__).resolve().parents[1] / "dist"


class GameLinks(HTMLParser):
    """Read the game cards and ordinary pagination links on a rendered list page."""
    def __init__(self):
        super().__init__()
        self.games = []
        self.card = None
        self.next_page = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a":
            path = urlsplit(urljoin(LIST_URL, a.get("href", "")))
            if path.hostname not in {"backloggd.com", "www.backloggd.com"}:
                return
            if path.path == urlsplit(LIST_URL).path and "next" in (a.get("rel") or "").split():
                self.next_page = path.geturl()
            if re.fullmatch(r"/games/[^/]+/?", path.path):
                self.card = {"url": path.geturl(), "title": a.get("title") or a.get("aria-label") or ""}
        if self.card is not None and tag == "img":
            self.card["title"] = a.get("alt") or a.get("title") or self.card["title"]
            self.card["artwork"] = a.get("data-src") or a.get("src") or ""

    def handle_data(self, data):
        if self.card is not None and not self.card["title"] and data.strip():
            self.card["title"] = data.strip()

    def handle_endtag(self, tag):
        if tag == "a" and self.card is not None:
            if self.card["title"]:
                self.games.append(self.card)
            self.card = None


def read_page(html):
    page = GameLinks()
    page.feed(html)
    if not page.games:
        raise ValueError("No game cards found on this page. The existing inventory is intact.")
    return page


def live_list():
    url = LIST_URL
    seen = set()
    games = []
    while url and url not in seen:
        seen.add(url)
        with urlopen(Request(url, headers={"User-Agent": "LowerLevel/1.0"}), timeout=20) as response:
            page = read_page(response.read().decode())
        games.extend(page.games)
        url = page.next_page
    return games


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="*", type=Path, help="Saved list pages or CSV with title, platform and format")
    parser.add_argument("--editions", type=Path, help="CSV with a Backloggd url or title, platform and physical format")
    args = parser.parse_args()
    rows = []
    for file in args.files:
        rows.extend(read_csv(file) if file.suffix.lower()==".csv" else read_page(file.read_text()).games)
    if not args.files:
        rows = live_list()
    editions = {}
    for entry in read_csv(args.editions) if args.editions else []:
        key = entry.get("url") or entry["title"]
        editions[key.strip().rstrip("/").casefold()] = entry
    items = {}
    missing = []
    for row in rows:
        title = row["title"].strip()
        url = (row.get("url") or "").rstrip("/")
        if url and (urlsplit(url).hostname not in {"backloggd.com","www.backloggd.com"} or not url.startswith("https://")):
            raise ValueError("Expected a Backloggd game URL for "+title)
        data = {**row, **(editions.get(url.casefold()) or editions.get(title.casefold()) or {})}
        fmt = (data.get("format") or "").strip().lower()
        if fmt not in {"disc","cartridge"}:
            missing.append(title)
            continue
        key = urlsplit(url).path.strip("/").split("/")[-1] if url else title.casefold()
        item_id = "backloggd:"+key
        cat = "game-discs" if fmt=="disc" else "cartridges"
        items.setdefault(item_id, dict(id=item_id, category=cat, title=title,
            platform=data.get("platform") or "", year=data.get("year") or "",
            creator=data.get("developer") or "", format="Game disc" if fmt=="disc" else "Game cartridge",
            source="Backloggd", sourceUrl=url or LIST_URL, artwork=data.get("artwork") or None))
    if missing:
        raise ValueError("Confirm cartridge or disc for these games in --editions: "+", ".join(dict.fromkeys(missing)))
    if not items:
        raise ValueError("The input contained no games. The existing inventory is intact.")
    file = DIST/"backloggd-items.json"
    temp = file.with_suffix(".tmp")
    temp.write_text(json.dumps(list(items.values()),ensure_ascii=False,separators=(",",":"))+"\n")
    temp.replace(file)
    print("Imported",len(items),"Backloggd games")


if __name__=="__main__":
    main()
