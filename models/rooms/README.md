# My Room · three-floor Blender model

The architectural shell follows revision 02 of A-101, A-102 and A-103. The north gallery wall follows A-301. The editable master and proof images are in the project workspace under `models/MY-ROOM-3F.blend` and `renders/`. The source scenes in this directory contain the room collections used by the website.

| Editable scene | Spaces and fixtures |
| --- | --- |
| architectural-shell.blend | Three stepped floor plates, partition walls and openings, pressed-glass bands, walnut soffits, stair flights and landings |
| level-01-interiors.blend | TV lounge, clothing shop, bedroom, washroom and kitchen |
| level-02-interiors.blend | Music and reading lounge, modern and retro gaming rooms and collectible displays |
| gallery-and-circulation.blend | Entrance and stair garden, Level 2 landing, gallery foyer, gallery, lower roofs and Kratex’s private room |
| box-set-casework.blend | Adjustable cabinet with separate decks and plinth, used for the two TV-room collections |
| gallery-frame.blend | Rebated frame moulding cut to the proportions of each gallery image |

The cinema’s [native models](../cinema/README.md) and the [retail packaging library](../packaging/README.md) are separate source assets. In the web scene each new room file uses a local floor datum; the level root supplies its building elevation. Web X points east, Z points south, and one unit is one metre. The native master uses Blender Z up and Y north.

## Plan and fit-out assumptions

| Element | Model dimension or decision |
| --- | --- |
| Level datums | 0.00, +4.20 and +8.40 m. Gallery ceiling underside +14.80 m. |
| Walls and thresholds | Nominal 180 mm shell at the plan centrelines, 2.65 m framed door openings and 2.78 m open passages. The four-metre music-to-reading opening runs to the ceiling. |
| Stairs and lift | Two flights per storey, twelve 175 mm rises per flight, using the original 3.84 m run and shaft. Furniture and trim clear the moving doors and player route. |
| Glazing and finishes | 360 mm sill and head bands, approximately 240 mm pressed-glass modules, staggered walnut ceiling boards and honed slate. These are provisional fit-out dimensions. |
| Series storage | Series and anime box sets occupy independent south-wall cabinets on either side of the TV room window. Both adapt to the collection’s physical case depth. |
| Art display | 10 north-wall, 13 perimeter and 6 suspended positions. Frames, backing and hangers resize to each selected picture’s aspect ratio. |
| Playback and interaction | The website controls the mobile lift, doors, collection selection, poster changes, audio, screens, arcade games and gallery changes. The static native file shows a furnished installation. |

The gallery uses a local image snapshot from [Kratex’s My art room Pinterest board](https://www.pinterest.com/kratexmusic/my-art-room/). The web manifest records the available image dimensions and source links. Each occupied frame gets a random 60–120 second interval and changes singly, with a fade through the empty frame.
