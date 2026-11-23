"""Refresh local, edition-matched game artwork from the public LaunchBox database."""
import argparse
import io
import json
import re
import tempfile
import time
import unicodedata
import zipfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from xml.etree.ElementTree import iterparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EDITIONS = DIST / "game-editions.json"
RULES = ROOT / "scripts/launchbox-editions.json"
METADATA = "https://gamesdb.launchbox-app.com/Metadata.zip"
IMAGES = "https://images.launchbox-app.com/"
REGIONS = ("North America", "United States", "World", "Europe", "United Kingdom", "Japan", "")
FRONTS = ("Box - Front", "Box - Front - Reconstructed")
ART_FIELDS = {"artwork", "artworkSource", "launchboxId", "launchboxUrl", "launchboxPlatform",
              "launchboxArt", "boxBack", "boxSpine", "artworkNote"}


def name_key(name):
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\(\d{4}\)", "", text)
    numerals = {"ii":"2", "iii":"3", "iv":"4", "v":"5", "vi":"6", "vii":"7"}
    text = re.sub(r"\b(?:ii|iii|iv|v|vi|vii)\b", lambda match: numerals[match[0]], text)
    return re.sub("[^a-z0-9]", "", text)


def source_platform(label):
    if label.startswith("PlayStation"):
        return "Sony PSP" if label == "PlayStation Portable" else "Sony " + label.replace("Station", "station")
    if label.startswith("Xbox"):
        return "Microsoft Xbox Series X/S" if label in ("Xbox Series X", "Xbox Series S") else "Microsoft " + label
    if label.startswith("Game Boy"):
        return "Nintendo " + label
    return label


def records(archive, tags):
    # Clearing completed root children bounds memory on the 500+ MB XML document.
    with archive.open("Metadata.xml") as stream:
        events = iterparse(stream, events=("start", "end"))
        root = next(events)[1]
        depth = 1
        for event, node in events:
            if event == "start":
                depth += 1
                continue
            if depth == 2:
                if node.tag in tags:
                    yield node.tag, {child.tag:child.text or "" for child in node}
                root.clear()
            depth -= 1


def match_games(archive, games, editions, rules):
    targets = {name_key(item["title"]) for item in games}
    names = defaultdict(set)
    records_by_id = {}
    for tag, data in records(archive, {"Game", "GameAlternateName"}):
        dbid = int(data["DatabaseID"])
        if tag == "Game":
            title = data["Name"]
            records_by_id[dbid] = (data["Platform"], (data.get("ReleaseDate") or data.get("ReleaseYear") or "")[:4])
        else:
            title = data["AlternateName"]
        key = name_key(title)
        if key in targets:
            names[key].add(dbid)
    matches = {}
    for game in games:
        iid = game["id"]
        rule = rules.get(iid, {})
        platform = source_platform(game.get("platform") or editions.get(iid, {}).get("platform") or rule.get("platform", ""))
        expected = rule.get("sourcePlatform", platform)
        if "databaseId" in rule:
            dbid = rule["databaseId"]
            if dbid not in records_by_id or records_by_id[dbid][0] != expected:
                raise ValueError("Reviewed LaunchBox edition has changed: " + iid)
        else:
            candidates = names[name_key(game["title"])]
            if expected:
                candidates = {g for g in candidates if records_by_id[g][0] == expected}
            if len(candidates) > 1:
                candidates = {g for g in candidates if records_by_id[g][1] == str(game.get("year"))}
            if len(candidates) != 1:
                continue
            dbid = next(iter(candidates))
            release = records_by_id[dbid][1]
            year = str(game.get("year", ""))
            # A same-name remake on a newer console needs an explicit review.
            if release.isdigit() and year.isdigit() and abs(int(release) - int(year)) > 4:
                continue
        matches[iid] = (dbid, records_by_id[dbid][0])
    return matches


def image_index(archive, matches):
    wanted = {game_id for game_id, _ in matches.values()}
    images = defaultdict(list)
    for _, record in records(archive, {"GameImage"}):
        dbid = int(record["DatabaseID"])
        if dbid in wanted and record.get("Type") in {*FRONTS, "Box - Back", "Box - Spine", "Banner"}:
            filename = record["FileName"]
            if not re.fullmatch(r"[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)", filename, flags=re.I):
                raise ValueError("Unexpected LaunchBox image filename: " + filename)
            images[dbid].append({"file":filename, "type":record["Type"], "region":record.get("Region", "")})
    return images


