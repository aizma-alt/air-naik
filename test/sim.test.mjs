// node test/sim.test.mjs : rule checks over many seeds. Exits non-zero on the first failure.
// createSim(seed, true) is the calm game (no pings, bolting or drifting) for the base rules; chaos is checked on top.
import assert from 'node:assert/strict';
import { ITEMS, NODES, T, BM, TUNE } from '../data.js';
import { createSim, spawn, step, tap, score, pathFrom, title } from '../sim.js';

const SEEDS = 200, DT = 1 / 30, SAFE = ['hand', 'para', 'boat'];
const roomOf = i => NODES[i.node].rooms[0];
const run = (s, until, each) => { while (!s.done && s.t < until) { each && each(s); step(s, DT); } return s; };
const slots = Object.keys(NODES).filter(k => NODES[k].slot);

// Returns a list of broken spawn rules (empty = good).
function checkSpawn(items) {
  const bad = [], ids = items.map(i => i.id), val = i => !i.d.decoy && i.id !== 'kucing' && i.d.nilai >= 5;
  if (items.length < 9 || items.length > 10) bad.push('count ' + items.length);
  if (new Set(ids).size !== ids.length) bad.push('duplicate item');
  if (new Set(items.map(i => i.node)).size !== items.length) bad.push('two items on one slot');
  for (const need of ['dokumen', 'kucing']) if (!ids.includes(need)) bad.push('missing ' + need);
  if (!items.some(i => i.d.wt === 3 && i.d.decoy)) bad.push('no decoy');
  for (const r of ['serambi', 'dapur']) if (!items.some(i => val(i) && roomOf(i) === r)) bad.push('no valuable in ' + r);
  for (const i of items) if (!NODES[i.node]?.slot || !pathFrom('home', i.node)) bad.push('unreachable ' + i.id);
  return bad;
}
const broken = spawn(1).filter(i => i.id !== 'dokumen').map(i => ({ ...i, node: 'b1' }));
assert.ok(checkSpawn(broken).length >= 4, 'checker accepted a bad spawn'); // the checker must be able to fail

// Things that must hold on every step of any run.
function invariants(s, tag) {
  const p = s.p, where = `${tag} t=${s.t.toFixed(1)}`;
  if (!p.link && p.lvl < 2) assert.ok(p.y + TUNE.height < TUNE.ceil[p.lvl] + 0.05, where + ': head through the ceiling');
  assert.notEqual(s.cat.loc, 'gone', where + ': the cat was swept away');
  if (s.cat.loc === 'run') assert.ok(s.cat.y > s.water - 0.2, where + ': the cat is running under water');
  else if (s.cat.loc === 'slot' && s.t < T.drift) seen.add(s.cat.node);
  if (s.ping) assert.ok(!p.lifted && !p.locked && s.t < T.drift + TUNE.pingTtl, where + ': message open while carried or boarding');
  assert.ok(p.hands.every(i => i.loc === 'hand') && s.items.filter(i => i.loc === 'hand').length === p.hands.length, where + ': hands out of sync');
  assert.ok(p.hands.length <= 2 && !(p.hands.length === 2 && p.hands.some(i => i.d.wt === 3)), where + ': too much in hand');
  const on = s.items.filter(i => i.loc === 'slot').map(i => i.node);
  assert.equal(new Set(on).size, on.length, where + ': two items on one slot');
  if (s.t >= T.max) assert.equal(p.lvl, 2, where + ': not on the roof at max water');
  if (s.boat.state === 'docked') assert.ok(s.t >= T.boat, where + ': boat docked early');
}

