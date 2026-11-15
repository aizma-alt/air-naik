// node test/browser.mjs            smoke: plays one run through the real page, saves screenshots to test/shots
// node test/browser.mjs --perf [url]  cold-cache load to "Mula enabled with 3D drawn" under DevTools Slow 4G
// Headless FPS is not a device result; phone FPS comes from ?debug on the phone.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url), TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', png: 'image/png' };
const server = http.createServer(async (req, res) => { // gzip like GitHub Pages does
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const body = gzipSync(await readFile(new URL(name, ROOT)));
    res.writeHead(200, { 'content-type': TYPES[name.split('.').pop()] || 'application/octet-stream', 'content-encoding': 'gzip', 'cache-control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, r));
const LOCAL = `http://localhost:${server.address().port}/`;
const PHONE = { viewport: { width: 394, height: 718 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] }); // real GPU if the headless shell can reach one

async function perf(url) {
  // DevTools "Slow 4G" preset (front_end/core/sdk/NetworkManager.ts): 1.6 Mbps down, 750 kbps up, each x0.9; 150ms RTT x3.75.
  const SLOW4G = { offline: false, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9, latency: 150 * 3.75 };
  for (const [label, net, cpu] of [['unthrottled', null, 1], ['Slow 4G', SLOW4G, 1], ['Slow 4G + 4x CPU', SLOW4G, 4]]) {
    const runs = [];
    for (let i = 0; i < 5; i++) {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      if (net) await cdp.send('Network.emulateNetworkConditions', net);
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      let bytes = 0, reqs = 0;
      cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; reqs++; });
      await page.goto(url, { waitUntil: 'commit' });
      await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
      const r = await page.evaluate(() => ({ ready: window.__ready, three: window.__three, gpu: (g => g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL))(document.createElement('canvas').getContext('webgl2')), paint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0) }));
      runs.push({ ...r, kb: Math.round(bytes / 1024), reqs });
      await ctx.close();
    }
    runs.sort((a, b) => a.ready - b.ready);
    const m = runs[2];
    if (!net) console.log('GPU:', m.gpu);
    console.log(`${label}: ready median ${m.ready}ms (min ${runs[0].ready}, max ${runs[4].ready}), modules loaded ${m.three}ms, first paint ${m.paint}ms, ${m.kb}KB over ${m.reqs} requests`);
  }
}

