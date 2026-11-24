// models.js: geometry only, no game state. Village, house and fallback models are built here from boxes and roof prisms;
// furniture, people, cat and boat come from models.bin (Kenney, CC0, baked by tools/bake.mjs) once it has loaded.
import * as THREE from 'three';
import { ROOMS, NODES, DEPTH } from './data.js';

export const C = { grass: 0x7dbb5a, grass2: 0x6aa84f, road: 0x5b6270, line: 0xf4f4f0, river: 0x4aa3c7, mud: 0x9b7a50, paddy: 0xa6cf5c,
  floor: 0xe2b877, floor2: 0xd6a964, deck: 0xf0c98a, wall: 0xfff1d0, trim: 0x9c6b43, stilt: 0x6e4a33, roof: 0xe4572e, pad: 0xfbe3b0,
  tamu: 0x4fb3a8, dapur: 0xf08a5d, bilik: 0x7d8fd6, water: 0xc2985c, glow: 0xffe08a, skin: 0xe0a875, hair: 0x2a2320, shirt: 0xf7f7f2, sarong: 0x2f6f8f, sarong2: 0x4f9fbf,
  coat: 0xf2c14e, pants: 0x30475e, jacket: 0xff6b00, hull: 0xe4572e, inner: 0xfaf0dc, leaf: 0x3f9d57, leaf2: 0x57b56b, trunk: 0x8a6240, rain: 0xe6f1f7, arrow: 0xffe14d, dark: 0x2b2d42, white: 0xfafafa };
const dim = (h, k) => k === 1 ? h : new THREE.Color(h).multiplyScalar(k).getHex(); // a darker tone, for baked occlusion
const pick = (cs, i) => cs.length < 3 ? i % cs.length : (i * 7 + i * i % 5) % cs.length; // sheet colour: alternate two tones, or a patchwork
const ZINC = [0xb8432e, 0xc9513a], ZINC_D = 0x8a3022, PLANK = [0x9b8167, 0x8e7560, 0xa58c72], PLANK_D = 0x6d5645, PLANK_L = 0xc2a88a, TIMBER = 0x6a4e3a, DOOR = 0x86694f, CONC = 0xb9b3a6; // house: red zinc, weathered boards, concrete

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
const U = new THREE.BoxGeometry(1, 1, 1), UP = U.attributes.position, UN = U.attributes.normal, ALL = [0, 1, 2, 3, 4, 5], SEEN = [0, 2, 4];
// open: unturned boxes keep only the faces the camera and the sun can see (+x, +y, +z); draw such a batch with shadowSide FrontSide.
export function batch(open = false) {
  const pos = [], nor = [], col = [], idx = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  const add = (colour, x0, x1, y0, y1, z0, z1, rx = 0, ry = 0, rz = 0) => { // box by extents, then a turn about its centre
    q.setFromEuler(e.set(rx, ry, rz));
    m.compose(a.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q, b.set(x1 - x0, y1 - y0, z1 - z0));
    c.set(colour); last = pos.length / 3;
    for (const f of open && !rx && !ry && !rz ? SEEN : ALL) { // BoxGeometry: face f owns vertices 4f..4f+3 and indices 6f..6f+5
      const base = pos.length / 3;
      for (let i = f * 4; i < f * 4 + 4; i++) {
        a.fromBufferAttribute(UP, i).applyMatrix4(m); pos.push(a.x, a.y, a.z);
        a.fromBufferAttribute(UN, i).applyQuaternion(q); nor.push(a.x, a.y, a.z);
        col.push(c.r, c.g, c.b);
      }
      for (let j = f * 6; j < f * 6 + 6; j++) idx.push(base + U.index.array[j] - f * 4);
    }
    if (!rx && !ry && !rz && y0 < 0.35 && y1 - y0 > 0.2) ao(0.66); // standing on the ground: dark at the foot
    return api;
  };
  let last = 0; // first vertex of the latest box
  const ao = k => { // baked ambient occlusion: darken the bottom edge of the latest box's side faces, fading up the face
    let lo = Infinity; for (let i = last; i < pos.length / 3; i++) lo = Math.min(lo, pos[i * 3 + 1]);
    for (let i = last; i < pos.length / 3; i++) if (Math.abs(nor[i * 3 + 1]) < 0.5 && pos[i * 3 + 1] < lo + 1e-4) for (let j = 0; j < 3; j++) col[i * 3 + j] *= k;
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
  const put = (parts, x, y, z, ry = 0) => { // a baked model at a place, turned about y
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (const { p, g } of parts) {
      const P = g.attributes.position, N = g.attributes.normal, K = g.attributes.color, base = pos.length / 3;
      for (let i = 0; i < P.count; i++) {
        const lx = P.getX(i) + p[0], lz = P.getZ(i) + p[2];
        pos.push(x + lx * cs + lz * sn, y + P.getY(i) + p[1], z - lx * sn + lz * cs);
        nor.push(N.getX(i) * cs + N.getZ(i) * sn, N.getY(i), -N.getX(i) * sn + N.getZ(i) * cs);
        col.push(K.getX(i), K.getY(i), K.getZ(i));
      }
      for (const k of g.index.array) idx.push(base + k);
    }
    return api;
  };
  const mesh = material => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return new THREE.Mesh(g, material);
  };
  const zinc = (cs, x0, x1, y0, y1, z0, z1, alongZ = false, end = cs[0], s = 0.3) => { // corrugated gable: sheets run down both slopes
    const p = (u, y, w) => alongZ ? [w, y, u] : [u, y, w], [u0, u1, w0, w1] = alongZ ? [z0, z1, x0, x1] : [x0, x1, z0, z1], wm = (w0 + w1) / 2, fl = f => alongZ ? [...f].reverse() : f;
    for (let u = u0, i = 0; u < u1 - 1e-6; u += s, i++) { const v = Math.min(u + s, u1); face(cs[pick(cs, i)], fl([p(u, y0, w1), p(v, y0, w1), p(v, y1, wm), p(u, y1, wm)])); face(cs[pick(cs, i + 3)], fl([p(v, y0, w0), p(u, y0, w0), p(u, y1, wm), p(v, y1, wm)])); }
    face(end, fl([p(u0, y0, w0), p(u0, y0, w1), p(u0, y1, wm)])); face(end, fl([p(u1, y0, w1), p(u1, y0, w0), p(u1, y1, wm)]));
    return api;
  };
  const hip = (cs, x0, x1, y0, y1, z0, z1, s = 0.3) => { // hipped (limas) roof, ridge along the longer side, sheets on every slope
    const aZ = z1 - z0 > x1 - x0, p = (u, y, w) => aZ ? [w, y, u] : [u, y, w], fl = f => aZ ? [...f].reverse() : f, [u0, u1, w0, w1] = aZ ? [z0, z1, x0, x1] : [x0, x1, z0, z1];
    const wm = (w0 + w1) / 2, ra = u0 + (w1 - w0) / 2, rb = u1 - (w1 - w0) / 2, cl = u => Math.min(rb, Math.max(ra, u));
    for (let u = u0, i = 0; u < u1 - 1e-6; u += s, i++) { const v = Math.min(u + s, u1);
      face(cs[pick(cs, i)], fl([p(u, y0, w1), p(v, y0, w1), p(cl(v), y1, wm), p(cl(u), y1, wm)])); face(cs[pick(cs, i + 3)], fl([p(v, y0, w0), p(u, y0, w0), p(cl(u), y1, wm), p(cl(v), y1, wm)])); }
    face(cs[pick(cs, 1)], fl([p(u0, y0, w0), p(u0, y0, w1), p(ra, y1, wm)])); face(cs[pick(cs, 2)], fl([p(u1, y0, w1), p(u1, y0, w0), p(rb, y1, wm)]));
    return api;
  };
  const api = { add, ao, roof, zinc, hip, put, mesh, face: (k, p) => { face(k, p); return api; }, all: list => { for (const s of list) add(...s); return api; } };
  return api;
}

const { serambi: S, tamu: R, dapur: K, bilik: B, para: P } = ROOMS, Z = DEPTH;
export const PERCH = [4.6, P.y + 1.62, Z / 2]; // roof beam that stays in the cutaway: where the cat waits if nobody carries it

