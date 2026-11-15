// sim.js: game state and rules. No Three.js, no DOM, no clock, no Math.random, so a bot can drive it.
// Use: s = createSim(seed); tap(s, kind, id); step(s, dt). Everything a renderer needs is on s.
import { ITEMS, ROOMS, NODES, LINKS, T, WATER, TUNE, BM, PINGS } from './data.js';

const IDS = Object.keys(NODES);
const SLOTS = IDS.filter(k => NODES[k].slot);
const room = k => ROOMS[NODES[k].rooms[0]];
const isLink = (a, b) => LINKS.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
const shared = (a, b) => NODES[a].rooms.find(r => NODES[b].rooms.includes(r));
const len = (a, b) => Math.hypot(NODES[a].x - NODES[b].x, NODES[a].z - NODES[b].z, isLink(a, b) ? room(a).y - room(b).y : 0);

// All-pairs shortest paths (Floyd-Warshall) over about 24 nodes.
const D = {}, NEXT = {};
for (const a of IDS) {
  D[a] = {}; NEXT[a] = {};
  for (const b of IDS) { const ok = a === b || isLink(a, b) || shared(a, b); D[a][b] = ok ? len(a, b) : Infinity; NEXT[a][b] = ok ? b : null; }
}
for (const k of IDS) for (const i of IDS) for (const j of IDS)
  if (D[i][k] + D[k][j] < D[i][j] - 1e-9) { D[i][j] = D[i][k] + D[k][j]; NEXT[i][j] = NEXT[i][k]; }
export const routeLen = (a, b) => D[a][b];
export function pathFrom(a, b) { const p = []; while (a !== b) { a = NEXT[a][b]; if (!a) return null; p.push(a); } return p; }

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 9 to 10 items. Always: Dokumen, Kucing (any slot), one decoy, a valuable in Serambi and one in Dapur.
export function spawn(seed) {
  const r = rng(seed), pick = a => a.splice(Math.floor(r() * a.length), 1)[0];
  const def = id => ITEMS.find(i => i.id === id);
  const valuable = i => !i.decoy && i.id !== 'kucing' && i.nilai >= TUNE.valuable;
  const pool = ITEMS.filter(i => i.id !== 'dokumen' && i.id !== 'kucing');
  const chosen = [def('dokumen'), def('kucing'), pick(pool.filter(i => i.decoy)), pick(pool.filter(valuable))];
  const rest = pool.filter(i => !chosen.includes(i)), count = 9 + Math.floor(r() * 2);
  while (chosen.length < count) chosen.push(pick(rest));
  const free = [...SLOTS], at = {};
  const put = (i, rm) => { at[i.id] = pick(free.filter(k => !rm || NODES[k].rooms[0] === rm)); free.splice(free.indexOf(at[i.id]), 1); };
  chosen.filter(i => i.decoy).forEach(i => put(i, i.room));
  const v = chosen.filter(valuable);
  put(pick(v), 'serambi'); put(pick(v), 'dapur');
  chosen.filter(i => !at[i.id]).forEach(i => put(i));
  // loc: slot, hand, para, boat, gone (swept away). The cat is never swept: perch (roof beam), then ikut (rides along, no score).
  return chosen.map(d => ({ id: d.id, d, node: at[d.id], loc: 'slot' }));
}

// calm = no chaos (pings, cat bolting, drifting items), for rule tests. Chaos has its own random stream, so spawns do not change.
export function createSim(seed, calm = false) {
  const h = NODES.home, items = spawn(seed), rnd = rng(seed ^ 0x9e3779b9), cat = items.find(i => i.id === 'kucing');
  const first = Math.floor(rnd() * BM.chats.length);
  const pings = calm ? [] : PINGS.map(([a, b, kind], n) => ({ t: a + rnd() * (b - a), kind, text: kind === 'hoax' ? BM.hoax : BM.chats[(first + n) % BM.chats.length] }));
  cat.flee = calm ? 0 : 1 + (rnd() < TUNE.flee2 ? 1 : 0);
  return {
    seed, calm, rnd, cat, pings, ping: null, early: 0, t: 0, started: false, done: false, water: WATER[0][1], level: 0, final: null,
    items, boat: { state: 'away', k: 0 }, msg: '', msgN: 0, held: false, banked: false,
    p: { x: h.x, z: h.z, y: ROOMS.tamu.y, room: 'tamu', lvl: 0, node: 'home', path: [], link: null, hands: [],
      busy: 0, stun: 0, intent: null, lifted: false, floating: false, locked: false, jacket: false, aboard: false },
  };
}

