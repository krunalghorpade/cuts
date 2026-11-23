# Media packaging

[Media packaging.blend](<Media packaging.blend>) is the editable Blender 5.3 source for the retail packaging in My Room. Each collection contains a full-detail inspection model and a lightweight shelf model. The Blender file opens with the eleven detail models arranged for inspection. Enable the shelf subcollection in the Outliner to edit its geometry.

The web exports live in `dist/models/packaging/`. Each file contains `Detail_<format>` and `Shelf_<format>`. Both have a centered origin, X width, Y height and Z thickness, and the artwork faces +Z. One unit is one metre. These are representative retail packages. The catalogue supplies each actual item's final dimensions, artwork and printed identification.

| Export | Native W × H × D in mm | Construction |
| --- | --- | --- |
| dvd | 135 × 190 × 14 | Two molded polypropylene halves, a clear cover wrap and fore-edge snap latch |
| bluray | 135 × 171 × 12 | Shorter disc case with a molded header and a separate cover insert |
| game | 135 × 171 × 14 | Platform-colored disc case with a dedicated masthead |
| boxset | 135 × 190 × 25 | Rigid board slipbox, open on the fore edge, with inner disc folios |
| vinyl | 315 × 315 × 3 | Front and rear printed boards joined on three edges, with a paper liner visible at the mouth |
| cd | 142 × 125 × 10.4 | Clear jewel lid, ribbed tray hinge, square booklet and rear tray inlay |
| cassette | 109 × 69.6 × 16.8 | Clear hinged shell, folded J-card, exposed reels, tape window and head bridge |
| carton | 127 × 127 × 25 | Tuck-flap paperboard game box with folded dust flaps |
| clamshell | 145 × 195 × 27 | Deep, molded retro game case with an opening catch and grip ribs |
| handheld | 135 × 122 × 15 | Compact snap case with a full-face wrap |
| book | 145 × 220 × 20 | Printed covers around a recessed text block with signatures at the head and fore edge |

`MAT_FRONT`, `MAT_BACK` and `MAT_SPINE` each map the complete 0–1 UV rectangle to its printed surface. `MAT_BAND` is the platform or Blu-ray masthead where present. `MAT_SHELL` accepts the platform's plastic color. Source materials also distinguish crystal polystyrene, soft overwrap, exposed board, page stock, and molded plastic. Cassette rear artwork uses the wide J-card flap above the visible reels. Both levels of detail include the three print slots. Hardware uses authored geometry and material finishes.