// Village look: kampung houses in boards and zinc, palms, bushes, grass, picket fences, laterite paths. All in the one village batch, built open (see batch).
const RED2 = [0xa83c2a, 0xbb4a35], TIN = [0x8d969c, 0x7a838a, 0xa0a7ab], RUST = [0x9a4a2a, 0x8a8f94, 0xb0643a, 0x6f7478, 0xa35a34, 0x7d868c], TIN_RUST = [0x8d969c, 0x9a4a2a, 0x7a838a, 0xa0a7ab, 0xb0643a];
const WOOD = [PLANK, [0x9aa3a0, 0x8c9592, 0xa6aeab], [0xc9d9c5, 0xbccdb8, 0xd3e2cf], [0xbcd0dc, 0xaec3d0, 0xc7d9e4], [0xe6d5b0, 0xdac9a3, 0xefdfbd], [0x8f7a66, 0x857060, 0x9a8571]]; // weathered, grey, mint, blue, cream, dark
const LOG = 0x5e4a3a, TRUNK = [0xa8623f, 0x9a5a3c, 0xb46a44], RING = 0x7a4430, FROND = [0x3fae4f, 0x2f8f43, 0x5cc867], NUT = 0xd9a35b, BUSH = [0x4fae46, 0x5cc25a, 0x43a03f], BERRY = 0xd6453d, GRASS = [0x58c04a, 0x2f7d35, 0x9bd64a], PICKET = [0xc48d55, 0x9a9a94, C.white], DIRT = 0xc4925f;

