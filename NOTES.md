# NOTES (keep under 40 lines)

Game: Air Naik! Malaysian flood evacuation game. Three.js, primitives only, portrait mobile, casual BM. Public repo, hosted on GitHub Pages: https://aizma-alt.github.io/air-naik/
Docs: docs/driver.md (run loop), docs/design.md (intent, rules, flows), docs/item-sheet.md (items, source checks).
Test device: Redmi Note 15 Pro 5G. Real FPS: open ?debug on the phone (fps avg, p5 over the run, ready ms). ?seed=N repeats a run, ?calm turns chaos off.

## Files
index.html shell + HUD + loop · data.js all content and tuning · sim.js rules, no Three.js (createSim, tap, step, score, title) · models.js all geometry · render.js camera, animation, picking · audio.js synthesized sound · share.js result card, og image, Kongsi · og.png · vendor/three.min.js built by npm run vendor (rerun when render.js uses a new THREE class) · probe.html Stage 0 probe
Tests: npm test (rules, 200 seeds) · node test/balance.mjs (bots, pass lines) · node test/browser.mjs (page smoke; --perf [url] Slow 4G load; --review N art shots; --og rebuilds og.png) · test/bots.mjs

## Stages
0 to 5 DONE (owner: FPS fine on the phone, no number) · NOW: 7 look and sound (see driver.md). 7a mechanics DONE: faster walk and pick-up, cat runs the real route, title Dokumen Penting, Malaysian wording. 7b DONE in code: village landing, zoom + fade, furnished rooms, character, chat-style messages, game UI, synthesized audio, CREDITS.md. 7c Fredoka font DONE (loads after the 3D). 7d OPEN, each download needs owner yes: Kenney packs (furniture, mini characters, cube pets for the cat, watercraft for the boat; all CC0, zip size not shown on the pages), sound files per the list in design.md · THEN: 6 testers and launch

## Rules
- UI alert words: Normal, Waspada, Amaran, Bahaya. Never name any agency or charity in the game. Official level names beyond these are unverified.
- Run 82s (boards at 80s). No deaths. No ads. No donation link. Footer: Projek kreatif, bukan produk rasmi.
- Pass: first tap <3s throttled 4G; p5 FPS 30+; 4/5 testers finish unaided; wording matches sources; link preview renders.
- Never reload the whole project; patch small files.

## Decisions (all tunable in data.js)
- Layout: Serambi, Ruang Tamu, Dapur in a row at floor heights 1.0/1.6/1.3 (flood order per design); Bilik above Ruang Tamu; Para deck above Bilik. Upper floors see-through.
- Never stuck: a level seals when a floating head is within 0.7 of its ceiling (ground 52s, Bilik 65s); taps there are refused and the water carries him up.
- Tap empty slot = put down the last item picked up. Tap Para or docked boat = put down everything. Banked items stay banked. Picking = nearest target centre on screen.
- Boat (playtest): approaches from screen left for 6s, docks at 74s, leaves to screen right.
- Cat (no-deaths rule, owner OK): bolts once or twice when reached; runs the real route (doors, stairs, ladder) ahead of the water, ends on the roof beam and rides the boat unscored. Only a carried cat scores.
- Messages: 6 per run, one hoax in Amaran, burst of 3 in Bahaya. An open message blocks taps on the house for up to 4s; Sebarkan costs 3s, Semak sumber rasmi is free. NEEDS PLAYTEST.
- Floating items wander every 4 to 9s. Slosh dropped as redundant. Tuning (owner asked faster): speed 2.6, grab 0.25/0.4/0.65s, stairs/ladder x0.2 carrying and x0.6 empty-handed; yard dry through Normal.
- Look (Stage 7): models.js builds everything in code (village, furnished rooms in bold wall colours, pak cik in kain pelikat, cat, boat); 21 draw calls, one shadow light. Landing = village with a gentle sway; Mula zooms to the house while roof and front walls fade. Tall scenery is kept out of the strip between camera and house (clear() in models.js). Route change from the plan: code-built first, because no free pack has kampung houses and no download was approved yet; packs stay an optional upgrade.
- UI: chunky outlined buttons and badges, Fredoka font (OFL) with rounded system fallback. Messages look like a chat app, no logo or app name. Sound: audio.js synthesizes SFX, rain and a pentatonic loop, mute button remembered. Credits: CREDITS.md and the Kredit panel.
- Titles: awal = over half the score banked before Amaran; dokumen = Dokumen plus every Ubat/Wang present in that house; then comot, peti, tabah.
- Card tip is "Kalau diarah pindah, terus pindah. Jangan tunggu air naik." (sourced, owner OK). Language: modern casual Bahasa Malaysia, never Indonesian.
- Kongsi: Web Share with the PNG if allowed, else link only, else Salin pautan + Simpan gambar (<a download>) + long-press on the card image. If share.js cannot load, the end screen shows the plain score and Main Semula.

## Measurements
- Load (Slow 4G, cold, median of 5), Stage 7 build, local gzip server: 2225ms, 2592ms with 4x CPU, 164KB. Pass. Three.js self hosted and tree-shaken (the CDN min build pulls the unminified core).
- Slow-phone guard: 65% resolution and no shadows if frames 20 to 140 average under 40 fps (tested by forcing 25 fps). Shadows are new: phone FPS must be re-checked. Not handled: WebGL context loss.
- Balance, 100 seeds: zero taps 0 (clock never starts); minimal effort (one tap on Dokumen) 10 in 100%; casual bot 49% of nilai; best bot (24 plans, 0.25s reaction) 83%, saves every item 0%, every non-decoy 5%; clears every non-decoy at 2.5x speed.
- Sources (2026-11-16): 10 kit items and the tip match the DOSM-hosted article; alert words match the flood portal legend; Ready2go link is 404 (UNVERIFIED); "bersedia berpindah" has a news report only.
- NOT MEASURED OR TESTED: phone FPS with shadows, how the sound and music actually sound (made blind), in-app browser share/download, link preview, real 4G.
