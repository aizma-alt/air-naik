// npm run bake : turns the Kenney source models in tools/kenney into models.bin, the one small file the game loads.
// Runs Three's GLTFLoader in a headless page (build time only), poses the model, bakes the palette colour into
// each vertex and splits moving parts (limbs, tail) so the game can swing them. The game itself has no loader.
// File layout: u32 header length, header JSON { name: [[part, px, py, pz, quantum, verts, indices], ...] }, then per part
// Int16 positions (x quantum, relative to the part pivot), Uint16 indices, Uint8 sRGB colours, each block padded to even.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';

// name: [file, { s: scale | h: target height, turn: radians about y, clip: pose, split: keep moving parts apart }]
const F = 1.5; // furniture kit to tiles
export const MODELS = {
  man: ['characters/character-male-a.glb', { h: 1.42, clip: 'idle', split: 1 }],
  jiran: ['characters/character-worker.glb', { h: 1.42, clip: 'sit', split: 1 }],
  cat: ['pets/animal-cat.glb', { h: 0.62, split: 1 }],
  boat: ['boats/boat-row-large.glb', { h: 0.78, turn: Math.PI / 2 }],
  peti: ['furniture/kitchenFridge.glb', { h: 1.35 }], tv: ['furniture/televisionVintage.glb', { h: 0.62 }], radio: ['furniture/radio.glb', { h: 0.36 }],
  ...Object.fromEntries(['loungeSofa', 'loungeChair', 'tableCoffee', 'cabinetTelevision', 'bookcaseOpenLow', 'sideTable', 'sideTableDrawers', 'lampRoundFloor', 'lampRoundTable',
    'rugRectangle', 'rugRounded', 'pottedPlant', 'bedSingle', 'cabinetBedDrawerTable', 'kitchenStove', 'kitchenSink', 'kitchenCabinet', 'kitchenCabinetDrawer', 'kitchenCabinetUpper',
    'table', 'tableCloth', 'chair', 'chairCushion', 'cardboardBoxClosed', 'cardboardBoxOpen', 'books', 'benchCushion', 'stoolBar', 'trashcan', 'coatRackStanding', 'kitchenMicrowave', 'toaster']
    .map(n => [n, [`furniture/${n}.glb`, { s: F }]])),
};

