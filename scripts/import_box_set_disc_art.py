"""Refresh the season/disc labels reviewed in dist/box-set-disc-art.json."""
import io
import json
import math
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps

DIST = Path(__file__).resolve().parents[1] / "dist"
MANIFEST = DIST / "box-set-disc-art.json"
SIZE = 600


def label_bounds(image):
    """Locate the printed disc, including scans with visible scanner-bed margins."""
    reduced = image.resize((128, 128), Image.Resampling.BILINEAR).convert("RGB")
    px = reduced.load()
    angles = [(math.cos(k*math.tau/32), math.sin(k*math.tau/32)) for k in range(32)]
    best = (-1, 63.5, 63.5, 63.5)
    for cx in range(58, 70):
        for cy in range(58, 70):
            for radius in range(51, 65):
                edges = []
                for dx, dy in angles:
                    ax, ay = round(cx + (radius-1.45)*dx), round(cy + (radius-1.45)*dy)
                    bx, by = round(cx + (radius+1.45)*dx), round(cy + (radius+1.45)*dy)
                    if 0 <= bx < 128 and 0 <= by < 128:
                        edges.append(sum(abs(a-b) for a, b in zip(px[ax, ay], px[bx, by])))
                if len(edges) < 18:
                    continue
                edges.sort()
                middle = edges[len(edges)//4:len(edges)*3//4]
                score = sum(middle)/len(middle) + radius*.5 - (abs(cx-63.5)+abs(cy-63.5))*.4
                if score > best[0]:
                    best = (score,cx,cy,radius)
    _, x, y, r = best
    return tuple(round(v*s/128) for v,s in zip((x-r,y-r,x+r,y+r), (*image.size,*image.size)))


def prepare(raw, entry):
    with Image.open(io.BytesIO(raw)) as source:
        im = ImageOps.exif_transpose(source).convert("RGB")
    if not .85 < im.width / im.height < 1.17:
        raise ValueError("Unexpected disc shape")
    im.thumbnail((1100,1100), Image.Resampling.LANCZOS)
    im = im.crop(label_bounds(im)).resize((SIZE,SIZE), Image.Resampling.LANCZOS)
    angle = entry.get("rotation",0)
    if angle:
        im = im.rotate(angle, resample=Image.Resampling.BICUBIC)
    mask = Image.new("L",(2*SIZE,2*SIZE))
    draw = ImageDraw.Draw(mask)
    draw.ellipse((1,1,2*SIZE-2,2*SIZE-2),fill=255)
    r = SIZE / 8  # 15 mm spindle bore on a 120 mm disc.
    draw.ellipse((SIZE-r,SIZE-r,SIZE+r,SIZE+r),fill=0)
    im.putalpha(mask.resize((SIZE,SIZE),Image.Resampling.LANCZOS))
    return im


def refresh(job):
    iid, season, entry = job
    folder = DIST / "art" / "box-set-discs"
    output = folder / f'{iid}-s{int(season)}-d{entry["number"]}.webp'
    if (DIST / entry["artwork"]).resolve() != output.resolve():
        raise ValueError("Unexpected texture path")
    if output.exists():
        with Image.open(output) as im:
            im.verify()
        return
    url = urlparse(entry["imageSource"])
    if url.scheme != "https" or (url.netloc, url.path.split("/")[1]) not in {
        ("www.covercentury.com","covers"),("archive.org","download")}:
        raise ValueError("Unexpected scan origin")
    req = Request(url.geturl(),headers={"User-Agent": "MyRoom/1.0 (season disc artwork)"})
    with urlopen(req,timeout=40) as response:
        raw = response.read(24*1024*1024 + 1)
    if len(raw) > 24*1024*1024:
        raise ValueError("Oversized source image")
    image = prepare(raw,entry)
    folder.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=folder,suffix=".webp",delete=False) as temp:
        pending = Path(temp.name)
    try:
        image.save(pending,"WEBP",quality=86,method=4)
        pending.chmod(0o644)
        pending.replace(output)
    finally:
        pending.unlink(missing_ok=True)


if __name__ == "__main__":
    catalog = json.loads(MANIFEST.read_text())
    jobs = [(iid,season,disc) for iid,seasons in catalog.items() for season,row in seasons.items() for disc in row["discs"]]
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(refresh,jobs))
    print(f"{len(jobs)} reviewed season and disc labels.")
