// render.js: Three.js view of a sim. Flat-colour boxes merged into a few meshes, sticker labels, one rain draw call.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH, BOAT, CAM } from './data.js';
import { itemPos } from './sim.js';

const C = { ground: 0x3f5a38, mud: 0x5d4c33, floor: 0xd2a868, deck: 0xe0b877, wall: 0xf3e6c8, trim: 0x8a5a3c, stilt: 0x5b4030, roof: 0xb0452f, pad: 0xe9cf9a,
  water: 0xa5814f, glow: 0xffd98a, skin: 0xd9a066, hair: 0x2a2320, shirt: 0x2a9d8f, pants: 0x30475e, coat: 0xf2c14e, jacket: 0xff6b00, hull: 0xd9572b, inner: 0xf5ead6,
  leaf: 0x3f7d4a, rain: 0xcfe2ee, arrow: 0xffe14d };
// Item models: lists of boxes [colour, x0, x1, y0, y1, z0, z1], base at y 0. No asset files.
const SHAPES = {
  dokumen: [[0xf2c14e, -.26, .26, 0, .1, -.19, .19], [0xfff8e1, -.22, .22, .1, .14, -.15, .15]],
  ubat: [[0xf7f7f2, -.2, .2, 0, .28, -.15, .15], [0xd62828, -.07, .07, .28, .3, -.15, .15], [0xd62828, -.2, .2, .28, .3, -.05, .05]],
  wang: [[0x5a9e4b, -.2, .2, 0, .12, -.12, .12], [0xe9f5db, -.2, .2, .05, .08, -.125, .125]],
  lampu: [[0xf4d35e, -.1, .1, 0, .2, -.25, .15], [0x333333, -.13, .13, 0, .26, .15, .27]],
  radio: [[0x9c6644, -.26, .26, 0, .3, -.1, .1], [0x333333, .16, .19, .3, .62, -.02, .02], [0xe9d8a6, -.2, 0, .06, .24, .1, .11]],
  bateri: [[0x2d6a4f, -.14, .14, 0, .34, -.14, .14], [0xcfcfcf, -.06, .06, .34, .4, -.06, .06]],
  wisel: [[0xee964b, -.12, .12, 0, .14, -.12, .12], [0x333333, .12, .2, .04, .1, -.04, .04]],
  air: [[0x8ecae6, -.18, .18, 0, .5, -.18, .18], [0x1d6fa5, -.08, .08, .5, .62, -.08, .08]],
  makanan: [[0xc1121f, -.26, -.02, 0, .3, -.12, .12], [0xe9c46a, .02, .26, 0, .3, -.12, .12], [0xe8e8e8, -.26, -.02, .3, .32, -.12, .12]],
  pakaian: [[0xb5838d, -.3, .3, 0, .14, -.24, .24], [0x6d9dc5, -.28, .28, .14, .26, -.22, .22], [0xf3e6c8, -.26, .26, .26, .36, -.2, .2]],
  kucing: [[0xf28f3b, -.28, .16, .1, .34, -.11, .11], [0xf28f3b, .12, .38, .2, .48, -.13, .13], [0xf28f3b, .16, .23, .48, .57, -.13, -.06], [0xf28f3b, .16, .23, .48, .57, .06, .13],
    [0xf28f3b, -.34, -.28, .28, .6, -.03, .03], [0xf28f3b, -.26, -.18, 0, .1, -.1, .1], [0xf28f3b, .06, .14, 0, .1, -.1, .1], [0x5a3a22, .38, .39, .28, .4, -.06, .06]],
  peti: [[0xe8eef0, -.36, .36, 0, 1.35, -.33, .33], [0x9aa7ad, -.36, .36, .85, .88, .33, .34], [0x9aa7ad, .2, .26, .95, 1.2, .33, .37]],
  tv: [[0x2b2d42, -.5, .5, .12, .72, -.1, .1], [0x5fa8d3, -.44, .44, .18, .66, .1, .115], [0x2b2d42, -.2, .2, 0, .12, -.14, .14]],
};
const MAN = (shirt, pants) => [[pants, -.21, .21, 0, .45, -.15, .15], [shirt, -.25, .25, .45, .95, -.17, .17], [C.skin, -.18, .18, .97, 1.33, -.18, .18], [C.hair, -.19, .19, 1.3, 1.42, -.19, .19],
  [shirt, -.37, -.25, .5, .92, -.07, .07], [shirt, .25, .37, .5, .92, -.07, .07]];
