# Credits

Every asset in the game is listed here and on the Kredit panel of the landing page. Add a line before adding any file.

## Code libraries
- Three.js 0.187.0, MIT licence, https://threejs.org. Bundled as `vendor/three.min.js` (licence text is at the end of that file).

## Font
- Fredoka, Copyright The Fredoka Project Authors, SIL Open Font License 1.1 (`fonts/OFL.txt`). File `fonts/Fredoka.woff2` is the Latin subset from Google Fonts.

## 3D models from Kenney (www.kenney.nl), Creative Commons Zero (CC0)
- Furniture Kit 2.0: the furniture, the fridge, the TV and the radio.
- Mini Characters 2.0: pak cik (character-male-a) and the rescuer in the boat (character-worker).
- Cube Pets 2.0: Comot the cat (animal-cat).
- Watercraft Kit 2.1: the rescue boat (boat-row-large).
- Only the models used are in the repo, as downloaded, in `tools/kenney/` with each pack's `License.txt`. `npm run bake` turns them into `models.bin`, the file the game loads. Changes made in the bake or in the game: scaled, colours baked into the vertices, limbs split so they can move, a kain pelikat added to pak cik.

## Made for this game, in code (no files)
- The village, the house, the small items and the fallback box models (`models.js`).
- All sound effects, the rain bed and the music loop: synthesized with Web Audio (`audio.js`).
- Result card and link preview image (`share.js`, `og.png`).

## From the player's device
- Emoji on the item stickers and the result card use the system emoji font. `og.png` was rendered with the emoji font of the machine that built it.

## Style references only (no files used)
- Polygonia Low Poly City Pack by antonmoek (Sketchfab).
- Low Poly Isometric Rooms by Brynn (Sketchfab, CC Attribution).

## Sources for wording
See `docs/item-sheet.md`.