export function waterAt(t) {
  for (let i = 1; i < WATER.length; i++) if (t < WATER[i][0]) {
    const [t0, y0] = WATER[i - 1], [t1, y1] = WATER[i];
    return y0 + (y1 - y0) * (t - t0) / (t1 - t0);
  }
  return WATER[WATER.length - 1][1];
}
const say = (s, m) => { s.msg = m; s.msgN++; };
// A level is sealed once a floating head would be within liftMargin of its ceiling.
export const sealed = (s, lvl) => lvl < 2 && s.water - TUNE.neck + TUNE.height > TUNE.ceil[lvl] - TUNE.liftMargin;
const SAFE = ['hand', 'para', 'boat'];
export const score = s => s.final ?? s.items.reduce((a, i) => a + (SAFE.includes(i.loc) ? i.d.nilai : 0), 0);
// Result title id, by priority (names in BM.titles). awal: more than half the score was on the roof deck before Amaran.
// dokumen: Dokumen plus every one of Ubat and Wang that was in this house. comot: carried the cat. peti: saved a decoy.
export function title(s) {
  const safe = id => s.items.some(i => i.id === id && SAFE.includes(i.loc)), pair = ['ubat', 'wang'].filter(id => s.items.some(i => i.id === id));
  if (score(s) > 0 && s.early * 2 > score(s)) return 'awal';
  if (safe('dokumen') && pair.length && pair.every(safe)) return 'dokumen';
  if (safe('kucing')) return 'comot';
  if (s.items.some(i => i.d.decoy && SAFE.includes(i.loc))) return 'peti';
  return 'tabah';
}
const canHold = (p, i) => i.d.wt === 3 ? !p.hands.length && !p.floating : p.hands.length < 2 && !p.hands.some(h => h.d.wt === 3);
const used = (s, k) => s.items.some(i => i.loc === 'slot' && i.node === k);
const lose = i => i.id === 'kucing' ? 'perch' : 'gone';
const wet = (s, k) => s.water > room(k).y + 0.15;
function freeSlot(s, ok) { const c = SLOTS.filter(k => !used(s, k) && ok(k)); return c[Math.floor(s.rnd() * c.length)]; }
function moveItem(s, i, to) { // the item changed slot: a player already heading for it follows
  i.node = to;
  if (s.p.intent && s.p.intent.item === i && !s.p.lifted) { s.p.intent.ready = false; s.p.busy = 0; go(s, to); }
}

// Where an item on a slot sits: on the floor, or floating at the surface under the ceiling.
export function itemPos(s, i) {
  const n = NODES[i.node], r = room(i.node);
  return { x: n.x, z: n.z, y: Math.max(r.y, Math.min(s.water, TUNE.ceil[r.lvl] - 0.4)) };
}

function floorY(p) {
  if (p.link) { const a = room(p.link.a).y; return a + (room(p.link.b).y - a) * p.link.k; }
  if (p.lvl) return ROOMS[p.room].y;
  for (const r of Object.values(ROOMS)) if (!r.lvl && p.x < r.x1) return r.y; // ground rooms, in x order
  return ROOMS.dapur.y;
}

function go(s, target) {
  const p = s.p;
  if (p.link) p.path = [p.link.b, ...pathFrom(p.link.b, target)]; // finish the stairs or ladder first
  else if (p.node) p.path = pathFrom(p.node, target);
  else { // mid room: head straight for whichever node of this room gives the shortest route
    let best, cost = Infinity;
    for (const k of IDS) if (NODES[k].rooms.includes(p.room)) {
      const c = Math.hypot(NODES[k].x - p.x, NODES[k].z - p.z) + D[k][target];
      if (c < cost) { cost = c; best = k; }
    }
    p.path = [best, ...pathFrom(best, target)];
  }
}

