// audio.js: every sound can be made here with Web Audio alone. Created on the Mula tap (browsers need a tap before sound).
// Music is a quiet pentatonic loop that speeds up with the alert level. Mute is remembered.
// load() then swaps in the recorded CC0 files in sounds/ (see CREDITS.md) one by one; a file that fails keeps its synthesized sound.
const FILES = { rain: 'rain.mp3', water: 'water.ogg', crickets: 'crickets.mp3', thunder: 'thunder.ogg', step1: 'step1.ogg', step2: 'step2.ogg', step3: 'step3.ogg', wade1: 'wade1.ogg', wade2: 'wade2.ogg', meow: 'meow.ogg', splash: 'splash.wav', frog: 'frog.wav',
  uiClick: 'click.ogg', uiPick: 'pick.ogg', uiPut: 'put.ogg', uiBank: 'bank.ogg', uiGood: 'good.ogg', uiNo: 'no.ogg', uiDing: 'ding.ogg', uiWin: 'win.ogg' };
const BEDS = { rain: [0.18, 0.28, 0.4, 0.5], water: [0.0001, 0.1, 0.22, 0.35], crickets: [1, 0.3, 0.0001, 0.0001] }; // looping files: gain at each alert level
const REC = { step: [['step1', 1.2], ['step2', 0.45], ['step3', 0.63]], slosh: [['wade1', 1.25], ['wade2', 1]], cat: [['meow', 0.63]], splash: [['splash', 0.63]], thunder: [['thunder', 0.45, 0.6]],
  tap: [['uiClick', 0.15]], click: [['uiClick', 0.3]], grab: [['uiPick', 0.3]], drop: [['uiPut', 0.3]], bank: [['uiBank', 0.35]], good: [['uiGood', 0.3]], no: [['uiNo', 0.3]], ping: [['uiDing', 0.4]], win: [['uiWin', 0.55]] }; // effect: takes of [file, gain, start at]; gains even out how loud the files were recorded
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99]; // A minor pentatonic
const TUNE = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 7, 5, 4, 2, 0, 2, 4, 2, 5, 7, 8, 7, 5, 4, 2, 4, 1, 2, 0, -1]; // -1 = rest

