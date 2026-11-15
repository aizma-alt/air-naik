# NOTES (keep under 40 lines)

Game: Air Naik! Malaysian flood evacuation game. Three.js, primitives only, portrait mobile, casual BM. Public repo, hosted on GitHub Pages: https://aizma-alt.github.io/air-naik/
Docs: docs/driver.md (run loop), docs/design.md (intent, rules, flows), docs/item-sheet.md (items).
Test device: Redmi Note 15 Pro 5G. Real FPS: open ?debug on the phone (fps avg, p5 over the run, ready ms). ?seed=N repeats a run, ?calm turns chaos off.

## Files
index.html shell + HUD + loop · data.js all content and tuning · sim.js rules, no Three.js (createSim, tap, step, score) · render.js Three.js view + picking · probe.html Stage 0 probe
Tests: npm test (rules, 200 seeds) · node test/balance.mjs (bots, pass lines) · node test/browser.mjs (page smoke, shots in test/shots; --perf [url] for Slow 4G load) · test/bots.mjs (bots, run in Node and in the page)

## Stages
0 probe DONE · 1 greybox DONE · 2 chaos + balance DONE · NEXT: 3 cutout art · 4 perf gate · 5 share card + OG · 6 testers + launch

## Rules
- UI alert words: Normal, Waspada, Amaran, Bahaya. Never name any agency or charity in the game. Official level names beyond these are unverified.
- Run 82s (boards at 80s). No deaths. No ads. No donation link. Footer: Projek kreatif, bukan produk rasmi.
- Pass: first tap <3s throttled 4G; p5 FPS 30+; 4/5 testers finish unaided; wording matches sources; link preview renders.
- Never reload the whole project; patch small files.

## Decisions so far (all tunable in data.js)
- Layout: Serambi, Ruang Tamu, Dapur in a row at floor heights 1.0/1.6/1.3 (flood order per design); Bilik above Ruang Tamu; Para deck above Bilik. Upper floors see-through in the cutaway.
- Never stuck: a level seals when a floating head is within 0.7 of its ceiling (ground 52s, Bilik 65s); taps there are refused and the water carries him up, also off the ladder if he was heading down.
- Tap empty slot = put down the last item picked up. Tap Para or docked boat = put down everything. Banked items stay banked. Picking = nearest target centre on screen.
- Boat (playtest): seen approaching from screen left for 6s, docks at 74s, leaves to screen right.
- Cat (no-deaths rule): bolts once or twice when reached; climbs a level by itself when its floor gets wet, ends on the roof beam and rides the boat unscored ("ikut"). Only a carried cat scores. NEEDS OWNER OK.
- Messages: 6 per run, one hoax in Amaran, burst of 3 in Bahaya. An open message blocks taps on the house for up to 4s; Sebarkan costs 3s, Semak sumber rasmi is free. No brand, sender or place named. NEEDS PLAYTEST.
- Floating items wander to another wet slot every 4 to 9s. Floor-edge slosh dropped as redundant (gauge + visible water).
- Stage 2 tuning: speed 2.5 to 2.0, stairs/ladder x0.4, grab 0.5/0.8/1.3s. Flood times untouched.

## Measurements
- Three.js: three.module.min.js imports the UNMINIFIED three.core.js; the importmap in index.html remaps it to the min build. Keep it. Page total was 170KB at Stage 1.
- 1b load (Slow 4G, cold, median of 5): 2318ms live, 2659ms with 4x CPU. Pass but MARGINAL. LAZY3D flag in index.html = load on Mula.
- Balance, 100 seeds: zero taps = 0 (clock never starts); minimal effort (one tap on the hinted Dokumen) scores 10 in 100%; casual bot 49% of nilai; best bot (best of 24 plans, 0.25s reaction) 82%, saves every item in 0%, every non-decoy in 1%. Bot strength check: clears every non-decoy at 2.5x speed in 100%.
- "Idle bot saves some" is read as the minimal-effort bot. No free-points mechanic was added. NEEDS OWNER OK.
- Phone FPS: NOT MEASURED (adb lists no device). Owner playtested Stage 1 by hand: "seems fine", no numbers.

## Stage 3 needs
Art only in render.js and index.html CSS: cutout look, flat palette, rain (one LineSegments), lights, landing polish. Review shots go to test/review/roundN (headless, not phone).
