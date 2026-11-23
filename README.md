# The Lower Level

A first-person 3D basement media store for desktop, tablet, and phone. The walkable room follows the supplied video-store reference with long, dense face-out racks, gray flooring, and fluorescent ceiling lights. The rack fixtures and format shapes were developed with a private Spline scene (`The Lower Level — Physical Media Fixtures`, file `113bdccc-56e5-4f05-9f32-3085e7356a6a`).

## Explore

- Desktop: WASD to move, drag to look, Shift to run, E or click a visible case to flip through its stack, B to browse, Esc to pause. Double-click the scene or press L for optional pointer lock. Arrow keys also look around.
- Phone and tablet: left joystick to move, drag the right side to look, and tap a visible case or Inspect to flip through its stack.
- In a stack: arrow buttons, left/right keys, scroll, or swipe to flip cases. Drag to tilt the 3D stack; open details for the selected item.
- Browse offers search and format filters without walking to a rack. Item details include a **Go to this shelf** button.

## Collection

The current catalog has 217 entries:

- 96 imported from the supplied IMDb watchlist CSV: 81 films and 15 TV series or miniseries.
- 109 physical music entries from 108 verified albums represented in the supplied Spotify playlist. This is a selected snapshot of the playlist, not a live or complete sync. The full playlist link is available in Browse. Spotify album art is bundled for the selected snapshot. TheAudioDB free v1 API enriches album details and cover art when an album is opened and a match is found.
- 12 sample game discs and cartridges until a game list is supplied.

Music format rules use the album's published release year: before 1985 goes to vinyl; 1985–1995 goes to both cassette and CD; after 1995 goes to CD. An album that appears in the 1985–1995 interval has two physical entries. Spotify album page metadata supplied the release years for the selected snapshot; TheAudioDB is used for live item detail enrichment. Album editions and compilations can have later dates than the original recording.

Movie and series cases use imported IMDb artwork. Films from 2006 onward use blue Blu-ray style cases; older films use DVD cases. Vinyl sleeves are square, CDs use jewel cases, cassettes use horizontal tape cases, and games use cartridge or blue disc cases. Each rack holds staggered physical stacks with a 3D flip-through view. A small amount of explicitly labeled display stock fills the sparse vinyl, cassette, and game racks without adding those titles to the 217-item collection.

## Preview locally

```sh
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173/`. The site is buildless; `dist/` is deployed directly. Three.js is bundled in `dist/vendor/`.

## Source files

- `dist/catalog.js`: combined in-browser catalog and category definitions.
- `dist/imdb-items.json`: selected fields converted from the supplied IMDb CSV.
- `dist/spotify-items.json`: selected Spotify playlist albums and verified release dates.
- `dist/app.js`: 3D scene, controls, physical racks, stack viewer, search, inspection, and TheAudioDB detail lookups.
- `dist/media.js`: artwork textures and format-specific 3D case models.
- `dist/art/`: local IMDb poster and Spotify album thumbnails.

The IMDb CSV and Spotify playlist are currently imported snapshots. A later live sync needs a supported provider API or authenticated server integration. The client uses only the public TheAudioDB v1 key for optional album details. Do not place private API credentials in browser code.
