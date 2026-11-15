# NOTES (keep under 40 lines)

Game: Air Naik! Malaysian flood evacuation game. Three.js, primitives only, portrait mobile, casual BM. Public repo, hosted on GitHub Pages: https://aizma-alt.github.io/air-naik/
Docs: docs/driver.md (run loop), docs/design.md (intent, rules, flows), docs/item-sheet.md (items).
Test device: Redmi Note 15 Pro 5G. Real FPS: open ?debug on the phone (fps avg, p5, ready ms).

## Files
index.html shell + HUD + loop (inline module) · data.js items/BM/timeline/rooms/nodes/tuning · sim.js rules, no Three.js (createSim, tap, step, score) · render.js Three.js view + picking · probe.html Stage 0 probe · test/sim.test.mjs (npm test) · test/browser.mjs (smoke; --perf [url]) · later: share.js, og.png

## Stages
0 probe DONE · 1 greybox loop DONE, waiting at the GATE for the playtest verdict · NEXT: 2 water + chaos tuning (Playwright bot) · 3 cutout art · 4 perf gate · 5 share card + OG · 6 testers + launch

## Rules
- UI alert words: Normal, Waspada, Amaran, Bahaya. Never name any agency or charity in the game. Official level names beyond these are unverified.
- Run 82s (boards at 80s). No deaths. No ads. No donation link. Footer: Projek kreatif, bukan produk rasmi.
- Pass: first tap <3s throttled 4G; p5 FPS 30+; 4/5 testers finish unaided; wording matches sources; link preview renders.
- Never reload the whole project; patch small files.

## Stage 1 decisions (all tunable in data.js)
- Layout: Serambi, Ruang Tamu, Dapur in a row at floor heights 1.0/1.6/1.3 so they flood in design order; Bilik above Ruang Tamu; Para deck above Bilik (the loft under the roof). Upper floors are see-through in the cutaway.
- Movement: nodes in a room connect directly; stairs and ladder are the only level links and cannot be reversed midway.
- Never stuck: when a floating head is within 0.7 of the ceiling the level is sealed (ground 52s, Bilik 65s), taps there are refused and he is carried up. He is on the roof by about 67s.
- Picking: nearest target centre on screen within its reach (items 0.75 tile, slots 0.6, boat 1.3), then anywhere on the Para. Ray-vs-box picking let items steal taps meant for the empty slot beside them (caught by the smoke test).
- Tap empty slot = walk there and put down the last item picked up. Tap Para or docked boat = put down everything. Items on the Para cannot be picked up again.
- Items float at the surface under the ceiling and stay tappable until the level seals. At 62s everything still on a slot is swept away.
- Hands at departure count. HUD score is live (hands + Para + boat). Gauge fill is time, not height.
- Item labels are system emoji sprites (placeholder for Stage 3 art).
- Not built yet (later stages): cat running, floating drift, pings, floor-edge slosh, rain, titles, share card, OG.

## Measurements
- Three.js: three.module.min.js imports the UNMINIFIED three.core.js (211KB br). The importmap in index.html remaps it to three.core.min.js (85KB br). Page total 170KB over 6 requests. Keep that remap.
- 1b, Playwright, DevTools Slow 4G (180KB/s down, 562ms latency), cold cache, median of 5, local gzip server: Mula enabled with 3D drawn at 2267ms; with 4x CPU 2683ms. Unthrottled 259ms. Live Pages URL, same method: 2318ms, 4x CPU 2659ms. Passes under 3s but MARGINAL: CDP does not model the two connection handshakes, and without the importmap remap it would be about 3.0s. LAZY3D flag in index.html switches to load-on-Mula.
- Sim asserts, 200 seeds: spawn rules hold, idle and random-tap bots always reach the roof and board. Greedy bot saves 43.0 of 46.3 on average: far too easy, Stage 2 must fix (target: best bot cannot save all, idle bot saves some).
- Phone FPS on the greybox: NOT MEASURED. Windows sees the phone over USB but adb lists no device (USB debugging off or not authorised). ?debug shows fps avg and p5 over the whole run and freezes them on the end screen.

## Stage 2 needs
Playtest verdict from the GATE. Then: chaos events, tuning in data.js until bot stats pass over 50+ seeds, sim.js logic review, phone FPS if adb is up.
