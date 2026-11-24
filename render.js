// render.js: Three.js view of a sim. Geometry comes from models.js; this file is camera, light, animation and picking.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH, BOAT as DOCK, CAM } from './data.js';
import { itemPos } from './sim.js';
import { blobMesh, C, SHAPES, PERCH, batch, buildVillage, buildHouse, BODY, ARM, SARONG, NEIGHBOUR, BOAT, SONGKOK, baju, loadPack, furnish } from './models.js';

const { para: P } = ROOMS, Z = DEPTH, Y = new THREE.Vector3(0, 1, 0);
const HOUSE = new THREE.Vector3(4.5, 3.7, 1.5), VILLAGE = new THREE.Vector3(4.5, 2.0, 3.2); // camera targets: game, landing
const SW = { x0: -16, x1: 22, z0: -18, z1: 16 }, FLOW = SW.x1 - SW.x0; // the patch around the house that gets ripples and streaks
const PACKED = { kucing: 'cat', peti: 'peti', tv: 'tv', radio: 'radio' }; // items that have a baked model

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // opaque: the ground fills the view
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // phone dpr is 3.25
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d3344);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fb37a, 1.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.1); // one shadow light; three flat tones per box
  sun.position.set(13, 18, 12); sun.target.position.set(4.5, 0, 1.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  scene.add(sun, sun.target);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
  const lit = new THREE.MeshBasicMaterial({ vertexColors: true }); // window light, unlit
  const shellMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }), shellLit = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }); // fade at Mula
  const shade = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
  // Rim for what must pop against the water (the man, the boat, what he carries): a back-face copy pushed out along smoothed normals, so box corners stay closed.
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, side: THREE.BackSide });
  rimMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute vec3 onormal;\nvoid main() {').replace('#include <begin_vertex>', 'vec3 transformed = position + onormal * 0.045;'); };
  rimMat.customProgramCacheKey = () => 'rim';
  function smooth(g) {
    if (g.attributes.onormal) return g;
    const p = g.attributes.position, n = g.attributes.normal, sum = new Map(), key = i => Math.round(p.getX(i) * 400) + ',' + Math.round(p.getY(i) * 400) + ',' + Math.round(p.getZ(i) * 400), out = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = key(i), a = sum.get(k) || sum.set(k, [0, 0, 0]).get(k); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
    for (let i = 0; i < p.count; i++) { const a = sum.get(key(i)), l = Math.hypot(...a) || 1; out.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
    return g.setAttribute('onormal', new THREE.BufferAttribute(out, 3));
  }
  function rim(root) { // returns the outline meshes so a caller can switch them
    const ms = []; root.traverse(o => o.isMesh && !o.userData.rim && ms.push(o));
    return ms.map(m => { const e = new THREE.Mesh(smooth(m.geometry), rimMat); e.userData.rim = true; m.add(e); return e; });
  }

  const [vb, vlit, vblobs] = buildVillage(), hb = buildHouse();
  const soft = document.createElement('canvas'); soft.width = 128; soft.height = 64; // blob atlas, white with soft alpha
  { const x = soft.getContext('2d'), g = x.createRadialGradient(96, 32, 0, 96, 32, 31);
    x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 11; x.shadowOffsetX = 1000; x.fillRect(15 - 1000, 15, 34, 34); x.shadowBlur = 0; x.shadowOffsetX = 0;
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(64, 0, 64, 64); }
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: new THREE.CanvasTexture(soft), vertexColors: true, transparent: true, depthWrite: false });
  blobMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.a *= vColor.r;'); }; // vertex colour = blob strength, used as alpha
  blobMat.customProgramCacheKey = () => 'blob';
  const blobs = blobMesh(vblobs, blobMat); blobs.renderOrder = -1;
  const shell = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: C.deck, transparent: true, opacity: 0.85, depthWrite: false })); // own mesh: pulses for the second hint
  deck.scale.set(P.x1 - P.x0, 0.15, Z); deck.position.set((P.x0 + P.x1) / 2, P.y - 0.075, Z / 2); deck.receiveShadow = true;
  shell.add(shade(hb.sh.mesh(shellMat)), hb.glowOut.mesh(shellLit));
  const standIn = shade(hb.f.mesh(solid));
  scene.add(shade(vb.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, shadowSide: THREE.FrontSide }))), // open batch: front faces cast
     vlit.mesh(lit), blobs, shade(hb.h.mesh(solid)), standIn, shade(hb.up.mesh(glass), false), hb.glow.mesh(lit), deck, shell);

  // Flood: the whole village under one opaque, unlit mud plane (light, so lit wood and furniture still read against it; unlit, so the alert dimming cannot muddy it).
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshBasicMaterial({ color: C.water }));
  water.rotation.x = -Math.PI / 2; water.position.set(5, 0, 5); water.visible = false; scene.add(water);

  // Rain: one LineSegments. Every streak is drawn twice, one loop height apart, so the loop is seamless.
  const DROPS = 420, LOOP = 18, rp = [];
  for (let i = 0; i < DROPS; i++) {
    const x = -22 + Math.random() * 52, z = -20 + Math.random() * 46, y = Math.random() * LOOP;
    for (const o of [0, LOOP]) rp.push(x, y + o, z, x - 0.12, y + o - 0.8, z);
  }
  const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)),
    new THREE.LineBasicMaterial({ color: C.rain, transparent: true, opacity: 0.35, depthWrite: false }));
  rain.frustumCulled = false; scene.add(rain);

  // Flood water detail. Streaks slide with the current (three copies a loop apart, so the slide never shows a gap).
  // Rings are rain drops and the man's wake: one instanced mesh, each ring grows and fades into the water colour.
  const fb = batch();
  for (let i = 0; i < 90; i++) { const x = SW.x0 + Math.random() * FLOW, z = SW.z0 + Math.random() * (SW.z1 - SW.z0), l = 0.8 + Math.random() * 1.8; for (const o of [-FLOW, 0, FLOW]) fb.add(0, x + o, x + o + l, 0, 0.004, z, z + 0.07); }
  const streaks = fb.mesh(new THREE.MeshBasicMaterial({ color: 0xf1e6c8, transparent: true, opacity: 0.4, depthWrite: false })); streaks.frustumCulled = false; scene.add(streaks);
  const RINGS = 30, ringGeo = new THREE.RingGeometry(0.82, 1, 20); ringGeo.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }), RINGS); rings.frustumCulled = false; scene.add(rings);
  const ring = Array.from({ length: RINGS }, () => ({ x: 0, z: 0, age: Math.random(), life: 1, size: 0.4 })), dummy = new THREE.Group(), foam = new THREE.Color(0xfff6e0), wet = new THREE.Color(C.water), tint = new THREE.Color();
  let ri = 0, wake = 0, flow = 0, mood = 0, shake = 0, lvl = 0;
  const ripple = (x, z, size) => { const r = ring[ri = (ri + 1) % RINGS]; r.x = x; r.z = z; r.age = 0; r.life = 0.7 + size; r.size = size; };

  // Fallback people and boat, built from boxes. upgrade() swaps in the baked models when models.bin arrives.
  const man = new THREE.Group(); scene.add(man);
  let body = shade(batch().all(BODY).mesh(solid)), legs = [], head = null, rest = 0, waveUp = Math.PI, deckY = 0.08, pack = null; // rest: how far the arms must drop to hang down
  let arms = [-1, 1].map(side => { const a = shade(batch().all(ARM()).mesh(solid)); a.position.set(side * 0.31, 0.95, 0); return a; });
  man.add(body, ...arms); rim(man);
  const jacket = new THREE.Mesh(deck.geometry, new THREE.MeshLambertMaterial({ color: C.jacket })); jacket.scale.set(0.58, 0.44, 0.42); jacket.position.y = 0.74; man.add(jacket);
  const boat = new THREE.Group(); scene.add(boat);
  let jiran = shade(batch().all(NEIGHBOUR).mesh(solid)); jiran.position.set(-0.7, 0.08, 0); jiran.rotation.y = Math.PI / 2;
  let wave = shade(batch().all(ARM(C.coat)).mesh(solid)); wave.position.set(-0.7, 1.03, -0.32); // the jiran's waving arm
  let hull = shade(batch().all(BOAT).mesh(solid));
  boat.add(hull, jiran, wave); rim(boat);

  // A baked model as a group: one mesh per moving part, each at its pivot. Returns [group, parts by name, top height].
  function rig(parts) {
    const g = new THREE.Group(), by = {};
    let top = 0;
    for (const q of parts) { const m = shade(new THREE.Mesh(q.g, solid)); m.position.set(...q.p); g.add(m); by[q.n] = m; top = Math.max(top, q.p[1] + q.g.boundingBox.max.y); }
    return [g, by, top];
  }
  const droop = m => { const c = m.geometry.boundingBox.getCenter(v); return Math.atan2(Math.abs(c.x), -c.y); }; // angle of a baked arm from straight down
  function upgrade(pk) {
    pack = pk;
    standIn.visible = false; scene.add(shade(furnish(pk).mesh(solid)));
    man.remove(body, ...arms);
    let by, top; baju(pk.man); [body, by, top] = rig(pk.man); body.add(shade(batch().all(SARONG).mesh(solid))); man.add(body);
    arms = [by['arm-right'], by['arm-left']]; legs = [by['leg-right'], by['leg-left']]; head = by.head; rest = droop(arms[0]) - 0.15; head.add(shade(batch().all(SONGKOK).mesh(solid))); rim(body);
    const tb = by.torso.geometry.boundingBox; // life jacket hugs the torso
    jacket.scale.set((tb.max.x - tb.min.x) * 1.12, (tb.max.y - tb.min.y) * 0.9, (tb.max.z - tb.min.z) * 1.15); jacket.position.set(by.torso.position.x + (tb.max.x + tb.min.x) / 2, by.torso.position.y + (tb.max.y + tb.min.y) / 2, by.torso.position.z + (tb.max.z + tb.min.z) / 2);
    boat.remove(hull, jiran, wave);
    hull = rig(pk.boat)[0]; hull.position.y = -0.2; deckY = -0.02;
    [jiran, by] = rig(pk.jiran); jiran.position.set(-0.75, deckY - 0.1, 0); jiran.rotation.y = Math.PI / 2; jiran.scale.setScalar(0.92);
    wave = by['arm-right']; waveUp = -(2.5 - droop(wave));
    boat.add(hull, jiran); rim(boat);
    if (sim) for (const i of sim.items) dress(meshes.get(i.id), i);
  }
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
  let leave = 0, sim, meshes = new Map(), time = 0, mode = 'land', yaw = yawR, yaw0 = 0, cut = 1, lastX = 0, lastZ = 0, face = 0, width = CAM.far;
  function dress(g, i) { // (re)builds an item's model: baked if the pack has it, boxes if not. Keeps its place and state.
    const u = g.userData, parts = pack && pack[PACKED[i.id]], shape = SHAPES[i.id];
    if (u.body) { g.remove(u.body); if (u.own) u.body.geometry.dispose(); }
    u.own = !parts; u.rig = null;
    if (parts) { [u.body, u.rig, u.h] = rig(parts); if (i.id === 'kucing') u.body.rotation.y = Math.PI / 2; } // the cat model looks along z, the game turns it nose first along x
    else { u.body = shade(batch().all(shape).mesh(solid)); u.h = Math.max(...shape.map(b => b[4])); }
    g.add(u.body); u.sp.position.y = u.h + 0.42; u.rims = rim(u.body);
  }
  function setSim(s) {
    for (const m of meshes.values()) { scene.remove(m); if (m.userData.own) m.userData.body.geometry.dispose(); }
    meshes = new Map(); sim = s; leave = 0;
    for (const i of s.items) {
      const g = new THREE.Group(), sp = new THREE.Sprite(sticker(i.d.icon));
      sp.scale.setScalar(i.d.wt === 3 ? 0.8 : 0.62); g.add(sp);
      g.userData = { sp, gone: 0, snap: true }; dress(g, i); scene.add(g); meshes.set(i.id, g);
    }
  }

  // Mula: zoom from the village to the house while the roof and front walls fade. skip = Main Semula, straight to the cutaway.
  function begin(skip) { mode = 'play'; yaw0 = yaw; cut = skip ? 1 : 0; if (skip) { yaw = yawR; width = CAM.view; shell.visible = false; } }

  function frustum() { // fit the width, keep enough height for the house
    const w = canvas.clientWidth, ht = canvas.clientHeight;
    if (!w || !ht) return;
    const halfH = Math.max(width / 2 / (w / ht), width * 0.667), halfW = halfH * w / ht;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH; cam.updateProjectionMatrix();
  }
  function resize() { if (canvas.clientWidth) renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); frustum(); }
  addEventListener('resize', resize); resize();
  const quality = k => { renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * k); sun.castShadow = false; resize(); }; // slow phone: fewer pixels, no shadows

  const target = new THREE.Vector3().copy(VILLAGE), v = new THREE.Vector3();
  function frame(dt, hint) {
    time += dt;
    if (mode === 'land') yaw = yawR + Math.sin(time * 0.25) * CAM.sway; // gentle sway over the village
    else if (cut < 1) {
      cut = Math.min(1, cut + dt / CAM.cut);
      const e = cut * cut * (3 - 2 * cut);
      yaw = yaw0 + (yawR - yaw0) * e; width = CAM.far + (CAM.view - CAM.far) * e; target.lerpVectors(VILLAGE, HOUSE, e);
      shellMat.opacity = shellLit.opacity = 1 - Math.min(1, e * 1.6);
      if (cut === 1) shell.visible = false;
      frustum();
    } else target.copy(HOUSE);
    const pitch = CAM.pitch * Math.PI / 180;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(70).add(target);
    cam.lookAt(target);
    if (sim && sim.level !== lvl) { if (sim.level > lvl) shake = 0.35; lvl = sim.level; } // a small jolt when the alert rises
    if (shake > 0) { shake -= dt; target.x += Math.sin(time * 90) * 0.05 * shake / 0.35; target.y += Math.cos(time * 70) * 0.04 * shake / 0.35; cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(70).add(target); cam.lookAt(target); }
    rain.position.y = -((time * 16) % LOOP);
    arrow.visible = false;
    if (sim) {
      const p = sim.p, b = sim.boat, pulse = 0.5 + 0.5 * Math.sin(time * 7), moved0 = Math.hypot(p.x - lastX, p.z - lastZ) > 1e-4;
      rain.material.opacity = 0.28 + 0.08 * sim.level; // heavier as the alert rises
      mood += (sim.level / 3 - mood) * Math.min(1, dt * 0.8); hemi.intensity = 1.9 - 0.12 * mood; sun.intensity = 2.1 - 0.15 * mood; // a slight dusk only: ground, road and sky stay near their Normal colours
      water.visible = sim.water > 0.02; water.position.y = sim.water;
      flow = (flow + dt * (0.5 + 0.5 * sim.level)) % FLOW; streaks.position.set(flow, sim.water + 0.012, 0);
      wake -= dt;
      if (wake < 0) { // a rain drop somewhere, or the man's wake when he wades
        const wading = sim.water > p.y + 0.05 && !p.aboard;
        if (wading && moved0) { ripple(p.x, p.z, 0.55); wake = 0.22; } else { ripple(-4 + Math.random() * 18, -6 + Math.random() * 12, 0.2 + Math.random() * 0.25); wake = 0.16 - 0.035 * sim.level; }
      }
      ring.forEach((r, k) => {
        r.age += dt / r.life; const a = Math.min(1, r.age);
        dummy.position.set(r.x, sim.water + 0.016, r.z); dummy.scale.setScalar(a >= 1 ? 0 : 0.08 + r.size * a); dummy.updateMatrix(); rings.setMatrixAt(k, dummy.matrix);
        rings.setColorAt(k, tint.lerpColors(foam, wet, a));
      });
      rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
      boat.visible = b.state !== 'away';
      leave = b.state === 'leaving' ? leave + dt : 0; // keeps drifting behind the end screen
      const along = b.state === 'arriving' ? -DOCK.from * (1 - b.k) ** 1.6 : leave * leave * DOCK.accel; // tiles toward screen right
      boat.position.set(DOCK.x + along * RX, sim.water + 0.2 + Math.sin(time * 2.2) * 0.04, DOCK.z + along * RZ);
      boat.rotation.z = Math.sin(time * 1.7) * 0.03; boat.updateMatrixWorld();
      if (pack) wave.rotation.z = waveUp + Math.sin(time * 9) * 0.35; else wave.rotation.x = waveUp + Math.sin(time * 9) * 0.5; // the jiran waves
      const moved = moved0, heavy = p.hands[0] && p.hands[0].d.wt === 3, panic = sim.level === 3 && !p.hands.length; // Bahaya with empty hands: he runs with his arms up
      if (moved) face = Math.atan2(p.x - lastX, p.z - lastZ); // turn to where he walks
      else if (sim.calling && !p.locked && !p.aboard && !p.hands.length) face += (((yawR - face) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 8); // waving: turns to face the camera
      lastX = p.x; lastZ = p.z;
      if (p.aboard) { boat.localToWorld(man.position.set(0.25, deckY, 0)); man.rotation.y = yawR + Math.PI / 2; }
      else { man.position.set(p.x, p.y + (moved && !p.floating ? Math.abs(Math.sin(time * 12)) * 0.07 : p.floating ? Math.sin(time * 3) * 0.05 : 0), p.z); man.rotation.y = face; }
      const calling = sim.calling && !moved && !p.locked && !p.aboard && !p.hands.length; // play is over: both arms up, waving for help
      arms.forEach((a, k) => { // carry pose, swim, or walking swing
        const holding = heavy || p.hands[k];
        a.rotation.x = calling ? -2.8 : heavy ? -2.9 : holding ? -1.25 : p.floating ? -1.4 + Math.sin(time * 5 + k * 3) * 0.5 : moved ? (panic ? -2.7 + Math.sin(time * 14 + k * Math.PI) * 0.35 : Math.sin(time * 12 + k * Math.PI) * 0.7) : 0;
        a.rotation.z = (k ? 1 : -1) * (calling ? 0.35 + Math.sin(time * 9 + k * Math.PI) * 0.5 - rest : (p.floating && !holding ? 0.5 : 0) - rest);
      });
      const walk = moved && !p.floating && !p.aboard;
      legs.forEach((l, k) => { l.rotation.x = walk ? Math.sin(time * 12 + k * Math.PI) * 0.7 : p.floating ? Math.sin(time * 5 + k * Math.PI) * 0.4 : 0; }); // step, or kick in the water
      if (head) head.rotation.z = walk ? Math.sin(time * 12) * 0.05 : 0;
      jacket.visible = p.jacket;
      deck.material.emissive.setScalar(hint === 'para' ? 0.35 * pulse : 0);
      if (hint === 'para') { arrow.visible = true; arrow.position.set(4.6, P.y + 1.1 + pulse * 0.3, 2.3); }
      let np = 0, nb = 0;
      for (const i of sim.items) {
        const g = meshes.get(i.id), u = g.userData;
        u.pop = u.loc && u.loc !== i.loc ? 1 : Math.max(0, (u.pop || 0) - dt * 4); u.loc = i.loc; // a little bounce when it is picked up, put down or banked
        g.scale.setScalar(1 + 0.3 * Math.sin(u.pop * Math.PI));
        if (i.loc === 'slot') {
          const q = itemPos(sim, i), afloat = q.y > ROOMS[NODES[i.node].rooms[0]].y + NODES[i.node].at[2];
          v.set(q.x, q.y + (afloat ? Math.sin(time * 2 + q.x) * 0.05 - Math.min(u.h * 0.4, 0.3) : 0), q.z);
          g.position.lerp(v, u.snap ? 1 : Math.min(1, dt * 5)); u.snap = false; // glides when it drifts
          g.rotation.set(0, afloat ? Math.sin(time * 0.7 + q.z) * 0.4 : 0, afloat ? Math.sin(time * 1.6 + q.x) * 0.08 : 0);
          if (hint === 'item' && i.id === 'dokumen') { g.scale.setScalar(1 + 0.25 * pulse); arrow.visible = true; arrow.position.set(g.position.x, g.position.y + u.h + 1.15 + pulse * 0.3, g.position.z); }
        } else if (i.loc === 'hand') {
          const k = p.hands.indexOf(i);
          g.position.copy(man.position).add((i.d.wt === 3 ? v.set(0, 1.5, 0.05) : v.set(k ? 0.31 : -0.31, 0.62, 0.42)).applyAxisAngle(Y, man.rotation.y));
          g.rotation.set(0, man.rotation.y, 0);
        } else if (i.loc === 'para' && !p.aboard) { g.position.set(3.5 + (np % 5) * 0.55, P.y, 0.4 + Math.floor(np / 5) * 0.6); g.rotation.set(0, 0, 0); np++; }
        else if (i.loc === 'boat' || i.loc === 'para') { boat.localToWorld(g.position.set(0.55 + (nb % 2) * 0.4 - Math.floor(nb / 4) * 0.4, deckY, (Math.floor(nb / 2) % 2 - 0.5) * 0.45)); nb++; } // what he saved goes with him
        else if (i.loc === 'run') { // the cat on its way: hops along, nose first
          if (Math.hypot(i.x - g.position.x, i.z - g.position.z) > 1e-3) g.rotation.set(0, Math.atan2(g.position.z - i.z, i.x - g.position.x), 0);
          g.position.set(i.x, i.y + Math.abs(Math.sin(time * 16)) * 0.12, i.z);
        } else if (i.loc === 'perch') { g.position.lerp(v.set(...PERCH), Math.min(1, dt * 5)); g.rotation.set(0, 0, 0); }
        else if (i.loc === 'ikut') boat.localToWorld(g.position.set(-0.15, deckY, 0.25));
        else { // gone: drifts off and shrinks
          u.gone = Math.min(1, u.gone + dt / 2.5);
          g.position.x += dt * 1.6 * RX; g.position.z += dt * 1.6 * RZ; g.position.y = sim.water - 0.2;
          g.scale.setScalar(1 - u.gone);
        }
        if (u.rig && i.id === 'kucing') { // paws when it runs, tail always
          const run = i.loc === 'run' ? Math.sin(time * 22) * 0.8 : 0;
          for (const n in u.rig) if (n.startsWith('leg')) u.rig[n].rotation.x = n.includes('front') ? run : -run;
          u.rig.tail.rotation.z = Math.sin(time * 5) * 0.25;
        }
        for (const e of u.rims) e.visible = i.loc === 'hand'; // rim only while carried
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
    for (const i of sim.items) if (i.loc === 'slot' || i.loc === 'run') {
      const g = meshes.get(i.id);
      near(g.position.x, g.position.y + g.userData.h / 2 + 0.2, g.position.z, i.d.wt === 3 ? 1 : 0.75, { kind: 'item', id: i.id });
      if (i.loc === 'slot') used[i.node] = 1;
    }
    for (const k in NODES) if (NODES[k].slot && !used[k]) { const n = NODES[k]; near(n.x + n.at[0], ROOMS[n.rooms[0]].y + n.at[2], n.z + n.at[1], 0.6, { kind: 'slot', id: k }); }
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
  // Fetches the baked models and swaps them in. Resolves false if they cannot load: the box models stay.
  const models = url => loadPack(url).then(pk => { upgrade(pk); return true; }, () => false);
  const dv = new THREE.Vector3(), driverAt = () => { boat.localToWorld(dv.set(-0.75, deckY + 1.95, 0)); return toScreen(dv.x, dv.y, dv.z); }; // above the boat driver's head: the jacket bubble
  const hintAt = () => arrow.visible ? toScreen(arrow.position.x, arrow.position.y - 0.8, arrow.position.z) : null; // where the first-run hand should tap
  const look = (x, y, z, w) => { HOUSE.set(x, y, z); width = w; frustum(); }; // art checks only: close-up on a spot
  return { setSim, begin, frame, pick, resize, quality, toScreen, models, look, hintAt, driverAt, boatAt: () => toScreen(boat.position.x, boat.position.y, boat.position.z), info: () => renderer.info.render };
}