async function smoke() {
  await mkdir(new URL('shots/', import.meta.url), { recursive: true });
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));
  const shot = n => page.screenshot({ path: fileURLToPath(new URL(`shots/${n}.png`, import.meta.url)) });
  const sim = f => page.evaluate(f);
  const ff = until => page.evaluate(u => { const g = window.__game; while (g.sim.t < u && !g.sim.done) g.step(g.sim, 1 / 30); }, until);
  const touch = async (x, y, z) => { const p = await page.evaluate(a => window.__game.view.toScreen(...a), [x, y, z]); await page.touchscreen.tap(p.x, p.y); };

  await page.goto(LOCAL + '?debug&calm&seed=7');
  await page.waitForFunction(() => window.__ready);
  await page.waitForTimeout(1200); await shot('1-landing');
  await page.locator('#mula').tap();
  await page.waitForTimeout(700); await shot('2-cutaway-mid');
  await page.waitForTimeout(1300); await shot('3-start');
  assert.equal(await sim(() => window.__game.sim.t), 0, 'clock ran before the first tap in the house');
  assert.equal(await page.locator('#hint').textContent(), 'Klik barang');

  // Tap the Dokumen box through the real pointer path, then the roof deck.
  const doc = await sim(() => { const g = window.__game, i = g.sim.items.find(i => i.id === 'dokumen'), n = g.nodes[i.node]; return [n.x, g.rooms[n.rooms[0]].y + 0.3, n.z]; });
  await touch(...doc);
  assert.equal(await sim(() => window.__game.sim.p.intent?.item.id), 'dokumen', 'tap on Dokumen was not picked');
  await page.waitForFunction(() => window.__game.sim.p.hands.length === 1, null, { timeout: 15000 });
  assert.equal(await page.locator('#hint').textContent(), 'Klik tempat tinggi');
  await shot('4-holding');
  await touch(5.0, 6.2, 1.0);
  assert.equal(await sim(() => window.__game.sim.p.intent?.k), 'para', 'tap on the roof deck was not picked');
  await page.waitForFunction(() => window.__game.sim.banked, null, { timeout: 30000 });
  await shot('5-banked');
  assert.equal(await page.locator('#score').textContent(), 'Skor 10');
  await touch(40, 0, 40); // empty ground far away: must pick nothing
  assert.equal(await sim(() => window.__game.sim.p.intent), null, 'tap on empty ground was picked');

  for (const [t, name] of [[40, '6-amaran-40s'], [53, '7-ground-deep-53s'], [64, '8-bahaya-64s'], [75, '9-boat-75s']]) { await ff(t); await page.waitForTimeout(300); await shot(name); }
  assert.equal(await sim(() => window.__game.sim.boat.state), 'docked');
  await ff(79.2); await page.waitForTimeout(300); await shot('10-jacket-79s');
  await page.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 15000 });
  await shot('11-end');
  assert.equal(await page.locator('#endS').textContent(), 'Skor 10');
  await page.locator('#lagi').tap();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#land').isHidden(), true, 'Main Semula showed the landing again');
  assert.equal(await sim(() => window.__game.sim.t), 0);
  await shot('12-main-semula');
  // Second run: two hands, a weight 3 item, wading, floating, carried up, real tap on the docked boat.
  const bx = [], G = f => page.evaluate(f), held = n => page.waitForFunction(n => window.__game.sim.p.hands.length === n, n, { timeout: 20000 });
  const at = k => page.evaluate(k => { const g = window.__game, n = g.nodes[k]; return [n.x, g.rooms[n.rooms[0]].y + 0.3, n.z]; }, k);
  await page.goto(LOCAL + '?debug&calm&seed=3'); await page.waitForFunction(() => window.__ready);
  await page.locator('#mula').tap(); await page.waitForTimeout(1700);
  await touch(...await at(await G(() => window.__game.sim.items.find(i => i.d.wt === 3).node))); await held(1);
  assert.equal(await G(() => window.__game.sim.p.hands[0].d.wt), 3);
  await shot('b2-weight-3');
  const free = await G(() => { const s = window.__game.sim; return ['s1', 's2', 's3'].find(k => !s.items.some(i => i.loc === 'slot' && i.node === k)); });
  await touch(...await at(free)); await held(0);
  assert.equal(await G(() => window.__game.sim.p.room), 'serambi', 'did not walk to the Serambi slot');
  const two = await G(() => window.__game.sim.items.filter(i => i.d.wt === 1 && i.id !== 'kucing').slice(0, 2).map(i => i.node));
  await touch(...await at(two[0])); await held(1); await touch(...await at(two[1])); await held(2);
  await shot('b1-two-hands');
  for (const [t, wait, name] of [[40, 300, 'b3-wading-40s'], [50, 300, 'b4-floating-50s'], [52.4, 1500, 'b5-carried-up-stairs'], [65.1, 900, 'b6-carried-up-hatch'], [70.5, 300, 'b7-boat-far'], [72.5, 300, 'b8-boat-near'], [75, 300, 'b9-boat-docked']]) { await ff(t); await page.waitForTimeout(wait); await shot(name); bx.push(await G(() => window.__game.view.boatAt().x)); }
  assert.ok(bx[4] < bx[5] && bx[5] < bx[6], 'boat does not come in from screen left: ' + bx.slice(4));
  assert.equal(await G(() => window.__game.sim.p.lvl), 2, 'not on the roof at 75s');
  await touch(7.6, 6.35, 2.6);
  assert.equal(await G(() => window.__game.sim.p.intent?.k), 'boat', 'tap on the docked boat was not picked');
  await ff(80.5); await page.waitForTimeout(900);
  assert.ok(await G(() => window.__game.view.boatAt().x) > bx[6] + 10, 'boat does not leave to screen right');
  await shot('b10-boat-leaving');
  // Third run, chaos on: the message card blocks the house, its buttons work, and the bots give the same scores in the page as in Node.
  await page.goto(LOCAL + '?debug&seed=11'); await page.waitForFunction(() => window.__ready);
  await page.locator('#mula').tap(); await page.waitForTimeout(1700);
  await touch(...await at('t1'));
  const untilPing = kind => page.evaluate(k => { const g = window.__game; while (!(g.sim.ping && g.sim.ping.kind === k) && !g.sim.done) g.step(g.sim, 1 / 30); }, kind);
  await untilPing('chat'); await page.waitForTimeout(200);
  assert.equal(await page.locator('#ping').isVisible(), true, 'message card not shown');
  await shot('c1-chat');
  await touch(...await at(await G(() => window.__game.sim.items.find(i => i.id === 'dokumen').node)));
  assert.equal(await G(() => window.__game.sim.p.intent), null, 'tap went through the message card');
  await page.locator('#ping button[data-a=ok]').tap(); await page.waitForTimeout(100);
  assert.equal(await page.locator('#ping').isHidden(), true, 'OK did not close the message');
  await untilPing('hoax'); await page.waitForTimeout(200); await shot('c2-hoax');
  assert.equal(await page.locator('#ping button[data-a=ok]').isHidden(), true);
  await page.locator('#ping button[data-a=sebar]').tap(); await page.waitForTimeout(150);
  assert.ok(await G(() => window.__game.sim.p.stun) > 0, 'Sebarkan did not cost time');
  const node = await import('./bots.mjs'), inPage = await page.evaluate(async () => { const b = await import('/test/bots.mjs'); return [1, 2, 3, 4, 5].map(s => [b.best(s).score, b.play(s, b.casual, 1).score]); });
  assert.deepEqual(inPage, [1, 2, 3, 4, 5].map(s => [node.best(s).score, node.play(s, node.casual, 1).score]), 'bots score differently in the page');
  assert.equal(await G(() => window.__low), false, 'low-res guard fired on a fast machine');
  assert.deepEqual(errors, [], 'console or page errors');
  // The slow-phone guard must fire when frames are slow: same page with 40ms burned in every frame (about 25 fps).
  const slowPage = await ctx.newPage();
  await slowPage.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => raf(t => { const end = performance.now() + 40; while (performance.now() < end); cb(t); }); });
  await slowPage.goto(LOCAL + '?debug&seed=1'); await slowPage.bringToFront();
  await slowPage.waitForFunction(() => window.__low !== undefined, null, { timeout: 60000 });
  assert.equal(await slowPage.evaluate(() => window.__low), true, 'low-res guard did not fire at 25 fps');
  console.log('smoke ok, screenshots in test/shots. Headless fps (not a device result):', await sim(() => window.__fps));
}