export function gable(b, cs, x0, x1, y0, y1, z0, z1, alongZ, end = PLANK[0], cap = ZINC_D) { // zinc gable with a ridge cap and eave boards
  b.zinc(cs, x0, x1, y0, y1, z0, z1, alongZ, end);
  if (alongZ) { const m = (x0 + x1) / 2; b.add(cap, m - 0.14, m + 0.14, y1 - 0.03, y1 + 0.09, z0 - 0.04, z1 + 0.04).add(cap, x0 - 0.03, x0 + 0.03, y0 - 0.06, y0 + 0.04, z0, z1).add(cap, x1 - 0.03, x1 + 0.03, y0 - 0.06, y0 + 0.04, z0, z1); }
  else { const m = (z0 + z1) / 2; b.add(cap, x0 - 0.04, x1 + 0.04, y1 - 0.03, y1 + 0.09, m - 0.14, m + 0.14).add(cap, x0, x1, y0 - 0.06, y0 + 0.04, z0 - 0.03, z0 + 0.03).add(cap, x0, x1, y0 - 0.06, y0 + 0.04, z1 - 0.03, z1 + 0.03); }
}
export function leanTo(b, cs, x0, x1, ya, yb, z0, z1, cap = ZINC_D) { // zinc lean-to from ya at x0 to yb at x1, sheets running down the slope
  const L = Math.hypot(x1 - x0, yb - ya), th = Math.atan2(yb - ya, x1 - x0), cx = (x0 + x1) / 2, cy = (ya + yb) / 2;
  for (let z = z0, i = 0; z < z1 - 1e-6; z += 0.3, i++) b.add(cs[pick(cs, i)], cx - L / 2, cx + L / 2, cy - 0.04, cy + 0.04, z, Math.min(z + 0.3, z1), 0, 0, th);
  b.add(cap, cx - L / 2, cx + L / 2, cy - 0.07, cy + 0.01, z0 - 0.03, z0 + 0.03, 0, 0, th).add(cap, cx - L / 2, cx + L / 2, cy - 0.07, cy + 0.01, z1 - 0.03, z1 + 0.03, 0, 0, th);
}
function boards(b, x0, x1, y0, y1, z0, z1, P) { // wall block, boards as flat strips on the faces the camera sees (+z and +x)
  const n = Math.max(1, Math.round((y1 - y0) / 0.27)), dy = (y1 - y0) / n, zf = z1 + 0.02, xf = x1 + 0.02;
  b.add(P[0] - 0x1a1a1a, x0, x1, y0, y1, z0, z1);
  for (let i = 0; i < n; i++) { const a = y0 + i * dy + 0.015, t = a + dy - 0.03, c = dim(P[(i * 37 % 11) % 3], i === 0 ? 0.8 : i === n - 1 ? 0.85 : 1);
    b.face(c, [[x0, a, zf], [x1, a, zf], [x1, t, zf], [x0, t, zf]]).face(c, [[xf, a, z1], [xf, a, z0], [xf, t, z0], [xf, t, z1]]); }
}
function win(b, lit, c, y, f, onX) { // window centred on c along a wall face at f (+z face, or +x face if onX): lit glass, sill, open shutters
  const W = 0.28, H = 0.68, box = (k, a0, a1, y0, y1, o0, o1) => onX ? b.add(k, f + o0, f + o1, y0, y1, a0, a1) : b.add(k, a0, a1, y0, y1, f + o0, f + o1);
  if (onX) lit.add(C.glow, f + 0.04, f + 0.05, y, y + H, c - W, c + W); else lit.add(C.glow, c - W, c + W, y, y + H, f + 0.04, f + 0.05);
  box(PLANK_L, c - W - 0.06, c + W + 0.06, y - 0.08, y, 0.03, 0.1);
  box(TIMBER, c - W - 0.34, c - W - 0.02, y - 0.03, y + H + 0.03, 0.03, 0.07); box(TIMBER, c + W + 0.02, c + W + 0.34, y - 0.03, y + H + 0.03, 0.03, 0.07);
}
function steps(b, cx, fy, z1) { for (let i = 0; i < 3; i++) b.add(TIMBER, cx - 0.4, cx + 0.4, 0, fy - 0.2 - i * fy * 0.27, z1 + i * 0.28, z1 + 0.28 + i * 0.28); }
const door = (x, w, t) => x + w * (t === 'cross' ? 0.3 : 0.5), foot = (z, d, t) => z + d + (t === 'limas' ? 1 : 0) + 0.84; // door x, and z where the steps land
// A neighbour's kampung house on stilts. x, z: back-left corner, w along x, d along z. Types: panjang (long gable), cross (gable with a cross wing),
// patch (rusty gable, lean-to serambi on the side), limas (hipped roof, front gable over a serambi, log stilts, X rails).
function kampung(b, lit, x, z, w, d, type, k) {
  const P = WOOD[k % WOOD.length], fy = 0.9 + (k % 3) * 0.15, top = fy + 1.8 + (k % 2) * 0.2, x1 = x + w, z1 = z + d, log = type === 'limas';
  const cs = type === 'patch' || log ? (k % 2 ? RUST : TIN_RUST) : [RED2, ZINC, TIN][k % 3], cap = cs === TIN || cs === TIN_RUST ? 0x5f676d : ZINC_D;
  const nx = Math.max(1, Math.round((w - 0.4) / 1.6));
  for (let i = 0; i <= nx; i++) for (const sz of [z + 0.2, z1 - 0.2]) { const sx = x + 0.2 + i * (w - 0.4) / nx;
    if (log) b.add(LOG, sx - 0.09, sx + 0.09, -0.05, fy, sz - 0.09, sz + 0.09, 0.05 * Math.sin(sx * 3), 0, 0.06 * Math.cos(sx * 5));
    else b.add(CONC, sx - 0.2, sx + 0.2, 0, 0.26, sz - 0.2, sz + 0.2).add(TIMBER, sx - 0.09, sx + 0.09, 0.26, fy, sz - 0.09, sz + 0.09); }
  b.add(TIMBER, x - 0.08, x1 + 0.08, fy - 0.14, fy, z - 0.08, z1 + 0.08);
  boards(b, x, x1, fy, top, z, z1, P);
  b.add(TIMBER, x1 - 0.04, x1 + 0.07, fy, top, z1 - 0.04, z1 + 0.07);
  const h = Math.min(w, d) * 0.5, dx = door(x, w, type);
  const entry = zf => b.add(TIMBER, dx - 0.36, dx + 0.36, fy, fy + 1.35, zf + 0.03, zf + 0.06).add(DOOR, dx - 0.3, dx + 0.3, fy + 0.05, fy + 1.3, zf + 0.06, zf + 0.08);
  win(b, lit, z + d * 0.5, fy + 0.6, x1, true);
  if (type === 'cross') { // front wing under a cross gable
    const wx = x1 - w * 0.4; boards(b, wx, x1, fy, top, z1, z1 + 0.7, P);
    b.add(TIMBER, wx - 0.08, x1 + 0.08, fy - 0.14, fy, z1, z1 + 0.78).add(CONC, x1 - 0.4, x1, 0, 0.26, z1 + 0.3, z1 + 0.7).add(TIMBER, x1 - 0.29, x1 - 0.11, 0.26, fy, z1 + 0.41, z1 + 0.59);
    gable(b, cs, x - 0.4, x1 + 0.4, top, top + h, z - 0.4, z1 + 0.4, false, P[0], cap); gable(b, cs, wx - 0.35, x1 + 0.4, top, top + h, z - 0.4, z1 + 1.1, true, P[0], cap);
    win(b, lit, (wx + x1) / 2, fy + 0.6, z1 + 0.7); entry(z1); steps(b, dx, fy, z1);
  } else if (type === 'limas') { // serambi in front with X rails, hipped roof, a small gable over the serambi
    const sz = z1 + 1.0; b.add(PLANK[1], x + 0.3, x1 - 0.3, fy - 0.1, fy, z1, sz);
    for (const px of [x + 0.35, dx - 0.5, dx + 0.5, x1 - 0.35]) b.add(LOG, px - 0.07, px + 0.07, -0.05, top - 0.1, sz - 0.12, sz + 0.02);
    for (const [a, c] of [[x + 0.35, dx - 0.5], [dx + 0.5, x1 - 0.35]]) { const L = c - a, t = Math.atan2(0.45, L), m = (a + c) / 2, l2 = L / 2 / Math.cos(t);
      b.add(TIMBER, a, c, fy + 0.5, fy + 0.57, sz - 0.08, sz - 0.02).add(TIMBER, m - l2, m + l2, fy + 0.25, fy + 0.3, sz - 0.07, sz - 0.03, 0, 0, t).add(TIMBER, m - l2, m + l2, fy + 0.25, fy + 0.3, sz - 0.07, sz - 0.03, 0, 0, -t); }
    b.hip(cs, x - 0.45, x1 + 0.45, top, top + h * 0.9, z - 0.45, z1 + 0.45);
    gable(b, cs, dx - 1.0, dx + 1.0, top - 0.15, top + h * 0.55, z1 - 0.5, sz + 0.35, true, P[0], cap);
    win(b, lit, x + w * 0.18, fy + 0.6, z1); win(b, lit, x1 - w * 0.18, fy + 0.6, z1); entry(z1); steps(b, dx, fy, sz);
  } else {
    gable(b, cs, x - 0.4, x1 + 0.4, top, top + h, z - 0.4, z1 + 0.4, d > w, P[0], cap);
    win(b, lit, x + w * 0.2, fy + 0.6, z1); win(b, lit, x1 - w * 0.2, fy + 0.6, z1); entry(z1); steps(b, dx, fy, z1);
    if (type === 'patch') { // side serambi under a lean-to, wooden pickets
      const ex = x1 + 1.6; b.add(PLANK[2], x1, ex, fy - 0.1, fy, z + 0.3, z1 - 0.2);
      for (const pz of [z + 0.35, z1 - 0.25]) b.add(TIMBER, ex - 0.14, ex, 0, top - 0.5, pz - 0.07, pz + 0.07);
      fence(b, ex, z + 0.4, ex, z1 - 0.3, PICKET[0], null, fy - 0.05);
      leanTo(b, cs, ex + 0.3, x1, top - 0.6, top - 0.02, z + 0.1, z1, cap);
    }
  }
}
// Pointed pickets on two rails, posts every 1.8, along x or z from (x0, z0). Pickets and rails are flat, facing the camera.
// gap = [a, b] left open along the run; gate hangs open at the gap; y = base height.
function fence(b, x0, z0, x1, z1, col, gap, y = 0, gate = false) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0), L = ax ? x1 - x0 : z1 - z0, dark = new THREE.Color(col).multiplyScalar(0.78).getHex();
  const flat = (c, ua, ub, ys, o) => b.face(c, ys.map(([u, yy]) => ax ? [x0 + ua + (ub - ua) * u, y + yy, z0 + o] : [x0 + o, y + yy, z0 + ub + (ua - ub) * u])); // u 0..1 across, left to right seen from the camera
  const open = u => gap && u > gap[0] && u < gap[1];
  for (let u = 0.1; u < L; u += 0.2) if (!open(u)) flat(col, u - 0.045, u + 0.045, [[0, 0], [1, 0], [1, 0.5], [0.5, 0.58], [0, 0.5]], 0.015);
  for (const [a, c] of gap ? [[0, gap[0]], [gap[1], L]] : [[0, L]]) { if (c - a < 0.05) continue;
    for (const ry of [0.12, 0.36]) flat(dark, a, c, [[0, ry], [1, ry], [1, ry + 0.05], [0, ry + 0.05]], 0.03);
    for (let u = a; u <= c + 0.01; u += Math.max(0.3, (c - a) / Math.ceil((c - a) / 1.8))) ax ? b.add(dark, x0 + u - 0.05, x0 + u + 0.05, y, y + 0.66, z0 - 0.05, z0 + 0.05) : b.add(dark, x0 - 0.05, x0 + 0.05, y, y + 0.66, z0 + u - 0.05, z0 + u + 0.05); }
  if (gate && gap && ax) { // gate swung open toward the road, with a diagonal brace
    const t = -1.15, hx = x0 + gap[0], hz = z0, ux = Math.cos(t), uz = -Math.sin(t), at = s => [hx + ux * s, hz + uz * s];
    for (let s = 0.12; s < 0.9; s += 0.19) { const [px, pz] = at(s); b.add(col, px - 0.045, px + 0.045, y, y + 0.5, pz - 0.015, pz + 0.015, 0, t, 0).add(col, px - 0.032, px + 0.032, y + 0.47, y + 0.53, pz - 0.015, pz + 0.015, 0, t, Math.PI / 4); }
    const [mx, mz] = at(0.45), bl = Math.hypot(0.85, 0.26);
    for (const ry of [0.12, 0.36]) b.add(dark, mx - 0.45, mx + 0.45, y + ry, y + ry + 0.05, mz - 0.012, mz + 0.012, 0, t, 0);
    b.add(dark, mx - bl / 2, mx + bl / 2, y + 0.24, y + 0.29, mz - 0.012, mz + 0.012, 0, t, Math.atan2(0.26, 0.85));
  }
}
// Coconut palm: ringed trunk of tilted segments, drooping fronds bent in three (flat leaves, both sides). v: 0 gentle curve, 1 near straight, 2 hard lean. hd: lean heading.
function palm(b, x, z, h, v, hd) {
  const [a0, a1] = [[0.08, 0.34], [0.03, 0.12], [1.05, 0.15]][v], n = 8, L = h / n, tc = TRUNK[v];
  let px = x, py = 0, pz = z;
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n, dx = Math.sin(a) * Math.cos(hd), dy = Math.cos(a), dz = -Math.sin(a) * Math.sin(hd), r = 0.17 - i * 0.008;
    let cx = px + dx * L / 2, cy = py + dy * L / 2, cz = pz + dz * L / 2;
    b.add(tc, cx - r, cx + r, cy - L * 0.52, cy + L * 0.52, cz - r, cz + r, 0, hd, -a);
    cx = px + dx * (L - 0.05); cy = py + dy * (L - 0.05); cz = pz + dz * (L - 0.05);
    b.add(RING, cx - r * 1.2, cx + r * 1.2, cy - 0.05, cy + 0.05, cz - r * 1.2, cz + r * 1.2, 0, hd, -a);
    px += dx * L; py += dy * L; pz += dz * L;
  }
  b.add(tc, px - 0.2, px + 0.2, py - 0.15, py + 0.2, pz - 0.2, pz + 0.2, 0, hd, 0);
  if (v !== 1) for (let k = 0; k < 3; k++) { const ph = hd + k * 2.1 + 0.5, cx = px + Math.cos(ph) * 0.17, cz = pz - Math.sin(ph) * 0.17; b.add(NUT, cx - 0.1, cx + 0.1, py - 0.32, py - 0.12, cz - 0.1, cz + 0.1, 0.5, ph, 0.4); }
  for (let k = 0; k < 9; k++) {
    const ph = hd + k * 2 * Math.PI / 9 + (k % 2) * 0.2, c = FROND[(k + v) % 3], up = k % 2 ? 0.25 : 0, sx = Math.sin(ph), sz = Math.cos(ph);
    let fx = px, fy = py + 0.05, fz = pz, w0 = 0.36;
    for (const [l, e, w1] of [[0.68, 0.4 + up, 0.29], [0.64, -0.12 + up, 0.15], [0.55, -0.75 + up, 0]]) {
      const ex = fx + Math.cos(e) * Math.cos(ph) * l, ey = fy + Math.sin(e) * l, ez = fz - Math.cos(e) * Math.sin(ph) * l;
      const q = [[fx - sx * w0 / 2, fy, fz - sz * w0 / 2], [fx + sx * w0 / 2, fy, fz + sz * w0 / 2], [ex + sx * w1 / 2, ey, ez + sz * w1 / 2], [ex - sx * w1 / 2, ey, ez - sz * w1 / 2]];
      const p = w1 ? q : q.slice(0, 3); b.face(c, p).face(c, [...p].reverse());
      fx = ex; fy = ey; fz = ez; w0 = w1;
    }
  }
}
// Faceted bush: lumps of two boxes turned against each other. v: 0 one lump, 1 clump with berries, 2 big clump.
function bush(b, x, z, s, v, r) {
  const lumps = [[[0, 0, 1]], [[-0.4, 0, 0.9], [0.35, 0.15, 1], [0, -0.35, 0.8]], [[-0.55, 0, 0.9], [0.5, 0.1, 1], [0, -0.45, 0.85], [0.05, 0.4, 1.05]]][v];
  for (const [ox, oz, k] of lumps) { const q = s * k, cx = x + ox * s, cz = z + oz * s, cy = q * 0.85, c = BUSH[Math.floor(r() * 3)], t = r() * 1.5;
    b.add(c, cx - q, cx + q, cy - q * 0.8, cy + q * 0.8, cz - q, cz + q, 0.5 + t * 0.2, 0.7 + t, 0.3).add(c, cx - q * 0.85, cx + q * 0.85, cy - q * 0.85, cy + q * 0.95, cz - q * 0.85, cz + q * 0.85, 0.2, -0.4 + t, 0.6);
    if (v === 1) for (let i = 0; i < 2; i++) { const a = r() * 6.3, bx = cx + Math.cos(a) * q * 0.95, bz = cz + Math.sin(a) * q * 0.95, by = cy + (r() - 0.2) * q * 0.7; b.add(BERRY, bx - 0.06, bx + 0.06, by - 0.06, by + 0.06, bz - 0.06, bz + 0.06); } }
}
function tuft(b, x, z, s, c) { // spiky grass tuft: one triangle per blade, turned to the camera
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + x * 3, hh = s * (0.55 + (i * 0.37) % 0.45), le = (0.15 + (i % 3) * 0.17) * hh, w = 0.04, bx = x + (i - 2.5) * 0.03;
    b.face(c, [[bx - w, 0, z + w], [bx + w, 0, z - w], [bx + Math.cos(a) * le, hh, z - Math.sin(a) * le]]); }
}