def choose_faces(images, rule):
    def region_order(row):
        region = row["region"]
        return (REGIONS.index(region) if region in REGIONS else len(REGIONS), region)
    fronts = [row for row in images if row["type"] in FRONTS]
    if rule.get("frontFile"):
        front = next((row for row in images if row["file"] == rule["frontFile"]), None)
        if front is None:
            raise ValueError("Reviewed cover missing from LaunchBox: " + rule["frontFile"])
    elif fronts:
        front = min(fronts, key=lambda row: (FRONTS.index(row["type"]), region_order(row)))
    else:
        return {}
    chosen = {"front":front}
    if not rule.get("frontOnly"):
        for face, kind in (("back","Box - Back"), ("spine","Box - Spine")):
            matching = [row for row in images if row["type"] == kind and row["region"] == front["region"]]
            if matching:
                pinned = rule.get(face + "File")
                chosen[face] = next((row for row in matching if row["file"] == pinned), matching[0])
    return chosen


def fetch(url, output, limit):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent":"MyRoomGameArt/1.0"})
            with urlopen(request, timeout=50) as response:
                length = 0
                while True:
                    chunk = response.read(262144)
                    if not chunk:
                        return
                    length += len(chunk)
                    if length > limit:
                        raise ValueError("Unexpected response size: " + url)
                    output.write(chunk)
        except (HTTPError, URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                raise
            output.seek(0)
            output.truncate()
            time.sleep(attempt + 1)


def save_face(job):
    face, row, path = job
    if path.is_file():
        with Image.open(path) as saved:
            saved.verify()
        return
    buf = io.BytesIO()
    fetch(IMAGES + row["file"], buf, 80 * 1024 * 1024)
    buf.seek(0)
    with Image.open(buf) as src:
        image = ImageOps.exif_transpose(src).convert("RGB")
    if face == "spine" and image.width > image.height:
        image = image.transpose(Image.Transpose.ROTATE_270)
    image.thumbnail((220, 840) if face == "spine" else (690, 840), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".webp", delete=False) as temp:
        staged = Path(temp.name)
        try:
            image.save(temp, "WEBP", quality=84, method=5)
            temp.flush()
            staged.replace(path)
        finally:
            staged.unlink(missing_ok=True)


def refresh(metadata):
    games = [x for x in json.loads((DIST / "imdb-items.json").read_text())
             if x["category"] in ("cartridges", "game-discs")]
    before = EDITIONS.read_bytes() if EDITIONS.exists() else b"{}"
    editions = json.loads(before)
    rules = json.loads(RULES.read_text())
    with zipfile.ZipFile(metadata) as archive:
        matches = match_games(archive, games, editions, rules)
        images = image_index(archive, matches)
    jobs = []
    missing = []
    for item in games:
        iid = item["id"]
        if not re.fullmatch(r"tt\d+", iid):
            raise ValueError("Invalid IMDb ID: " + iid)
        old = editions.get(iid, {})
        entry = {k:v for k,v in old.items() if k not in ART_FIELDS}
        match = matches.get(iid)
        rule = rules.get(iid, {})
        faces = choose_faces(images[match[0]], rule) if match else {}
        if faces:
            dbid, platform = match
            entry.update(launchboxId=dbid, launchboxUrl=f"https://gamesdb.launchbox-app.com/games/dbid/{dbid}",
                         launchboxPlatform=platform, launchboxArt={})
            for face, row in faces.items():
                fingerprint = Path(row["file"]).stem
                path = DIST / "art" / "launchbox" / f"{iid}-{face}-{fingerprint}.webp"
                jobs.append((face, row, path))
                source = IMAGES + row["file"]
                entry["launchboxArt"][face] = {k:row[k] for k in ("type", "region")}
                entry["launchboxArt"][face]["source"] = source
                entry[{"front":"artwork", "back":"boxBack", "spine":"boxSpine"}[face]] = "./" + path.relative_to(DIST).as_posix()
                if face == "front":
                    entry["artworkSource"] = source
            if rule.get("artworkNote"):
                entry["artworkNote"] = rule["artworkNote"]
        else:
            missing.append(item["title"])
        editions[iid] = entry
    with ThreadPoolExecutor(max_workers=7) as pool:
        list(pool.map(save_face, jobs))
    if EDITIONS.exists() and before != EDITIONS.read_bytes():
        raise RuntimeError("Edition manifest changed during import; rerun to preserve the other edits.")
    with tempfile.NamedTemporaryFile(dir=EDITIONS.parent, suffix=".json", delete=False) as temp:
        temp.write((json.dumps(editions, ensure_ascii=False, indent=2) + "\n").encode())
    Path(temp.name).replace(EDITIONS)
    print(f"Matched {len(games)-len(missing)}/{len(games)} games. {len(jobs)} verified box images.")
    if missing:
        print("No verified LaunchBox art; retaining original catalog front:", ", ".join(missing))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata", type=Path, help="Use an existing official Metadata.zip snapshot.")
    args = parser.parse_args()
    if args.metadata:
        refresh(args.metadata)
    else:
        with tempfile.TemporaryFile() as temp:
            fetch(METADATA, temp, 300 * 1024 * 1024)
            temp.seek(0)
            refresh(temp)


if __name__ == "__main__":
    main()