// Art review: one real-time run driven by the casual bot, shots at set moments. Headless, not the phone.
async function review(round) {
  const dir = new URL(`review/round${round}/`, import.meta.url); await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  const shot = n => page.screenshot({ path: fileURLToPath(new URL(n + '.png', dir)) });
  await page.goto(LOCAL + '?seed=7'); await page.waitForTimeout(400); await shot('00-first-paint');
  await page.goto(LOCAL + '?debug&seed=7'); await page.waitForFunction(() => window.__ready);
  await page.waitForTimeout(2500); await shot('01-landing');
  await page.locator('#mula').tap(); await page.waitForTimeout(750); await shot('02-cutaway'); await page.waitForTimeout(1200); await shot('03-start');
  await page.evaluate(async () => { const b = await import('/test/bots.mjs'); setInterval(() => { const s = window.__game.sim; if (!s.done && (s.ping ? s.t > s.ping.until - 2.5 : b.free(s))) b.casual(s); }, 500); });
  for (const t of [3, 9, 16, 24, 33, 41, 48, 53.5, 58, 63, 66, 71, 75, 79.4, 81]) {
    await page.waitForFunction(t => window.__game.sim.t >= t, t, { timeout: 30000 }); await shot(`t${String(t).padStart(4, '0')}`);
  }
  await page.waitForFunction(() => window.__game.sim.done); await page.waitForTimeout(700); await shot('99-end');
  console.log('review shots in', fileURLToPath(dir), 'draw calls', await page.evaluate(() => window.__game.view.info().calls), 'fps (headless)', await page.evaluate(() => window.__fps));
}

try {
  const i = process.argv.indexOf('--perf'), r = process.argv.indexOf('--review');
  if (i > 0) await perf(process.argv[i + 1] || LOCAL); else if (r > 0) await review(process.argv[r + 1] || 1); else await smoke();
} finally { await browser.close(); server.close(); }