const SRC = new URL('./kenney/', import.meta.url), THREE_DIR = new URL('../node_modules/three/', import.meta.url);
const PAGE = '<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>';
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try {
    if (p === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
    const body = await readFile(new URL(p.slice(p.indexOf('/', 1) + 1), p.startsWith('/three/') ? THREE_DIR : SRC));
    res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.png') ? 'image/png' : 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, r));
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
await page.goto(`http://localhost:${server.address().port}/`);

// In the page: load, pose, flatten to world space, colour, split. Returns plain arrays.
const baked = await page.evaluate(async MODELS => {
  const THREE = await import('three'), { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader(), v = new THREE.Vector3(), w = new THREE.Vector4(), out = {}, pixels = new Map();
  const sample = (map, u, t) => { // palette texture at a UV; glTF textures are not flipped
    let d = pixels.get(map.image);
    if (!d) { const c = new OffscreenCanvas(map.image.width, map.image.height), g = c.getContext('2d'); g.drawImage(map.image, 0, 0); pixels.set(map.image, d = g.getImageData(0, 0, c.width, c.height)); }
    const x = Math.min(d.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * d.width))), y = Math.min(d.height - 1, Math.max(0, Math.floor((t - Math.floor(t)) * d.height))), k = (y * d.width + x) * 4;
    return [d.data[k], d.data[k + 1], d.data[k + 2]];
  };
  for (const [name, [file, o]] of Object.entries(MODELS)) {
    const g = await loader.loadAsync('/k/' + file);
    if (o.clip) {
      const clip = g.animations.find(a => a.name === o.clip);
      if (!clip) throw new Error(`${name}: no clip ${o.clip}`);
      const mixer = new THREE.AnimationMixer(g.scene); mixer.clipAction(clip).play(); mixer.setTime(0);
    }
    g.scene.rotation.y = o.turn || 0; g.scene.updateMatrixWorld(true);
    const parts = {}, part = (n, node) => parts[n] ||= { n, p: node ? node.getWorldPosition(new THREE.Vector3()).toArray() : [0, 0, 0], pos: [], col: [], idx: [] };
    let loose = 0;
    g.scene.traverse(m => {
      if (!m.isMesh) return;
      const P = m.geometry.attributes.position, UV = m.geometry.attributes.uv, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight;
      const mat = m.material, flat = mat.color.getHex(), at = new Array(P.count), index = m.geometry.index ? m.geometry.index.array : [...Array(P.count).keys()];
      for (let i = 0; i < P.count; i++) {
        let key = 'main', node = null;
        if (o.split && m.isSkinnedMesh) { // rigid limbs: each vertex follows one bone
          let best = 0; for (let k = 1; k < 4; k++) if (w.fromBufferAttribute(SW, i).getComponent(k) > w.getComponent(best)) best = k;
          if (w.getComponent(best) < 0.99) loose++;
          node = m.skeleton.bones[w.fromBufferAttribute(SI, i).getComponent(best)]; key = node.name;
        } else if (o.split) { node = m; key = m.name; }
        const q = part(key, node);
        if (m.isSkinnedMesh) m.getVertexPosition(i, v); else v.fromBufferAttribute(P, i);
        v.applyMatrix4(m.matrixWorld);
        at[i] = [q, q.pos.length / 3]; q.pos.push(v.x, v.y, v.z);
        q.col.push(...(mat.map && UV ? sample(mat.map, UV.getX(i), UV.getY(i)) : [flat >> 16, flat >> 8 & 255, flat & 255]));
      }
      for (let t = 0; t < index.length; t += 3) { // a triangle belongs to the part of its first corner
        const q = at[index[t]][0], tri = [0, 1, 2].map(k => at[index[t + k]]);
        if (tri.every(a => a[0] === q)) q.idx.push(...tri.map(a => a[1]));
        else for (const a of tri) { const s = a[0], j = a[1]; q.idx.push(q.pos.length / 3); q.pos.push(s.pos[j * 3], s.pos[j * 3 + 1], s.pos[j * 3 + 2]); q.col.push(s.col[j * 3], s.col[j * 3 + 1], s.col[j * 3 + 2]); }
      }
    });
    // Normalise: stand on y 0, centre on x and z, scale to the asked height or factor.
    const list = Object.values(parts).filter(q => q.idx.length), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const q of list) for (let i = 0; i < q.pos.length; i++) { lo[i % 3] = Math.min(lo[i % 3], q.pos[i]); hi[i % 3] = Math.max(hi[i % 3], q.pos[i]); }
    const s = o.h ? o.h / (hi[1] - lo[1]) : o.s || 1, off = [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2];
    for (const q of list) { q.p = q.p.map((c, k) => (c - off[k]) * s); q.pos = q.pos.map((c, i) => (c - off[i % 3]) * s - q.p[i % 3]); }
    out[name] = { parts: list, size: hi.map((c, k) => (c - lo[k]) * s), loose };
  }
  return out;
}, MODELS);
await browser.close(); server.close();

const head = {}, blocks = [];
for (const [name, m] of Object.entries(baked)) {
  if (m.loose) console.warn(`  ${name}: ${m.loose} vertices follow more than one bone (limbs may tear)`);
  head[name] = m.parts.map(q => {
    if (q.pos.length / 3 > 65535) throw new Error(`${name}/${q.n}: too many vertices for 16-bit indices`);
    const quantum = Math.max(1e-9, ...q.pos.map(Math.abs)) / 32767, even = b => Buffer.concat([b, Buffer.alloc(b.length & 1)]);
    blocks.push(Buffer.from(Int16Array.from(q.pos, c => Math.round(c / quantum)).buffer), Buffer.from(Uint16Array.from(q.idx).buffer), even(Buffer.from(Uint8Array.from(q.col))));
    return [q.n, ...q.p.map(c => +c.toFixed(4)), quantum, q.pos.length / 3, q.idx.length];
  });
  console.log(`  ${name.padEnd(22)} ${m.size.map(c => c.toFixed(2)).join(' x ')}  ${m.parts.map(q => `${q.n}:${q.idx.length / 3}`).join(' ')}`);
}
let json = Buffer.from(JSON.stringify(head)); if (json.length & 1) json = Buffer.concat([json, Buffer.from(' ')]);
const len = Buffer.alloc(4); len.writeUInt32LE(json.length);
const file = Buffer.concat([len, json, ...blocks]);
await writeFile(new URL('../models.bin', import.meta.url), file);
console.log(`models.bin: ${Object.keys(head).length} models, ${(file.length / 1024).toFixed(0)}KB`);
