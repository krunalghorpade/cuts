"""Refresh the visually reviewed disc photographs and label designs in My Room's movie catalog."""
import io
import json
import math
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
MANIFEST = DIST / "movie-medium-art.json"
SIZE = 600


def disc_bounds(image):
    """Fit the printed rim; scans may be off center or include a narrow scanner border."""
    probe = image.resize((100, 100), Image.Resampling.BILINEAR).convert("RGB")
    px = probe.load()
    angles = [(math.cos(k * math.tau / 48), math.sin(k * math.tau / 48)) for k in range(48)]
    best = None
    for x in range(47, 53):
        for y in range(47, 53):
            for radius in (46, 47, 48, 49, 50):
                edges = []
                for dx, dy in angles:
                    ax, ay = round(x + (radius - 1.5) * dx), round(y + (radius - 1.5) * dy)
                    bx, by = round(x + (radius + 1.5) * dx), round(y + (radius + 1.5) * dy)
                    if 0 <= bx < 100 and 0 <= by < 100 and 0 <= ax < 100 and 0 <= ay < 100:
                        edges.append(sum(abs(a-b) for a, b in zip(px[ax, ay], px[bx, by])))
                if len(edges) < 28:
                    continue
                edges.sort()
                score = sum(edges[len(edges)//4:3*len(edges)//4]) / (len(edges)//2)
                # A good edge on much of the circumference is stronger than an incidental interior arc.
                score += radius * .6 - (abs(x - 49.5) + abs(y - 49.5))
                if best is None or score > best[0]:
                    best = (score, x, y, radius)
    _, x, y, radius = best
    w, h = image.size
    return tuple(round(value * scale / 100) for value, scale in
                 ((x-radius, w), (y-radius, h), (x+radius, w), (y+radius, h)))


def prepare(raw):
    with Image.open(io.BytesIO(raw)) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
    if not .87 <= image.width/image.height <= 1.14:
        raise ValueError("Expected a square disc label")
    image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
    image = image.crop(disc_bounds(image)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    mask = Image.new("L", (2*SIZE, 2*SIZE))
    ctx = ImageDraw.Draw(mask)
    ctx.ellipse((1, 1, 2*SIZE-2, 2*SIZE-2), fill=255)
    # DVD and Blu-ray media share a 15 mm center hole in a 120 mm disc.
    r = SIZE / 8
    ctx.ellipse((SIZE-r, SIZE-r, SIZE+r, SIZE+r), fill=0)
    image.putalpha(mask.resize(image.size, Image.Resampling.LANCZOS))
    return image


def refresh(row):
    iid, entry = row
    output = DIST / "art" / "movie-discs" / (iid + ".webp")
    if (DIST / entry["artwork"]).resolve() != output.resolve():
        raise ValueError("Unexpected output location for " + iid)
    if output.exists():
        with Image.open(output) as image:
            image.verify()
        return
    url = entry["imageSource"]
    parts = urlparse(url)
    if parts.scheme != "https" or parts.netloc != "www.covercentury.com" or not parts.path.startswith("/covers/"):
        raise ValueError("Unexpected source for " + iid)
    req = Request(url, headers={"User-Agent":"MyRoom/1.0 (movie disc art)"})
    with urlopen(req, timeout=30) as res:
        raw = res.read(24*1024*1024 + 1)
    if len(raw) > 24*1024*1024:
        raise ValueError("Disc scan too large")
    image = prepare(raw)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output.parent, suffix=".webp", delete=False) as temp:
        pending = Path(temp.name)
    try:
        image.save(pending, "WEBP", quality=86, method=5)
        pending.chmod(0o644)
        pending.replace(output)
    finally:
        pending.unlink(missing_ok=True)


if __name__ == "__main__":
    entries = json.loads(MANIFEST.read_text())
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(refresh, entries.items()))
    print(f"{len(entries)} reviewed movie disc images.")
