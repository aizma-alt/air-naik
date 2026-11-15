// node test/balance.mjs [seeds] : bot balance over many seeds. Pass lines were written before tuning; tune data.js, not these.
import assert from 'node:assert/strict';
import { TUNE } from '../data.js';
import { play, best, zero, minimal, casual } from './bots.mjs';

const N = +process.argv[2] || 100, seeds = Array.from({ length: N }, (_, i) => i + 1);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, pct = a => Math.round(mean(a.map(Number)) * 100);

const z = seeds.map(s => play(s, zero)), m = seeds.map(s => play(s, minimal)), c = seeds.map(s => play(s, casual, 1.0)), b = seeds.map(s => best(s));
const ratio = r => r.score / r.all;
console.log(`seeds ${N}, run length ${Math.min(...b.map(r => r.t)).toFixed(1)} to ${Math.max(...b.map(r => r.t)).toFixed(1)}s`);
console.log(`zero taps:      score 0 by construction (clock never starts): ${z.every(r => r.score === 0 && r.t === 0)}`);
console.log(`minimal effort: scores >0 in ${pct(m.map(r => r.score > 0))}% of seeds, mean ${mean(m.map(r => r.score)).toFixed(1)}`);
console.log(`casual (1.0s):  mean ${pct(c.map(ratio))}% of nilai, >0 in ${pct(c.map(r => r.score > 0))}% of seeds`);
console.log(`best (0.25s):   mean ${pct(b.map(ratio))}% of nilai (min ${Math.round(Math.min(...b.map(ratio)) * 100)}%, max ${Math.round(Math.max(...b.map(ratio)) * 100)}%), saved every item ${pct(b.map(r => r.savedAll))}%, every non-decoy ${pct(b.map(r => r.savedGood))}%`);

// Is the best bot strong? On an easy game (2.5x walking speed) it should clear every non-decoy item.
const speed = TUNE.speed; TUNE.speed = speed * 2.5;
const easy = seeds.slice(0, 40).map(s => best(s)); TUNE.speed = speed;
console.log(`best at 2.5x speed: every non-decoy saved in ${pct(easy.map(r => r.savedGood))}% of seeds`);

assert.ok(b.every(r => r.t >= 60 && r.t <= 90), 'run length outside 60 to 90s');
assert.ok(m.every(r => r.score > 0), 'minimal-effort bot scored 0 in some seed');
assert.ok(!b.some(r => r.savedAll), 'best bot saved every item in some seed');
assert.ok(mean(b.map(r => r.savedGood)) <= 0.2, 'best bot saves every non-decoy item too often');
assert.ok(mean(b.map(ratio)) >= 0.55 && mean(b.map(ratio)) <= 0.85, 'best bot mean outside 55 to 85%');
assert.ok(mean(c.map(ratio)) >= 0.25 && mean(c.map(ratio)) <= 0.65, 'casual bot mean outside 25 to 65%');
assert.ok(mean(c.map(r => r.score > 0)) >= 0.95, 'casual bot scores 0 too often');
assert.ok(mean(easy.map(r => r.savedGood)) >= 0.9, 'best bot is too weak to trust: it cannot clear the easy game');
console.log('balance ok');
