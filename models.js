// models.js: everything built from boxes and roof prisms. Geometry only, no game state, no asset files.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH } from './data.js';

export const C = { grass: 0x7dbb5a, grass2: 0x6aa84f, road: 0x5b6270, line: 0xf4f4f0, river: 0x4aa3c7, mud: 0x9b7a50, paddy: 0xa6cf5c,
  floor: 0xe2b877, floor2: 0xd6a964, deck: 0xf0c98a, wall: 0xfff1d0, trim: 0x9c6b43, stilt: 0x6e4a33, roof: 0xe4572e, pad: 0xfbe3b0,
  tamu: 0x4fb3a8, dapur: 0xf08a5d, bilik: 0x7d8fd6, water: 0xb08a57, glow: 0xffe08a, skin: 0xe0a875, hair: 0x2a2320, shirt: 0xf7f7f2, sarong: 0x2f6f8f, sarong2: 0x4f9fbf,
  coat: 0xf2c14e, pants: 0x30475e, jacket: 0xff6b00, hull: 0xe4572e, inner: 0xfaf0dc, leaf: 0x3f9d57, leaf2: 0x57b56b, trunk: 0x8a6240, rain: 0xe6f1f7, arrow: 0xffe14d, dark: 0x2b2d42, white: 0xfafafa };
const ROOFS = [0x3d7ea6, 0x2a9d8f, 0xf2a541, 0x8d6cab, 0xd1495b, 0x4f8f5b];

// Item models: boxes [colour, x0, x1, y0, y1, z0, z1], base at y 0.
export const SHAPES = {
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
    [0xf28f3b, -.34, -.28, .28, .6, -.03, .03], [0xf28f3b, -.26, -.18, 0, .1, -.1, .1], [0xf28f3b, .06, .14, 0, .1, -.1, .1], [0x5a3a22, .38, .39, .28, .4, -.06, .06], [0xffffff, -.1, .1, .1, .12, -.115, .115]],
  peti: [[0xe8eef0, -.36, .36, 0, 1.35, -.33, .33], [0x9aa7ad, -.36, .36, .85, .88, .33, .34], [0x9aa7ad, .2, .26, .95, 1.2, .33, .37]],
  tv: [[0x2b2d42, -.5, .5, .12, .72, -.1, .1], [0x5fa8d3, -.44, .44, .18, .66, .1, .115], [0x2b2d42, -.2, .2, 0, .12, -.14, .14]],
};

// Merges boxes and roof prisms into one geometry with vertex colours: a whole model is one draw call.
const U = new THREE.BoxGeometry(1, 1, 1), UP = U.attributes.position, UN = U.attributes.normal;
export function batch() {
  const pos = [], nor = [], col = [], idx = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  const add = (colour, x0, x1, y0, y1, z0, z1, rx = 0, ry = 0, rz = 0) => { // box by extents, then a turn about its centre
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
  const face = (colour, pts) => { // flat polygon, counter-clockwise seen from outside
    const base = pos.length / 3; c.set(colour);
    n.crossVectors(a.set(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]), b.set(pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2])).normalize();
    for (const p of pts) { pos.push(...p); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); }
    for (let i = 2; i < pts.length; i++) idx.push(base, base + i - 1, base + i);
  };
  const roof = (colour, x0, x1, y0, y1, z0, z1, alongZ = false, end = colour) => { // gable prism, ridge along x (or z)
    const p = (u, y, w) => alongZ ? [w, y, u] : [u, y, w], [u0, u1, w0, w1] = alongZ ? [z0, z1, x0, x1] : [x0, x1, z0, z1], wm = (w0 + w1) / 2;
    const A = p(u0, y0, w0), B = p(u1, y0, w0), Cc = p(u1, y0, w1), D = p(u0, y0, w1), R0 = p(u0, y1, wm), R1 = p(u1, y1, wm);
    for (const [col2, f] of [[colour, [D, Cc, R1, R0]], [colour, [B, A, R0, R1]], [end, [A, D, R0]], [end, [Cc, B, R1]]]) face(col2, alongZ ? [...f].reverse() : f);
    return api;
  };
  const mesh = material => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return new THREE.Mesh(g, material);
  };
  const api = { add, roof, mesh, all: list => { for (const s of list) add(...s); return api; } };
  return api;
}

