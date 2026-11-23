"""Refresh game inventory and printed case artwork from the owner's public RAWG collection."""
import io
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps

DIST = Path(__file__).resolve().parents[1] / "dist"
HOST = "https://rawg.io"
FEED = HOST + "/api/collections/my-games-108/feed"
# Representative packaging for these particular multi-platform releases.
GAME_CARDS = {
    "gta-chinatown-wars": "Nintendo DS",
    "grand-theft-auto-the-trilogy-the-definitive-editio": "Nintendo Switch",
}


def get(url, limit=20_000_000):
    req = Request(url, headers={"User-Agent":"LowerLevel/1.0"})
    with urlopen(req, timeout=30) as response:
        data = response.read(limit+1)
    if len(data)>limit:
        raise ValueError("Oversized RAWG response")
    return data


def collection():
    records = {}
    page = 1
    received = 0
    while True:
        batch = json.loads(get(FEED+"?page="+str(page)))
        results = batch["results"]
        received += len(results)
        for entry in results:
            if entry.get("type") == "game":
                game = entry["game"]
                records[game["id"]] = game
        if not batch["next"]:
            if received != batch["count"]:
                raise ValueError("Incomplete RAWG feed")
            return records.values()
        if not results or received >= batch["count"]:
            raise ValueError("Invalid RAWG pagination")
        page += 1


def font(size):
    for path in ("Arial Bold.ttf","/System/Library/Fonts/Supplemental/Arial Bold.ttf","DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def print_cover(game, cartridge):
    url = game["background_image"]
    if urlsplit(url).hostname != "media.rawg.io":
        raise ValueError("Unexpected artwork host")
    size = (360,360 if cartridge else 494)
    img = ImageOps.fit(Image.open(io.BytesIO(get(url))).convert("RGB"),size,method=Image.Resampling.LANCZOS)
    artist = ImageDraw.Draw(img,"RGBA")
    w,h=size
    for y in range(h//2,h):
        artist.line((0,y,w,y),fill=(0,0,0,int(240*((y-h/2)/(h/2))**.76)))
    face = font(25 if cartridge else 29)
    lines = []
    for word in game["name"].split():
        if lines and artist.textlength(lines[-1]+" "+word,font=face) < w-32:
            lines[-1] += " "+word
        else:
            lines.append(word)
    y=h-17-32*len(lines)
    for line in lines:
        artist.text((16,y),line,font=face,fill="white",stroke_width=1,stroke_fill=(0,0,0,100))
        y+=32
    target = DIST/"art"/"rawg"/(str(game["id"])+".webp")
    target.parent.mkdir(parents=True,exist_ok=True)
    img.save(target,"WEBP",quality=86)
    return "./art/rawg/"+target.name


def convert(game):
    url = HOST+"/games/"+quote(game["slug"],safe="-")
    html = get(url).decode()
    blob = html.partition("window.CLIENT_PARAMS = ")[2]
    state = json.JSONDecoder().raw_decode(blob)[0]["initialState"]
    details = state["entities"]["games"][state["game"]["slug"]]
    if details["id"]!=game["id"]:
        raise ValueError("Detail page did not match collection game")
    platforms = [x["platform"]["name"] for x in (game.get("platforms") or [])]
    card = GAME_CARDS.get(game["slug"])
    if not card and len(platforms)==1 and platforms[0] in {"Nintendo DS","Game Boy Advance","Nintendo Switch"}:
        card=platforms[0]
    if card and card not in platforms:
        raise ValueError("Chosen card format unavailable on RAWG")
    return dict(id="rawg:"+str(game["id"]),rawgId=game["id"],title=game["name"],
        category="cartridges" if card else "game-discs",format="Game card" if card else "Archive case",
        platform=card,platforms=platforms,creator=", ".join(d["name"] for d in details.get("developers",[])),
        year=(game.get("released") or "")[:4],genres=[g["name"] for g in game.get("genres",[])],
        artwork=print_cover(game, bool(card)),source="RAWG",sourceUrl=url)


def main():
    games = [convert(g) for g in collection()]
    target = DIST/"rawg-items.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(games,ensure_ascii=False,indent=2)+"\n")
    temporary.replace(target)
    subprocess.run([os.sys.executable,str(Path(__file__).with_name("build_shelf_atlas.py"))],check=True)
    print("Imported",len(games),"games from RAWG")


if __name__=="__main__":
    main()
