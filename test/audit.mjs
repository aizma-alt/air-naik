// node test/audit.mjs [WxH]   (default 394x718; set CHROME_PATH to use an installed Chrome)
// Draw calls and triangles per phase, and flood readability at fixed times. Headless software GL: not a phone result.
// Contrast = (p95 + 0.05) / (p5 + 0.05) of relative luminance inside the screen box of the house (x 0..9, y 0..6.6, z 0..3), HUD hidden. Target 4:1.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const [W, H] = (process.argv[2] || '394x718').split('x').map(Number), ROOT = new URL('..', import.meta.url);
const TYPES = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', png: 'image/png', woff2: 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try { res.writeHead(200, { 'content-type': TYPES[name.split('.').pop()] || 'application/octet-stream', 'content-encoding': 'gzip', 'cache-control': 'no-store' }).end(gzipSync(await readFile(new URL(name, ROOT)))); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: W < 600, isMobile: W < 600 }), page = await ctx.newPage(), errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text())); page.on('pageerror', e => errors.push(String(e)));
await page.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#dbg{display:none!important}body.nohud .layer,body.nohud #mute,body.nohud #jaket,body.nohud #hand,body.nohud #flash{visibility:hidden!important}'; document.head.append(s); }));
await page.goto(`http://localhost:${server.address().port}/?debug&calm&seed=7`);
await page.waitForFunction(() => window.__ready && window.__pack !== undefined, null, { timeout: 60000 });

const calls = async () => { await page.waitForTimeout(700); return page.evaluate(() => { const i = __game.view.info(); return `${i.calls} calls, ${i.triangles} tris${window.__low ? ' [slow-phone guard on: no shadows, 65% pixels]' : ''}`; }); };
const contrast = async () => { // screenshot of the bare canvas, decoded in the page
  await page.evaluate(() => document.body.classList.add('nohud')); await page.waitForTimeout(900);
  const png = (await page.locator('#c').screenshot()).toString('base64'), r = await page.evaluate(async b64 => {
    const v = __game.view, c = document.getElementById('c').getBoundingClientRect(), bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), k = bmp.width / c.width;
    const pts = []; for (const x of [0, 9]) for (const y of [0, 6.6]) for (const z of [0, 3]) { const q = v.toScreen(x, y, z); pts.push([(q.x - c.left) * k, (q.y - c.top) * k]); }
    const x0 = Math.max(0, Math.min(...pts.map(p => p[0])) | 0), x1 = Math.min(bmp.width, Math.max(...pts.map(p => p[0])) | 0), y0 = Math.max(0, Math.min(...pts.map(p => p[1])) | 0), y1 = Math.min(bmp.height, Math.max(...pts.map(p => p[1])) | 0);
    const cv = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d'); cv.drawImage(bmp, 0, 0); const d = cv.getImageData(x0, y0, x1 - x0, y1 - y0).data, L = [];
    const lin = u => (u /= 255) <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
    for (let i = 0; i < d.length; i += 4) L.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
    L.sort((a, b) => a - b); const p5 = L[L.length * 0.05 | 0], p95 = L[L.length * 0.95 | 0];
    return ((p95 + 0.05) / (p5 + 0.05)).toFixed(2);
  }, png);
  await page.evaluate(() => document.body.classList.remove('nohud')); return r;
};
console.log(`viewport ${W}x${H}`); console.log('landing:', await calls(), '| house contrast', await contrast());
await page.locator('#mula')[W < 600 ? 'tap' : 'click']({ force: true }); await page.waitForTimeout(2300);
console.log('play 0s:', await calls());
await page.evaluate(async () => { window.__b = await import('/test/bots.mjs'); });
const ff = t => page.evaluate(u => { const g = __game, b = __b; let n = 0; while (g.sim.t < u && !g.sim.done) { if (n++ % 15 === 0) { const s = g.sim; if (s.boat.state === 'docked' && !s.p.locked && s.t > 77) g.tap(s, 'boat'); else if (!s.ping || s.t > s.ping.until - 2.5) if (b.free(s)) b.casual(s); } g.step(g.sim, 1 / 30); } }, t);
for (const [t, tag] of [[30, 'play'], [40, 'play'], [53, 'play'], [64, 'play (Bahaya)'], [71, 'ending (wave)'], [76, 'ending (boat docked)']]) { await ff(t); console.log(`${tag} ${t}s:`, await calls(), '| house contrast', await contrast()); }
await ff(200); await page.waitForTimeout(2000); console.log('ending (result screen):', await calls());
console.log('console errors:', errors.length ? errors : 'none');
await browser.close(); server.close();