const { serambi: S, tamu: R, dapur: K, bilik: B, para: P } = ROOMS, Z = DEPTH, Y = new THREE.Vector3(0, 1, 0);

// Merges boxes into one geometry with vertex colours, so a whole model is one draw call.
const U = new THREE.BoxGeometry(1, 1, 1), UP = U.attributes.position, UN = U.attributes.normal;
function batch() {
  const pos = [], nor = [], col = [], idx = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const add = (colour, x0, x1, y0, y1, z0, z1, rx = 0, ry = 0, rz = 0) => { // extents, then a turn about the box centre
    q.setFromEuler(e.set(rx, ry, rz));
    m.compose(a.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q, b.set(x1 - x0, y1 - y0, z1 - z0));
    const base = pos.length / 3; c.set(colour);
    for (let i = 0; i < UP.count; i++) {
      a.fromBufferAttribute(UP, i).applyMatrix4(m); pos.push(a.x, a.y, a.z);
      a.fromBufferAttribute(UN, i).applyQuaternion(q); nor.push(a.x, a.y, a.z);
      col.push(c.r, c.g, c.b);
    }
    for (const k of U.index.array) idx.push(base + k);
    return api;
  };
  const mesh = material => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return new THREE.Mesh(g, material);
  };
  const api = { add, mesh, all: list => { for (const s of list) add(...s); return api; } };
  return api;
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // opaque: the ground fills the view, so no page compositing
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // phone dpr is 3.25
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d3344);
  scene.add(new THREE.HemisphereLight(0xcfe0ee, 0x6b5d4a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1dd, 1.6); sun.position.set(5, 9, 7); scene.add(sun); // three flat tones per box
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  const lit = new THREE.MeshBasicMaterial({ vertexColors: true }); // window light, unlit

  // House that stays in the cutaway, plus yard.
  const h = batch(), up = batch(), sh = batch(), glowIn = batch(), glowOut = batch();
  h.add(C.ground, -40, 50, -0.3, 0, -40, 50);
  for (const [x, z, w, d] of [[1.2, 5.2, 1.6, 1], [6.5, 4.6, 2.2, 1.2], [-2.2, 2, 1.2, 1.6], [10.6, 1, 1.4, 1]]) h.add(C.mud, x, x + w, 0, 0.02, z, z + d); // puddles
  for (const r of [S, R, K]) {
    h.add(C.floor, r.x0, r.x1, r.y - 0.15, r.y, 0, Z);
    for (const x of [r.x0 + 0.15, r.x1 - 0.15]) for (const z of [0.15, Z - 0.15]) h.add(C.stilt, x - 0.1, x + 0.1, 0, r.y - 0.15, z - 0.1, z + 0.1);
  }
  for (let i = 0; i < 3; i++) h.add(C.trim, 0.7, 1.9, 0, S.y - 0.25 - i * 0.25, Z + i * 0.3, Z + 0.3 + i * 0.3); // front steps
  const hole = [3.4, 5.8, 0.75]; // stairwell in the Bilik floor: x0, x1, z1. Upper floors are see-through.
  up.add(C.floor, B.x0, B.x1, B.y - 0.15, B.y, hole[2], Z).add(C.floor, B.x0, hole[0], B.y - 0.15, B.y, 0, hole[2]).add(C.floor, hole[1], B.x1, B.y - 0.15, B.y, 0, hole[2]);
  h.add(C.wall, S.x0, S.x1, S.y, S.y + 0.6, -0.1, 0).add(C.wall, -0.1, 0, S.y, S.y + 0.6, 0, Z); // Serambi railing
  h.add(C.wall, R.x0, R.x1, R.y, P.y, -0.1, 0).add(C.wall, K.x0, K.x1, K.y, K.y + 2.2, -0.1, 0).add(C.wall, B.x0 - 0.1, B.x0, B.y, P.y, 0, Z);
  h.add(C.trim, R.x0, R.x1, B.y - 0.15, B.y, -0.12, 0).add(C.trim, K.x0, K.x1, K.y + 2.1, K.y + 2.2, -0.12, 0.02); // timber bands
  const sb = NODES.sb, st = NODES.st, run = sb.x - st.x, rise = B.y - R.y, len = Math.hypot(run, rise), mx = (sb.x + st.x) / 2, my = (R.y + B.y) / 2;
  h.add(C.trim, mx - len / 2, mx + len / 2, my - 0.12, my, sb.z - 0.35, sb.z + 0.35, 0, 0, -Math.atan2(rise, run)); // stairs as a ramp
  for (let i = 0; i < 2; i++) h.add(C.stilt, NODES.hb.x - 0.25 + i * 0.44, NODES.hb.x - 0.19 + i * 0.44, B.y, P.y + 0.4, NODES.hb.z - 0.44, NODES.hb.z - 0.38); // ladder rails
  for (let y = B.y + 0.3; y < P.y + 0.3; y += 0.4) h.add(C.stilt, NODES.hb.x - 0.22, NODES.hb.x + 0.22, y, y + 0.06, NODES.hb.z - 0.44, NODES.hb.z - 0.38);
  const PERCH = [4.6, P.y + 1.62, Z / 2]; // roof beam that stays in the cutaway: where the cat waits if nobody carries it
  h.add(C.stilt, P.x0, P.x1, P.y + 1.5, PERCH[1], Z / 2 - 0.08, Z / 2 + 0.08);
  for (const x of [P.x0 + 0.08, P.x1 - 0.08]) h.add(C.stilt, x - 0.07, x + 0.07, P.y, P.y + 1.5, Z / 2 - 0.07, Z / 2 + 0.07);
  for (const k in NODES) if (NODES[k].slot) { const n = NODES[k], y = ROOMS[n.rooms[0]].y; h.add(C.pad, n.x - 0.33, n.x + 0.33, y, y + 0.02, n.z - 0.33, n.z + 0.33); } // mats = places to put things
  h.add(C.stilt, -2.1, -1.8, 0, 7.6, -1.6, -1.3, 0, 0, 0.05); // coconut palm behind the house
  for (let i = 0; i < 5; i++) h.add(C.leaf, -3.2, -1.0, 7.5, 7.58, -1.7, -1.2, 0, i * 1.257, 0.35);
  glowIn.add(C.glow, 4.3, 5.4, B.y + 0.8, B.y + 1.7, 0, 0.02).add(C.glow, 7.1, 8.1, K.y + 0.9, K.y + 1.7, 0, 0.02); // lit windows on the back wall
  const house = new THREE.Group(), shell = new THREE.Group();
  const deck = new THREE.Mesh(U, new THREE.MeshLambertMaterial({ color: C.deck, transparent: true, opacity: 0.85, depthWrite: false })); // own mesh: pulses for the second hint
  deck.scale.set(P.x1 - P.x0, 0.15, Z); deck.position.set((P.x0 + P.x1) / 2, P.y - 0.075, Z / 2);
  house.add(h.mesh(solid), up.mesh(glass), glowIn.mesh(lit), deck);

  // Shell: roofs and the walls facing the camera. Drops away at Mula.
  sh.add(C.wall, S.x0, S.x1, S.y, S.y + 0.6, Z, Z + 0.1);
  for (const x of [0.1, 2.3]) sh.add(C.stilt, x - 0.08, x + 0.08, S.y, S.y + 2.3, Z - 0.18, Z - 0.02);
  sh.add(C.roof, -0.4, S.x1, S.y + 2.3, S.y + 2.45, -0.4, Z + 0.4);
  sh.add(C.wall, R.x0, R.x1, R.y, P.y, Z, Z + 0.1).add(C.wall, R.x0 - 0.1, R.x0, R.y, B.y, 0, Z).add(C.wall, R.x1, R.x1 + 0.1, R.y, P.y, 0, Z);
  sh.add(C.wall, K.x0, K.x1, K.y, K.y + 2.2, Z, Z + 0.1).add(C.wall, K.x1, K.x1 + 0.1, K.y, K.y + 2.2, 0, Z);
  sh.add(C.roof, K.x0, K.x1 + 0.4, K.y + 2.2, K.y + 2.35, -0.4, Z + 0.4);
  sh.add(C.trim, R.x0, R.x1, B.y - 0.15, B.y, Z, Z + 0.13).add(C.trim, 4.7, 5.5, R.y, R.y + 1.7, Z + 0.1, Z + 0.13); // band and front door
  for (const side of [-1, 1]) { // gable over the Para
    const cx = (R.x0 + R.x1) / 2, w = (R.x1 - R.x0 + 0.8) / 2, cz = Z / 2 + side * 0.95;
    sh.add(C.roof, cx - w, cx + w, P.y + 0.75, P.y + 0.87, cz - 1.25, cz + 1.25, side * Math.atan2(1.6, 1.9));
  }
  glowOut.add(C.glow, 3.0, 4.1, R.y + 0.8, R.y + 1.7, Z + 0.1, Z + 0.12).add(C.glow, 3.4, 5.1, B.y + 0.7, B.y + 1.6, Z + 0.1, Z + 0.12)
    .add(C.glow, 7.0, 8.0, K.y + 0.8, K.y + 1.6, Z + 0.1, Z + 0.12).add(C.glow, K.x1 + 0.1, K.x1 + 0.12, K.y + 0.8, K.y + 1.6, 1, 2).add(C.glow, R.x1 + 0.1, R.x1 + 0.12, B.y + 0.7, B.y + 1.6, 0.9, 2.1);
  shell.add(sh.mesh(solid), glowOut.mesh(lit));
  scene.add(house, shell);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ color: C.water, transparent: true, opacity: 0.8, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(5, 0, 5); scene.add(water);

  // Rain: one LineSegments. Every streak is drawn twice, one loop height apart, so the loop is seamless.
  const DROPS = 240, LOOP = 16, rp = [];
  for (let i = 0; i < DROPS; i++) {
    const x = -9 + Math.random() * 27, z = -9 + Math.random() * 22, y = Math.random() * LOOP;
    for (const o of [0, LOOP]) rp.push(x, y + o, z, x - 0.12, y + o - 0.75, z);
  }
  const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)),
    new THREE.LineBasicMaterial({ color: C.rain, transparent: true, opacity: 0.35, depthWrite: false }));
  rain.frustumCulled = false; scene.add(rain);

  const man = batch().all(MAN(C.shirt, C.pants)).mesh(solid); scene.add(man);
  const jacket = new THREE.Mesh(U, new THREE.MeshLambertMaterial({ color: C.jacket })); jacket.scale.set(0.58, 0.46, 0.42); jacket.position.y = 0.72; man.add(jacket);
  const boat = new THREE.Group(); scene.add(boat);
  boat.add(batch().add(C.hull, -1.15, 1.15, -0.25, 0.05, -0.55, 0.55).add(C.inner, -1.05, 1.05, 0.05, 0.08, -0.45, 0.45).add(C.hull, -1.15, 1.15, 0.05, 0.28, 0.47, 0.55).add(C.hull, -1.15, 1.15, 0.05, 0.28, -0.55, -0.47)
    .add(C.hull, 1.15, 1.5, -0.15, 0.2, -0.35, 0.35).all(MAN(C.coat, C.pants).slice(0, 5).map(([c, x0, x1, ...r]) => [c, x0 - 0.75, x1 - 0.75, ...r])).mesh(solid)); // hull, bow, and the jiran in a raincoat
  const wave = new THREE.Mesh(U.clone().translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: C.coat })); // the jiran's arm, pivot at the shoulder
  wave.scale.set(0.12, 0.45, 0.14); wave.position.set(-0.75 + 0.31, 0.88, 0); boat.add(wave);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 4), new THREE.MeshBasicMaterial({ color: C.arrow, depthTest: false, transparent: true })); arrow.rotation.x = Math.PI; arrow.renderOrder = 9; scene.add(arrow); // hint pointer, always on top

  const stickers = {};
  function sticker(ch) { // white cutout disc with the emoji on it
    if (stickers[ch]) return stickers[ch];
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(48, 48, 43, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = '#1d2b36'; g.stroke();
    g.font = '50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return stickers[ch] = new THREE.SpriteMaterial({ map: t, alphaTest: 0.5 });
  }

  const yawR = CAM.yaw * Math.PI / 180, RX = Math.cos(yawR), RZ = -Math.sin(yawR); // screen right, in world x and z
  boat.rotation.y = yawR;
  let leave = 0, sim, meshes = new Map(), time = 0, mode = 'land', yaw = 0, yaw0 = 0, yawT = 0, cut = 1, lastX = 0, lastZ = 0, face = 0;
  function setSim(s) {
    for (const m of meshes.values()) { scene.remove(m); m.children[0].geometry.dispose(); }
    meshes = new Map(); sim = s; leave = 0;
    for (const i of s.items) {
      const g = new THREE.Group(), shape = SHAPES[i.id], top = Math.max(...shape.map(b => b[4]));
      g.add(batch().all(shape).mesh(solid));
      const sp = new THREE.Sprite(sticker(i.d.icon)); sp.scale.setScalar(i.d.wt === 3 ? 0.8 : 0.62); sp.position.y = top + 0.42; g.add(sp);
      g.userData = { h: top, gone: 0, snap: true }; scene.add(g); meshes.set(i.id, g);
    }
  }

  // skip = Main Semula: straight to the cutaway.
  function begin(skip) {
    const turn = Math.PI * 2;
    mode = 'play'; yaw0 = yaw; yawT = yawR + turn * Math.round((yaw - yawR) / turn); cut = skip ? 1 : 0;
    if (skip) { yaw = yawT; shell.visible = false; }
  }

  function resize() {
    const w = canvas.clientWidth, ht = canvas.clientHeight;
    if (!w || !ht) return;
    renderer.setSize(w, ht, false);
    const halfH = Math.max(CAM.view / 2 / (w / ht), 7), halfW = halfH * w / ht; // fit the width, keep the full height in view
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  const quality = k => { renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * k); resize(); }; // slow phone: draw fewer pixels

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
    rain.position.y = -((time * 15) % LOOP);
    arrow.visible = false;
    if (sim) {
      const p = sim.p, b = sim.boat, pulse = 0.5 + 0.5 * Math.sin(time * 7);
      rain.material.opacity = 0.3 + 0.08 * sim.level; // heavier as the alert rises
      water.position.y = sim.water;
      boat.visible = b.state !== 'away';
      leave = b.state === 'leaving' ? leave + dt : 0; // keeps drifting behind the end screen
      const along = b.state === 'arriving' ? -BOAT.from * (1 - b.k) ** 1.6 : leave * leave * BOAT.accel; // tiles toward screen right
      boat.position.set(BOAT.x + along * RX, sim.water + 0.2 + Math.sin(time * 2.2) * 0.04, BOAT.z + along * RZ);
      boat.updateMatrixWorld();
      wave.rotation.z = -0.5 + Math.sin(time * 9) * 0.4; // the jiran waves
      const moved = Math.hypot(p.x - lastX, p.z - lastZ) > 1e-4;
      if (moved) face = Math.atan2(p.x - lastX, p.z - lastZ); // turn to where he walks
      lastX = p.x; lastZ = p.z;
      if (p.aboard) { boat.localToWorld(man.position.set(0.2, 0.08, 0)); man.rotation.y = yawR + Math.PI / 2; }
      else { man.position.set(p.x, p.y + (moved && !p.floating ? Math.abs(Math.sin(time * 11)) * 0.07 : p.floating ? Math.sin(time * 3) * 0.05 : 0), p.z); man.rotation.y = face; }
      jacket.visible = p.jacket;
      deck.material.emissive.setScalar(hint === 'para' ? 0.35 * pulse : 0);
      if (hint === 'para') { arrow.visible = true; arrow.position.set(4.6, P.y + 1.1 + pulse * 0.3, 2.3); }
      let np = 0, nb = 0;
      for (const i of sim.items) {
        const g = meshes.get(i.id), u = g.userData;
        g.scale.setScalar(1);
        if (i.loc === 'slot') {
          const q = itemPos(sim, i), afloat = q.y > ROOMS[NODES[i.node].rooms[0]].y;
          v.set(q.x, q.y + (afloat ? Math.sin(time * 2 + q.x) * 0.05 - Math.min(u.h * 0.4, 0.3) : 0), q.z);
          g.position.lerp(v, u.snap ? 1 : Math.min(1, dt * 5)); u.snap = false; // glides when it drifts or the cat bolts
          g.rotation.set(0, afloat ? Math.sin(time * 0.7 + q.z) * 0.4 : 0, afloat ? Math.sin(time * 1.6 + q.x) * 0.08 : 0);
          if (hint === 'item' && i.id === 'dokumen') { g.scale.setScalar(1 + 0.25 * pulse); arrow.visible = true; arrow.position.set(g.position.x, g.position.y + u.h + 1.15 + pulse * 0.3, g.position.z); }
        } else if (i.loc === 'hand') {
          const k = p.hands.indexOf(i);
          g.position.copy(man.position).add((i.d.wt === 3 ? v.set(0, 1.45, 0) : v.set(k ? 0.44 : -0.44, 0.5, 0.12)).applyAxisAngle(Y, man.rotation.y));
          g.rotation.set(0, man.rotation.y, 0);
        } else if (i.loc === 'para' && !p.aboard) { g.position.set(3.5 + (np % 5) * 0.55, P.y, 0.4 + Math.floor(np / 5) * 0.6); g.rotation.set(0, 0, 0); np++; }
        else if (i.loc === 'boat' || i.loc === 'para') { // what he saved goes with him
          boat.localToWorld(g.position.set(-0.1 + (nb % 3) * 0.42, 0.08, (Math.floor(nb / 3) - 0.5) * 0.4)); nb++; }
        else if (i.loc === 'perch') { g.position.lerp(v.set(...PERCH), Math.min(1, dt * 5)); g.rotation.set(0, 0, 0); }
        else if (i.loc === 'ikut') boat.localToWorld(g.position.set(0.75, 0.08, 0.2));
        else { // gone: drifts off and shrinks
          u.gone = Math.min(1, u.gone + dt / 2.5);
          g.position.x += dt * 1.6 * RX; g.position.z += dt * 1.6 * RZ; g.position.y = sim.water - 0.2;
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
  return { setSim, begin, frame, pick, resize, quality, toScreen, boatAt: () => toScreen(boat.position.x, boat.position.y, boat.position.z), info: () => renderer.info.render };
}
