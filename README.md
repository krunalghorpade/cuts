# The Lower Level

A two-floor, first-person media store for desktop, tablet and phone. The interface uses Helvetica Neue, with Helvetica and Arial fallbacks.

## Explore

- Use WASD to walk, drag or use the arrow keys to look, and hold Shift to run. Click a case to select it and press E to inspect it. B opens the collection, M opens the floor map and Esc pauses the walkthrough. L or a double click enables mouse look.
- On a touch screen, move with the stick, drag to look, tap a case to select it, then tap View item.
- The item carousel opens on the selected case. Use the left and right buttons or arrow keys to browse its media section in shelf order. Drag the centered 3D case to rotate it. With the preview focused, Shift + left/right rotates horizontally and up/down rotates vertically. Reset view restores the opening angle.
- The floor map takes you to a room on either floor. The switchback stairs connect the two levels on foot.

## Catalog

The film, series and anime inventory comes from the supplied Trakt list. An empty snapshot leaves those shelves empty. A series goes on one shelf. Anime has its own section on Level 2. Box sets use a packaging estimate of four episodes per disc and four discs per inner case. Multi-volume sets expand in depth and width. When an episode count is unavailable, the item uses a standard box without an inferred count.

The music catalog combines the previously imported Kratex Favs selection with the other supplied Spotify playlists. Each album retains its source playlists. Spotify's album release year selects vinyl before 1985, cassette and CD from 1985 through 1995 inclusive, and CD after 1995. Source links are available from the collection. TheAudioDB enriches album details where available. The game inventory comes from the owner’s RAWG collection, My Games. Each distinct RAWG entry has a single location. The Nintendo DS and Switch card models represent selected cartridge releases. Other titles use archive case mockups. The listed platforms describe support, not ownership of a particular edition.

## Update data

- Run `python3 scripts/import_rawg.py` to refresh all collection pages from RAWG, download the artwork and rebuild the shelf textures. Per-item links in the store lead back to RAWG.

- Run `python3 scripts/import_trakt.py path/to/list.json` with a Trakt movie/show list export. CSV rows with type and title are also accepted. Include genres, origin and episode counts for classification and sizing. With a configured `TRAKT_CLIENT_ID`, the importer can read the public list directly and hydrate minimal entries. The client ID is read only by the import script.
- `scripts/import_spotify.py` merges normalized Spotify album results into the snapshot. It reads Spotify album release dates, saves local cover thumbnails and retains each album's playlist memberships.
- Run `python3 scripts/build_shelf_atlas.py` after updating the catalog. The walkthrough batches static shelf geometry and uses small artwork tiles. The item carousel loads the larger covers as needed.

## Preview

Run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. The site deploys directly from `dist/`. Three.js is bundled locally.