const { serambi: S, tamu: R, dapur: K, bilik: B, para: P } = ROOMS, Z = DEPTH;
export const PERCH = [4.6, P.y + 1.62, Z / 2]; // roof beam that stays in the cutaway: where the cat waits if nobody carries it

function palm(b, x, z, h, lean = 0.06) { // coconut palm
  b.add(C.trunk, x - 0.14, x + 0.14, 0, h, z - 0.14, z + 0.14, 0, 0, lean);
  const tx = x - Math.sin(lean) * h / 2;
  for (let i = 0; i < 6; i++) b.add(i % 2 ? C.leaf : C.leaf2, tx - 1.25, tx + 0.05, h - 0.05, h + 0.04, z - 0.24, z + 0.24, 0, i * 1.047, 0.42);
  b.add(0x8a5a2b, tx - 0.16, tx + 0.16, h - 0.35, h - 0.08, z - 0.16, z + 0.16);
}
function bush(b, x, z, s = 0.5) { b.add(C.leaf, x - s, x + s, 0, s * 1.2, z - s, z + s, 0, 0.6, 0).add(C.leaf2, x - s * 0.7, x + s * 0.7, s * 0.6, s * 1.7, z - s * 0.7, z + s * 0.7, 0, 0.2, 0); }
// A neighbour's kampung house on stilts: w along x, d along z, ridge along the long side.
function hut(b, lit, x, z, w, d, wall, roofC, fy = 1.1, wh = 1.9) {
  for (const sx of [x + 0.2, x + w - 0.2]) for (const sz of [z + 0.2, z + d - 0.2]) b.add(C.stilt, sx - 0.1, sx + 0.1, 0, fy, sz - 0.1, sz + 0.1);
  b.add(C.trim, x - 0.1, x + w + 0.1, fy - 0.14, fy, z - 0.1, z + d + 0.1).add(wall, x, x + w, fy, fy + wh, z, z + d);
  b.roof(roofC, x - 0.45, x + w + 0.45, fy + wh, fy + wh + Math.min(w, d) * 0.48, z - 0.45, z + d + 0.45, d > w, wall);
  b.add(C.trim, x + w * 0.38, x + w * 0.62, fy, fy + 1.3, z + d, z + d + 0.04); // door, facing the road
  for (let i = 0; i < 3; i++) b.add(C.trim, x + w * 0.34, x + w * 0.66, 0, fy - 0.2 - i * 0.3, z + d + i * 0.28, z + d + 0.28 + i * 0.28);
  lit.add(C.glow, x + w * 0.1, x + w * 0.3, fy + 0.7, fy + 1.35, z + d, z + d + 0.03).add(C.glow, x + w * 0.7, x + w * 0.9, fy + 0.7, fy + 1.35, z + d, z + d + 0.03)
    .add(C.glow, x + w, x + w + 0.03, fy + 0.7, fy + 1.35, z + d * 0.3, z + d * 0.7);
}

// Tall things must not stand between the camera and the main house: that strip (down-screen from it) stays low.
const clear = (x, z) => !(x - z > -8 && x - z < 14 && x + z > 5);

