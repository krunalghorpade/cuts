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
    def current_path(path):
        if path.startswith("./art/igdb/"):
            return editions.get(Path(path).stem, {}).get("artwork") or path
        return path
    previous = (current_path(p) for p in json.loads(index_file.read_text())["art"])
    old = list(dict.fromkeys(p for p in previous if p in available))
    art = old + sorted(available.difference(old))
def paste_print(sheet, image, x, y, pad):
    width, height = image.size
    sheet.paste(image, (x, y))
    # Extrude the complete boundary, including corners, to prevent mipmap bleed.
    for sx, dx in [(0, x-pad), (width-1, x+width)]:
        sheet.paste(image.crop((sx, 0, sx+1, height)).resize((pad, height)), (dx, y))
    for sy, dy in [(0, y-pad), (height-1, y+height)]:
        sheet.paste(sheet.crop((x-pad, y+sy, x+width+pad, y+sy+1)).resize((width+2*pad, pad)), (x-pad, dy))


def pack_game_boxes(editions):
    # Spines only occupy their printed width. Keep the whole scan, including wide SNES boxes.
    sheet_width, row_height, rows, pad = 1536, 152, 7, 3
    paths = sorted({e[k] for e in editions.values() if e.get("launchboxUrl")
                    for k in ("artwork", "boxBack", "boxSpine") if e.get(k)})
    pages, prints = [], {}
    x, y = pad, pad
    sheet = Image.new("RGB", (sheet_width, rows*row_height))
    def save_page():
        height = y-pad+row_height
        sheet.crop((0, 0, sheet_width, height)).save(dest / f"game-{len(pages)}.webp", quality=91, method=5)
        pages.append([sheet_width, height])
    for path in paths:
        with Image.open(DIST / path) as original:
            aspect = original.width / original.height
            thumb = original.convert("RGB")
            thumb.thumbnail((228, row_height-2*pad), Image.Resampling.LANCZOS)
        w, h = thumb.size
        if x+w+pad > sheet_width:
            if y-pad+row_height == sheet.height:
                save_page()
                sheet = Image.new("RGB", (sheet_width, rows*row_height))
                y = pad
            else:
                y += row_height
            x = pad
        paste_print(sheet, thumb, x, y, pad)
        prints[path] = [len(pages), x, y, w, h, round(aspect, 6)]
        x += w+2*pad
    if prints:
        save_page()
    return {"pages":pages, "prints":prints}


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
manifest["gameBoxes"] = pack_game_boxes(editions)
index_file.write_text(json.dumps(manifest, separators=(",", ":")))
print(len(art), "covers packed")
