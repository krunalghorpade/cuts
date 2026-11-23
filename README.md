# My Room - by Krunal Ghorpade aka Kratex

A three-floor, first-person media store for desktop, tablet and phone. The interface uses Helvetica Neue, with Helvetica and Arial fallbacks.

## Explore

- Use WASD to walk, drag or use the arrow keys to look, and hold Shift to run. Click a case to select it and press E to inspect it. B opens the collection, M opens the floor map and Esc pauses the walkthrough. L or a double click enables mouse look.
- On a touch screen, move with the stick, drag to look, tap a case to select it, then tap View item.
- The item carousel opens on the selected case. Use the left and right buttons or arrow keys to browse its media section in shelf order. Drag the centered 3D case to rotate it. With the preview focused, Shift + left/right rotates horizontally and up/down rotates vertically. Reset view restores the opening angle.
- The floor map visits rooms on all three levels. Doors open as you approach. Both switchback flights and the elevator connect the floors. The lift arrives when approached. Step inside and press E or choose a destination on screen.

The entrance lobby on Level 1 opens straight into the TV lounge and has a separate door to a private projector theatre with movie and anime-film racks, and a TV room with separate regular and anime series shelves. Level 2 has a combined music and book library with a listening lounge, a retro gaming room with two playable arcade cabinets, and a modern gaming desk with PlayStation, Xbox and Nintendo consoles. Other game editions without a verified console disc are filed in the collectibles annex. Level 3 has a gallery with wall-mounted and suspended art, and a separately accessed private bedroom and writing desk.

Each screen draws randomly from titles on its own shelves with matched trailers. A per-room history in the visitor’s browser keeps played titles out of the current cycle. The player tries alternate sources when a stream or embed fails. The 4:3 CRT uses legacy cartridge titles. Digital posters change once a minute. Click or tap a poster or a playing screen and select View details to inspect its item. Trailer sound follows your distance from the screen. Use Mute TVs or V to silence it.

The music room starts on vinyl. Select a physical deck or its on-screen control to switch formats or turn it off. One audio player shuffles Spotify previews from albums stocked in the selected format. Leaving the room or opening a menu pauses playback. The active track links to Spotify. A spinning LP and its sleeve, an open cassette case beside the boombox, or an open jewel case beside the mini hi-fi displays the active release.

## Catalog

The film, series and anime inventory comes from the supplied IMDb CSV. Each IMDb title ID appears once. A series goes on one shelf. Anime movies and anime series have separate shelves in their respective screening rooms. Box sets use a packaging estimate of four episodes per disc and four discs per inner case. Every set has a 135 × 190 mm cover. Additional discs and cases increase depth. Sets at least half as deep as their cover width stand upright in their own shelf slot. When an episode count is unavailable, the item uses a standard box without an inferred count.

The music catalog combines the previously imported Kratex Favs selection with the other supplied Spotify playlists. Each album retains its source playlists. Each album gets one case per eligible format, using Spotify's album release year. Vinyl covers releases through 1989. Cassettes cover 1980 through 2000 inclusive, and CDs cover 1985 onward. Source links are available from the collection. TheAudioDB enriches album details where available. Games also come from the IMDb CSV. Titles without a listed physical platform use a neutral game archive case. The book shelves use the owner’s Open Library list, with one physical copy per work and a link to the listed edition. Book dimensions use the edition’s measurements where available and estimates otherwise.

## Update data

- Run `python3 scripts/import_trailers.py` after updating IMDb titles to refresh title-matched trailer sources from Internet Archive, IMDb-keyed film metadata, and IGDB game records. An optional HTTPS `Trailer URL` column can supply a directly playable trailer for a specific IMDb ID.
- Run `python3 scripts/import_launchbox.py` to refresh platform-matched game box art from the LaunchBox Games Database. Use `--metadata /path/to/Metadata.zip` to read a previously downloaded LaunchBox snapshot. The importer keeps each IMDb game ID and records the LaunchBox edition and image sources. The shelves and inspection view show the front, back and spine scans available for that edition.
- Run `python3 scripts/import_music_previews.py` to update Spotify preview availability.
- Run `python3 scripts/import_books.py` to refresh the Open Library list, edition details, and book covers.

- Run `python3 scripts/import_imdb.py path/to/watchlist.csv` with the IMDb title-list export. Series episode counts use matched TVmaze IDs or credited series metadata. The importer reuses local posters for existing IMDb IDs.
- `scripts/import_spotify.py` merges normalized Spotify album results into the snapshot. It reads Spotify album release dates, saves local cover thumbnails and retains each album's playlist memberships.
- Run `python3 scripts/build_shelf_atlas.py` after updating the catalog. The walkthrough batches static shelf geometry and uses small artwork tiles. The item carousel loads the larger covers as needed.

## Preview

Run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/`. The site deploys directly from `dist/`. Three.js is bundled locally.
