"""Fit a supplied, trimmed DVDcover.com print to a catalog title and refresh its shelf atlas."""
import argparse
import hashlib
import io
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
MANIFEST = DIST / "film-cover-scans.json"


def split_cover(image, item, folds):
    width, height = image.size
    if not folds and width < height:
        return {"artwork": image}
    if not folds:
        if item["category"] in {"anime", "shows"}:
            raise ValueError("Supply the two spine fold coordinates for this box set using --folds LEFT RIGHT.")
        if not 1.30 <= width / height <= 2.05:
            raise ValueError("Supply a front cover or a trimmed back/spine/front wrap.")
        # Common 14 mm DVD and 12 mm Blu-ray cases. A supplied fold overrides the estimate.
        face, spine = (129, 14) if item["format"] == "DVD" else (128, 12)
        left = round(width * face / (2 * face + spine))
        folds = (left, width - left)
    left, right = folds
    if not 0 < left < right < width:
        raise ValueError("Spine folds must fall inside the image from left to right.")
    return {key: image.crop((start, 0, end, height)) for key, start, end in (
        ("boxBack", 0, left), ("boxSpine", left, right), ("artwork", right, width))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("imdb_id")
    parser.add_argument("scan", type=Path)
    parser.add_argument("--folds", nargs=2, type=int, metavar=("LEFT", "RIGHT"),
                        help="Horizontal pixel coordinates of the two spine folds in the upright scan")
    args = parser.parse_args()
    items = json.loads((DIST / "imdb-items.json").read_text())
    item = next((row for row in items if row["id"] == args.imdb_id and row["category"] in
                 {"movies", "anime-movies", "shows", "anime"}), None)
    if not item:
        parser.error("The IMDb ID must identify a movie, series or anime on the shelves.")
    with Image.open(args.scan) as source:
        try:
            panels = split_cover(ImageOps.exif_transpose(source).convert("RGB"), item, args.folds)
        except ValueError as error:
            parser.error(str(error))
    collection = json.loads(MANIFEST.read_text())
    entry = {}
    output = DIST / "art" / "film-covers"
    output.mkdir(parents=True, exist_ok=True)
    for key, panel in panels.items():
        panel.thumbnail((1200, 1080), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        panel.save(buffer, format="WEBP", quality=91, method=6)
        data = buffer.getvalue()
        digest = hashlib.sha256(data).hexdigest()[:12]
        target = output / f"{item['id']}-{key}-{digest}.webp"
        target.write_bytes(data)
        entry[key] = "./" + target.relative_to(DIST).as_posix()
    collection[item["id"]] = entry
    pending = MANIFEST.with_suffix(".tmp")
    pending.write_text(json.dumps(collection, indent=2, sort_keys=True) + "\n")
    pending.replace(MANIFEST)
    subprocess.run([sys.executable, str(ROOT / "scripts/build_shelf_atlas.py"), "--film-only"], check=True)
    print(f"Imported {len(entry)} cover panel(s) for {item['title']} ({item['year']}).")


if __name__ == "__main__":
    main()
