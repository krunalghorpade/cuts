# My Room - by Krunal Ghorpade aka Kratex

A two-floor, first-person media store for desktop, tablet and phone. The interface uses Helvetica Neue, with Helvetica and Arial fallbacks.

## Explore

- Use WASD to walk, drag or use the arrow keys to look, and hold Shift to run. Click a case to select it and press E to inspect it. B opens the collection, M opens the floor map and Esc pauses the walkthrough. L or a double click enables mouse look.
- On a touch screen, move with the stick, drag to look, tap a case to select it, then tap View item.
- The item carousel opens on the selected case. Use the left and right buttons or arrow keys to browse its media section in shelf order. Drag the centered 3D case to rotate it. With the preview focused, Shift + left/right rotates horizontally and up/down rotates vertically. Reset view restores the opening angle.
- The floor map takes you to a room on either floor. The Book Library entrance stays open. The other doors swing open as you approach from either side and close after you walk away. The switchback stairs connect the two levels on foot.

The digital wall posters change once a minute. The modern TVs stream muted theatrical trailers matched to catalog titles. The CRT plays trailers for games released before 2017 on verified legacy cartridge platforms and shows standby when none qualify. Playback pauses outside the TV room or while browsing a menu.

## Catalog

The film, series and anime inventory comes from the supplied IMDb CSV. Each IMDb title ID appears once. A series goes on one shelf. Anime has its own section on Level 2. Box sets use a packaging estimate of four episodes per disc and four discs per inner case. Every set has a 135 × 190 mm cover. Additional discs and cases increase depth. Sets at least half as deep as their cover width stand upright in their own shelf slot. When an episode count is unavailable, the item uses a standard box without an inferred count.

The music catalog combines the previously imported Kratex Favs selection with the other supplied Spotify playlists. Each album retains its source playlists. Each album gets one case per eligible format, using Spotify's album release year. Vinyl covers releases through 1989 and from 2021 onward. Cassettes cover 1980 through 2000 inclusive, and CDs cover 1985 onward. Source links are available from the collection. TheAudioDB enriches album details where available. Games also come from the IMDb CSV. Titles without a listed physical platform use a neutral game archive case. The book shelves use the owner’s Open Library list, with one physical copy per work and a link to the listed edition. Book dimensions use the edition’s measurements where available and estimates otherwise.

## Update data

- Run `python3 scripts/import_trailers.py` after updating IMDb titles to refresh verified Internet Archive trailer streams. An optional HTTPS `Trailer URL` column can supply a directly playable trailer for a specific IMDb ID.
- Run `python3 scripts/import_books.py` to refresh the Open Library list, edition details, and book covers.

- Run `python3 scripts/import_imdb.py path/to/watchlist.csv` with the IMDb title-list export. Series episode counts use matched TVmaze IDs or credited series metadata. The importer reuses local posters for existing IMDb IDs.
- `scripts/import_spotify.py` merges normalized Spotify album results into the snapshot. It reads Spotify album release dates, saves local cover thumbnails and retains each album's playlist memberships.
- Run `python3 scripts/build_shelf_atlas.py` after updating the catalog. The walkthrough batches static shelf geometry and uses small artwork tiles. The item carousel loads the larger covers as needed.

## Preview

Run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. The site deploys directly from `dist/`. Three.js is bundled locally.
