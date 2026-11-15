# NOTES (keep under 40 lines)

Game: Air Naik! Malaysian flood evacuation game. Three.js, primitives only, portrait mobile, casual BM. Public repo, hosted on GitHub Pages: https://aizma-alt.github.io/air-naik/
Docs: docs/driver.md (run loop), docs/design.md (intent, rules, flows), docs/item-sheet.md (items, source checks).
Test device: Redmi Note 15 Pro 5G. Real FPS: open ?debug on the phone (fps avg, p5 over the run, ready ms). ?seed=N repeats a run, ?calm turns chaos off.

## Files
index.html shell + HUD + loop · data.js all content and tuning · sim.js rules, no Three.js (createSim, tap, step, score, title) · render.js Three.js view + picking · share.js result card, og image, Kongsi · og.png · vendor/three.min.js built by npm run vendor (rerun when render.js uses a new THREE class) · probe.html Stage 0 probe
Tests: npm test (rules, 200 seeds) · node test/balance.mjs (bots, pass lines) · node test/browser.mjs (page smoke; --perf [url] Slow 4G load; --review N art shots; --og rebuilds og.png) · test/bots.mjs

## Stages
0 to 5 DONE (phone FPS and the hand checks below still open) · NEXT: 6 external testers and launch, by hand

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
- Cat (no-deaths rule): bolts once or twice when reached; climbs by itself when its floor gets wet, ends on the roof beam and rides the boat unscored. Only a carried cat scores. NEEDS OWNER OK.
- Messages: 6 per run, one hoax in Amaran, burst of 3 in Bahaya. An open message blocks taps on the house for up to 4s; Sebarkan costs 3s, Semak sumber rasmi is free. NEEDS PLAYTEST.
- Floating items wander every 4 to 9s. Slosh dropped as redundant. Tuning: speed 2.0, stairs/ladder x0.4, grab 0.5/0.8/1.3s; yard dry through Normal.
- Art: merged vertex-colour box models (16 draw calls), teh-tarik water, sticker labels (system emoji), rain = one LineSegments.
- Titles: awal = over half the score banked before Amaran; dokumen = Dokumen plus every Ubat/Wang present in that house; then comot, peti, tabah.
- Card tip is "Kalau diarah berpindah, pindah segera. Jangan tunggu air naik." (sourced). The design's waterproof-container example could not be sourced, so it is not used. NEEDS OWNER OK.
- Kongsi: Web Share with the PNG if allowed, else link only, else Salin pautan + Simpan gambar (<a download>) + long-press on the card image.

## Measurements
- Load (Slow 4G, cold, median of 5): 2207ms live after Stage 4, 2515ms with 4x CPU, 156KB over 5 requests. Pass. Three.js self hosted and tree-shaken (the CDN min build pulls the unminified core).
- Slow-phone guard: 65% resolution if frames 20 to 140 average under 40 fps (tested by forcing 25 fps). Not handled: WebGL context loss.
- Balance, 100 seeds: zero taps 0 (clock never starts); minimal effort (one tap on Dokumen) 10 in 100%; casual bot 49% of nilai; best bot (24 plans, 0.25s reaction) 82%, saves every item 0%, every non-decoy 0 to 1%; clears every non-decoy at 2.5x speed.
- "Idle bot saves some" is read as the minimal-effort bot; no free-points mechanic was added. NEEDS OWNER OK.
- Sources (2026-11-16): 10 kit items and the tip match the DOSM-hosted article; alert words match the flood portal legend; Ready2go link is 404 (UNVERIFIED); "bersedia berpindah" has a news report only.
- NOT MEASURED OR TESTED: phone FPS (adb lists no device), in-app browser share/download, link preview, real 4G.