const cats = new Set(), counts = {}, seen = new Set();
let drifts = 0, bolts = 0, perched = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const items = spawn(seed);
  assert.deepEqual(checkSpawn(items), [], 'spawn seed ' + seed);
  cats.add(items.find(i => i.id === 'kucing').node);
  counts[items.length] = (counts[items.length] || 0) + 1;

  // Idle after one tap in the far corner, chaos on: carried to the roof, run ends on time, nothing scored, cat safe.
  let s = createSim(seed);
  step(s, 5); assert.equal(s.t, 0, 'clock ran before the first tap');
  assert.equal(s.pings.filter(g => g.kind === 'hoax').length, 1, 'not exactly one hoax');
  assert.ok(tap(s, 'slot', 's1'));
  const before = Object.fromEntries(s.items.map(i => [i.id, i.node]));
  run(s, T.drift - 0.1, s => invariants(s, 'idle ' + seed));
  drifts += s.items.filter(i => i.id !== 'kucing' && i.node !== before[i.id]).length;
  run(s, 999, s => invariants(s, 'idle ' + seed));
  assert.ok(s.t >= 78 && s.t <= 82.1, 'run length ' + s.t);
  assert.equal(score(s), 0, 'idle run scored');
  assert.ok(s.items.every(i => i.loc === (i.id === 'kucing' ? 'ikut' : 'gone')), 'idle run: items not swept, or cat not riding along');

  // Pest, chaos on: taps something random twice a second, answers messages at random.
  let n = seed * 7919;
  const rnd = k => (n = (n * 1103515245 + 12345) & 0x7fffffff) % k;
  s = createSim(seed); let next = 0;
  run(s, 999, s => {
    invariants(s, 'pest ' + seed);
    if (s.msg === BM.cat) bolts++, s.msg = '';
    if (s.t < next && s.started) return; next = s.t + 0.5;
    const what = rnd(5);
    if (s.ping && what < 3) tap(s, 'ping', ['ok', 'sebar', 'semak'][what]);
    else if (what === 0) tap(s, 'para'); else if (what === 1) tap(s, 'slot', slots[rnd(slots.length)]);
    else if (what === 2 && s.boat.state === 'docked') tap(s, 'boat');
    else tap(s, 'item', s.items[rnd(s.items.length)].id);
  });
  assert.ok(s.done && s.p.aboard && s.p.jacket, 'pest did not board');
  assert.equal(score(s), s.items.filter(i => SAFE.includes(i.loc)).reduce((a, i) => a + i.d.nilai, 0), 'score counts something outside hands, boat and roof deck');
  assert.ok(s.items.every(i => !['slot', 'perch', 'run'].includes(i.loc)), 'item left on a slot or the cat left behind at the end');
  perched += s.cat.loc === 'ikut';
}
assert.ok(cats.size >= 8, 'cat is not spread over slots: ' + cats.size);
assert.ok(drifts > SEEDS, 'floating items hardly drift: ' + drifts);
assert.ok(bolts > 10, 'the cat hardly ever bolts in random play: ' + bolts); // the chaser test below is the real check

// Same seed and same taps give the same run, chaos included.
const play = () => { const s = createSim(42); tap(s, 'item', 'dokumen'); run(s, 20, s => s.ping && tap(s, 'ping', 'ok')); tap(s, 'para'); run(s, 999); return JSON.stringify(s); };
assert.equal(play(), play(), 'not deterministic');
assert.notEqual(JSON.stringify(spawn(1)), JSON.stringify(spawn(2)), 'seed ignored');
assert.equal(JSON.stringify(createSim(9, true).items.map(i => i.node)), JSON.stringify(createSim(9).items.map(i => i.node)), 'chaos changed the spawn');