// Fruit tree (mango, rambutan, jambu): short trunk under a faceted canopy of lumps. v picks the leaf tones and the fruit.
const CANOPY = [[0x2f7d3a, 0x3a8f44, 0x2a6e33], [0x4a9a3f, 0x58a84a, 0x418d39], [0x6cbf4e, 0x5aae45, 0x7acb5a]], FRUIT = [null, 0xc73a2e, 0xe88aa0];
function fruitTree(b, x, z, s, v, r) {
  const th = 1.3 * s, cy = th + 0.85 * s;
  b.add(0x7a5a3e, x - 0.13 * s, x + 0.13 * s, 0, th + 0.3 * s, z - 0.13 * s, z + 0.13 * s);
  for (const [ox, oy, oz, k] of [[0, 0.2, 0, 1.1], [-0.6, -0.15, 0.2, 0.8], [0.55, -0.1, -0.25, 0.85], [0.1, -0.2, 0.6, 0.75]]) {
    const q = s * k * 0.95, cx = x + ox * s, cyy = cy + oy * s, cz = z + oz * s, c = CANOPY[v][Math.floor(r() * 3)], t = r() * 1.5;
    b.add(c, cx - q, cx + q, cyy - q * 0.8, cyy + q * 0.8, cz - q, cz + q, 0.5 + t * 0.2, 0.7 + t, 0.3).add(c, cx - q * 0.85, cx + q * 0.85, cyy - q * 0.85, cyy + q * 0.9, cz - q * 0.85, cz + q * 0.85, 0.2, -0.4 + t, 0.6);
    if (FRUIT[v]) for (let i = 0; i < 2; i++) { const a = r() * 6.3, fx = cx + Math.cos(a) * q * 0.95, fz = cz + Math.sin(a) * q * 0.95, fy = cyy - q * 0.3 + r() * q * 0.5; b.add(FRUIT[v], fx - 0.08, fx + 0.08, fy - 0.08, fy + 0.08, fz - 0.08, fz + 0.08); }
  }
}
// Banana clump: two or three soft trunks, broad arching leaves (flat, both sides).
function banana(b, x, z, r) {
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + r(), tx = x + Math.cos(a) * 0.35, tz = z + Math.sin(a) * 0.35, h = 1.0 + r() * 0.6;
    b.add(0x8fae4a, tx - 0.09, tx + 0.09, 0, h, tz - 0.09, tz + 0.09);
    for (let i = 0; i < 5; i++) {
      const ph = a + i * 1.26, sx = Math.sin(ph), sz = Math.cos(ph), c = i % 2 ? 0x7cc34f : 0x63ad3f;
      let fx = tx, fy = h, fz = tz, w0 = 0.12;
      for (const [l, e, w1] of [[0.6, 0.75, 0.45], [0.7, 0.05, 0.38], [0.55, -0.7, 0.06]]) {
        const ex = fx + Math.cos(e) * Math.cos(ph) * l, ey = fy + Math.sin(e) * l, ez = fz - Math.cos(e) * Math.sin(ph) * l;
        const p = [[fx - sx * w0 / 2, fy, fz - sz * w0 / 2], [fx + sx * w0 / 2, fy, fz + sz * w0 / 2], [ex + sx * w1 / 2, ey, ez + sz * w1 / 2], [ex - sx * w1 / 2, ey, ez - sz * w1 / 2]];
        b.face(c, p).face(c, [...p].reverse()); fx = ex; fy = ey; fz = ez; w0 = w1;
      }
    }
  }
}

// On screen at the landing (sway included), not under the Mula button: nothing is built where no camera ever looks.
const seen = (x, z, m = 0) => { const dx = x - 4.5, dz = z - 3.2, sx = (dx - dz) * 0.7071, sy = (dx + dz) * 0.354; return Math.abs(sx) < 13.5 + 0.15 * Math.hypot(dx, dz) + m && sy > -25 - m && sy < (Math.abs(sx) < 7.5 ? 15 : 24.5) + m; };
// Tall things (height h, crown radius rr) stay out of the play view in front of the main house; behind it they frame it.
const open = (x, z, h, rr = 0) => { if (x + z < 5) return true; const dx = x - 4.5, dz = z - 1.5, sx = (dx - dz) * 0.7071, sy0 = -3.2 - (dx + dz) * 0.354; return Math.abs(sx) > 8 + rr || sy0 + h * 0.866 < -10.5 || sy0 > 10.5; };
const wet = z => (z > -14.7 && z < -6.8) || (z > 6.1 && z < 9.3); // river and road: no trunk and no crown
// Houses, spread out with yards between: near side, three loose rows across the river (bank path, two back lanes), bands across the road kept out of the play view.
const HOUSES = [[-10, -2.5, 4.6, 3.2, 'cross'], [-19.5, -4.6, 4.2, 3.2, 'limas'], [15, -3.6, 3.6, 3.2, 'patch'], [-27, -6.4, 4.2, 3, 'panjang'],
  [-40, -19.4, 4.4, 3.2, 'panjang'], [-30, -20.2, 4.6, 3.4, 'cross'], [-20, -19.2, 4.2, 3.2, 'limas'], [-10, -20, 4.4, 3.2, 'patch'], [0, -19.4, 4.4, 3.2, 'cross'],
  [-35, -27.6, 4.2, 3.2, 'limas'], [-25, -28.2, 4.6, 3.2, 'patch'], [-14.5, -27.4, 4.4, 3.2, 'panjang'], [-6.5, -28, 4.2, 3.4, 'cross'],
  [-30, -34.6, 4.4, 3.2, 'panjang'], [-19, -35, 4.2, 3.2, 'cross'],
  [-6, 11, 4.6, 3.2, 'limas'], [1.5, 18, 4.2, 3.2, 'panjang'], [5, 23.8, 4.4, 3.4, 'cross'], [11.5, 31, 4.4, 3.2, 'patch'],
  [27, 11, 3.8, 3.2, 'cross'], [34, 14.5, 4.4, 3.4, 'panjang'], [27.5, 20.5, 4.4, 3.4, 'limas'], [18, 21.5, 4, 3.2, 'limas'], [21.5, 28, 4.2, 3.2, 'patch']];