// kind: 'item' (id), 'slot' (node id), 'para', 'boat'. Returns true if the tap was accepted.
export function tap(s, kind, id) {
  const p = s.p;
  if (s.done) return false;
  if (kind === 'ping') { // id: 'sebar' forwards the hoax and costs time; anything else closes it for free
    const g = s.ping;
    if (!g) return false;
    s.ping = null;
    if (g.kind === 'hoax') { if (id === 'sebar') { p.stun = TUNE.sebar; say(s, BM.sebar); } else say(s, BM.semak); }
    return true;
  }
  if (s.ping || p.locked || p.lifted || p.aboard) return false; // an open message blocks the house
  let target, intent;
  if (kind === 'item') {
    const i = s.items.find(x => x.id === id);
    if (!i || i.loc !== 'slot') return false;
    if (sealed(s, room(i.node).lvl)) return say(s, BM.deep), false;
    if (!canHold(p, i)) return say(s, i.d.wt === 3 && p.floating ? BM.heavy : BM.full), false;
    target = i.node; intent = { k: 'grab', item: i };
  } else if (kind === 'slot') {
    if (!NODES[id] || !NODES[id].slot) return false;
    if (sealed(s, room(id).lvl)) return say(s, BM.deep), false;
    target = id; intent = { k: 'slot', node: id };
  } else if (kind === 'para') { target = 'pa'; intent = { k: 'para' }; }
  else if (kind === 'boat' && s.boat.state === 'docked') { target = 'dock'; intent = { k: 'boat' }; }
  else return false;
  s.started = true; // the clock starts on the first tap
  p.intent = intent; p.busy = 0;
  go(s, target);
  return true;
}

// Forced drop (too heavy to float with): nearest free slot on the same level.
function release(s, i) {
  const p = s.p;
  p.hands.splice(p.hands.indexOf(i), 1);
  const cost = k => Math.hypot(NODES[k].x - p.x, NODES[k].z - p.z) + (used(s, k) ? 100 : 0) + (room(k).lvl !== p.lvl ? 1000 : 0);
  i.node = SLOTS.reduce((a, b) => cost(b) < cost(a) ? b : a);
  i.loc = s.t >= T.drift ? lose(i) : 'slot';
}

function arrive(s) {
  const p = s.p, it = p.intent;
  p.lifted = false;
  if (it && it.k === 'grab' && !it.ready && it.item.loc === 'slot') {
    const i = it.item, to = i.flee > 0 && freeSlot(s, k => k !== i.node && !wet(s, k) && !sealed(s, room(k).lvl) && room(k).lvl >= room(i.node).lvl);
    if (to) { i.flee--; i.node = to; p.intent = null; say(s, BM.cat); } // the cat bolts; he has to go after it again
    else { it.ready = true; p.busy = TUNE.grab[i.d.wt - 1]; }
  } else act(s);
}

function act(s) {
  const p = s.p, it = p.intent;
  p.intent = null;
  if (!it) return;
  if (it.k === 'grab') {
    const i = it.item;
    if (i.loc !== 'slot') return;
    if (!canHold(p, i)) return say(s, i.d.wt === 3 ? BM.heavy : BM.full);
    i.loc = 'hand'; p.hands.push(i); s.held = true;
  } else if (it.k === 'slot') { // put down the last item picked up
    if (!p.hands.length || used(s, it.node)) return;
    const i = p.hands.pop();
    i.node = it.node; i.loc = s.t >= T.drift ? lose(i) : 'slot';
  } else if (it.k === 'para' || (it.k === 'boat' && s.boat.state === 'docked')) {
    for (const i of p.hands) i.loc = it.k;
    if (p.hands.length) s.banked = true;
    p.hands = [];
  }
}

function move(s, dt) {
  const p = s.p, depth = s.water - floorY(p);
  p.floating = depth >= TUNE.chest;
  const heavy = p.floating && p.hands.find(i => i.d.wt === 3);
  if (heavy) { release(s, heavy); say(s, BM.heavy); }
  // Never stuck: when the water nears the ceiling it carries him up the stairs or the hatch.
  if (!p.link && !p.lifted && !p.locked && sealed(s, p.lvl)) {
    p.lifted = true; p.intent = null; p.busy = 0; p.stun = 0; s.ping = null;
    go(s, p.lvl ? 'ht' : 'st'); say(s, BM.lift);
  }
  if (p.link && !p.lifted && sealed(s, room(p.link.b).lvl)) { // on the way down into a level that just sealed: the water turns him back
    p.link = { a: p.link.b, b: p.link.a, k: 1 - p.link.k }; p.path = [p.link.b];
    p.lifted = true; p.intent = null; p.busy = 0; p.stun = 0; s.ping = null; say(s, BM.lift);
  }
  if (p.stun > 0) p.stun -= dt; // typing on the phone
  else if (p.busy > 0) { p.busy -= dt; if (p.busy <= 0) act(s); }
  else {
    const wade = depth <= 0 ? 1 : (TUNE.wade.find(w => depth < w[0]) || [0, TUNE.float])[1];
    let left = dt * (p.lifted ? TUNE.lift : TUNE.speed * wade * Math.min(1, ...p.hands.map(i => TUNE.wt[i.d.wt - 1])));
    while (left > 1e-9 && p.path.length) {
      const to = p.path[0], N = NODES[to];
      if (p.link || (p.node && isLink(p.node, to))) { // stairs or ladder: cannot turn back midway
        if (!p.link) { p.link = { a: p.node, b: to, k: 0 }; p.node = null; }
        const A = NODES[p.link.a], L = len(p.link.a, to) / (p.lifted ? 1 : TUNE.climb), need = (1 - p.link.k) * L;
        if (left >= need) {
          left -= need; p.link = null; p.node = to; p.room = N.rooms[0]; p.lvl = ROOMS[p.room].lvl;
          p.x = N.x; p.z = N.z; p.path.shift();
        } else { p.link.k += left / L; left = 0; p.x = A.x + (N.x - A.x) * p.link.k; p.z = A.z + (N.z - A.z) * p.link.k; }
      } else {
        if (p.node) { p.room = shared(p.node, to); p.lvl = ROOMS[p.room].lvl; p.node = null; }
        const dx = N.x - p.x, dz = N.z - p.z, d = Math.hypot(dx, dz);
        if (left >= d) { left -= d; p.x = N.x; p.z = N.z; p.node = to; p.path.shift(); }
        else { p.x += dx / d * left; p.z += dz / d * left; left = 0; }
      }
    }
    if (!p.path.length && p.node && (p.intent || p.lifted)) arrive(s);
  }
  p.y = Math.max(floorY(p), s.water - TUNE.neck);
}