// The village around the main house: grass, river behind, road in front, neighbours, trees. Static, two draw calls.
export function buildVillage() {
  const b = batch(), lit = batch();
  b.add(C.grass, -60, 70, -0.3, 0, -60, 70);
  for (const [x, z, w, d] of [[-9, -3, 7, 5], [11, 3, 6, 4], [-16, 10, 8, 6], [2, 11, 5, 3], [16, -4, 6, 5], [-3, 4.5, 5, 1.6]]) b.add(C.grass2, x, x + w, 0, 0.015, z, z + d); // darker lawn patches
  b.add(C.river, -60, 70, 0, 0.03, -13.5, -8).add(C.mud, -60, 70, 0, 0.02, -8, -7.3).add(C.mud, -60, 70, 0, 0.02, -14.2, -13.5); // the river that will rise
  b.add(C.road, -60, 70, 0, 0.04, 6.4, 9).add(C.road, 12.2, 14.6, 0, 0.04, -7.3, 6.4); // road, and a lane to the bridge
  for (let x = -58; x < 70; x += 3) b.add(C.line, x, x + 1.4, 0.04, 0.05, 7.62, 7.78);
  b.add(C.trim, 11.9, 14.9, 0.05, 0.3, -14.4, -7.1).add(C.stilt, 11.9, 12.05, 0.3, 0.9, -14.4, -7.1).add(C.stilt, 14.75, 14.9, 0.3, 0.9, -14.4, -7.1); // bridge
  for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) b.add(C.paddy, 17 + i * 2.6, 19.2 + i * 2.6, 0, 0.05, -6.6 + j * 1.35, -5.5 + j * 1.35); // paddy plots
  const N = [[-9.5, -1.5, 5, 3.4], [14.5, -2.5, 4.4, 3.2], [-7, 11.5, 4.6, 3.2], [27, 11.5, 3.6, 4.4], [-24, 12, 5, 3.2], [-15.5, 11, 4, 3.6], [-17.5, -2.5, 4.2, 3.4], [33, 2, 4.6, 3.4], [22.5, -3, 4, 3.2], [-26, -2, 4.4, 3.4]];
  N.forEach(([x, z, w, d], i) => hut(b, lit, x, z, w, d, i % 3 === 1 ? 0xf7dcc0 : i % 3 ? 0xe9f1e4 : C.wall, ROOFS[i % ROOFS.length], 0.9 + (i % 3) * 0.15));
  for (const [x, z, hh] of [[-2.3, -1.5, 7.6], [-4.2, 3.2, 6.4], [11, -4.5, 7], [19.5, 2.5, 6.6], [-12, 5.2, 7.2], [8.5, 10, 6.2], [-9.5, 10.5, 6.8], [16.5, 10.2, 7], [-21, 4, 6.5], [1, -5.5, 6.9], [24, -1, 7.3], [-1.5, 15, 6.6], [-6.5, 1.5, 6.4], [-13, 8, 6.9], [29, 9, 6.7], [-20, 13, 7.1], [6.5, -4.8, 7.4], [-7.5, -5.5, 6.6], [19, -5.5, 6.9], [-30, 5, 6.8], [36, 9, 7]]) if (clear(x, z)) palm(b, x, z, hh, (x * 7 % 5 - 2) * 0.03);
  for (const [x, z, s] of [[-1.2, 4.6, 0.45], [9.8, 4.2, 0.5], [10.4, -1.2, 0.4], [-5.5, 0.5, 0.55], [5.5, 5.4, 0.35], [-12.5, 9.6, 0.5], [15.5, 5.2, 0.45], [0.5, 10.4, 0.5], [18.8, 9.8, 0.4], [-8, 5.3, 0.4]]) bush(b, x, z, s);
  for (let x = -37; x < 45; x += 7.5) if (clear(x, 9.7)) b.add(C.stilt, x - 0.07, x + 0.07, 0, 4.2, 9.63, 9.77).add(C.stilt, x - 0.5, x + 0.5, 3.9, 3.98, 9.66, 9.74); // electric poles, far side of the road
  for (let x = -3; x < 12; x += 0.9) if (x < 0.4 || x > 2.3) b.add(C.white, x, x + 0.08, 0, 0.55, 5.2, 5.28); // picket fence, gap at the steps
  b.add(C.white, -3, 11.2, 0.36, 0.42, 5.22, 5.26);
  b.add(0x4d7ea8, -9, -7.2, 0.18, 0.62, 7.0, 7.9).add(0x4d7ea8, -8.7, -7.6, 0.62, 0.98, 7.05, 7.85).add(0xcfe6f2, -8.72, -7.58, 0.66, 0.94, 7.03, 7.87) // a small car
    .add(C.dark, -8.8, -8.45, 0.05, 0.36, 6.95, 7.95).add(C.dark, -7.75, -7.4, 0.05, 0.36, 6.95, 7.95);
  return [b, lit];
}