// Laterite paths [x0, x1, z0, z1]: river bank and back lanes across the river, a footway from the lanes over the titian to the main house, each near house to the road.
const PATHS = [[-46, 8, -15.7, -14.8], [-46, 6, -24.3, -23.5], [-40, -10, -30.9, -30.1], [-1.3, -0.5, -30.1, -15.7], [-1.3, -0.5, -7.1, 4.7], [-1.3, 1.4, 4.0, 4.7], [0.6, 2.0, 4.7, 6.4],
  ...HOUSES.filter(([, z]) => z > -8 && z < 6).map(([x, z, w, d, t]) => { const dx = door(x, w, t); return [dx - 0.35, dx + 0.35, foot(z, d, t) - 0.1, 6.4]; })];
// Ground kept free of bushes, grass and trees: road, river, lane, paddy, paths, the main house and its yard, each house with its serambi and steps.
const BUSY = [[-60, 70, 6.2, 9.2], [-60, 70, -14.4, -7.1], [12, 14.8, -7.3, 6.4], [16.8, 27.4, -6.8, 5.7], [-1.2, 10, -0.8, 6], [-8.8, -6.8, 6.8, 8.1], ...PATHS.map(([a, b, c, d]) => [a - 0.2, b + 0.2, c - 0.2, d + 0.2]),
  ...HOUSES.map(([x, z, w, d]) => [x - 0.7, x + w + 2.1, z - 0.7, z + d + 2.4])];
const free = (x, z, m = 0) => !BUSY.some(([a, b, c, d]) => x > a - m && x < b + m && z > c - m && z < d + m);

