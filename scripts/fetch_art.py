"""Download small, local cover thumbnails for the private media store."""
import concurrent.futures
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; LowerLevel/1.0)'}


def get(url, limit=4_000_000):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=18) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Image too large')
    return data


def save_image(url, path, square=False):
    host = urllib.parse.urlparse(url).hostname
    if host not in {'m.media-amazon.com', 'i.scdn.co'}:
        raise ValueError('Unexpected image host')
    image = Image.open(io.BytesIO(get(url, 12_000_000))).convert('RGB')
    size = (256, 256) if square else (252, 360)
    image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', quality=79, method=5)


def imdb_art(item):
    path = DIST / 'art' / 'imdb' / f"{item['id']}.webp"
    if path.exists():
        return item['id'], f"./art/imdb/{item['id']}.webp", None
    title = item['title'].strip()
    query = urllib.parse.quote(title.lower())
    initial = urllib.parse.quote(title[0].lower())
    url = f'https://v2.sg.media-imdb.com/suggestion/{initial}/{query}.json'
    try:
        data = json.loads(get(url, 1_000_000))
        match = next((entry for entry in data.get('d', []) if entry.get('id') == item['id']), None)
        image_url = match.get('i', {}).get('imageUrl') if match else None
        if not image_url:
            exact = json.loads(get(f"https://v2.sg.media-imdb.com/suggestion/t/{item['id']}.json", 1_000_000))
            exact_match = next((entry for entry in exact.get('d', []) if entry.get('id') == item['id']), None)
            image_url = exact_match.get('i', {}).get('imageUrl') if exact_match else None
        if not image_url:
            return item['id'], None, 'no poster result'
        save_image(image_url, path)
        return item['id'], f"./art/imdb/{item['id']}.webp", None
    except Exception as exc:
        return item['id'], None, str(exc)[:100]


def spotify_art(item):
    album_id = item['albumUri'].split(':')[-1]
    path = DIST / 'art' / 'spotify' / f'{album_id}.webp'
    if path.exists():
        return album_id, f'./art/spotify/{album_id}.webp', None
    try:
        save_image(item['artworkRemote'], path, square=True)
        return album_id, f'./art/spotify/{album_id}.webp', None
    except Exception as exc:
        return album_id, None, str(exc)[:100]


def run():
    imdb = json.loads((DIST / 'imdb-items.json').read_text())
    spotify = json.loads((DIST / 'spotify-items.json').read_text())
    unique_albums = {item['albumUri']: item for item in spotify}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        im_results = dict((key, (path, error)) for key, path, error in pool.map(imdb_art, imdb))
        sp_results = dict((key, (path, error)) for key, path, error in pool.map(spotify_art, unique_albums.values()))
    for item in imdb:
        item['artwork'] = im_results[item['id']][0]
    for item in spotify:
        item['artwork'] = sp_results[item['albumUri'].split(':')[-1]][0]
        item.pop('artworkRemote', None)
    (DIST / 'imdb-items.json').write_text(json.dumps(imdb, ensure_ascii=False, separators=(',', ':')) + '\n')
    (DIST / 'spotify-items.json').write_text(json.dumps(spotify, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({
        'imdb': {'downloaded': sum(bool(path) for path, _ in im_results.values()), 'total': len(imdb), 'failures': {k: err for k, (path, err) in im_results.items() if not path}},
        'spotify': {'downloaded': sum(bool(path) for path, _ in sp_results.values()), 'total': len(unique_albums), 'failures': {k: err for k, (path, err) in sp_results.items() if not path}},
    }))


if __name__ == '__main__':
    run()
