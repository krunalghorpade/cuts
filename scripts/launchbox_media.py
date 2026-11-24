"""Match and prepare physical-media artwork from the LaunchBox Games Database."""
import io
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageOps, UnidentifiedImageError

MEDIA_TYPES = {"Disc", "Cart - Front", "Cart - Back", "Cart - 3D"}
CARTRIDGE_SYSTEMS = {"Nintendo Game Boy", "Nintendo Game Boy Color", "Nintendo Game Boy Advance",
                     "Nintendo DS", "Nintendo 3DS", "Nintendo Switch", "Nintendo Switch 2",
                     "Nintendo Entertainment System", "Super Nintendo Entertainment System",
                     "Nintendo 64", "Nintendo Famicom", "Sega Genesis", "Sony Playstation Vita"}


def kind_for(platform):
    if platform == "Sony PSP":
        return "umd"
    if platform in CARTRIDGE_SYSTEMS:
        return "cartridge"
    if platform.startswith(("Sony Playstation", "Microsoft Xbox")) or platform in {
            "Windows", "Nintendo GameCube", "Nintendo Wii", "Nintendo Wii U"}:
        return "disc"
    return "unknown"


def same_region(first, second):
    return first == second or {first, second} <= {"United States", "North America"}


def select_media(rows, rule, platform, db_platform, box_region):
    kind = rule.get("mediaKind", kind_for(platform))
    # Platform-neutral covers may use a PC database entry; the media itself may not.
    if kind in ("unknown", "digital") or (platform != db_platform and not rule.get("sharedMediaPlatform")):
        return kind, []
    medium_type = "Cart - Front" if kind == "cartridge" else "Disc"
    files = {r["file"]: r for r in rows}
    selected = []
    if "mediaFiles" in rule:
        for spec in rule["mediaFiles"]:
            row = files.get(spec["file"])
            if not row or row["type"] not in (medium_type, "Cart - 3D" if kind == "cartridge" else medium_type):
                raise ValueError("Reviewed physical-media scan changed: " + spec["file"])
            selected.append((row, spec))
    else:
        # Multiple scans may represent reissues. Disc order requires reviewed labels.
        candidates = [r for r in rows if r["type"] == medium_type and r["region"] and same_region(r["region"], box_region)]
        if len(candidates) == 1:
            selected.append((candidates[0], {}))
    return kind, selected


def add_media(edition, iid, rows, rule, platform, box_region, dist, base_url, jobs):
    kind, selected = select_media(rows, rule, platform, edition.get("launchboxPlatform"), box_region)
    media = []
    for row, spec in selected:
        layout = spec.get("layout", "shell" if kind == "cartridge" else "disc")
        path = dist / "art" / "launchbox" / f'{iid}-media-{Path(row["file"]).stem}.webp'
        jobs.append(("media", {**row, **spec, "layout":layout}, path))
        entry = {"artwork":"./"+path.relative_to(dist).as_posix(), "source":base_url+row["file"],
                 "type":row["type"], "region":row["region"], "layout":layout}
        if spec.get("regionalAlternative"):
            entry["regionalAlternative"] = True
            if "printedRegion" in spec:
                entry["sourceRegion"] = row["region"]
                entry["region"] = spec["printedRegion"]
                entry["printEvidence"] = spec["printEvidence"]
        if spec.get("label"):
            entry["label"] = spec["label"]
        if kind == "cartridge":
            reverse = [r for r in rows if r["type"] == "Cart - Back" and r["region"] == row["region"]]
            if len(reverse) == 1 and (len(selected) == 1 or spec.get("backFile") == reverse[0]["file"]):
                back = reverse[0]
                back_path = dist / "art" / "launchbox" / f'{iid}-media-back-{Path(back["file"]).stem}.webp'
                jobs.append(("media", dict(back, layout="shell"), back_path))
                entry.update(backArtwork="./"+back_path.relative_to(dist).as_posix(), backSource=base_url+back["file"])
        media.append(entry)
    edition["gameMedia"] = {"kind":kind, "media":media}


def open_scan(buf):
    try:
        return Image.open(buf)
    except UnidentifiedImageError:
        # One archived PNG has an invalid CRC on its optional ICC profile.
        # Drop only that ancillary chunk; Pillow still decodes the original pixels.
        data = buf.getvalue()
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise
        pos = 8
        chunks = [data[:pos]]
        while pos + 12 <= len(data):
            stop = pos + 12 + int.from_bytes(data[pos:pos+4], "big")
            if data[pos+4:pos+8] != b"iCCP":
                chunks.append(data[pos:stop])
            pos = stop
        return Image.open(io.BytesIO(b"".join(chunks)))


def prepare_scan(buf, row):
    with open_scan(buf) as src:
        image = ImageOps.exif_transpose(src).convert("RGBA")
    if "labelCorners" in row:
        corners = [(x*image.width,y*image.height) for x,y in row["labelCorners"]]
        return image.transform((320, round(320/row["labelAspect"])), Image.Transform.QUAD,
                               tuple(v for point in corners for v in point), Image.Resampling.BICUBIC)
    image.thumbnail((960, 960), Image.Resampling.LANCZOS)
    if image.getchannel("A").getextrema()[0] == 255:
        for corner in [(0,0), (image.width-1,0), (0,image.height-1), (image.width-1,image.height-1)]:
            if image.getpixel(corner)[3]:
                ImageDraw.floodfill(image, corner, (0,0,0,0), thresh=26)
    bounds = image.getchannel("A").point(lambda value: 255 if value > 30 else 0).getbbox()
    if not bounds:
        raise ValueError("Empty physical-media scan: " + row["file"])
    image = image.crop(bounds)
    image.thumbnail((720,720), Image.Resampling.LANCZOS)
    if row["layout"] == "disc":
        size = max(image.size)
        image = ImageOps.pad(image, (size,size), color=(0,0,0,0))
        mask = Image.new("L", (size*2,size*2))
        g = ImageDraw.Draw(mask)
        g.ellipse((0,0,mask.width-1,mask.height-1),fill=255)
        hole = mask.width/16  # 15 mm bore / 120 mm disc diameter.
        center = (mask.width-1)/2
        g.ellipse((center-hole,center-hole,center+hole,center+hole),fill=0)
        image.putalpha(ImageChops.multiply(image.getchannel("A"),mask.resize(image.size,Image.Resampling.LANCZOS)))
    return image
