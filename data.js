// data.js: content and tuning only, no logic. Units: tiles (x right, z toward the viewer, y up), seconds.

export const ITEMS = [
  { id: 'dokumen', name: 'Dokumen Penting', icon: '📄', wt: 1, nilai: 10, c: 0xf2e9c9 },
  { id: 'ubat', name: 'Ubat-ubatan', icon: '💊', wt: 1, nilai: 7, c: 0xe8f1f2 },
  { id: 'wang', name: 'Wang Tunai', icon: '💵', wt: 1, nilai: 6, c: 0x7fb069 },
  { id: 'lampu', name: 'Lampu Suluh', icon: '🔦', wt: 1, nilai: 3, c: 0xf4d35e },
  { id: 'radio', name: 'Radio Bateri', icon: '📻', wt: 1, nilai: 3, c: 0x9c6644 },
  { id: 'bateri', name: 'Bateri Tambahan', icon: '🔋', wt: 1, nilai: 3, c: 0x52b788 },
  { id: 'wisel', name: 'Wisel', icon: '📣', wt: 1, nilai: 1, c: 0xee964b },
  { id: 'air', name: 'Air Minuman Bersih', icon: '💧', wt: 2, nilai: 5, c: 0x8ecae6 },
  { id: 'makanan', name: 'Makanan Tin', icon: '🥫', wt: 2, nilai: 4, c: 0xc1121f },
  { id: 'pakaian', name: 'Pakaian & Selimut', icon: '🧺', wt: 2, nilai: 4, c: 0xb5838d },
  { id: 'kucing', name: 'Kucing (Comot)', icon: '🐈', wt: 1, nilai: 9, c: 0xf28f3b },
  { id: 'peti', name: 'Peti Sejuk', icon: '🧊', wt: 3, nilai: 2, decoy: true, room: 'dapur', c: 0xdfe7ea },
  { id: 'tv', name: 'TV', icon: '📺', wt: 3, nilai: 2, decoy: true, room: 'tamu', c: 0x2b2d42 },
];

// Ground floor rooms sit side by side along x at different floor heights, so they flood in order.
export const DEPTH = 3;
export const ROOMS = {
  serambi: { name: 'Serambi', x0: 0, x1: 2.5, y: 1.0, lvl: 0 },
  tamu: { name: 'Ruang Tamu', x0: 2.5, x1: 6, y: 1.6, lvl: 0 },
  dapur: { name: 'Dapur', x0: 6, x1: 9, y: 1.3, lvl: 0 },
  bilik: { name: 'Bilik', x0: 2.5, x1: 6, y: 4.0, lvl: 1 },
  para: { name: 'Para', x0: 2.5, x1: 6, y: 6.2, lvl: 2 },
};

// Waypoints. Nodes in the same room connect directly (rooms are open rectangles).
// slot: an anchor that can hold one item. Doors belong to two rooms.
const n = (rooms, x, z, slot) => ({ rooms: [].concat(rooms), x, z, slot: !!slot });
export const NODES = {
  s1: n('serambi', 0.6, 0.7, 1), s2: n('serambi', 1.7, 0.6, 1), s3: n('serambi', 0.8, 2.3, 1),
  t1: n('tamu', 3.1, 1.9, 1), t2: n('tamu', 3.9, 2.6, 1), t3: n('tamu', 4.8, 1.8, 1), t4: n('tamu', 5.4, 2.6, 1),
  k1: n('dapur', 6.7, 0.6, 1), k2: n('dapur', 8.3, 0.7, 1), k3: n('dapur', 8.3, 2.3, 1), k4: n('dapur', 7.0, 2.4, 1),
  b1: n('bilik', 4.0, 1.5, 1), b2: n('bilik', 5.3, 1.4, 1), b3: n('bilik', 4.6, 2.5, 1), b4: n('bilik', 5.5, 2.5, 1),
  home: n('tamu', 4.3, 1.3),
  d1: n(['serambi', 'tamu'], 2.5, 1.5), d2: n(['tamu', 'dapur'], 6, 1.5),
  sb: n('tamu', 5.6, 0.45), st: n('bilik', 3.0, 0.45), // stairs, bottom and top
  hb: n('bilik', 3.1, 2.3), ht: n('para', 3.1, 2.3), // hatch ladder
  pa: n('para', 4.3, 1.6), dock: n('para', 5.6, 2.2),
};
export const LINKS = [['sb', 'st'], ['hb', 'ht']]; // the only edges that change level
// Boat: docked position beside the roof deck. It comes in from screen left and leaves to screen right.
export const BOAT = { x: 7.6, z: 2.6, from: 11, accel: 0.8 }; // from: tiles of approach; accel: tiles/s2 when leaving