// The village around the main house: grass, river behind, road in front, neighbours, trees. Static, two draw calls.
export function buildVillage() {
  const b = batch(true), lit = batch(), blobs = [[-1.2, 10.2, -1.2, 4.2, 0.6, 0], [-9.4, -6.8, 6.6, 8.3, 0.5, 0]]; // contact shadows: [x0, x1, z0, z1, strength, round]
  let seed = 7; const r = () => (seed = seed * 16807 % 2147483647) / 2147483647; // fixed scatter, same village every load
  b.add(C.grass, -60, 70, -0.3, 0, -60, 70);
  for (const [x, z, w, d] of [[-9, -3, 7, 5], [11, 3, 6, 4], [-16, 10, 8, 6], [2, 11, 5, 3], [16, -4, 6, 5], [-3, 4.5, 5, 1.6], [-30, -30, 14, 6], [-12, -24, 9, 5]]) b.add(C.grass2, x, x + w, 0, 0.015, z, z + d); // darker lawn patches
  b.add(C.river, -60, 70, 0, 0.03, -13.5, -8).add(C.mud, -60, 70, 0, 0.02, -8, -7.3).add(C.mud, -60, 70, 0, 0.02, -14.2, -13.5); // the river that will rise
  b.add(C.road, -60, 70, 0, 0.04, 6.4, 9).add(C.road, 12.2, 14.6, 0, 0.04, -7.3, 6.4); // road, and a lane to the bridge
  for (let x = -58; x < 70; x += 3) if (seen(x, 7.7, 2)) b.add(C.line, x, x + 1.4, 0.04, 0.05, 7.62, 7.78);
  for (const [x0, x1, z0, z1] of PATHS) b.add(DIRT, x0, x1, 0.02, 0.045, z0, z1);
  b.add(C.trim, 11.9, 14.9, 0.05, 0.3, -14.4, -7.1).add(C.stilt, 11.9, 12.05, 0.3, 0.9, -14.4, -7.1).add(C.stilt, 14.75, 14.9, 0.3, 0.9, -14.4, -7.1); // bridge
  for (let z = -14.3; z < -7.2; z += 0.26) b.add(z * 7 % 2 > 1 ? PLANK[0] : PLANK[2], -1.35, -0.45, 0.42, 0.5, z, z + 0.22); // titian: plank footbridge to the far bank
  for (let z = -14.2; z < -7; z += 1.8) { b.add(LOG, -1.4, -1.28, -0.2, 0.5, z, z + 0.12).add(LOG, -0.52, -0.4, -0.2, 1.15, z, z + 0.12); }
  b.add(TIMBER, -0.5, -0.42, 1.08, 1.15, -14.2, -7.1);
  const onHouse = (x0, x1, z0, z1) => HOUSES.some(([x, z, w, d]) => x0 < x + w + 2 && x1 > x - 0.5 && z0 < z + d + 0.5 && z1 > z - 0.5) || PATHS.some(([a, c, e, f]) => x0 < c && x1 > a && z0 < f && z1 > e);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) { const x = 17 + i * 2.6, z = -6.6 + j * 1.35; if (!onHouse(x, x + 2.2, z, z + 1.1)) b.add(C.paddy, x, x + 2.2, 0, 0.05, z, z + 1.1); } // paddy plots
  HOUSES.forEach(([x, z, w, d, t], k) => {
    kampung(b, lit, x, z, w, d, t, k); blobs.push([x - 1.2, x + w + (t === 'patch' ? 3 : 1.2), z - 1.2, z + d + (t === 'limas' ? 2.2 : t === 'cross' ? 1.9 : 1.2), 0.6, 0]);
    if (k % 3 === 0 && z > -15) { const fz = z + d + (t === 'limas' ? 2.5 : 1.5), dx = door(x, w, t) - x + 0.6; fence(b, x - 0.6, fz, x + w + (t === 'patch' ? 2.2 : 0.6), fz, PICKET[k % 2], [dx - 0.55, dx + 0.55]); }
  });
  // Trees. Palms that frame the main house: [x, z, height, shape, lean heading]. Then a seeded scatter of fruit trees, palms and banana clumps with room between them.
  const trees = [];
  const plant = (x, z, h, rr, lean = [x, z]) => { if (!seen(x, z, 3) || !free(x, z, 0.5) || wet(z) || wet(lean[1]) || !open(x, z, h, rr) || !open(...lean, h, rr) || trees.some(([a, c]) => Math.hypot(a - x, c - z) < 2.6)) return false; trees.push([x, z]); return true; };
  const palmAt = (x, z, h, v, hd) => { const reach = v === 2 ? h * 0.4 : v ? 0.3 : h * 0.15; const ok = plant(x, z, h, 2, [x + Math.cos(hd) * reach, z - Math.sin(hd) * reach]); if (ok) { palm(b, x, z, h, v, hd); blobs.push([x - 1.1, x + 1.1, z - 1.1, z + 1.1, 0.5, 1]); } return ok; };
  for (const [x, z, h, v, hd] of [[-2.3, -1.5, 7.6, 0, 2.2], [-4.2, 3.2, 6.4, 1, 0], [1, -5.5, 6.9, 0, 0.6], [6.5, -4.8, 7.4, 1, 0], [11, -4.5, 7, 0, 2.6], [-6.5, 1.5, 5, 2, 3.4], [19.5, 2.5, 6.6, 0, 1]]) palmAt(x, z, h, v, hd);
  for (let i = 0, n = 0; i < 4000 && n < 70; i++) {
    const x = -50 + r() * 100, z = -42 + r() * 92, k = r();
    if (k < 0.45) { const s = 0.8 + r() * 0.5; if (plant(x, z, 3.6 * s, 1.5 * s)) { fruitTree(b, x, z, s, n % 3, r); blobs.push([x - 2.2 * s, x + 2.2 * s, z - 2.2 * s, z + 2.2 * s, 0.55, 1]); n++; } }
    else if (k < 0.75) { const v = n % 3, h = (v === 2 ? 4.6 : 6.2) + r(), hd = r() * 6.3; if (palmAt(x, z, h, v, hd)) n++; }
    else if (plant(x, z, 2.2, 1)) { banana(b, x, z, r); blobs.push([x - 1.4, x + 1.4, z - 1.4, z + 1.4, 0.45, 1]); n++; }
  }
  for (const [x, z, s, v] of [[-1.9, 4.6, 0.4, 1], [9.8, 4.2, 0.5, 2], [10.4, -1.2, 0.4, 0], [-5.5, 0.5, 0.55, 2], [5.5, 5.4, 0.35, 0], [3.5, 4.4, 0.3, 0], [7.8, 4.6, 0.35, 1]]) { bush(b, x, z, s, v, r); blobs.push([x - 2.4 * s, x + 2.4 * s, z - 2.4 * s, z + 2.4 * s, 0.5, 1]); }
  for (let i = 0, n = 0; i < 2000 && n < 60; i++) { const x = -50 + r() * 100, z = -42 + r() * 92; if (seen(x, z) && free(x, z, 0.6) && !trees.some(([a, c]) => Math.hypot(a - x, c - z) < 1.2)) { const sz = 0.3 + r() * 0.3; bush(b, x, z, sz, n % 3, r); blobs.push([x - 2.4 * sz, x + 2.4 * sz, z - 2.4 * sz, z + 2.4 * sz, 0.5, 1]); n++; } }
  for (let i = 0, n = 0; i < 4000 && n < 230; i++) { const x = -50 + r() * 100, z = -42 + r() * 92; if (seen(x, z) && free(x, z, 0.2)) { tuft(b, x, z, 0.35 + r() * 0.2, GRASS[n % 3]); n++; } }
  [[0.2, 3.4], [2.7, 3.3], [6.1, 3.4], [9.3, 3.2], [-1.8, 0.6], [4.4, 4.8], [8.8, 0.3]].forEach(([x, z], i) => tuft(b, x, z, 0.42, GRASS[i % 3]));
  for (let x = -37; x < 45; x += 7.5) if (open(x, 9.7, 4.2) && seen(x, 9.7, 2)) b.add(C.stilt, x - 0.07, x + 0.07, 0, 4.2, 9.63, 9.77).add(C.stilt, x - 0.5, x + 0.5, 3.9, 3.98, 9.66, 9.74); // electric poles, far side of the road
  fence(b, -3, 5.24, 11.2, 5.24, C.white, [3.4, 5.3], 0, true); // the main house's white pickets, gate open at the steps
  b.add(0x4d7ea8, -9, -7.2, 0.18, 0.62, 7.0, 7.9).add(0x4d7ea8, -8.7, -7.6, 0.62, 0.98, 7.05, 7.85).add(0xcfe6f2, -8.72, -7.58, 0.66, 0.94, 7.03, 7.87) // a small car
    .add(C.dark, -8.8, -8.45, 0.05, 0.36, 6.95, 7.95).add(C.dark, -7.75, -7.4, 0.05, 0.36, 6.95, 7.95);
  return [b, lit, blobs];
}
// Contact shadows as one mesh: a soft quad per blob, black, strength in the vertex colour (the material reads it as alpha). The map is an atlas: left half a soft box, right half a soft disc.
export function blobMesh(list, material) {
  const pos = [], uv = [], col = [], idx = [];
  for (const [x0, x1, z0, z1, a, round] of list) {
    const k = pos.length / 3, u = round ? 0.5 : 0, y = 0.05;
    pos.push(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0); uv.push(u, 0, u + 0.5, 0, u + 0.5, 1, u, 1);
    for (let i = 0; i < 4; i++) col.push(a, a, a);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  return new THREE.Mesh(g, material);
}

// Main house. Returns batches: h stays in the cutaway, f = plain stand-in furniture (hidden once models.bin arrives), up = see-through upper floor,
// glow = lit windows inside, sh/glowOut = shell that fades at Mula.
export function buildHouse() {
  const h = batch(), f = batch(), up = batch(), sh = batch(), glow = batch(), glowOut = batch();
  for (const r of [S, R, K]) {
    for (let z = 0, i = 0; z < Z; z += 0.5, i++) h.add(i ? (i % 2 ? C.floor : C.floor2) : dim(C.floor2, 0.84), r.x0, r.x1, r.y - 0.15, r.y, z, z + 0.5); // planks, darker along the back wall
    for (const x of [r.x0 + 0.15, r.x1 - 0.15]) for (const z of [0.15, Z - 0.15]) h.add(CONC, x - 0.22, x + 0.22, 0, 0.3, z - 0.22, z + 0.22).add(C.stilt, x - 0.1, x + 0.1, 0.3, r.y - 0.15, z - 0.1, z + 0.1);
    h.add(C.trim, r.x0, r.x1, r.y - 0.2, r.y - 0.15, -0.02, Z + 0.02);
  }
  for (let i = 0; i < 3; i++) h.add(C.trim, 0.7, 1.9, 0, S.y - 0.25 - i * 0.25, Z + i * 0.3, Z + 0.3 + i * 0.3); // front steps
  for (const x of [0.64, 1.96]) h.add(C.stilt, x - 0.03, x + 0.03, S.y + 0.1, S.y + 0.16, Z + 0.02, Z + 0.98, 0.7, 0, 0).add(C.stilt, x - 0.04, x + 0.04, 0, S.y + 0.58, Z - 0.06, Z + 0.02).add(C.stilt, x - 0.04, x + 0.04, 0, S.y - 0.2, Z + 0.9, Z + 0.98); // rails and posts
  h.add(CONC, 0.35, 2.25, 0, 0.08, Z + 0.8, Z + 1.7); // concrete pad
  const hole = [3.4, 5.8, 0.75]; // stairwell in the Bilik floor: x0, x1, z1
  up.add(C.floor, B.x0, B.x1, B.y - 0.15, B.y, hole[2], Z).add(C.floor, B.x0, hole[0], B.y - 0.15, B.y, 0, hole[2]).add(C.floor, hole[1], B.x1, B.y - 0.15, B.y, 0, hole[2]);
  // Walls that stay: back walls in room colours, Serambi railing, Bilik side wall.
  h.add(C.white, S.x0, S.x1, S.y + 0.5, S.y + 0.6, -0.1, 0).add(C.white, -0.1, 0, S.y + 0.5, S.y + 0.6, 0, Z);
  for (let x = 0.15; x < S.x1; x += 0.3) h.add(C.white, x - 0.03, x + 0.03, S.y, S.y + 0.5, -0.08, -0.02);
  for (let z = 0.15; z < Z; z += 0.3) h.add(C.white, -0.08, -0.02, S.y, S.y + 0.5, z - 0.03, z + 0.03);
  h.add(C.tamu, R.x0, R.x1, R.y, B.y - 0.15, -0.1, 0).ao(0.78).add(C.bilik, R.x0, R.x1, B.y, P.y, -0.1, 0).ao(0.78).add(C.bilik, B.x0 - 0.1, B.x0, B.y, P.y, 0, Z).ao(0.78).add(C.dapur, K.x0, K.x1, K.y, K.y + 2.2, -0.1, 0).ao(0.78); // back walls, dark at the floor
  h.add(C.trim, R.x0, R.x1, B.y - 0.15, B.y, -0.12, 0).add(C.trim, K.x0, K.x1, K.y + 2.2, K.y + 2.3, -0.12, 0.02);
  for (const [r, x1, y] of [[R, R.x1, R.y], [K, K.x1, K.y], [B, B.x1, B.y]]) h.add(C.white, r.x0, x1, y, y + 0.12, 0, 0.03); // skirting
  const sb = NODES.sb, st = NODES.st, run = sb.x - st.x, rise = B.y - R.y, steps = 9; // real stairs
  for (let i = 0; i < steps; i++) h.add(i % 2 ? C.trim : 0xb07d52, sb.x - (i + 1) * run / steps, sb.x - i * run / steps, R.y + i * rise / steps - 0.05, R.y + (i + 1) * rise / steps, sb.z - 0.36, sb.z + 0.36);
  for (let i = 0; i < 2; i++) h.add(C.stilt, NODES.hb.x - 0.25 + i * 0.44, NODES.hb.x - 0.19 + i * 0.44, B.y, P.y + 0.4, NODES.hb.z - 0.44, NODES.hb.z - 0.38); // ladder
  for (let y = B.y + 0.3; y < P.y + 0.3; y += 0.4) h.add(C.stilt, NODES.hb.x - 0.22, NODES.hb.x + 0.22, y, y + 0.06, NODES.hb.z - 0.44, NODES.hb.z - 0.38);
  h.add(C.stilt, P.x0, P.x1, P.y + 1.5, PERCH[1], Z / 2 - 0.08, Z / 2 + 0.08); // roof beam
  for (const x of [P.x0 + 0.08, P.x1 - 0.08]) h.add(C.stilt, x - 0.07, x + 0.07, P.y, P.y + 1.5, Z / 2 - 0.07, Z / 2 + 0.07);
  for (const k in NODES) if (NODES[k].slot) { const n = NODES[k], y = ROOMS[n.rooms[0]].y, x = n.x + n.at[0], z = n.z + n.at[1]; f.add(n.at[2] > 0.1 ? C.trim : C.pad, x - 0.3, x + 0.3, y, y + n.at[2], z - 0.28, z + 0.28); } // stand-ins: a crate or a mat under every slot
  // Furniture and decor, kept off the walking lines.
  h.add(0xc8553d, 3.3, 5.3, R.y, R.y + 0.015, 1.3, 2.9).add(0xf2d9a0, 3.45, 5.15, R.y + 0.015, R.y + 0.02, 1.45, 2.75); // Ruang Tamu rug
  for (const [x, y, w, hh, c] of [[2.85, 2.5, 0.5, 0.4, 0xf2c14e], [3.5, 2.75, 0.36, 0.5, 0xfafafa], [4.05, 3.1, 0.5, 0.36, 0xe4572e], [4.8, 3.45, 0.4, 0.4, 0xfafafa]]) h.add(C.trim, x - 0.04, x + w + 0.04, y - 0.04, y + hh + 0.04, 0, 0.03).add(c, x, x + w, y, y + hh, 0.03, 0.05); // frames going up the stairs
  h.add(C.trim, 6.3, 7.3, K.y + 1.55, K.y + 1.6, 0, 0.26).add(0xfafafa, 6.4, 6.6, K.y + 1.6, K.y + 1.78, 0.05, 0.2).add(0x2a9d8f, 6.7, 6.86, K.y + 1.6, K.y + 1.85, 0.05, 0.2).add(0xf2c14e, 6.95, 7.15, K.y + 1.6, K.y + 1.74, 0.05, 0.2); // shelf with jars
  h.add(0x3d7ea6, 8.55, 8.9, K.y, K.y + 0.6, 1.25, 1.6).add(0xcfd8dc, 8.66, 8.79, K.y + 0.6, K.y + 0.72, 1.36, 1.49); // gas tank
  h.add(0x57a773, 6.7, 8.2, K.y, K.y + 0.015, 1.25, 2.1); // tikar
  h.add(C.trim, 3.5, 4.5, B.y, B.y + 0.1, 1.5, 2.75).add(0xfafafa, 3.54, 4.46, B.y + 0.1, B.y + 0.22, 1.54, 2.71).add(0xf08a5d, 3.54, 4.46, B.y + 0.22, B.y + 0.25, 2.05, 2.71).add(0xfafafa, 3.6, 3.86, B.y + 0.22, B.y + 0.3, 1.58, 1.96); // tilam on the floor, blanket, pillow
  for (const [x, y, w, hh, c] of [[3.0, 5.0, 0.44, 0.34, 0xf2c14e], [3.6, 5.05, 0.3, 0.42, 0x57a773]]) h.add(C.white, x - 0.04, x + w + 0.04, y - 0.04, y + hh + 0.04, 0, 0.03).add(c, x, x + w, y, y + hh, 0.03, 0.05);
  for (const [x, z] of [[2.2, 0.28], [0.28, 2.8]]) f.add(0xc8553d, x - 0.16, x + 0.16, S.y, S.y + 0.26, z - 0.16, z + 0.16).add(C.leaf, x - 0.24, x + 0.24, S.y + 0.26, S.y + 0.62, z - 0.24, z + 0.24, 0, 0.5, 0).add(C.leaf2, x - 0.14, x + 0.14, S.y + 0.55, S.y + 0.85, z - 0.14, z + 0.14); // potted plants
  glow.add(C.glow, 4.5, 5.6, B.y + 0.8, B.y + 1.7, 0, 0.02).add(C.white, 4.42, 5.68, B.y + 0.72, B.y + 0.8, 0, 0.04).add(C.glow, 7.4, 8.5, K.y + 1.0, K.y + 1.75, 0, 0.02).add(C.white, 7.32, 8.58, K.y + 0.94, K.y + 1.0, 0, 0.04); // lit windows on the back walls

  // Shell: roofs and the walls facing the camera. Weathered boards, red zinc, concrete footings, lean-to serambi.
  const planks = (x0, x1, y0, y1, z0, z1) => { // a wall box with boards on its camera face (+z, or +x on a side wall)
    const side = x1 - x0 < z1 - z0, n = Math.max(1, Math.round((y1 - y0) / 0.27)), dy = (y1 - y0) / n;
    sh.add(PLANK_D, x0, x1, y0, y1, z0, z1);
    for (let i = 0; i < n; i++) { const a = y0 + i * dy + 0.015, c = dim(PLANK[(i * 37 % 11) % 3], i === 0 ? 0.8 : i === n - 1 ? 0.85 : 1); if (side) sh.add(c, x1, x1 + 0.03, a, a + dy - 0.03, z0, z1); else sh.add(c, x0, x1, a, a + dy - 0.03, z1, z1 + 0.03); }
  };
  const sa = 3.1, sr = (3.95 - 3.1) / 3.1, under = x => sa + (x + 0.5) * sr - 0.06; // serambi roof: low edge 3.1 at x -0.5, joins the main wall at 3.95
  sh.add(C.white, S.x0, S.x1, S.y + 0.5, S.y + 0.6, Z, Z + 0.1);
  for (let x = 0.15; x < S.x1; x += 0.3) if (x < 0.6 || x > 2.0) sh.add(C.white, x - 0.03, x + 0.03, S.y, S.y + 0.5, Z + 0.02, Z + 0.08);
  for (const x of [0.1, 2.3]) sh.add(TIMBER, x - 0.08, x + 0.08, S.y, under(x), Z - 0.18, Z - 0.02);
  leanTo(sh, ZINC, -0.5, 2.6, sa, 3.95, -0.5, Z + 0.5);
  planks(R.x0, R.x1, R.y, P.y, Z, Z + 0.1); planks(R.x1, R.x1 + 0.1, R.y, P.y, 0, Z); sh.add(PLANK_D, R.x0 - 0.1, R.x0, R.y, B.y, 0, Z);
  planks(K.x0, K.x1, K.y, K.y + 2.2, Z, Z + 0.1); planks(K.x1, K.x1 + 0.1, K.y, K.y + 2.2, 0, Z);
  gable(sh, ZINC, K.x0, K.x1 + 0.5, K.y + 2.2, K.y + 3.4, -0.5, Z + 0.5, true); // kitchen wing: cross gable
  sh.add(TIMBER, R.x0, R.x1, B.y - 0.15, B.y, Z, Z + 0.13).add(TIMBER, 4.7, 5.5, R.y, R.y + 1.7, Z + 0.1, Z + 0.14).add(C.glow, 5.3, 5.38, R.y + 0.8, R.y + 0.9, Z + 0.14, Z + 0.16); // band, front door, knob
  for (const x of [4.78, 5.12]) for (const y of [R.y + 0.08, R.y + 0.6, R.y + 1.12]) sh.add(DOOR, x, x + 0.32, y, y + 0.44, Z + 0.14, Z + 0.16); // door panels
  gable(sh, ZINC, R.x0 - 0.5, R.x1 + 0.5, P.y, P.y + 1.75, -0.55, Z + 0.55, false); // main gable over the Para
  for (const [x0, x1, y0, y1] of [[3.0, 4.1, R.y + 0.8, R.y + 1.7], [3.4, 5.1, B.y + 0.7, B.y + 1.6], [7.0, 8.0, K.y + 0.8, K.y + 1.6]]) {
    glowOut.add(C.glow, x0, x1, y0, y1, Z + 0.13, Z + 0.145); sh.add(PLANK_L, x0 - 0.08, x1 + 0.08, y0 - 0.1, y0, Z + 0.1, Z + 0.16).add(PLANK_L, x0 - 0.08, x1 + 0.08, y1, y1 + 0.07, Z + 0.1, Z + 0.15);
    for (const [a, b] of [[x0 - 0.46, x0 - 0.06], [x1 + 0.06, x1 + 0.46]]) sh.add(TIMBER, a, b, y0 - 0.05, y1 + 0.05, Z + 0.1, Z + 0.15).add(DOOR, a + 0.05, b - 0.05, y0 + 0.02, y1 - 0.02, Z + 0.15, Z + 0.17); // open shutters
  }
  glowOut.add(C.glow, K.x1 + 0.13, K.x1 + 0.145, K.y + 0.8, K.y + 1.6, 1, 2).add(C.glow, R.x1 + 0.13, R.x1 + 0.145, B.y + 0.7, B.y + 1.6, 0.9, 2.1);
  return { h, f, up, sh, glow, glowOut };
}

// Baked models (tools/bake.mjs): { name: [{ n, p: pivot, g: geometry relative to the pivot }] }. Throws if the file cannot load.
export async function loadPack(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('models ' + r.status);
  const buf = await r.arrayBuffer(), len = new DataView(buf).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len))), c = new THREE.Color(), pack = {};
  let o = 4 + len;
  for (const name in head) pack[name] = head[name].map(([n, px, py, pz, q, v, i]) => {
    const P = new Int16Array(buf.slice(o, o += v * 6)), I = new Uint16Array(buf.slice(o, o += i * 2)), K = new Uint8Array(buf, o, v * 3), col = new Float32Array(v * 3), g = new THREE.BufferGeometry();
    o += v * 3 + (v & 1);
    for (let k = 0; k < v * 3; k += 3) { c.setRGB(K[k] / 255, K[k + 1] / 255, K[k + 2] / 255, THREE.SRGBColorSpace); col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(P, x => x * q), 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex([...I]); g.computeVertexNormals(); g.computeBoundingBox();
    return { n, p: [px, py, pz], g };
  });
  return pack;
}

