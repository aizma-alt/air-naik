# Air Naik! Design Doc

Source of truth for the game. Companions: item-sheet.md (items), driver.md (build stages).

## Intent
A 60 to 90s mobile web game: save a kampung family's belongings as the flood rises. Fun, shareable, warm. Understood in 5 seconds without reading, with one hint at most. Chaotic but fair: you cannot save everything, and choices (light vs heavy, cat vs documents) matter. Records cleanly in a 15s clip.

## Not in scope
No accounts, backend, analytics, ads, purchases, multiple levels, leaderboards, daily seeds, English UI, donation link, agency or charity names. No deaths, injury or drowning shown.
In scope since the Stage 5 review: audio (sound effects and one music loop) and free asset files (models, font, music) whose licence allows a public repo. Every asset is credited in CREDITS.md and on a credits line in the game.

## Failure even if it works
Reads as mocking flood victims; reads as official agency content or a charity endorsement; over ~3s to first tap on 4G; item fiddling that makes testers quit before the first result.

## Tech
Three.js 0.187.0, self hosted and tree-shaken (vendor/three.min.js). Isometric dollhouse. GitHub Pages. Portrait mobile first, centered phone column on desktop. Few small files, sim separate from render. Low-poly models, font and music are free assets loaded after the first paint, so the 3s line still counts to Mula enabled. Fallback if the gate fails: canvas 2D isometric, same sim.js, only render.js changes.

## Rules
- House: 2 storey on stilts. Ground floor Serambi, Dapur, Ruang Tamu; upper floor Bilik (stairs in Ruang Tamu); roof deck (Para) via a hatch from Bilik. The run ends by boat from the roof.
- Tap item = walk and grab; tap spot = drop. Two hands. Speed depends on the hands in use (TUNE.carry: none 1, one 0.86, two 0.72), not on item weight; weight 3 takes both hands; stairs and ladder x0.7 (TUNE.climb). Waypoint graph pathing.
- Score = nilai of items in hands, the boat and the roof deck at departure; the rest is swept away. Higher is safer (the PSA lesson).
- HUD uses only Normal, Waspada, Amaran, Bahaya. No numeric timer: the rising water is the clock, shown as a vertical gauge against the four alert bands.
- Chaos events: runaway cat (walks the stairs and ladder ahead of the water if nobody carries it, never swept away), floating items, chat-app style message pings (no logo or app name).
- Footer: "Projek kreatif, bukan produk rasmi."
- Pass: first tap under 3s throttled 4G; p5 FPS 30+ on the test phone (Redmi Note 15 Pro 5G); 4 of 5 outside testers finish unaided; wording matches sources; link preview renders.
- Left to builder: tuning values, camera angle, palette, character, card layout, BM microcopy.

## Items and spawning
13 items per the item sheet. Seeded PRNG in sim.js (?seed=N reproduces a run). Each room has fixed anchor slots; draw 9 to 10 items with guarantees: Dokumen Penting always, at least 1 weight 3 decoy, at least 1 valuable item in each of the first two flooding rooms, Kucing at a random slot, every item reachable. Stage 2 bot balance runs across 50+ seeds.

## Water logic
One global water plane rises with the alert ladder. No life jacket at home. Three depth states (tunable): **wading** below chest (x0.85 to knee, x0.7 knee to waist); **floating** at chest or neck or deeper (head above water, y = water minus neck offset, x0.5, can still move and tap; weight 3 items are dropped with "Terlalu berat!" and float). A late player is never stuck: the stairwell and hatch are open and the rising water lifts him up a level. Items float too and stay tappable.
Timeline defaults (data.js, tune in Stage 2):
- 0 to 9s Normal: rain, puddles.
- 9 to 27s Waspada: Serambi floor reached about 20s.
- 27 to 50s Amaran: Dapur about 31s, Ruang Tamu about 40s. Tag "bersedia berpindah". From about 45s the ground floor is chest deep or more. A red vignette fades in from Amaran and pulses at Bahaya.
- 50 to 63s Bahaya: Bilik floor about 52s. From about 56s items not on the roof deck, in hands or in the boat drift off. During 56 to 63s he is lifted through the hatch to the roof deck, hands keep their items.
- 63s (T.max): the water clock stops play. He takes what he holds to the Para and waves both arms for help. The boat appears at 65s, docks at 68s (horn) and waits 5s; if nobody taps the bubble or the boat he boards by himself. No toast text.
- Boarding is by tap: the boatman's jacket bubble (icon only) or the boat. He walks to the dock, what he holds goes on the boat, jacket on (T.wear 0.9s), he boards and the boat leaves; the run ends 2s later (T.sail), about 78.6s if he boards at once. No tap, no boarding: he waits safe on the Para and the run does not end.
Floor-edge slosh was dropped as redundant.

## Start flow
One Three.js scene, one house model, same OrthographicCamera throughout.
1. First paint is HTML/CSS only: dark rainy gradient, "Air Naik!", "Hujan tak berhenti. Selamatkan apa yang boleh.", disabled Mula, footer.
2. When Three.js is ready (target under 3s throttled 4G, measured at Mula enabled with 3D visible): fade in the 3D exterior with walls, roof, rain, puddles around the stilts, slow yaw orbit.
3. Tap Mula: orbit eases to the isometric angle and the roof and front walls drop away (cutaway, about 1.5s).
4. Two pulsing hints in Normal: "Klik barang" (outline Dokumen Penting), then "Klik tempat tinggi" (Para) once holding. The clock (water) starts on the first tap inside the house.
5. Main Semula skips the landing and starts directly in the cutaway.
Rain is one LineSegments draw call (tune or drop in Stage 4). Stage 1 builds orbit and cutaway with boxes, no rain; Stage 3 adds rain, lights, polish. If throttled first interactive fails in Stage 1b, the landing becomes the CSS poster only and Three.js loads on Mula behind a short fade.