// Timeline (seconds after the first tap). levels: start of Normal, Waspada, Amaran, Bahaya.
// boatIn: seconds the boat is seen approaching before it docks at T.boat.
export const T = { levels: [0, 10, 30, 55], drift: 62, max: 70, boatIn: 6, boat: 74, move: 78, jacket: 79, board: 80, end: 82 };
// Water height keyframes [t, y]. Floors reached: Serambi 22s, Dapur 34s, Ruang Tamu 44s, Bilik 58s.
export const WATER = [[0, -0.25], [10, 0], [22, 1.0], [34, 1.3], [44, 1.6], [50, 2.6], [58, 4.0], [70, 6.05]];

export const TUNE = {
  speed: 2.0, // tiles per second, empty hands, dry floor
  wt: [1, 0.75, 0.5], // speed by heaviest held weight 1/2/3
  grab: [0.5, 0.8, 1.3], // seconds to pick up, by weight
  climb: 0.4, // speed x on the stairs and the ladder (not while the water carries him)
  wade: [[0.4, 0.85], [1.0, 0.7]], // [depth below which, speed x]: to knee, knee to chest
  float: 0.5, // speed x when floating
  chest: 1.0, neck: 1.2, height: 1.4, // floating starts at chest depth; feet sit at water minus neck
  ceil: [3.9, 6.1], // ceiling of ground and upper level
  liftMargin: 0.7, // head room left when the water carries him up a level
  lift: 2.5, // speed while being carried up
  valuable: 5, // nilai at or above this counts as valuable for spawn guarantees
  // Chaos
  flee2: 0.5, // the cat always bolts once when he reaches for it; chance it bolts a second time
  drift: [4, 5], // a floating item moves to another slot every 4 to 9s
  pingTtl: 4, // a message closes by itself after this long; while open it blocks taps on the house
  sebar: 3, // seconds lost forwarding the hoax
};

// Messages: [earliest, latest, kind]. One hoax in Amaran, a burst in Bahaya. None after the sweep at 62s.
export const PINGS = [[13, 22, 'chat'], [32, 42, 'hoax'], [45, 50, 'chat'], [55.5, 56.5, 'chat'], [58, 59, 'chat'], [60.5, 61.5, 'chat']];

export const CAM = { yaw: 45, pitch: 30, view: 10.5, orbit: 0.25, cut: 1.5 };

export const BM = {
  levels: ['Normal', 'Waspada', 'Amaran', 'Bahaya'],
  tag: 'bersedia berpindah',
  hint1: 'Klik barang', hint2: 'Klik tempat tinggi',
  heavy: 'Terlalu berat!', full: 'Tangan penuh!', deep: 'Air dah tinggi sangat!',
  lift: 'Air naik, terapung ke atas!', boat: 'Bot sampai!', move: 'Masa pindah!',
  jacket: 'Pakai jaket', pps: 'Menuju PPS',
  cat: 'Comot lari!', catUp: 'Comot panjat bumbung!',
  pingTitle: 'Mesej baru', ok: 'OK', sebarBtn: 'Sebarkan', semakBtn: 'Semak sumber rasmi',
  sebar: 'Sibuk forward mesej...', semak: 'Bijak. Semak dulu.',
  hoax: 'Dimajukan banyak kali: "Air akan naik 10 kaki malam ni!! Sebarkan!!"',
  chats: ['Hujan lebat lagi ke kat sana?', 'Dah makan belum?', 'Jaga diri ya!', 'Bateri telefon cukup tak?', 'Air dah naik ke?', 'Apa-apa roger tau.'],
};