// Furniture from the pack: [model, x, floor, z, turn]. Slot furniture stands where data.js puts the item (node + at).
const T90 = Math.PI / 2;
export function furnish(pack) {
  const b = batch();
  for (const [m, x, y, z, ry = 0] of [
    ['benchCushion', 0.18, S.y, 0.7, T90], ['sideTable', 1.7, S.y, 0.2], ['cardboardBoxClosed', 0.32, S.y, 2.3], ['cardboardBoxOpen', 0.4, S.y, 1.72, 0.4], ['pottedPlant', 2.25, S.y, 0.25], ['pottedPlant', 0.25, S.y, 2.8],
    ['cabinetTelevision', 2.74, R.y, 2.3, T90], ['sideTableDrawers', 3.9, R.y, 2.82], ['bookcaseOpenLow', 5.4, R.y, 2.82], ['lampRoundFloor', 5.82, R.y, 2.2], ['pottedPlant', 2.72, R.y, 1.0],
    ['kitchenCabinetDrawer', 6.675, K.y, 0.335], ['kitchenStove', 7.325, K.y, 0.335], ['kitchenSink', 7.975, K.y, 0.335], ['kitchenCabinet', 8.625, K.y, 0.335], ['trashcan', 6.2, K.y, 0.3],
    ['tableCloth', 7.0, K.y, 2.72], ['chairCushion', 6.12, K.y, 2.72, T90], ['chairCushion', 7.88, K.y, 2.72, -T90],
    ['sideTableDrawers', 5.78, B.y, 1.4, -T90], ['lampRoundTable', 5.8, B.y + 0.58, 1.08], ['bookcaseOpenLow', 4.6, B.y, 2.8], ['cabinetBedDrawerTable', 5.78, B.y, 2.78], ['coatRackStanding', 5.82, B.y, 0.95], ['pottedPlant', 2.78, B.y, 2.8],
    ['cardboardBoxClosed', 2.85, P.y, 0.35], ['cardboardBoxOpen', 2.9, P.y, 0.85, T90], ['cardboardBoxClosed', 2.86, P.y + 0.42, 0.36, 0.3],
  ]) b.put(pack[m], x, y, z, ry);
  return b;
}