export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), out = ctx.createGain();
  let muted = false, level = 0, step = 0, next = ctx.currentTime + 0.4;
  try { muted = localStorage.getItem('airnaik-mute') === '1'; } catch { /* private mode: not remembered */ }
  out.gain.value = muted ? 0 : 0.9; out.connect(ctx.destination);

  const tone = (f, at, dur, type = 'triangle', vol = 0.2, slideTo) => { // one enveloped note, at = seconds from now
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.03);
  };
  const hiss = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = hiss.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = (freq, vol, dur) => { // filtered noise: a burst if dur is given, else a loop (returns its gain)
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = hiss; s.loop = !dur; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.5;
    g.gain.setValueAtTime(vol, t); if (dur) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); if (dur) s.stop(t + dur + 0.05);
    return g;
  };
  const rain = noise(2600, 0.035), heavy = noise(900, 0.0001), flow = noise(260, 0.0001); // light rain; heavy rain and flood water come in with the alert
  let motor = null;
  const buf = {}, beds = {}; // decoded files, and the gain of each looping one
  const shot = (name, vol, from = 0, at = 0) => { // one recorded effect; natural sounds are pitched a little differently each time
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf[name]; s.playbackRate.value = name.startsWith('ui') ? 1 : 0.94 + Math.random() * 0.12; g.gain.value = vol; s.connect(g).connect(out); s.start(ctx.currentTime + at, from);
  };

  const SFX = {
    tap: () => tone(700, 0, 0.06, 'sine', 0.1),
    grab: () => { tone(523, 0, 0.09, 'triangle', 0.22); tone(784, 0.07, 0.14, 'triangle', 0.22); },
    drop: () => tone(200, 0, 0.16, 'sine', 0.3, 110),
    bank: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.2)),
    no: () => tone(170, 0, 0.2, 'square', 0.07, 120),
    alert: () => { for (let i = 0; i <= level; i++) { const f = 780 + level * 90; tone(f, i * 0.26, 0.12, 'square', 0.06); tone(f * 0.75, i * 0.26 + 0.12, 0.12, 'square', 0.06); } }, // more beeps, and higher, as it gets worse
    step: () => noise(320, 0.09, 0.07), slosh: () => noise(1100, 0.12, 0.22), whoosh: () => noise(1800, 0.1, 0.35),
    good: () => { tone(784, 0, 0.1, 'sine', 0.18); tone(1175, 0.09, 0.22, 'sine', 0.18); },
    click: () => { tone(1500, 0, 0.03, 'square', 0.08); tone(900, 0.05, 0.04, 'square', 0.08); },
    sweep: () => { noise(500, 0.3, 1.6); tone(140, 0, 1.4, 'sine', 0.12, 60); },
    thunder: () => { noise(90, 0.5, 2.4); noise(180, 0.25, 1.2); },
    ping: () => { tone(1175, 0, 0.12, 'sine', 0.22); tone(1568, 0.1, 0.28, 'sine', 0.2); },
    cat: () => { tone(620, 0, 0.16, 'sawtooth', 0.05, 880); tone(880, 0.16, 0.3, 'sawtooth', 0.05, 520); },
    splash: () => noise(800, 0.35, 0.6),
    horn: () => { tone(155, 0, 0.8, 'sawtooth', 0.1); tone(233, 0, 0.8, 'sawtooth', 0.07); },
    win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.34, 'triangle', 0.22)),
  };

  // Music scheduler: plucks a little ahead of the clock so timing stays steady when frames stutter.
  setInterval(() => {
    if (ctx.state !== 'running') { next = ctx.currentTime + 0.2; return; }
    while (next < ctx.currentTime + 0.35) {
      const n = TUNE[step % TUNE.length], at = Math.max(0, next - ctx.currentTime);
      if (n >= 0) tone(SCALE[n] * 2, at, 0.42, 'triangle', 0.055);
      if (step % 8 === 0) tone(SCALE[[0, 3, 2, 4][(step / 8) % 4 | 0]] / 2, at, 0.9, 'sine', 0.09);
      if (level === 0 && buf.frog && step % 16 === 9 && Math.random() < 0.5) { shot('frog', 0.1, 0, at); shot('frog', 0.08, 0, at + 0.4); }
      if (level === 0 && !beds.crickets && step % 4 === 2) for (let i = 0; i < 3; i++) tone(4300, at + i * 0.045, 0.03, 'sine', 0.012); // crickets, until the rain drowns them
      step++; next += 60 / (88 + level * 14) / 2;
    }
  }, 100);
  document.addEventListener('visibilitychange', () => document.hidden ? ctx.suspend() : ctx.resume());

  const api = {
    play: name => {
      if (ctx.state !== 'running') return;
      const takes = (REC[name] || []).filter(r => buf[r[0]]);
      if (takes.length) shot(...takes[Math.random() * takes.length | 0]); else if (SFX[name]) SFX[name]();
    },
    level: l => { // rain, flood water and tempo follow the alert; a recorded loop takes over from its synthesized layer
      level = l; const set = (g, v) => g.gain.setTargetAtTime(v, ctx.currentTime, 0.8);
      set(rain, beds.rain ? 0.0001 : 0.035 + l * 0.012); set(heavy, beds.rain ? 0.0001 : [0.0001, 0.01, 0.035, 0.06][l]); set(flow, beds.water ? 0.0001 : [0.0001, 0.02, 0.05, 0.08][l]);
      for (const k in beds) set(beds[k], BEDS[k][l]);
    },
    load: dir => Promise.all(Object.entries(FILES).map(async ([name, file]) => { // resolves to how many files are in use
      try {
        const r = await fetch(dir + file); if (!r.ok) throw 0;
        const b = await ctx.decodeAudioData(await r.arrayBuffer()); if (!b) throw 0;
        buf[name] = b;
        if (BEDS[name]) {
          const s = ctx.createBufferSource(), g = beds[name] = ctx.createGain(), d = b.getChannelData(0), sr = b.sampleRate;
          const zero = i => { while (i < d.length - 2 && !(d[i] <= 0 && d[i + 1] > 0)) i++; return i / sr; }; // next upward zero crossing: a loop joined there does not click
          s.buffer = b; s.loop = true; g.gain.value = 0.0001;
          if (file.endsWith('.mp3')) { s.loopStart = zero(0.15 * sr | 0); s.loopEnd = zero((b.duration - 0.3) * sr | 0); } // a cut MP3 has a rough first frame and padding at the end, so loop inside it; the OGG loops whole
          s.connect(g).connect(out); s.start(0, s.loopStart); api.level(level);
        }
      } catch { /* this one stays synthesized */ }
    })).then(() => Object.keys(buf).length),
    motor(on) { // the boat engine: a low buzz that fades in and out
      if (on && !motor) {
        const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 92; l.frequency.value = 17; lg.gain.value = 0.02; g.gain.value = 0.0001;
        l.connect(lg).connect(g.gain); o.connect(g).connect(out); o.start(); l.start(); g.gain.setTargetAtTime(0.045, ctx.currentTime, 1.5); motor = { o, l, g };
      } else if (!on && motor) { const m = motor; motor = null; m.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 1.2); setTimeout(() => { m.o.stop(); m.l.stop(); }, 6000); }
    },
    get muted() { return muted; },
    toggle() { muted = !muted; out.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.03); try { localStorage.setItem('airnaik-mute', muted ? '1' : '0'); } catch { /* fine */ } return muted; },
  };
  return api;
}
