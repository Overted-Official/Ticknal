/**
 * Ticknal brand asset generator.
 *
 * Every logo / icon / favicon / PWA / Android asset is rendered from ONE source:
 * the V7 "Price-Line T" mark path below (64x64 design grid).
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Change PRIMARY_VARIANT to switch which tile style is used for app icons
 * (favicon, PWA, apple-touch, Android launcher, notification icon).
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

/** 'gradient' | 'dark' | 'light' */
const PRIMARY_VARIANT = 'gradient';

// ─── Source of truth: V7 Price-Line T (64x64 grid, bounds x 6..58, y 10..56) ───
export const MARK_PATH =
  'M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z';
const MARK_W = 52; // 58 - 6
const MARK_CX = 32;
const MARK_CY = 33;

const BRAND_GRADIENT = [
  ['0', '#00BCE6'],
  ['0.5', '#2962FF'],
  ['1', '#7928CA'],
];

const VARIANTS = {
  gradient: { bg: 'url(#tg)', fg: '#FFFFFF' },
  dark: { bg: '#000000', fg: '#FFFFFF' },
  light: { bg: '#FFFFFF', fg: '#000000' },
};

/** Place the mark so its width = markW, centred at (cx, cy). */
function markGroup(markW, cx, cy, fill) {
  const s = markW / MARK_W;
  const tx = +(cx - MARK_CX * s).toFixed(4);
  const ty = +(cy - MARK_CY * s).toFixed(4);
  return `<path transform="translate(${tx} ${ty}) scale(${+s.toFixed(5)})" fill="${fill}" d="${MARK_PATH}"/>`;
}

const gradientDefs = (size) => `<defs><linearGradient id="tg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">${BRAND_GRADIENT.map(
  ([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`
).join('')}</linearGradient></defs>`;

/**
 * App-icon tile.
 * shape: 'rounded' (transparent corners) | 'square' (full bleed) | 'circle'
 * ratio: mark width as a fraction of the tile
 * inset: transparent margin around rounded/circle tiles (fraction of size)
 */
function tileSvg({ variant = PRIMARY_VARIANT, size = 512, shape = 'rounded', ratio = 0.5, inset = 0 }) {
  const v = VARIANTS[variant];
  const pad = size * inset;
  const inner = size - pad * 2;
  let bg;
  if (shape === 'square') bg = `<rect width="${size}" height="${size}" fill="${v.bg}"/>`;
  else if (shape === 'circle') bg = `<circle cx="${size / 2}" cy="${size / 2}" r="${inner / 2}" fill="${v.bg}"/>`;
  else bg = `<rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${+(inner * 0.225).toFixed(2)}" fill="${v.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    variant === 'gradient' ? gradientDefs(size) : ''
  }${bg}${markGroup(inner * ratio, size / 2, size / 2, v.fg)}</svg>`;
}

/** Bare mark on transparent background (tight square viewBox). */
const markSvg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="5 6 54 54" fill="none"><path fill="${fill}" d="${MARK_PATH}"/></svg>`;