// Pak cik in a T-shirt and kain pelikat. Body is one mesh; the arms are separate so they can swing.
export const BODY = [[C.sarong, -.23, .23, 0, .5, -.16, .16], [C.sarong2, -.235, .235, .12, .2, -.165, .165], [C.sarong2, -.235, .235, .32, .4, -.165, .165], [C.skin, -.15, -.03, -.0, .04, -.05, .2], [C.skin, .03, .15, 0, .04, -.05, .2],
  [C.shirt, -.25, .25, .5, .98, -.17, .17], [C.skin, -.08, .08, .98, 1.02, -.08, .08], [C.skin, -.21, .21, 1.02, 1.42, -.2, .2], [C.hair, -.22, .22, 1.34, 1.47, -.21, .21], [C.hair, -.22, .22, 1.2, 1.36, -.21, -.12],
  [C.dark, -.12, -.06, 1.2, 1.27, .2, .21], [C.dark, .06, .12, 1.2, 1.27, .2, .21], [0xb5651d, -.06, .06, 1.09, 1.12, .2, .21]];
export const SARONG = [[C.sarong, -.34, .34, .08, .44, -.36, .24], [C.sarong2, -.345, .345, .15, .21, -.365, .245], [C.sarong2, -.345, .345, .3, .36, -.365, .245]]; // kain pelikat over the baked man's legs
export const ARM = (c = C.shirt) => [[c, -.06, .06, -.2, 0, -.07, .07], [C.skin, -.055, .055, -.42, -.2, -.065, .065]]; // hangs from the shoulder at y 0
export const NEIGHBOUR = [[C.pants, -.21, .21, 0, .45, -.15, .15], [C.coat, -.26, .26, .4, .98, -.18, .18], [C.skin, -.21, .21, 1.02, 1.42, -.2, .2], [C.coat, -.24, .24, 1.3, 1.5, -.23, .22], [C.coat, -.24, .24, 1.0, 1.36, -.23, -.14],
  [C.dark, -.12, -.06, 1.2, 1.27, .2, .21], [C.dark, .06, .12, 1.2, 1.27, .2, .21], [C.coat, -.38, -.26, .5, .92, -.07, .07]];
export const BOAT = [[C.hull, -1.2, 1.2, -0.25, 0.05, -0.58, 0.58], [C.inner, -1.1, 1.1, 0.05, 0.08, -0.48, 0.48], [C.hull, -1.2, 1.2, 0.05, 0.3, 0.5, 0.58], [C.hull, -1.2, 1.2, 0.05, 0.3, -0.58, -0.5],
  [C.hull, 1.2, 1.55, -0.15, 0.22, -0.38, 0.38], [C.white, -1.2, 1.2, 0.3, 0.34, 0.5, 0.58], [C.white, -1.2, 1.2, 0.3, 0.34, -0.58, -0.5], [C.dark, -1.32, -1.2, 0.0, 0.42, -0.14, 0.14]];

// Pak cik reads as one dark lump against wood and water. White baju melayu (the baked green shirt turns white, shading kept, skin and hair untouched) and a light songkok.
export function baju(parts) {
  const c = new THREE.Color(), w = new THREE.Color(0xf6f2e4);
  for (const q of parts) if (q.n === 'torso' || q.n.startsWith('arm')) {
    const a = q.g.attributes.color;
    for (let i = 0; i < a.count; i++) { c.fromBufferAttribute(a, i); if (c.g > c.r) { const k = 0.82 + 0.18 * Math.min(1, Math.max(0, (c.g - 0.2) / 0.35)); a.setXYZ(i, w.r * k, w.g * k, w.b * k); } } // greens only
  }
}
export const SONGKOK = [[0xf4eed8, -.39, .39, .44, .7, -.39, .39], [0xf4eed8, -.33, .33, .7, .77, -.33, .33], [0xcfa94a, -.4, .4, .44, .48, -.4, .4]]; // in head space, fitted to the baked head (top is 0.72 wide, y up to 0.69)