// Calm rules. A weight 3 item is dropped with "Terlalu berat!" once he floats, then swept away, not scored.
{
  const s = createSim(3, true), d = s.items.find(i => i.d.wt === 3);
  assert.ok(tap(s, 'item', d.id)); run(s, 25);
  assert.equal(d.loc, 'hand', 'did not pick up the decoy');
  assert.equal(tap(s, 'item', 'dokumen'), false, 'took a second item while carrying weight 3');
  assert.equal(s.msg, BM.full);
  run(s, 52, s => assert.ok(!(s.p.floating && d.loc === 'hand' && s.t > 51), 'still carrying weight 3 while floating'));
  assert.equal(d.loc, 'slot'); assert.ok(s.msgN > 1);
  run(s, 999); assert.equal(d.loc, 'gone'); assert.equal(score(s), 0);
}
// Items in hand at departure score. Banked before Amaran is recorded for the title.
{
  const s = createSim(5, true); tap(s, 'item', 'dokumen'); run(s, 999);
  assert.equal(score(s), 10, 'item in hands at departure not scored');
  assert.equal(tap(s, 'para'), false, 'tap accepted after the run ended');
  const e = createSim(5, true); tap(e, 'item', 'dokumen'); run(e, 12); tap(e, 'para'); run(e, 31);
  assert.equal(e.early, 10, 'early banked score not recorded');
}
// Messages: an open one blocks the house, closes by itself, and forwarding the hoax costs time.
{
  const until = (s, pred) => { while (!s.done && !pred(s)) step(s, DT); return s; }, hoax = s => s.ping && s.ping.kind === 'hoax';
  const s = createSim(11); tap(s, 'slot', 't1'); until(s, s => s.ping);
  assert.equal(s.ping.kind, 'chat');
  assert.equal(tap(s, 'item', 'dokumen'), false, 'tap went through an open message');
  assert.ok(tap(s, 'ping', 'ok')); assert.ok(tap(s, 'item', 'dokumen'), 'tap refused after closing the message');
  const h = createSim(11); tap(h, 'slot', 't1'); until(h, hoax);
  assert.ok(h.level === 2, 'hoax outside Amaran');
  run(h, h.t + TUNE.pingTtl + 0.2); assert.equal(h.ping, null, 'message did not close by itself');
  const f = createSim(11); tap(f, 'slot', 't1'); until(f, hoax);
  assert.ok(tap(f, 'ping', 'sebar')); assert.equal(f.msg, BM.sebar);
  assert.ok(tap(f, 'slot', 's1')); const x = f.p.x;
  run(f, f.t + TUNE.sebar - 0.2); assert.equal(f.p.x, x, 'walked while forwarding the hoax');
  run(f, f.t + 1); assert.notEqual(f.p.x, x, 'still frozen after forwarding');
}
// The cat bolts at least once from a determined chaser, and can still be caught.
{
  let caught = 0, bolted = 0; // it only bolts when a dry free slot exists, so not in every run
  for (let seed = 1; seed <= 40; seed++) {
    const s = createSim(seed); let ran = 0;
    run(s, 999, s => { if (s.msg === BM.cat) ran++, s.msg = ''; if (s.ping) tap(s, 'ping', 'ok'); else if (s.cat.loc === 'slot' && !s.p.intent) tap(s, 'item', 'kucing'); });
    if (SAFE.includes(s.cat.loc)) { caught++; bolted += ran >= 1; }
  }
  assert.ok(bolted >= caught * 0.8, `cat bolted in only ${bolted} of ${caught} catches`);
  assert.ok(caught >= 30, 'a determined chaser rarely catches the cat: ' + caught + '/40');
}

// Result titles, by priority.
{
  const seed = [...Array(50).keys()].find(n => createSim(n, true).items.some(i => i.id === 'ubat' || i.id === 'wang'));
  const s = createSim(seed, true), put = (f, loc) => s.items.filter(f).forEach(i => i.loc = loc);
  assert.equal(title(s), 'tabah');
  put(i => i.id === 'kucing', 'hand'); assert.equal(title(s), 'comot');
  put(i => i.d.decoy, 'para'); assert.equal(title(s), 'peti', 'a saved decoy outranks the cat');
  put(i => i.id === 'dokumen', 'boat'); assert.equal(title(s), 'peti', 'Dokumen without Ubat and Wang');
  put(i => i.id === 'ubat' || i.id === 'wang', 'para'); assert.equal(title(s), 'dokumen');
  s.early = score(s) / 2; assert.equal(title(s), 'dokumen', 'Beg Siap Awal at exactly half');
  s.early = score(s); assert.equal(title(s), 'awal');
}

console.log(`ok: ${SEEDS} seeds. items per run ${JSON.stringify(counts)}, cat slots used ${cats.size}/15, ${ITEMS.length} items defined`);
console.log(`chaos: ${drifts} drifts in idle runs, ${bolts} cat bolts in pest runs, cat rode along unsaved in ${perched}/${SEEDS} pest runs`);
