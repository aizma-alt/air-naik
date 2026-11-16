// share.js: result card (1080x1350), link preview image (1200x630) and Kongsi. Canvas 2D only. Loaded after Mula, not on the first paint.
import { BM, ITEMS } from './data.js';
import { score, title } from './sim.js';

export const LINK = 'https://aizma-alt.github.io/air-naik/';
const SAFE = ['hand', 'para', 'boat'], LEVEL = ['#57cc99', '#f4d35e', '#f08a24', '#e5383b'], CREAM = '#fff3d6', FONT = 'Fredoka, system-ui, sans-serif';

// Storm sky, rain streaks and a band of flood water at the bottom.
function backdrop(w, h, waterTop) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0d1b26'); sky.addColorStop(0.6, '#1d3344'); sky.addColorStop(1, '#2a4a5c');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#cfe2ee30'; g.lineWidth = 3;
  for (let i = 0; i < 90; i++) { const x = (i * 7919) % w, y = (i * 104729) % waterTop; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 52); g.stroke(); }
  g.fillStyle = '#a5814f'; g.beginPath(); g.moveTo(0, waterTop);
  for (let x = 0; x <= w; x += 60) g.quadraticCurveTo(x + 15, waterTop - 16, x + 30, waterTop), g.quadraticCurveTo(x + 45, waterTop + 16, x + 60, waterTop);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  return [c, g];
}
function text(g, str, x, y, size, colour, weight = 800, maxW) { // shrinks to fit maxW
  g.font = `${weight} ${size}px ${FONT}`;
  if (maxW && g.measureText(str).width > maxW) g.font = `${weight} ${Math.floor(size * maxW / g.measureText(str).width)}px ${FONT}`;
  g.fillStyle = colour; g.fillText(str, x, y);
}
function pill(g, x, y, w, h, colour) { g.fillStyle = colour; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill(); }
function stickers(g, icons, cx, y, r, perRow) { // white discs with an emoji, centred rows
  for (let i = 0; i < icons.length; i++) {
    const row = Math.floor(i / perRow), n = Math.min(perRow, icons.length - row * perRow), x = cx + (i % perRow - (n - 1) / 2) * r * 2.35, yy = y + row * r * 2.4;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, yy, r, 0, 7); g.fill(); g.lineWidth = r * 0.12; g.strokeStyle = '#1d2b36'; g.stroke();
    text(g, icons[i], x, yy + r * 0.08, r * 1.15, '#000', 400);
  }
}
function wrap(g, str, maxW) { // greedy word wrap with the font already set
  const lines = ['']; for (const word of str.split(' ')) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + word : word; if (g.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(word); else lines[lines.length - 1] = t; }
  return lines;
}

// What the card says, also used for the image alt text.
export function summary(s) {
  const saved = s.items.filter(i => SAFE.includes(i.loc));
  return { title: BM.titles[title(s)], score: score(s), saved, total: s.items.length, cat: s.cat.loc === 'ikut' };
}

export function drawCard(s) {
  const W = 1080, H = 1350, [c, g] = backdrop(W, H, 1130), r = summary(s);
  g.textAlign = 'left'; text(g, 'Air Naik!', 70, 110, 58, CREAM, 900);
  g.textAlign = 'right'; text(g, BM.highest, W - 250, 110, 30, '#ffffffcc', 600);
  g.textAlign = 'center'; pill(g, W - 150, 110, 180, 64, LEVEL[s.level]); text(g, BM.levels[s.level], W - 150, 112, 34, '#111', 800);
  text(g, r.title, W / 2, 330, 112, CREAM, 900, W - 140);
  pill(g, W / 2, 520, 480, 170, '#f4d35e'); text(g, 'Skor ' + r.score, W / 2, 526, 112, '#1b1b1b', 900);
  text(g, `${BM.saved}: ${r.saved.length} / ${r.total}`, W / 2, 670, 44, '#fff', 700);
  stickers(g, r.saved.map(i => i.d.icon), W / 2, 770, 46, 6);
  if (r.cat) text(g, BM.catSafe, W / 2, 925, 36, '#ffffffcc', 600);
  g.fillStyle = '#0b1620b0'; g.beginPath(); g.roundRect(70, 965, W - 140, 130, 24); g.fill();
  g.font = `600 36px ${FONT}`; wrap(g, 'Tip: ' + BM.tip, W - 220).forEach((line, k, all) => text(g, line, W / 2, 1030 + (k - (all.length - 1) / 2) * 46, 36, '#fff', 600));
  text(g, BM.warm1, W / 2, 1195, 46, CREAM, 800); text(g, BM.warm2, W / 2, 1255, 46, CREAM, 800, W - 100);
  text(g, BM.footer + '  ·  ' + LINK.replace(/^https:\/\/|\/$/g, ''), W / 2, 1318, 25, '#ffffffcc', 500);
  return c;
}

export function drawOg() {
  const W = 1200, H = 630, [c, g] = backdrop(W, H, 500);
  text(g, 'Air Naik!', W / 2, 170, 170, CREAM, 900);
  text(g, BM.tagline, W / 2, 300, 46, '#fff', 600);
  stickers(g, ITEMS.filter(i => !i.decoy).slice(0, 9).map(i => i.icon), W / 2, 410, 44, 9);
  text(g, BM.footer, W / 2, 575, 30, CREAM, 600);
  return c;
}

export const cardFile = async c => new File([await new Promise(done => c.toBlob(done, 'image/png'))], 'air-naik.png', { type: 'image/png' });
// Web Share with the image where the browser allows it, else with the link, else 'fallback' (the page shows Salin pautan and Simpan gambar).
// file is made ahead of the tap, so nothing is awaited between the tap and navigator.share.
export async function kongsi(file, s) {
  const msg = BM.shareText.replace('{n}', score(s));
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: msg + ' ' + LINK }); return 'shared'; }
    if (navigator.share) { await navigator.share({ text: msg, url: LINK }); return 'shared'; }
  } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  return 'fallback';
}
export async function salin(s) { // true if the link reached the clipboard
  try { await navigator.clipboard.writeText(BM.shareText.replace('{n}', score(s)) + ' ' + LINK); return true; } catch { return false; }
}
