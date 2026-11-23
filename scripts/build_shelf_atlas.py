"""Pack shelf-resolution artwork into shared textures for the WebGL walkthrough."""
import json
from pathlib import Path
from PIL import Image, ImageOps

DIST = Path(__file__).resolve().parents[1] / "dist"
TILE, GRID, PAD = 96, 12, 2
dest = DIST / "art" / "shelves"
dest.mkdir(parents=True, exist_ok=True)
editions = json.loads((DIST / "game-editions.json").read_text()) if (DIST / "game-editions.json").exists() else {}
items = [dict(i, artwork=editions.get(i["id"], {}).get("artwork") or i.get("artwork"))
         for src in ("imdb-items", "spotify-items", "book-items", "manga-items")
         for i in json.loads((DIST / (src + ".json")).read_text())]
art = sorted({i["artwork"] for i in items
              if (i.get("artwork") or "").startswith("./art/") and (DIST / i["artwork"]).is_file()})
# Keep stable slots for existing covers when appending a new collection.
index_file = dest / "index.json"
if index_file.exists():
    available = set(art)
    old = [path for path in json.loads(index_file.read_text())["art"] if path in available]
    art = old + sorted(available.difference(old))
for start in range(0, len(art), GRID * GRID):
    sheet = Image.new("RGB", (GRID*TILE, GRID*TILE))
    for slot, path in enumerate(art[start:start + GRID*GRID]):
        with Image.open(DIST/path) as source:
            thumb = source.convert("RGB").resize((TILE-2*PAD, TILE-2*PAD), Image.Resampling.LANCZOS)
        x, y = (slot % GRID)*TILE+PAD, (slot//GRID)*TILE+PAD
        sheet.paste(thumb, (x,y))
        w=thumb.width
        sheet.paste(thumb.crop((0,0,1,w)).resize((PAD,w)), (x-PAD,y))
        sheet.paste(thumb.crop((w-1,0,w,w)).resize((PAD,w)), (x+w,y))
        sheet.paste(thumb.crop((0,0,w,1)).resize((w,PAD)), (x,y-PAD))
        sheet.paste(thumb.crop((0,w-1,w,w)).resize((w,PAD)), (x,y+w))
    sheet.save(dest / (str(start//(GRID*GRID))+".webp"), quality=84)
(dest/"index.json").write_text(json.dumps(dict(tile=TILE,grid=GRID,pad=PAD,art=art),separators=(",",":")))
print(len(art), "covers packed")
