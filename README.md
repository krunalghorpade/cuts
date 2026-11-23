# The Lower Level

A first-person 3D basement media store for desktop, tablet, and phone. The walkable room follows the supplied video-store reference with long, dense face-out racks, pale shelving, gray flooring, and fluorescent ceiling lights.

## Explore

- Desktop: WASD to move, drag to look, Shift to run, E or click to inspect, B to browse, Esc to pause. Double-click the scene or press L for optional pointer lock. Arrow keys also look around.
- Phone and tablet: left joystick to move, drag the right side to look, and tap Inspect to examine a focused item.
- Browse offers search and format filters without walking to a rack.

## Collection

The current catalog has 217 entries:

- 96 imported from the supplied IMDb watchlist CSV: 81 films and 15 TV series or miniseries.
- 109 physical music entries from 108 verified albums represented in the supplied Spotify playlist. This is a selected snapshot of the playlist, not a live or complete sync. The full playlist link is available in Browse. TheAudioDB free v1 API enriches album details and cover art when an album is opened and a match is found.
- 12 sample game discs and cartridges until a game list is supplied.

Music format rules use the album's published release year: before 1985 goes to vinyl; 1985–1995 goes to both cassette and CD; after 1995 goes to CD. An album that appears in the 1985–1995 interval has two physical entries. Spotify album page metadata supplied the release years for the selected snapshot; TheAudioDB is used for live item detail enrichment. Album editions and compilations can have later dates than the original recording.

## Preview locally

```sh
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173/`. The site is buildless; `dist/` is deployed directly. Three.js is bundled in `dist/vendor/`.

## Source files

- `dist/catalog.js`: combined in-browser catalog and category definitions.
- `dist/imdb-items.json`: selected fields converted from the supplied IMDb CSV.
- `dist/spotify-items.json`: selected Spotify playlist albums and verified release dates.
- `dist/app.js`: 3D scene, controls, search, inspection, and TheAudioDB detail lookups.

The IMDb CSV and Spotify playlist are currently imported snapshots. A later live sync needs a supported provider API or authenticated server integration. The client uses only the public TheAudioDB v1 key for optional album details. Do not place private API credentials in browser code.