/** Bare mark on a transparent canvas of `size`, mark width = ratio * size. */
const markOnCanvasSvg = (size, ratio, fill = '#FFFFFF') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${markGroup(
    size * ratio,
    size / 2,
    size / 2,
    fill
  )}</svg>`;

async function png(svg, outPath, size, { flatten } = {}) {
  let img = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (flatten) img = img.flatten({ background: flatten });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
  return buf;
}

async function write(outPath, text) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, text, 'utf8');
}

/** Minimal ICO writer (PNG-compressed entries, supported by all modern browsers). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

const written = [];
const track = (p) => written.push(path.relative(ROOT, p));

async function main() {
  // ── 1. Bare marks (used by TicknalBrand, sidebar, loading screen, legacy logo-mark refs)
  for (const [file, fill] of [
    ['logo-white.svg', '#FFFFFF'],
    ['logo-black.svg', '#000000'],
    ['logo-mark.svg', '#FFFFFF'],
  ]) {
    await write(path.join(PUBLIC, file), markSvg(fill) + '\n');
    track(path.join(PUBLIC, file));
  }

  // ── 2. Icon tiles: all three variants as SVG + 1024 PNG (store listings, marketing, OG)
  for (const variant of Object.keys(VARIANTS)) {
    const svg = tileSvg({ variant, size: 1024 });
    const base = path.join(PUBLIC, 'icons', `ticknal-icon-${variant}`);
    await write(`${base}.svg`, svg + '\n');
    await png(svg, `${base}-1024.png`, 1024);
    track(`${base}.svg`);
    track(`${base}-1024.png`);
  }

  // Primary tile as the generic SVG icons
  const primarySvg = tileSvg({ size: 512 }) + '\n';
  for (const file of ['Ticknal_icon.svg', 'logo.svg', path.join('assets', 'ticknal-icon-new.svg')]) {
    await write(path.join(PUBLIC, file), primarySvg);
    track(path.join(PUBLIC, file));
  }

  // ── 3. Favicon (.ico: 16/32/48 with a larger mark for legibility)
  const favSvg = tileSvg({ size: 256, ratio: 0.6 });
  const icoEntries = [];
  for (const size of [16, 32, 48]) {
    const buf = await sharp(Buffer.from(favSvg), { density: 384 }).resize(size, size).png().toBuffer();
    icoEntries.push({ size, buf });
  }
  const ico = buildIco(icoEntries);
  for (const p of [path.join(PUBLIC, 'favicon.ico'), path.join(ROOT, 'src', 'app', 'favicon.ico')]) {
    await fs.writeFile(p, ico);
    track(p);
  }

  // ── 4. PWA "any" icons (rounded tile, transparent corners)
  for (const size of [48, 72, 96, 144, 192, 384, 512]) {
    const p = path.join(PUBLIC, `icon-${size}x${size}.png`);
    await png(tileSvg({ size: 512, ratio: size <= 72 ? 0.56 : 0.5 }), p, size);
    track(p);
  }

  // ── 5. PWA maskable icons (full bleed, mark inside the 80% safe circle)
  for (const size of [192, 512]) {
    const p = path.join(PUBLIC, `icon-maskable-${size}x${size}.png`);
    await png(tileSvg({ size: 512, shape: 'square', ratio: 0.42 }), p, size);
    track(p);
  }

  // ── 6. Apple touch icons (full bleed, no alpha; iOS applies its own mask)
  for (const file of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    const p = path.join(PUBLIC, file);
    await png(tileSvg({ size: 512, shape: 'square', ratio: 0.5 }), p, 180, { flatten: '#000000' });
    track(p);
  }

  // ── 7. Web push: notification icon (full tile) + badge (monochrome alpha silhouette)
  const notifPng = path.join(PUBLIC, 'ticknal-notification-icon.png');
  await png(tileSvg({ size: 512 }), notifPng, 192);
  await write(path.join(PUBLIC, 'ticknal-notification-icon.svg'), primarySvg);
  const badgePng = path.join(PUBLIC, 'badge.png');
  await png(markOnCanvasSvg(96, 0.78), badgePng, 96);
  track(notifPng);
  track(path.join(PUBLIC, 'ticknal-notification-icon.svg'));
  track(badgePng);

  // ── 8. Android launcher icons
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(densities)) {
    const dir = path.join(RES, `mipmap-${d}`);
    // Legacy (pre-Android 8) icons: 48dp
    await png(tileSvg({ size: 512, shape: 'rounded', inset: 0.04, ratio: 0.5 }), path.join(dir, 'ic_launcher.png'), 48 * k);
    await png(tileSvg({ size: 512, shape: 'circle', inset: 0.04, ratio: 0.48 }), path.join(dir, 'ic_launcher_round.png'), 48 * k);
    // Adaptive foreground: 108dp canvas, mark 40dp wide (well inside the 66dp safe zone)
    await png(markOnCanvasSvg(512, 40 / 108), path.join(dir, 'ic_launcher_foreground.png'), 108 * k);
    track(path.join(dir, 'ic_launcher*.png'));
  }

  // Adaptive background = brand gradient (top-left -> bottom-right)
  await write(
    path.join(RES, 'drawable', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-brand-assets.mjs - Ticknal brand gradient -->
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <gradient
        android:type="linear"
        android:angle="315"
        android:startColor="${PRIMARY_VARIANT === 'gradient' ? '#00BCE6' : PRIMARY_VARIANT === 'light' ? '#FFFFFF' : '#000000'}"
        android:centerColor="${PRIMARY_VARIANT === 'gradient' ? '#2962FF' : PRIMARY_VARIANT === 'light' ? '#FFFFFF' : '#000000'}"
        android:endColor="${PRIMARY_VARIANT === 'gradient' ? '#7928CA' : PRIMARY_VARIANT === 'light' ? '#FFFFFF' : '#000000'}" />
</shape>
`
  );
  track(path.join(RES, 'drawable', 'ic_launcher_background.xml'));

  // Android 13+ themed (monochrome) icon layer
  const s = 40 / MARK_W;
  await write(
    path.join(RES, 'drawable', 'ic_launcher_monochrome.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-brand-assets.mjs - themed icon layer (Android 13+) -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:translateX="${+(54 - MARK_CX * s).toFixed(4)}"
        android:translateY="${+(54 - MARK_CY * s).toFixed(4)}"
        android:scaleX="${+s.toFixed(5)}"
        android:scaleY="${+s.toFixed(5)}">
        <path
            android:fillColor="#FFFFFFFF"
            android:pathData="${MARK_PATH}" />
    </group>
</vector>
`
  );
  track(path.join(RES, 'drawable', 'ic_launcher_monochrome.xml'));

  for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    await write(
      path.join(RES, 'mipmap-anydpi-v26', file),
      `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`
    );
    track(path.join(RES, 'mipmap-anydpi-v26', file));
  }

  // Status-bar notification icon (white silhouette, 24dp)
  await write(
    path.join(RES, 'drawable', 'ic_stat_ticknal.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/generate-brand-assets.mjs - status bar notification icon -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="64"
    android:viewportHeight="64">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${MARK_PATH}" />
</vector>
`
  );
  track(path.join(RES, 'drawable', 'ic_stat_ticknal.xml'));

  // ── 9. Android splash screens: pure black with the white mark, same dimensions as before
  const splashFiles = [];
  for (const entry of await fs.readdir(RES, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('drawable')) {
      const p = path.join(RES, entry.name, 'splash.png');
      try {
        await fs.access(p);
        splashFiles.push(p);
      } catch {}
    }
  }
  for (const p of splashFiles) {
    const { width, height } = await sharp(p).metadata();
    const markW = Math.round(Math.min(width, height) * 0.2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#000000"/>${markGroup(
      markW,
      width / 2,
      height / 2,
      '#FFFFFF'
    )}</svg>`;
    const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    await fs.writeFile(p, buf);
    track(p);
  }

  console.log(`Generated ${written.length} assets (primary variant: ${PRIMARY_VARIANT}):`);
  for (const w of written) console.log('  ' + w);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
