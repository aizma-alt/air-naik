// node test/sim.test.mjs : rule checks over many seeds. Exits non-zero on the first failure.
import assert from 'node:assert/strict';
import { ITEMS, NODES, ROOMS, T, BM } from '../data.js';
import { createSim, spawn, step, tap, score, pathFrom, sealed } from '../sim.js';

const SEEDS = 200, DT = 1 / 30;
const roomOf = i => NODES[i.node].rooms[0];
const run = (s, until, each) => { while (!s.done && s.t < until) { each && each(s); step(s, DT); } return s; };

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

// The checker must be able to fail.
const broken = spawn(1).filter(i => i.id !== 'dokumen').map(i => ({ ...i, node: 'b1' }));
assert.ok(checkSpawn(broken).length >= 4, 'checker accepted a bad spawn');

let cats = new Set(), counts = {}, greedy = [], total = [];
for (let seed = 1; seed <= SEEDS; seed++) {
  const items = spawn(seed);
  assert.deepEqual(checkSpawn(items), [], 'spawn seed ' + seed);
  cats.add(items.find(i => i.id === 'kucing').node);
  counts[items.length] = (counts[items.length] || 0) + 1;

  // Idle after one tap (far corner of the Serambi): lifted to the roof, never stuck, run ends on time.
  let s = createSim(seed);
  assert.equal(step(s, 5), undefined); assert.equal(s.t, 0, 'clock ran before the first tap');
  assert.ok(tap(s, 'slot', 's1'));
  run(s, T.max);
  assert.equal(s.p.lvl, 2, `idle seed ${seed}: not on the roof at max water (lvl ${s.p.lvl})`);
  assert.equal(s.boat.state, 'away', 'boat before max water');
  run(s, 999);
  assert.ok(s.t >= 78 && s.t <= 82.1, 'run length ' + s.t);
  assert.equal(score(s), 0, 'idle run scored');
  assert.ok(s.items.every(i => i.loc === 'gone'), 'idle run left items behind');

  // Pest: taps something random twice a second. Must not throw, must end on the roof and in the boat.
  let n = seed * 7919;
  const rnd = k => (n = (n * 1103515245 + 12345) & 0x7fffffff) % k;
  const slots = Object.keys(NODES).filter(k => NODES[k].slot);
  s = createSim(seed); let next = 0;
  run(s, T.max, s => {
    if (s.t < next && s.started) return; next = s.t + 0.5;
    const pickNow = rnd(4);
    if (pickNow === 0) tap(s, 'para'); else if (pickNow === 1) tap(s, 'slot', slots[rnd(slots.length)]);
    else tap(s, 'item', s.items[rnd(s.items.length)].id);
    const head = s.p.y + 1.4, c = [3.9, 6.1][s.p.lvl];
    if (!s.p.link && s.p.lvl < 2) assert.ok(head < c + 0.05, `pest seed ${seed}: head through the ceiling at t=${s.t.toFixed(1)}`);
  });
  assert.equal(s.p.lvl, 2, `pest seed ${seed}: not on the roof at max water`);
  run(s, 999, s => { if (s.boat.state === 'docked') tap(s, 'boat'); });
  assert.ok(s.done && s.p.aboard && s.p.jacket, 'pest did not board');
  const safe = s.items.filter(i => ['hand', 'para', 'boat'].includes(i.loc));
  assert.equal(score(s), safe.reduce((a, i) => a + i.d.nilai, 0), 'score counts something outside hands, boat and roof deck');
  assert.ok(s.items.every(i => i.loc !== 'slot'), 'item still on a slot at the end');

  // Greedy: best nilai per trip, bank on the roof deck. Only for numbers at the gate, balance is Stage 2.
  s = createSim(seed);
  run(s, 999, s => {
    const p = s.p;
    if (p.intent || p.path.length || p.busy > 0 || p.locked || p.lifted) return;
    const cand = s.items.filter(i => i.loc === 'slot' && !i.d.decoy && !sealed(s, ROOMS[roomOf(i)].lvl)).sort((a, b) => b.d.nilai - a.d.nilai);
    if (p.hands.length < 2 && cand.length && s.t < T.drift - 4) tap(s, 'item', cand[0].id);
    else if (p.hands.length) tap(s, 'para');
    else if (!s.started) tap(s, 'para');
  });
  greedy.push(score(s)); total.push(s.items.reduce((a, i) => a + i.d.nilai, 0));
}
assert.ok(cats.size >= 8, 'cat is not spread over slots: ' + cats.size);

// Same seed and same taps give the same run.
const play = () => { const s = createSim(42); tap(s, 'item', 'dokumen'); run(s, 20); tap(s, 'para'); run(s, 999); return JSON.stringify(s); };
assert.equal(play(), play(), 'not deterministic');
assert.notEqual(JSON.stringify(spawn(1)), JSON.stringify(spawn(2)), 'seed ignored');

// A weight 3 item is dropped with "Terlalu berat!" once he floats, and it is swept away, not scored.
{
  const s = createSim(3), d = s.items.find(i => i.d.wt === 3);
  assert.ok(tap(s, 'item', d.id)); run(s, 20);
  assert.equal(d.loc, 'hand', 'did not pick up the decoy');
  assert.equal(tap(s, 'item', 'dokumen'), false, 'took a second item while carrying weight 3');
  assert.equal(s.msg, BM.full);
  run(s, 52, s => assert.ok(!(s.p.floating && d.loc === 'hand' && s.t > 51), 'still carrying weight 3 while floating'));
  assert.equal(d.loc, 'slot'); assert.ok(s.msgN > 1);
  run(s, 999); assert.equal(d.loc, 'gone'); assert.equal(score(s), 0);
}
// Carrying Dokumen in hand to the end scores it; the boat tap banks it too.
{
  const s = createSim(5); tap(s, 'item', 'dokumen'); run(s, 999);
  assert.equal(score(s), 10, 'item in hands at departure not scored');
  assert.equal(tap(s, 'para'), false, 'tap accepted after the run ended');
}

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`ok: ${SEEDS} seeds. items per run ${JSON.stringify(counts)}, cat slots used ${cats.size}/15`);
console.log(`greedy bot score avg ${avg(greedy)} of avg ${avg(total)} available (min ${Math.min(...greedy)}, max ${Math.max(...greedy)}); idle bot 0`);
console.log(`items defined ${ITEMS.length}`);
