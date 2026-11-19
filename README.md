# Air Naik!

A short mobile web game about a flood in a Malaysian kampung. The water is rising. Save what you can before the rescue boat comes.

**Play:** https://aizma-alt.github.io/air-naik/

Projek kreatif, bukan produk rasmi.

## How to play

- Tap an item to walk over and pick it up. You have two hands. Heavy items slow you down, and the heaviest take both hands.
- Tap a high spot (the roof deck, the boat) to put things down where the water can't reach.
- The rising water is the clock. The alert goes Normal, Waspada, Amaran, Bahaya.
- Watch out for the cat, items floating away and message pings. Some messages are hoaxes.
- When the boat arrives, you score what's in your hands, on the roof and in the boat.

A run takes about 80 seconds. You can't save everything, so choose.

## Run it locally

The game is plain HTML and JavaScript modules with no build step. Serve the folder with any static server:

```
npx serve .
```

Then open the address it prints. Phone portrait is the main target.

Handy URL options: `?debug` shows FPS, `?seed=N` repeats a run, `?calm` turns the chaos events off.

## Develop

```
npm install
npm test                  # game rules over 200 seeds
node test/balance.mjs     # bot players check the difficulty
node test/browser.mjs     # page smoke test in headless Chromium
npm run bake              # rebuild models.bin from tools/kenney
npm run vendor            # rebuild vendor/three.min.js
```

| File | What it does |
| --- | --- |
| `index.html` | Page, HUD and game loop |
| `data.js` | All content, wording and tuning numbers |
| `sim.js` | Game rules, no Three.js |
| `render.js`, `models.js` | Camera, models, effects, tap picking |
| `audio.js` | Sound and music |
| `share.js` | Result card and sharing |

Design notes are in `docs/`.

## Credits

Built with [Three.js](https://threejs.org). 3D models and some sounds by [Kenney](https://www.kenney.nl), other sounds from [OpenGameArt](https://opengameart.org), font Fredoka. Full list and licences in [CREDITS.md](CREDITS.md).