## Ending flow
From 68s the boat waits at the dock; he puts on the life jacket, boards with whatever is in his hands and the boat floats off (jiran waving, horn and engine, no toast text). No early departure. Then the result card (1080x1350 canvas): title, score, items saved, highest alert, one sourced safety line, the line "Barang boleh diganti. Yang penting, kita semua selamat.", buttons Kongsi and Main Semula. No cleanup scene.
Titles by priority (sim.js title()): Beg Siap Awal (over half the score banked before Amaran), Beg Lengkap (every kit item that spawned is safe, 6 or more spawned), Dokumen Penting (Dokumen plus every Ubat and Wang present), Sayang Comot (cat saved), Bekal Cukup (Air, Makanan, Pakaian), Sedia Isyarat (Lampu, Radio, Bateri, Wisel, 2 or more spawned), Hero Peti Sejuk (saved a decoy), default Tabah Sampai Akhir.
Kongsi: Web Share where available, else full screen card to screenshot plus Salin pautan. In-app social browsers can lack Web Share (Stage 0 probe). Static 1200x630 og.png.

## Look and sound (owner review of Stage 5)
- Landing shows the kampung: river behind, road in front, neighbours on stilts, palms, paddy. Mula zooms into the main house and the roof and front walls fade out.
- Rooms have bold wall colours and furniture (Kenney CC0 models, baked into one file by `npm run bake`). Things sit on that furniture at different heights: a counter stays dry longer than a mat on the floor, and an item only floats once the water reaches it. The fridge and the TV have their own spot. Water has rain rings, current streaks and a wake behind pak cik; the day darkens as the alert rises; lightning from Amaran. Points pop up when something is banked, the phone buzzes on key moments (off with the mute button), and on the first run a hand shows where to tap. Pak cik wears a T-shirt and kain pelikat. Messages look like a chat app with no logo or app name.
- Font: Fredoka (OFL). UI is chunky and outlined, like a game, not a web page.
- Sound list. Effects: tap, footsteps on wood, pick up, put down, bank on the Para, refused (hands full or too heavy), alert level up (three steps of urgency), message ding, message sent whoosh, good-choice chime, cat meow, splash into water, wading slosh, carried up by the water, sweep at 62s, boat motor and horn, life jacket click, boat leaving, result jingle, button click, zoom whoosh. Ambience: rain (light and heavy layers), distant thunder, flowing flood water, frogs and crickets on the landing. Music: one loop, calm at Normal, tenser by Bahaya.
- Sound files (owner said yes 2026-11-17; all CC0, full credit in `CREDITS.md`). 20 files, 671 KB, in `sounds/`, fetched after the models once Mula is tapped. Each one replaces its synthesized sound when it arrives; a file that is missing or will not decode keeps the synthesized one.

| Sound | File | From |
|---|---|---|
| Rain (one loop, louder with each alert) | `rain.mp3` | OpenGameArt, Ylmir |
| Flood water bed, thunder, footsteps on wood, wading | `water.ogg`, `thunder.ogg`, `step1-3.ogg`, `wade1-2.ogg` | OpenGameArt, rubberduck |
| Cat | `meow.ogg` | OpenGameArt, IgnasD |
| Splash | `splash.ogg` | OpenGameArt, Peludo |
| Crickets and frog at Normal | `crickets.mp3`, `frog.ogg` | OpenGameArt, Wolfgang_ and AJ_ |
| Tap and button, pick up, put down, bank, good choice, refused, message ding | `click`, `pick`, `put`, `bank`, `good`, `no`, `ding` (.ogg) | Kenney Interface Sounds |
| Result jingle | `win.ogg` | Kenney Music Jingles |

  Still synthesized: music, alert beeps, boat motor and horn, whoosh, sweep. Not used: `engine_sound.mp3` (a car, 829 KB), the kitten mew, the second splash, Kenney Impact Sounds (not downloaded, the wood footsteps above cover it). Picked by name and by measured length, loudness and pitch, not by ear: the Kenney ones and the jingle are the least certain. To swap one, change its line in `FILES` or `REC` in `audio.js`. No ffmpeg on the build machine: MP3s were cut on frame boundaries and the WAV sliced, nothing was re-encoded.
- Sound never blocks play: it starts on the Mula tap, has a mute button, and the game works without it.

## PSA layer (subtle)
Teach through scoring and pacing, never lectures. Re-verify every tip against sources in Stage 5.
- Early prep is cheap at Normal/Waspada; by Bahaya it costs more (panic, ping spam).
- One WhatsApp ping is a generic forwarded hoax ("Sebarkan!"). "Semak sumber rasmi" dismisses free; engaging costs seconds. No real places or agencies in it.
- Decoys (TV, Peti Sejuk) lose; Dokumen Penting is worth most. Titles carry the lesson.
- The result card has ONE sourced safety line (e.g. documents in a waterproof container).
- Life jacket goes on when the boat arrives, before boarding, never at home.
- Amaran HUD tag "bersedia berpindah" paraphrases the official description; the source stays in docs only.
- Never blame the player for lost items. Do not cite the "do not wade through floodwater" warning (it is about driving through floodwater). Risk: a rescue-belongings loop can teach the opposite of real advice, so the framing above (never trapped, safety line, warm line) must stay.
- Official level names beyond the four alert words are unverified: make no claims about them.
