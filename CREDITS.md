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

## Sounds, all Creative Commons Zero (CC0), in `sounds/`
From OpenGameArt.org:
- `rain.mp3`: "Rain (loopable)" by Ylmir, file `1.mp3` from `Rain MP3.zip`, cut to 9 seconds. opengameart.org/content/rain-loopable
- `water.ogg`, `thunder.ogg`, `step1.ogg` to `step3.ogg`, `wade1.ogg`, `wade2.ogg`: "100 CC0 SFX #2" by rubberduck (`loop_water_01`, `thunder_01`, `footstep_wood_01`, `_03`, `_04`, `footstep_wet_02`, `_03`), unchanged. opengameart.org/content/100-cc0-sfx-2
- `meow.ogg`: "Meow" by IgnasD, unchanged. opengameart.org/content/meow
- `splash.ogg`: "Water Splash and Sand Footsteps" by Peludo, file `splash1_0.wav`, silence cut off, re-encoded to ogg. opengameart.org/content/water-splash-and-sand-footsteps
- `crickets.mp3`: "Crickets ambient noise (loopable)" by Wolfgang_, file `crickets_1.mp3`, cut to 6 seconds. opengameart.org/content/crickets-ambient-noise-loopable
- `frog.ogg`: "Bird, cricket, frog and mosquito sounds" by AJ_, re-encoded to ogg. opengameart.org/content/birdcricketfrog-and-mosquito-sounds

From Kenney (www.kenney.nl):
- Interface Sounds 1.0: `click.ogg` (click_001), `pick.ogg` (drop_004), `put.ogg` (drop_002), `bank.ogg` (confirmation_002), `good.ogg` (confirmation_004), `no.ogg` (error_003), `ding.ogg` (glass_001), unchanged.
- Music Jingles: `win.ogg` (jingles_PIZZI02), unchanged.

## Made for this game, in code (no files)
- The village, the house, the small items and the fallback box models (`models.js`).
- The music loop, the alert beeps, the boat motor and horn, the whoosh and the sweep, plus a stand-in for every recorded sound in case its file does not load: synthesized with Web Audio (`audio.js`).
- Result card and link preview image (`share.js`, `og.png`).

## From the player's device
- Emoji on the item stickers and the result card use the system emoji font. `og.png` was rendered with the emoji font of the machine that built it.

## Style references only (no files used)
- Polygonia Low Poly City Pack by antonmoek (Sketchfab).
- Low Poly Isometric Rooms by Brynn (Sketchfab, CC Attribution).

## Sources for wording
See `docs/item-sheet.md`.