// Main house. Returns batches: h stays in the cutaway, up = see-through upper floor, glow = lit windows inside, sh/glowOut = shell that fades at Mula.
export function buildHouse() {
  const h = batch(), up = batch(), sh = batch(), glow = batch(), glowOut = batch();
  for (const r of [S, R, K]) {
    for (let z = 0, i = 0; z < Z; z += 0.5, i++) h.add(i % 2 ? C.floor : C.floor2, r.x0, r.x1, r.y - 0.15, r.y, z, z + 0.5); // planks
    for (const x of [r.x0 + 0.15, r.x1 - 0.15]) for (const z of [0.15, Z - 0.15]) h.add(C.stilt, x - 0.1, x + 0.1, 0, r.y - 0.15, z - 0.1, z + 0.1);
    h.add(C.trim, r.x0, r.x1, r.y - 0.2, r.y - 0.15, -0.02, Z + 0.02);
  }
  for (let i = 0; i < 3; i++) h.add(C.trim, 0.7, 1.9, 0, S.y - 0.25 - i * 0.25, Z + i * 0.3, Z + 0.3 + i * 0.3); // front steps
  const hole = [3.4, 5.8, 0.75]; // stairwell in the Bilik floor: x0, x1, z1
  up.add(C.floor, B.x0, B.x1, B.y - 0.15, B.y, hole[2], Z).add(C.floor, B.x0, hole[0], B.y - 0.15, B.y, 0, hole[2]).add(C.floor, hole[1], B.x1, B.y - 0.15, B.y, 0, hole[2]);
  // Walls that stay: back walls in room colours, Serambi railing, Bilik side wall.
  h.add(C.white, S.x0, S.x1, S.y + 0.5, S.y + 0.6, -0.1, 0).add(C.white, -0.1, 0, S.y + 0.5, S.y + 0.6, 0, Z);
  for (let x = 0.15; x < S.x1; x += 0.3) h.add(C.white, x - 0.03, x + 0.03, S.y, S.y + 0.5, -0.08, -0.02);
  for (let z = 0.15; z < Z; z += 0.3) h.add(C.white, -0.08, -0.02, S.y, S.y + 0.5, z - 0.03, z + 0.03);
  h.add(C.tamu, R.x0, R.x1, R.y, B.y - 0.15, -0.1, 0).add(C.bilik, R.x0, R.x1, B.y, P.y, -0.1, 0).add(C.bilik, B.x0 - 0.1, B.x0, B.y, P.y, 0, Z).add(C.dapur, K.x0, K.x1, K.y, K.y + 2.2, -0.1, 0);
  h.add(C.trim, R.x0, R.x1, B.y - 0.15, B.y, -0.12, 0).add(C.trim, K.x0, K.x1, K.y + 2.2, K.y + 2.3, -0.12, 0.02);
  for (const [r, x1, y] of [[R, R.x1, R.y], [K, K.x1, K.y], [B, B.x1, B.y]]) h.add(C.white, r.x0, x1, y, y + 0.12, 0, 0.03); // skirting
  const sb = NODES.sb, st = NODES.st, run = sb.x - st.x, rise = B.y - R.y, steps = 9; // real stairs
  for (let i = 0; i < steps; i++) h.add(i % 2 ? C.trim : 0xb07d52, sb.x - (i + 1) * run / steps, sb.x - i * run / steps, R.y + i * rise / steps - 0.05, R.y + (i + 1) * rise / steps, sb.z - 0.36, sb.z + 0.36);
  for (let i = 0; i < 2; i++) h.add(C.stilt, NODES.hb.x - 0.25 + i * 0.44, NODES.hb.x - 0.19 + i * 0.44, B.y, P.y + 0.4, NODES.hb.z - 0.44, NODES.hb.z - 0.38); // ladder
  for (let y = B.y + 0.3; y < P.y + 0.3; y += 0.4) h.add(C.stilt, NODES.hb.x - 0.22, NODES.hb.x + 0.22, y, y + 0.06, NODES.hb.z - 0.44, NODES.hb.z - 0.38);
  h.add(C.stilt, P.x0, P.x1, P.y + 1.5, PERCH[1], Z / 2 - 0.08, Z / 2 + 0.08); // roof beam
  for (const x of [P.x0 + 0.08, P.x1 - 0.08]) h.add(C.stilt, x - 0.07, x + 0.07, P.y, P.y + 1.5, Z / 2 - 0.07, Z / 2 + 0.07);
  for (const k in NODES) if (NODES[k].slot) { const n = NODES[k], y = ROOMS[n.rooms[0]].y; h.add(C.pad, n.x - 0.33, n.x + 0.33, y, y + 0.02, n.z - 0.33, n.z + 0.33); } // mats = places to put things
  // Furniture and decor, kept off the walking lines.
  h.add(0xc8553d, 3.3, 5.3, R.y, R.y + 0.015, 1.3, 2.9).add(0xf2d9a0, 3.45, 5.15, R.y + 0.015, R.y + 0.02, 1.45, 2.75); // Ruang Tamu rug
  for (const [x, y, w, hh, c] of [[2.85, 2.5, 0.5, 0.4, 0xf2c14e], [3.5, 2.75, 0.36, 0.5, 0xfafafa], [4.05, 3.1, 0.5, 0.36, 0xe4572e], [4.8, 3.45, 0.4, 0.4, 0xfafafa]]) h.add(C.trim, x - 0.04, x + w + 0.04, y - 0.04, y + hh + 0.04, 0, 0.03).add(c, x, x + w, y, y + hh, 0.03, 0.05); // frames going up the stairs
  h.add(C.dark, 2.62, 2.7, R.y, R.y + 1.5, 0.2, 0.28).add(C.glow, 2.52, 2.8, R.y + 1.5, R.y + 1.78, 0.1, 0.38); // floor lamp
  h.add(0xeadfc8, 6.85, 8.9, K.y, K.y + 0.72, 0.02, 0.32).add(C.trim, 6.85, 8.9, K.y + 0.72, K.y + 0.78, 0.0, 0.34); // kitchen counter
  h.add(C.dark, 7.0, 7.5, K.y + 0.78, K.y + 0.82, 0.05, 0.3).add(0xcfd8dc, 8.2, 8.7, K.y + 0.78, K.y + 0.8, 0.06, 0.28).add(0xfafafa, 7.7, 7.95, K.y + 0.78, K.y + 1.02, 0.08, 0.28).add(C.dark, 7.76, 7.89, K.y + 1.02, K.y + 1.06, 0.12, 0.24); // stove, sink, rice cooker
  h.add(C.trim, 6.3, 7.3, K.y + 1.55, K.y + 1.6, 0, 0.26).add(0xfafafa, 6.4, 6.6, K.y + 1.6, K.y + 1.78, 0.05, 0.2).add(0x2a9d8f, 6.7, 6.86, K.y + 1.6, K.y + 1.85, 0.05, 0.2).add(0xf2c14e, 6.95, 7.15, K.y + 1.6, K.y + 1.74, 0.05, 0.2); // shelf with jars
  h.add(0x3d7ea6, 8.55, 8.9, K.y, K.y + 0.6, 1.25, 1.6).add(0xcfd8dc, 8.66, 8.79, K.y + 0.6, K.y + 0.72, 1.36, 1.49); // gas tank
  h.add(0x57a773, 6.7, 8.2, K.y, K.y + 0.015, 1.25, 2.1); // tikar
  h.add(C.trim, 3.4, 4.3, B.y, B.y + 0.1, 1.9, 2.95).add(0xfafafa, 3.44, 4.26, B.y + 0.1, B.y + 0.22, 1.94, 2.91).add(0xf08a5d, 3.44, 4.26, B.y + 0.22, B.y + 0.25, 2.3, 2.91).add(0xfafafa, 3.55, 3.95, B.y + 0.22, B.y + 0.3, 1.98, 2.2); // tilam, blanket, pillow
  h.add(C.trim, 5.68, 5.96, B.y, B.y + 0.62, 0.85, 1.22).add(C.glow, 5.74, 5.9, B.y + 0.62, B.y + 0.86, 0.95, 1.12); // bedside rack with lamp
  for (const [x, y, w, hh, c] of [[3.0, 5.0, 0.44, 0.34, 0xf2c14e], [3.6, 5.05, 0.3, 0.42, 0x57a773]]) h.add(C.white, x - 0.04, x + w + 0.04, y - 0.04, y + hh + 0.04, 0, 0.03).add(c, x, x + w, y, y + hh, 0.03, 0.05);
  for (const [x, z] of [[0.28, 0.3], [2.2, 0.28], [0.28, 2.7]]) h.add(0xc8553d, x - 0.16, x + 0.16, S.y, S.y + 0.26, z - 0.16, z + 0.16).add(C.leaf, x - 0.24, x + 0.24, S.y + 0.26, S.y + 0.62, z - 0.24, z + 0.24, 0, 0.5, 0).add(C.leaf2, x - 0.14, x + 0.14, S.y + 0.55, S.y + 0.85, z - 0.14, z + 0.14); // potted plants
  glow.add(C.glow, 4.5, 5.6, B.y + 0.8, B.y + 1.7, 0, 0.02).add(C.white, 4.42, 5.68, B.y + 0.72, B.y + 0.8, 0, 0.04).add(C.glow, 7.4, 8.5, K.y + 1.0, K.y + 1.75, 0, 0.02).add(C.white, 7.32, 8.58, K.y + 0.94, K.y + 1.0, 0, 0.04); // lit windows on the back walls

  // Shell: roofs and the walls facing the camera.
  sh.add(C.white, S.x0, S.x1, S.y + 0.5, S.y + 0.6, Z, Z + 0.1);
  for (let x = 0.15; x < S.x1; x += 0.3) if (x < 0.6 || x > 2.0) sh.add(C.white, x - 0.03, x + 0.03, S.y, S.y + 0.5, Z + 0.02, Z + 0.08);
  for (const x of [0.1, 2.3]) sh.add(C.stilt, x - 0.08, x + 0.08, S.y, S.y + 2.3, Z - 0.18, Z - 0.02);
  sh.roof(0x3d7ea6, -0.5, S.x1, S.y + 2.3, S.y + 3.1, -0.5, Z + 0.5, true, C.wall);
  sh.add(C.wall, R.x0, R.x1, R.y, P.y, Z, Z + 0.1).add(C.wall, R.x0 - 0.1, R.x0, R.y, B.y, 0, Z).add(C.wall, R.x1, R.x1 + 0.1, R.y, P.y, 0, Z);
  sh.add(C.wall, K.x0, K.x1, K.y, K.y + 2.2, Z, Z + 0.1).add(C.wall, K.x1, K.x1 + 0.1, K.y, K.y + 2.2, 0, Z);
  sh.roof(0x3d7ea6, K.x0, K.x1 + 0.5, K.y + 2.2, K.y + 3.1, -0.5, Z + 0.5, true, C.wall);
  sh.add(C.trim, R.x0, R.x1, B.y - 0.15, B.y, Z, Z + 0.13).add(C.trim, 4.7, 5.5, R.y, R.y + 1.7, Z + 0.1, Z + 0.13).add(C.glow, 5.3, 5.38, R.y + 0.8, R.y + 0.9, Z + 0.13, Z + 0.15); // band, front door, knob
  sh.roof(C.roof, R.x0 - 0.5, R.x1 + 0.5, P.y, P.y + 1.75, -0.55, Z + 0.55, false, C.wall); // main gable over the Para
  for (const [x0, x1, y0, y1] of [[3.0, 4.1, R.y + 0.8, R.y + 1.7], [3.4, 5.1, B.y + 0.7, B.y + 1.6], [7.0, 8.0, K.y + 0.8, K.y + 1.6]]) { glowOut.add(C.glow, x0, x1, y0, y1, Z + 0.1, Z + 0.12); sh.add(C.white, x0 - 0.08, x1 + 0.08, y0 - 0.1, y0, Z + 0.1, Z + 0.16); }
  glowOut.add(C.glow, K.x1 + 0.1, K.x1 + 0.12, K.y + 0.8, K.y + 1.6, 1, 2).add(C.glow, R.x1 + 0.1, R.x1 + 0.12, B.y + 0.7, B.y + 1.6, 0.9, 2.1);
  return { h, up, sh, glow, glowOut };
}

