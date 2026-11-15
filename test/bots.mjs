// Bots that drive sim.js through tap() only. Pure, so the same file runs in Node and in the page.
import { NODES, ROOMS, T, TUNE } from '../data.js';
import { createSim, step, tap, score, sealed, routeLen, waterAt } from '../sim.js';

export const DT = 1 / 30;
const lvl = i => ROOMS[NODES[i.node].rooms[0]].lvl;
const SAFE = ['hand', 'para', 'boat'];
const free = s => { const p = s.p; return !p.intent && !p.path.length && p.busy <= 0 && p.stun <= 0 && !p.locked && !p.lifted && !p.aboard && p.node; };
const canTake = (p, i) => i.d.wt === 3 ? !p.hands.length : p.hands.length < 2 && !p.hands.some(h => h.d.wt === 3);
// When a level seals (taps there are refused from then on).
const sealAt = l => { for (let t = 0; t < 90; t += 0.1) if (sealed({ water: waterAt(t) }, l)) return t; return 99; };

// A bot is (s, mem) => void, called once it has been free (or a message has been open) for `react` seconds.
export function play(seed, bot, react = 0, calm = false) {
  const s = createSim(seed, calm), mem = { since: null };
  while (!s.done) {
    if (free(s) || s.ping) {
      if (mem.since === null) mem.since = s.t;
      if (!s.started || s.t - mem.since >= react) { bot(s, mem); mem.since = null; }
    } else mem.since = null;
    if (!s.started) break; // a bot that never taps: the clock never starts
    step(s, DT);
  }
  const all = s.items.reduce((a, i) => a + i.d.nilai, 0);
  return { score: score(s), all, t: s.t, savedAll: s.items.every(i => SAFE.includes(i.loc)), savedGood: s.items.every(i => i.d.decoy || SAFE.includes(i.loc)), s };
}

export const zero = () => {}; // no taps at all
export const minimal = (s, mem) => { if (!mem.done) { mem.done = tap(s, 'item', 'dokumen'); } else if (s.ping) tap(s, 'ping', 'ok'); }; // follows the first hint, then only closes messages

// Casual: nearest item, banks when hands are full, forwards the hoax, never plans.
export function casual(s) {
  const p = s.p;
  if (s.ping) return tap(s, 'ping', s.ping.kind === 'hoax' ? 'sebar' : 'ok');
  const c = s.items.filter(i => i.loc === 'slot' && !sealed(s, lvl(i)) && canTake(p, i)).sort((a, b) => routeLen(p.node, a.node) - routeLen(p.node, b.node));
  if (c.length && p.hands.length < 2 && s.t < T.drift) tap(s, 'item', c[0].id);
  else if (p.hands.length || p.lvl < 2) tap(s, 'para');
}

// Planner: value per second, optional staging in the Bilik, optional cat chase. best() takes the best of a grid per seed.
const planner = P => (s, mem) => {
  const p = s.p;
  if (s.ping) return tap(s, 'ping', 'semak');
  mem.staged ||= new Set(); mem.seal ||= [sealAt(0), sealAt(1)];
  const speed = TUNE.speed * Math.min(1, ...p.hands.map(i => TUNE.wt[i.d.wt - 1])) * 0.8; // rough, allows for wading
  const staging = P.stage && s.t < mem.seal[0] - 1;
  const eta = i => routeLen(p.node, i.node) / speed + TUNE.grab[i.d.wt - 1];
  const c = s.items.filter(i => i.loc === 'slot' && !i.d.decoy && (P.cat || i.id !== 'kucing') && canTake(p, i) && !sealed(s, lvl(i))
    && !(staging && (mem.staged.has(i.id) || lvl(i) === 1)) && s.t + eta(i) < Math.min(T.drift, mem.seal[lvl(i)]) - 0.3)
    .sort((a, b) => b.d.nilai / eta(b) ** P.beta - a.d.nilai / eta(a) ** P.beta);
  if (c.length && p.hands.length < 2 && (!p.hands.length || eta(c[0]) < P.detour)) return tap(s, 'item', c[0].id);
  if (p.hands.length) {
    const slot = staging && Object.keys(NODES).find(k => NODES[k].slot && NODES[k].rooms[0] === 'bilik' && !s.items.some(i => i.loc === 'slot' && i.node === k));
    if (slot) { mem.staged.add(p.hands[p.hands.length - 1].id); return tap(s, 'slot', slot); }
    return tap(s, 'para');
  }
  if (p.lvl < 2 && !c.length && !staging) tap(s, 'para');
  else if (!s.started) tap(s, 'para');
};
export const GRID = [];
for (const beta of [0, 1, 2]) for (const stage of [false, true]) for (const cat of [false, true]) for (const detour of [4, 99]) GRID.push({ beta, stage, cat, detour });
export function best(seed, react = 0.25) {
  let top = null;
  for (const P of GRID) { const r = play(seed, planner(P), react); if (!top || r.score > top.score) top = { ...r, P }; }
  return top;
}