function chaos(s) {
  const p = s.p, c = s.cat;
  // No deaths: the cat keeps ahead of the water by itself. Up a level if it can, else onto the roof beam (safe, not scored).
  if (c.loc === 'slot' && s.water > room(c.node).y - 0.05) {
    const up = freeSlot(s, k => room(k).lvl > room(c.node).lvl && s.water < room(k).y - 0.3);
    if (up) moveItem(s, c, up); else { c.loc = 'perch'; say(s, BM.catUp); }
  }
  if (s.calm) return;
  if (s.ping && s.t >= s.ping.until) s.ping = null;
  while (s.pings.length && s.t >= s.pings[0].t) {
    const g = s.pings.shift();
    if (!p.lifted && !p.locked) s.ping = { kind: g.kind, text: g.text, until: s.t + TUNE.pingTtl };
  }
  const taking = p.intent && p.intent.ready && p.intent.item; // fair: what he is already picking up does not float off
  for (const i of s.items) if (i.loc === 'slot' && i !== c && i !== taking && wet(s, i.node) && !sealed(s, room(i.node).lvl)) { // floating items wander
    if (i.next === undefined) i.next = s.t + TUNE.drift[0] + s.rnd() * TUNE.drift[1];
    else if (s.t >= i.next) {
      i.next = s.t + TUNE.drift[0] + s.rnd() * TUNE.drift[1];
      const to = freeSlot(s, k => room(k).lvl === room(i.node).lvl && wet(s, k));
      if (to) moveItem(s, i, to);
    }
  }
}

export function step(s, dt) {
  if (s.done || !s.started) return;
  dt = Math.min(dt, 0.1);
  const t0 = s.t, t = s.t += dt, p = s.p, at = x => t0 < x && t >= x;
  s.water = waterAt(t);
  s.level = T.levels.filter(x => t >= x).length - 1;
  if (at(T.levels[2])) s.early = s.items.reduce((a, i) => a + (i.loc === 'para' ? i.d.nilai : 0), 0); // banked before Amaran
  if (at(T.drift)) for (const i of s.items) if (i.loc === 'slot') i.loc = lose(i); // swept away
  chaos(s);
  if (t >= T.boat - T.boatIn && t < T.boat) { s.boat.state = 'arriving'; s.boat.k = (t - T.boat + T.boatIn) / T.boatIn; }
  if (at(T.boat)) { s.boat.state = 'docked'; say(s, BM.boat); }
  if (at(T.move)) { p.locked = true; p.intent = null; p.busy = 0; p.stun = 0; s.ping = null; go(s, 'dock'); say(s, BM.move); }
  if (at(T.jacket)) { p.jacket = true; say(s, BM.jacket); }
  if (at(T.board)) { p.aboard = true; if (s.cat.loc === 'perch') s.cat.loc = 'ikut'; s.final = score(s); s.boat.state = 'leaving'; say(s, BM.pps); }
  if (t >= T.board) s.boat.k = Math.min(1, (t - T.board) / (T.end - T.board));
  if (at(T.end)) s.done = true;
  if (!p.aboard) move(s, dt);
}
