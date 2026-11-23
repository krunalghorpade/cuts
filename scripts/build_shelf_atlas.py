"""Pack shelf-resolution artwork into shared textures for the WebGL walkthrough."""
import json
from pathlib import Path
from PIL import Image

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
def pack(art, tile, grid, pad, prefix="", quality=84):
    for start in range(0, len(art), grid * grid):
        sheet = Image.new("RGB", (grid*tile, grid*tile))
        for slot, path in enumerate(art[start:start + grid*grid]):
            with Image.open(DIST/path) as source:
                thumb = source.convert("RGB").resize((tile-2*pad, tile-2*pad), Image.Resampling.LANCZOS)
            x, y = (slot % grid)*tile+pad, (slot//grid)*tile+pad
            sheet.paste(thumb, (x,y))
            w=thumb.width
            sheet.paste(thumb.crop((0,0,1,w)).resize((pad,w)), (x-pad,y))
            sheet.paste(thumb.crop((w-1,0,w,w)).resize((pad,w)), (x+w,y))
            sheet.paste(thumb.crop((0,0,w,1)).resize((w,pad)), (x,y-pad))
            sheet.paste(thumb.crop((0,w-1,w,w)).resize((w,pad)), (x,y+w))
        sheet.save(dest / (prefix+str(start//(grid*grid))+".webp"), quality=quality)
    return dict(tile=tile, grid=grid, pad=pad, art=art)

manifest = pack(art, TILE, GRID, PAD)
# LP jackets are three times the width of a cassette and occupy more screen pixels.
lp_paths = {i.get("artwork") for i in items if i.get("category") == "vinyl"}
manifest["vinyl"] = pack([p for p in art if p in lp_paths], 192, 8, 3, "lp-", 89)
index_file.write_text(json.dumps(manifest, separators=(",", ":")))
print(len(art), "covers packed")
