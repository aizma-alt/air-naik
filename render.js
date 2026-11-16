// render.js: Three.js view of a sim. Geometry comes from models.js; this file is camera, light, animation and picking.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH, BOAT as DOCK, CAM } from './data.js';
import { itemPos } from './sim.js';
import { C, SHAPES, PERCH, batch, buildVillage, buildHouse, BODY, ARM, NEIGHBOUR, BOAT } from './models.js';

const { para: P } = ROOMS, Z = DEPTH, Y = new THREE.Vector3(0, 1, 0);
const HOUSE = new THREE.Vector3(4.5, 3.7, 1.5), VILLAGE = new THREE.Vector3(4.5, 2.0, 3.2); // camera targets: game, landing

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // opaque: the ground fills the view
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // phone dpr is 3.25
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d3344);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb37a, 1.9));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.1); // one shadow light; three flat tones per box
  sun.position.set(13, 18, 12); sun.target.position.set(4.5, 0, 1.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  scene.add(sun, sun.target);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  const lit = new THREE.MeshBasicMaterial({ vertexColors: true }); // window light, unlit
  const shellMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }), shellLit = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }); // fade at Mula
  const shade = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };

  const [vb, vlit] = buildVillage(), hb = buildHouse();
  const shell = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: C.deck, transparent: true, opacity: 0.85, depthWrite: false })); // own mesh: pulses for the second hint
  deck.scale.set(P.x1 - P.x0, 0.15, Z); deck.position.set((P.x0 + P.x1) / 2, P.y - 0.075, Z / 2); deck.receiveShadow = true;
  shell.add(shade(hb.sh.mesh(shellMat)), hb.glowOut.mesh(shellLit));
  scene.add(shade(vb.mesh(solid)), vlit.mesh(lit), shade(hb.h.mesh(solid)), shade(hb.up.mesh(glass), false), hb.glow.mesh(lit), deck, shell);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshBasicMaterial({ color: C.water, transparent: true, opacity: 0.8, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(5, 0, 5); scene.add(water);

  // Rain: one LineSegments. Every streak is drawn twice, one loop height apart, so the loop is seamless.
  const DROPS = 420, LOOP = 18, rp = [];
  for (let i = 0; i < DROPS; i++) {
    const x = -22 + Math.random() * 52, z = -20 + Math.random() * 46, y = Math.random() * LOOP;
    for (const o of [0, LOOP]) rp.push(x, y + o, z, x - 0.12, y + o - 0.8, z);
  }
  const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)),
    new THREE.LineBasicMaterial({ color: C.rain, transparent: true, opacity: 0.35, depthWrite: false }));
  rain.frustumCulled = false; scene.add(rain);

  const man = new THREE.Group(); scene.add(man);
  man.add(shade(batch().all(BODY).mesh(solid)));
  const arms = [-1, 1].map(side => { const a = shade(batch().all(ARM()).mesh(solid)); a.position.set(side * 0.31, 0.95, 0); man.add(a); return a; });
  const jacket = new THREE.Mesh(deck.geometry, new THREE.MeshLambertMaterial({ color: C.jacket })); jacket.scale.set(0.58, 0.44, 0.42); jacket.position.y = 0.74; man.add(jacket);
  const boat = new THREE.Group(); scene.add(boat);
  const jiran = shade(batch().all(NEIGHBOUR).mesh(solid)); jiran.position.set(-0.7, 0.08, 0); jiran.rotation.y = Math.PI / 2;
  const wave = shade(batch().all(ARM(C.coat)).mesh(solid)); wave.position.set(-0.7, 1.03, -0.32); // the jiran's waving arm
  boat.add(shade(batch().all(BOAT).mesh(solid)), jiran, wave);
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
  function setSim(s) {
    for (const m of meshes.values()) { scene.remove(m); m.children[0].geometry.dispose(); }
    meshes = new Map(); sim = s; leave = 0;
    for (const i of s.items) {
      const g = new THREE.Group(), shape = SHAPES[i.id], top = Math.max(...shape.map(b => b[4]));
      g.add(shade(batch().all(shape).mesh(solid)));
      const sp = new THREE.Sprite(sticker(i.d.icon)); sp.scale.setScalar(i.d.wt === 3 ? 0.8 : 0.62); sp.position.y = top + 0.42; g.add(sp);
      g.userData = { h: top, gone: 0, snap: true }; scene.add(g); meshes.set(i.id, g);
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
    rain.position.y = -((time * 16) % LOOP);
    arrow.visible = false;
    if (sim) {
      const p = sim.p, b = sim.boat, pulse = 0.5 + 0.5 * Math.sin(time * 7);
      rain.material.opacity = 0.28 + 0.08 * sim.level; // heavier as the alert rises
      water.position.y = sim.water;
      boat.visible = b.state !== 'away';
      leave = b.state === 'leaving' ? leave + dt : 0; // keeps drifting behind the end screen
      const along = b.state === 'arriving' ? -DOCK.from * (1 - b.k) ** 1.6 : leave * leave * DOCK.accel; // tiles toward screen right
      boat.position.set(DOCK.x + along * RX, sim.water + 0.2 + Math.sin(time * 2.2) * 0.04, DOCK.z + along * RZ);
      boat.rotation.z = Math.sin(time * 1.7) * 0.03; boat.updateMatrixWorld();
      wave.rotation.x = Math.PI + Math.sin(time * 9) * 0.5; // the jiran waves
      const moved = Math.hypot(p.x - lastX, p.z - lastZ) > 1e-4, heavy = p.hands[0] && p.hands[0].d.wt === 3;
      if (moved) face = Math.atan2(p.x - lastX, p.z - lastZ); // turn to where he walks
      lastX = p.x; lastZ = p.z;
      if (p.aboard) { boat.localToWorld(man.position.set(0.25, 0.08, 0)); man.rotation.y = yawR + Math.PI / 2; }
      else { man.position.set(p.x, p.y + (moved && !p.floating ? Math.abs(Math.sin(time * 12)) * 0.07 : p.floating ? Math.sin(time * 3) * 0.05 : 0), p.z); man.rotation.y = face; }
      arms.forEach((a, k) => { // carry pose, swim, or walking swing
        const holding = heavy || p.hands[k];
        a.rotation.x = heavy ? -2.9 : holding ? -1.25 : p.floating ? -1.4 + Math.sin(time * 5 + k * 3) * 0.5 : moved ? Math.sin(time * 12 + k * Math.PI) * 0.7 : 0;
        a.rotation.z = p.floating && !holding ? (k ? 0.5 : -0.5) : 0;
      });
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
          g.position.lerp(v, u.snap ? 1 : Math.min(1, dt * 5)); u.snap = false; // glides when it drifts
          g.rotation.set(0, afloat ? Math.sin(time * 0.7 + q.z) * 0.4 : 0, afloat ? Math.sin(time * 1.6 + q.x) * 0.08 : 0);
          if (hint === 'item' && i.id === 'dokumen') { g.scale.setScalar(1 + 0.25 * pulse); arrow.visible = true; arrow.position.set(g.position.x, g.position.y + u.h + 1.15 + pulse * 0.3, g.position.z); }
        } else if (i.loc === 'hand') {
          const k = p.hands.indexOf(i);
          g.position.copy(man.position).add((i.d.wt === 3 ? v.set(0, 1.5, 0.05) : v.set(k ? 0.31 : -0.31, 0.62, 0.42)).applyAxisAngle(Y, man.rotation.y));
          g.rotation.set(0, man.rotation.y, 0);
        } else if (i.loc === 'para' && !p.aboard) { g.position.set(3.5 + (np % 5) * 0.55, P.y, 0.4 + Math.floor(np / 5) * 0.6); g.rotation.set(0, 0, 0); np++; }
        else if (i.loc === 'boat' || i.loc === 'para') { boat.localToWorld(g.position.set(0.55 + (nb % 2) * 0.4 - Math.floor(nb / 4) * 0.4, 0.08, (Math.floor(nb / 2) % 2 - 0.5) * 0.45)); nb++; } // what he saved goes with him
        else if (i.loc === 'run') { // the cat on its way: hops along, nose first
          if (Math.hypot(i.x - g.position.x, i.z - g.position.z) > 1e-3) g.rotation.set(0, Math.atan2(g.position.z - i.z, i.x - g.position.x), 0);
          g.position.set(i.x, i.y + Math.abs(Math.sin(time * 16)) * 0.12, i.z);
        } else if (i.loc === 'perch') { g.position.lerp(v.set(...PERCH), Math.min(1, dt * 5)); g.rotation.set(0, 0, 0); }
        else if (i.loc === 'ikut') boat.localToWorld(g.position.set(-0.15, 0.08, 0.25));
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
    for (const i of sim.items) if (i.loc === 'slot' || i.loc === 'run') {
      const g = meshes.get(i.id);
      near(g.position.x, g.position.y + g.userData.h / 2 + 0.2, g.position.z, i.d.wt === 3 ? 1 : 0.75, { kind: 'item', id: i.id });
      if (i.loc === 'slot') used[i.node] = 1;
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
