// render.js: Three.js view of a sim. Greybox: plain boxes, one water plane, emoji sprites as labels.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH, BOAT, CAM } from './data.js';
import { itemPos } from './sim.js';

const C = { ground: 0x51684a, floor: 0xa9825a, deck: 0xc9a56b, wall: 0xd8c9a3, stilt: 0x6b4f3a, roof: 0x8c3b2e, pad: 0xe6d3a8, water: 0x3f88c5, skin: 0xe0ac69, shirt: 0x2a9d8f, jacket: 0xff6b00, boat: 0x7f4f24, sky: 0x1d3344 };
const SIZE = [[0.4, 0.4, 0.4], [0.55, 0.5, 0.55], [0.8, 1.3, 0.7]]; // item box by weight
const { serambi: S, tamu: R, dapur: K, bilik: B, para: P } = ROOMS, Z = DEPTH;

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // phone dpr is 3.25
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  scene.add(new THREE.HemisphereLight(0xdcecf5, 0x4a5a48, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(3, 10, 6); scene.add(sun);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);

  const unit = new THREE.BoxGeometry(1, 1, 1), mats = {};
  const mat = (c, o = 1) => mats[c + '/' + o] ||= new THREE.MeshLambertMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o === 1 });
  const box = (parent, c, x0, x1, y0, y1, z0, z1, o) => { // by extents
    const m = new THREE.Mesh(unit, mat(c, o));
    m.scale.set(x1 - x0, y1 - y0, z1 - z0); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m); return m;
  };
  const cube = (parent, c, w, h, d, x, y, z) => box(parent, c, x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2); // by size, y = base

  // House that stays in the cutaway.
  const house = new THREE.Group(), shell = new THREE.Group();
  scene.add(house, shell);
  box(scene, C.ground, -40, 50, -0.3, 0, -40, 50);
  for (const r of [S, R, K]) {
    box(house, C.floor, r.x0, r.x1, r.y - 0.15, r.y, 0, Z);
    for (const x of [r.x0 + 0.15, r.x1 - 0.15]) for (const z of [0.15, Z - 0.15]) cube(house, C.stilt, 0.2, r.y - 0.15, 0.2, x, 0, z);
  }
  const hole = [3.4, 5.8, 0.75]; // stairwell in the Bilik floor: x0, x1, z1. Upper floors are see-through.
  box(house, C.floor, B.x0, B.x1, B.y - 0.15, B.y, hole[2], Z, 0.5);
  box(house, C.floor, B.x0, hole[0], B.y - 0.15, B.y, 0, hole[2], 0.5);
  box(house, C.floor, hole[1], B.x1, B.y - 0.15, B.y, 0, hole[2], 0.5);
  const deck = box(house, C.deck, P.x0, P.x1, P.y - 0.15, P.y, 0, Z, 0.6);
  deck.material = deck.material.clone(); // pulses for the second hint
  box(house, C.wall, S.x0, S.x1, S.y, S.y + 0.6, -0.1, 0); box(house, C.wall, -0.1, 0, S.y, S.y + 0.6, 0, Z); // Serambi railing
  box(house, C.wall, R.x0, R.x1, R.y, P.y, -0.1, 0); // back wall, Ruang Tamu and Bilik
  box(house, C.wall, K.x0, K.x1, K.y, K.y + 2.2, -0.1, 0);
  box(house, C.wall, B.x0 - 0.1, B.x0, B.y, P.y, 0, Z);
  const sb = NODES.sb, st = NODES.st, run = sb.x - st.x, rise = B.y - R.y; // stairs as a ramp
  const ramp = cube(house, C.stilt, Math.hypot(run, rise), 0.12, 0.7, (sb.x + st.x) / 2, (R.y + B.y) / 2 - 0.06, sb.z);
  ramp.rotation.z = -Math.atan2(rise, run);
  cube(house, C.stilt, 0.5, P.y - B.y + 0.4, 0.08, NODES.hb.x, B.y, NODES.hb.z - 0.4); // hatch ladder
  for (const k in NODES) if (NODES[k].slot) cube(house, C.pad, 0.7, 0.03, 0.7, NODES[k].x, ROOMS[NODES[k].rooms[0]].y, NODES[k].z);

  // Shell: roofs and the walls facing the camera. Drops away at Mula.
  box(shell, C.wall, S.x0, S.x1, S.y, S.y + 0.6, Z, Z + 0.1);
  for (const x of [0.1, 2.3]) cube(shell, C.stilt, 0.15, 2.3, 0.15, x, S.y, Z - 0.1);
  box(shell, C.roof, -0.4, S.x1, S.y + 2.3, S.y + 2.45, -0.4, Z + 0.4);
  box(shell, C.wall, R.x0, R.x1, R.y, P.y, Z, Z + 0.1);
  box(shell, C.wall, R.x0 - 0.1, R.x0, R.y, B.y, 0, Z);
  box(shell, C.wall, R.x1, R.x1 + 0.1, R.y, P.y, 0, Z);
  box(shell, C.wall, K.x0, K.x1, K.y, K.y + 2.2, Z, Z + 0.1);
  box(shell, C.wall, K.x1, K.x1 + 0.1, K.y, K.y + 2.2, 0, Z);
  box(shell, C.roof, K.x0, K.x1 + 0.4, K.y + 2.2, K.y + 2.35, -0.4, Z + 0.4);
  for (const side of [-1, 1]) { // gable over the Para
    const m = cube(shell, C.roof, R.x1 - R.x0 + 0.8, 0.12, 2.5, (R.x0 + R.x1) / 2, P.y + 0.75, Z / 2 + side * 0.95);
    m.rotation.x = side * Math.atan2(1.6, 1.9);
  }

  const water = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ color: C.water, transparent: true, opacity: 0.55, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(5, 0, 5); scene.add(water);

  const man = new THREE.Group(); scene.add(man);
  cube(man, C.shirt, 0.5, 1.0, 0.35, 0, 0, 0); cube(man, C.skin, 0.4, 0.4, 0.4, 0, 1.0, 0);
  const jacket = cube(man, C.jacket, 0.58, 0.55, 0.43, 0, 0.4, 0);
  const boat = new THREE.Group(); scene.add(boat);
  cube(boat, C.boat, 2.0, 0.4, 1.1, 0, -0.15, 0); cube(boat, C.skin, 0.4, 0.9, 0.35, 0.7, 0.25, 0); // hull and the jiran

  const icons = {};
  function icon(ch) { // emoji label; shortcut: system emoji, replaced by cutout art in Stage 3
    if (icons[ch]) return icons[ch];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.font = '46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 36);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return icons[ch] = new THREE.SpriteMaterial({ map: t, alphaTest: 0.4 });
  }

  const yawR = CAM.yaw * Math.PI / 180, RX = Math.cos(yawR), RZ = -Math.sin(yawR); // screen right, in world x and z
  boat.rotation.y = yawR;
  let leave = 0, sim, meshes = new Map(), time = 0, mode = 'land', yaw = 0, yaw0 = 0, yawT = 0, cut = 1;
  function setSim(s) {
    for (const m of meshes.values()) scene.remove(m);
    meshes = new Map(); sim = s; leave = 0;
    for (const i of s.items) {
      const g = new THREE.Group(), [w, h, d] = SIZE[i.d.wt - 1];
      cube(g, i.d.c, w, h, d, 0, 0, 0);
      const sp = new THREE.Sprite(icon(i.d.icon)); sp.scale.setScalar(0.75); sp.position.y = h + 0.4; g.add(sp);
      g.userData = { h, gone: 0 }; scene.add(g); meshes.set(i.id, g);
    }
  }

  // skip = Main Semula: straight to the cutaway.
  function begin(skip) {
    const base = CAM.yaw * Math.PI / 180, turn = Math.PI * 2;
    mode = 'play'; yaw0 = yaw; yawT = base + turn * Math.round((yaw - base) / turn); cut = skip ? 1 : 0;
    if (skip) { yaw = yawT; shell.visible = false; }
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const halfH = Math.max(CAM.view / 2 / (w / h), 7), halfW = halfH * w / h; // fit the width, keep the full height in view
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const target = new THREE.Vector3(4.5, 3.7, 1.5), v = new THREE.Vector3();
  function frame(dt, hint) {
    time += dt;
    if (mode === 'land') yaw += CAM.orbit * dt;
    else if (cut < 1) {
      cut = Math.min(1, cut + dt / CAM.cut);
      const e = cut * cut * (3 - 2 * cut);
      yaw = yaw0 + (yawT - yaw0) * e; shell.position.y = -9 * e;
      if (cut === 1) shell.visible = false;
    }
    const pitch = CAM.pitch * Math.PI / 180;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(50).add(target);
    cam.lookAt(target);
    if (sim) {
      const p = sim.p, b = sim.boat, pulse = 0.5 + 0.5 * Math.sin(time * 7);
      water.position.y = sim.water;
      boat.visible = b.state !== 'away';
      leave = b.state === 'leaving' ? leave + dt : 0; // keeps drifting behind the end screen
      const along = b.state === 'arriving' ? -BOAT.from * (1 - b.k) ** 1.6 : leave * leave * BOAT.accel; // tiles toward screen right
      boat.position.set(BOAT.x + along * RX, sim.water + 0.15, BOAT.z + along * RZ);
      if (p.aboard) man.position.copy(boat.position).add(v.set(-0.4, 0.2, 0)); else man.position.set(p.x, p.y, p.z);
      jacket.visible = p.jacket;
      deck.material.emissive.setScalar(hint === 'para' ? 0.4 * pulse : 0);
      let np = 0, nb = 0;
      for (const i of sim.items) {
        const g = meshes.get(i.id), u = g.userData;
        g.scale.setScalar(hint === 'item' && i.id === 'dokumen' ? 1 + 0.35 * pulse : 1);
        if (i.loc === 'slot') {
          const q = itemPos(sim, i), afloat = q.y > ROOMS[NODES[i.node].rooms[0]].y;
          g.position.set(q.x, q.y + (afloat ? Math.sin(time * 2 + q.x) * 0.05 - u.h * 0.4 : 0), q.z);
        } else if (i.loc === 'hand') {
          const k = p.hands.indexOf(i);
          g.position.copy(man.position).add(i.d.wt === 3 ? v.set(0, 1.45, 0) : v.set(k ? 0.42 : -0.42, 0.5, 0.2));
        } else if (i.loc === 'para') { g.position.set(3.5 + (np % 5) * 0.55, P.y, 0.35 + Math.floor(np / 5) * 0.55); np++; }
        else if (i.loc === 'boat') { g.position.copy(boat.position).add(v.set((nb % 3 - 1.4) * 0.45, 0.25, (Math.floor(nb / 3) - 0.5) * 0.45)); nb++; }
        else { // gone: drifts off and shrinks
          u.gone = Math.min(1, u.gone + dt / 2.5);
          g.position.x += dt * 1.6; g.position.z += dt * 0.8; g.position.y = sim.water - u.h * 0.4;
          g.scale.setScalar(1 - u.gone);
        }
        g.visible = !(i.loc === 'gone' && u.gone >= 1);
      }
    }
    renderer.render(scene, cam);
  }

  // Tap picking: nearest target centre on screen, each with its own reach (items a bit more than slots).
  // Then anywhere on the roof deck. Boxes along a ray let items steal taps meant for the empty slot beside them.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), b3 = new THREE.Box3(), hit = new THREE.Vector3();
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect(), px = r.height / (cam.top - cam.bottom), used = {}; // px per tile
    let best = null, bd = 1;
    const near = (x, y, z, reach, o) => { const q = toScreen(x, y, z), d = Math.hypot(q.x - cx, q.y - cy) / (reach * px); if (d < bd) { bd = d; best = o; } };
    for (const i of sim.items) if (i.loc === 'slot') {
      const g = meshes.get(i.id);
      near(g.position.x, g.position.y + g.userData.h / 2 + 0.2, g.position.z, i.d.wt === 3 ? 1 : 0.75, { kind: 'item', id: i.id });
      used[i.node] = 1;
    }
    for (const k in NODES) if (NODES[k].slot && !used[k]) near(NODES[k].x, ROOMS[NODES[k].rooms[0]].y, NODES[k].z, 0.6, { kind: 'slot', id: k });
    if (sim.boat.state === 'docked') near(boat.position.x, boat.position.y + 0.2, boat.position.z, 1.3, { kind: 'boat' });
    if (best) return best;
    ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, cam);
    b3.min.set(P.x0, P.y - 0.15, 0); b3.max.set(P.x1, P.y + 0.6, Z);
    return ray.ray.intersectBox(b3, hit) ? { kind: 'para' } : null;
  }

  // World point to client pixels (tests, overlays).
  function toScreen(x, y, z) {
    const r = canvas.getBoundingClientRect(); v.set(x, y, z).project(cam);
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }
  return { setSim, begin, frame, pick, resize, toScreen, boatAt: () => toScreen(boat.position.x, boat.position.y, boat.position.z) };
}