// Pak cik in a T-shirt and kain pelikat. Body is one mesh; the arms are separate so they can swing.
export const BODY = [[C.sarong, -.23, .23, 0, .5, -.16, .16], [C.sarong2, -.235, .235, .12, .2, -.165, .165], [C.sarong2, -.235, .235, .32, .4, -.165, .165], [C.skin, -.15, -.03, -.0, .04, -.05, .2], [C.skin, .03, .15, 0, .04, -.05, .2],
  [C.shirt, -.25, .25, .5, .98, -.17, .17], [C.skin, -.08, .08, .98, 1.02, -.08, .08], [C.skin, -.21, .21, 1.02, 1.42, -.2, .2], [C.hair, -.22, .22, 1.34, 1.47, -.21, .21], [C.hair, -.22, .22, 1.2, 1.36, -.21, -.12],
  [C.dark, -.12, -.06, 1.2, 1.27, .2, .21], [C.dark, .06, .12, 1.2, 1.27, .2, .21], [0xb5651d, -.06, .06, 1.09, 1.12, .2, .21]];
export const ARM = (c = C.shirt) => [[c, -.06, .06, -.2, 0, -.07, .07], [C.skin, -.055, .055, -.42, -.2, -.065, .065]]; // hangs from the shoulder at y 0
export const NEIGHBOUR = [[C.pants, -.21, .21, 0, .45, -.15, .15], [C.coat, -.26, .26, .4, .98, -.18, .18], [C.skin, -.21, .21, 1.02, 1.42, -.2, .2], [C.coat, -.24, .24, 1.3, 1.5, -.23, .22], [C.coat, -.24, .24, 1.0, 1.36, -.23, -.14],
  [C.dark, -.12, -.06, 1.2, 1.27, .2, .21], [C.dark, .06, .12, 1.2, 1.27, .2, .21], [C.coat, -.38, -.26, .5, .92, -.07, .07]];
export const BOAT = [[C.hull, -1.2, 1.2, -0.25, 0.05, -0.58, 0.58], [C.inner, -1.1, 1.1, 0.05, 0.08, -0.48, 0.48], [C.hull, -1.2, 1.2, 0.05, 0.3, 0.5, 0.58], [C.hull, -1.2, 1.2, 0.05, 0.3, -0.58, -0.5],
  [C.hull, 1.2, 1.55, -0.15, 0.22, -0.38, 0.38], [C.white, -1.2, 1.2, 0.3, 0.34, 0.5, 0.58], [C.white, -1.2, 1.2, 0.3, 0.34, -0.58, -0.5], [C.dark, -1.32, -1.2, 0.0, 0.42, -0.14, 0.14]];
