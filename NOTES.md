# NOTES (keep under 40 lines)

Game: Air Naik! Malaysian flood evacuation game. Three.js, portrait mobile, casual BM. Public repo, hosted on GitHub Pages: https://aizma-alt.github.io/air-naik/
Docs: docs/driver.md (run loop), docs/design.md (intent, rules, flows), docs/item-sheet.md (items, source checks).
Test device: Redmi Note 15 Pro 5G. Real FPS: open ?debug on the phone (fps avg, p5 over the run, ready ms). ?seed=N repeats a run, ?calm turns chaos off.

## Files
index.html shell + HUD + loop · data.js all content and tuning · sim.js rules, no Three.js (createSim, tap, step, score, title) · models.js geometry, models.bin loader, furniture layout · render.js camera, animation, effects, picking · models.bin baked Kenney models (npm run bake, sources in tools/kenney) · audio.js sound: synth for everything, then load() swaps in the 20 CC0 files in sounds/ · share.js result card, og image, Kongsi · og.png · vendor/three.min.js built by npm run vendor (rerun when render.js uses a new THREE class) · probe.html Stage 0 probe
Tests: npm test (rules, 200 seeds) · node test/balance.mjs (bots, pass lines) · node test/browser.mjs (page smoke; --perf [url] Slow 4G load; --review N art shots; --og rebuilds og.png) · test/bots.mjs

## Stages
0 to 5 DONE (owner: FPS fine on the phone, no number) · NOW: 7 look and sound (see driver.md). 7a mechanics DONE: faster walk and pick-up, cat runs the real route, title Dokumen Penting, Malaysian wording. 7b DONE in code: village landing, zoom + fade, furnished rooms, character, chat-style messages, game UI, synthesized audio, CREDITS.md. 7c Fredoka font DONE (loads after the 3D). 7d DONE: four Kenney CC0 packs baked into models.bin. 7e DONE: water rings and streaks, darker light by alert, item bounce, score pops, alert jolt, lightning, vibration, first-run hint hand, panic run, full synth sound list. 7f DONE: recorded CC0 sounds (OpenGameArt, Kenney), list in docs/design.md. OPEN: owner listens and says which to swap · THEN: 6 testers and launch

## Rules
- UI alert words: Normal, Waspada, Amaran, Bahaya. Never name any agency or charity in the game. Official level names beyond these are unverified.
- Run 82s (boards at 80s). No deaths. No ads. No donation link. Footer: Projek kreatif, bukan produk rasmi.
- Pass: first tap <3s throttled 4G; p5 FPS 30+; 4/5 testers finish unaided; wording matches sources; link preview renders.

## Decisions (all tunable in data.js)
- Layout: Serambi, Ruang Tamu, Dapur in a row at floor heights 1.0/1.6/1.3 (flood order per design); Bilik above Ruang Tamu; Para deck above Bilik. Upper floors see-through.
- Never stuck: a level seals when a floating head is within 0.7 of its ceiling (ground 52s, Bilik 65s); taps there are refused and the water carries him up.
- Tap empty slot = put down the last item picked up. Tap Para or docked boat = put down everything. Banked items stay banked. Picking = nearest target centre on screen.
- Boat (playtest): approaches from screen left for 6s, docks at 74s, leaves to screen right.
- Cat (no-deaths rule, owner OK): bolts once or twice when reached; runs the real route (doors, stairs, ladder) ahead of the water, ends on the roof beam and rides the boat unscored. Only a carried cat scores.
- Messages: 6 per run, one hoax in Amaran, burst of 3 in Bahaya. An open message blocks taps on the house for up to 4s; Sebarkan costs 3s, Semak sumber rasmi is free. NEEDS PLAYTEST.
- Floating items wander every 4 to 9s. Slosh dropped as redundant. Tuning (owner asked faster): speed 2.6, grab 0.25/0.4/0.65s, stairs/ladder x0.2 carrying and x0.6 empty-handed; yard dry through Normal.
- Look (Stage 7): village and house are built in code; furniture, pak cik, rescuer, cat, boat, fridge, TV and radio are Kenney models baked by tools/bake.mjs (no loader in the game; models.bin, 48KB gzipped, loads after Mula is enabled; box models stay if it fails). Pak cik keeps a code-built kain pelikat. About 39 draw calls, one shadow light. view.look(x, y, z, width) is a close-up for art checks.
- Slots: each has at = [dx, dz, lift] in data.js. The item is drawn on furniture beside the walking spot, and the water must rise past the lift before it floats (counters 0.67, tikar 0.03). Fridge and TV have a home slot (k3, t1). k1 and k2 moved to z 0.95 to stand in front of the counters. Landing = village with a gentle sway; Mula zooms to the house while roof and front walls fade. Tall scenery is kept out of the strip between camera and house (clear() in models.js). No free pack has kampung houses, so those stay code-built.
- UI: chunky outlined buttons and badges, Fredoka font (OFL) with rounded system fallback. Messages look like a chat app, no logo or app name. Sound: audio.js synthesizes everything first (music stays synth); recorded files replace rain, water, thunder, steps, cat, splash, crickets, UI sounds and the win jingle when they load (FILES, BEDS, REC tables; gains set from measured loudness). Mute button remembered. Credits: CREDITS.md and the Kredit panel.
- Titles: awal = over half the score banked before Amaran; dokumen = Dokumen plus every Ubat/Wang present in that house; then comot, peti, tabah.
- Card tip is "Kalau diarah pindah, terus pindah. Jangan tunggu air naik." (sourced, owner OK). Language: modern casual Bahasa Malaysia, never Indonesian.
- Kongsi: Web Share with the PNG if allowed, else link only, else Salin pautan + Simpan gambar (<a download>) + long-press on the card image. If share.js cannot load, the end screen shows the plain score and Main Semula.

## Measurements
- Load (Slow 4G, cold, median of 5), live site, with Kenney models: 2304ms, 2699ms with 4x CPU, 171KB before Mula (models.bin comes after, served gzipped, loads with no errors). Pass. Three.js self hosted and tree-shaken (the CDN min build pulls the unminified core).
- Slow-phone guard: 65% resolution and no shadows if frames 20 to 140 average under 40 fps (tested by forcing 25 fps). Shadows are new: phone FPS must be re-checked. Not handled: WebGL context loss.
- Balance, 100 seeds: zero taps 0 (clock never starts); minimal effort (one tap on Dokumen) 10 in 100%; casual bot 54% of nilai; best bot (24 plans, 0.25s reaction) 84%, saves every item 0%, every non-decoy 7%; clears every non-decoy at 2.5x speed.
- Sources (2026-11-16): 10 kit items and the tip match the DOSM-hosted article; alert words match the flood portal legend; Ready2go link is 404 (UNVERIFIED); "bersedia berpindah" has a news report only.
- NOT MEASURED OR TESTED: phone FPS with shadows and the new models (39 draw calls), vibration and the hint hand on a real phone, how the sound and music actually sound (files picked by measurement, never heard), OGG files on an iPhone, in-app browser share/download, link preview, real 4G.
