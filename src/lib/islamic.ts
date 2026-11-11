import type { ThemeId } from './types'

/**
 * Islamic art for the Munaafasatul Ilm site (built with VITE_THEMESET=islamic):
 * theme names, logo marks, the arabesque under the title, the Arabic calligraphy above it,
 * the ambient background and the category icons.
 * Everything here is fixed markup with no user input, so it is safe to inject.
 * No Qur'anic text and no Names of Allah are drawn, and no place is shown.
 */

const f2 = (n: number) => n.toFixed(2)

/** Eight-point star (two overlapping squares) as one outline. */
function star(cx: number, cy: number, r: number, rot = 0): string {
  const p: string[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2 + rot
    const rr = k % 2 ? r * 0.7654 : r
    p.push(f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a)))
  }
  return 'M' + p.join(' L') + 'Z'
}

/** Theme names on the Islamic site. Colours stay the same, except where the CSS redefines them. */
export const ISLAMIC_THEME_TEXT: Partial<Record<ThemeId, { name: string; nameAr: string; blurb: string; swatch?: string }>> = {
  amethyst: { name: 'Night of Cordoba', nameAr: 'ليالي قرطبة', blurb: 'Violet, gold stars and rosettes' },
  emerald: { name: 'Emerald Mihrab', nameAr: 'المحراب الزمردي', blurb: 'Arches, lamps and brass' },
  neon: { name: 'Iznik Tiles', nameAr: 'خزف إزنيق', blurb: 'Cobalt, turquoise and tulips', swatch: 'linear-gradient(135deg,#0d2a6b,#3fd0c9 60%,#e0453a)' },
  onyx: { name: 'Gold Illumination', nameAr: 'التذهيب', blurb: 'Black and gold manuscript art' },
  rivals: { name: 'Samarkand', nameAr: 'سمرقند', blurb: 'Red and blue tilework', swatch: 'linear-gradient(135deg,#a3271f,#1d3f8f)' },
  ember: { name: 'Ottoman Tulip', nameAr: 'الخزامى العثمانية', blurb: 'Crimson, tulips and carnations' },
  heritage: { name: 'Heritage', nameAr: 'التراث', blurb: 'Najdi, Sadu and Asiri art' },
  rawdah: { name: 'The Garden', nameAr: 'الروضة', blurb: 'Leaves, flowers and vines', swatch: 'linear-gradient(135deg,#14402a,#f3c8d3 55%,#e9cf8a)' },
}

// ---------- shapes ----------

/** A pointed leaf from (0,0) to (len,0). */
const LEAF = (len: number, w: number) => `M0 0 C${f2(len * 0.3)} ${f2(-w)} ${f2(len * 0.75)} ${f2(-w)} ${len} 0 C${f2(len * 0.75)} ${f2(w)} ${f2(len * 0.3)} ${f2(w)} 0 0Z`
const leafAt = (x: number, y: number, rot: number, len: number, w: number, fill: string, extra = '') =>
  `<path d="${LEAF(len, w)}" fill="${fill}" transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)})"${extra}/>`

/** n petals around (cx,cy). */
function rosette(cx: number, cy: number, r: number, n: number, fill: string, w = 0.42, rot = 0): string {
  let s = ''
  for (let i = 0; i < n; i++) s += leafAt(cx, cy, rot + (360 / n) * i, r, r * w, fill)
  return s
}

/** A regular star polygon with n points. */
function nStar(cx: number, cy: number, r: number, inner: number, n: number, rot = -Math.PI / 2): string {
  const p: string[] = []
  for (let k = 0; k < n * 2; k++) {
    const a = (k * Math.PI) / n + rot
    const rr = k % 2 ? inner : r
    p.push(f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a)))
  }
  return 'M' + p.join(' L') + 'Z'
}

/** A tulip head and stem. */
function tulip(cx: number, base: number, h: number, petal: string, petal2: string, stem: string): string {
  const top = base - h
  return (
    `<path d="M${cx} ${base + h * 0.55} C${cx - 1} ${base + h * 0.2} ${cx + 1} ${base} ${cx} ${base - h * 0.15}" fill="none" stroke="${stem}" stroke-width="2.2" stroke-linecap="round"/>` +
    leafAt(cx, base + h * 0.42, 205, h * 0.75, h * 0.16, stem) +
    leafAt(cx, base + h * 0.3, -25, h * 0.7, h * 0.15, stem) +
    `<path d="M${cx} ${base} C${cx - h * 0.55} ${base - h * 0.05} ${cx - h * 0.5} ${top + h * 0.35} ${cx - h * 0.32} ${top} C${cx - h * 0.18} ${top + h * 0.3} ${cx - h * 0.08} ${top + h * 0.3} ${cx} ${top + h * 0.12} C${cx + h * 0.08} ${top + h * 0.3} ${cx + h * 0.18} ${top + h * 0.3} ${cx + h * 0.32} ${top} C${cx + h * 0.5} ${top + h * 0.35} ${cx + h * 0.55} ${base - h * 0.05} ${cx} ${base}Z" fill="${petal}"/>` +
    `<path d="M${cx} ${base - h * 0.08} C${cx - h * 0.2} ${base - h * 0.3} ${cx - h * 0.12} ${top + h * 0.4} ${cx} ${top + h * 0.18} C${cx + h * 0.12} ${top + h * 0.4} ${cx + h * 0.2} ${base - h * 0.3} ${cx} ${base - h * 0.08}Z" fill="${petal2}"/>`
  )
}

/** A layered rose seen from above. */
function rose(cx: number, cy: number, r: number, outer: string, mid: string, inner: string): string {
  return (
    rosette(cx, cy, r, 5, outer, 0.62, -90) +
    rosette(cx, cy, r * 0.68, 5, mid, 0.6, -54) +
    rosette(cx, cy, r * 0.4, 5, inner, 0.6, -90) +
    `<circle cx="${cx}" cy="${cy}" r="${f2(r * 0.14)}" fill="#fff4d6"/>`
  )
}

type Mark = { bg: [string, string]; draw: (g: string) => string }

export const ISLAMIC_MARKS: Record<ThemeId, Mark> = {
  // A gold eight-point star, interlaced, around a violet rosette.
  amethyst: {
    bg: ['#3a1a6e', '#160a2c'],
    draw: (g) =>
      `<defs><radialGradient id="${g}p"><stop offset="0" stop-color="#ffd7f3"/><stop offset="1" stop-color="#a23cff"/></radialGradient></defs>` +
      `<path d="${star(50, 50, 45)}" fill="#24104a" stroke="#f3cd76" stroke-width="3"/>` +
      `<path d="${star(50, 50, 38)}" fill="none" stroke="#f3cd76" stroke-width="1" opacity=".7"/>` +
      `<path d="${star(50, 50, 30, Math.PI / 8)}" fill="none" stroke="#ff9fe3" stroke-width="1.2" opacity=".8"/>` +
      rosette(50, 50, 21, 8, `url(#${g}p)`, 0.34, -90) +
      rosette(50, 50, 11, 8, '#f3cd76', 0.4, -67.5) +
      `<circle cx="50" cy="50" r="3.4" fill="#fff3e0"/>`,
  },
  // A pointed mihrab arch with a hanging lamp.
  emerald: {
    bg: ['#0f5a48', '#03201a'],
    draw: (g) =>
      `<defs><radialGradient id="${g}l" cy=".7"><stop offset="0" stop-color="#fff7d6"/><stop offset=".6" stop-color="#e9c47f"/><stop offset="1" stop-color="#a0772e"/></radialGradient></defs>` +
      `<path d="M14 94 V46 C14 26 34 14 50 4 C66 14 86 26 86 46 V94" fill="#062e25" stroke="#e9c47f" stroke-width="3"/>` +
      `<path d="M24 94 V50 C24 34 40 24 50 16 C60 24 76 34 76 50 V94" fill="none" stroke="#86f3d4" stroke-width="1.3" opacity=".75"/>` +
      `<path d="M50 16 V34" stroke="#e9c47f" stroke-width="1.4"/>` +
      `<path d="M41 40 H59 L56 47 H44Z" fill="url(#${g}l)"/>` +
      `<path d="M38 47 H62 C62 58 57 66 50 70 C43 66 38 58 38 47Z" fill="url(#${g}l)"/>` +
      `<circle cx="50" cy="56" r="5" fill="#fffbe8" opacity=".9"/>` +
      `<path d="M47 70 H53 L52 75 H48Z" fill="#e9c47f"/>` +
      `<path d="${star(50, 86, 5)}" fill="#86f3d4" opacity=".8"/>`,
  },
  // Iznik tile: a tulip and saz leaves on a white roundel.
  neon: {
    bg: ['#0d2a6b', '#061630'],
    draw: () =>
      `<circle cx="50" cy="50" r="46" fill="#f4f8ff"/><circle cx="50" cy="50" r="46" fill="none" stroke="#1d4fb8" stroke-width="3"/>` +
      `<circle cx="50" cy="50" r="40" fill="none" stroke="#3fd0c9" stroke-width="1.2"/>` +
      leafAt(50, 74, 200, 30, 6, '#1d4fb8') +
      leafAt(50, 74, -20, 30, 6, '#1d4fb8') +
      tulip(50, 50, 26, '#e0453a', '#ff8a7a', '#2f8f7a'),
  },
  // A gold shamsa (sunburst medallion) from manuscript illumination.
  onyx: {
    bg: ['#2a2115', '#070605'],
    draw: (g) => {
      let rays = ''
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2
        const r1 = i % 2 ? 40 : 46
        rays += `M${f2(50 + 30 * Math.cos(a - 0.05))} ${f2(50 + 30 * Math.sin(a - 0.05))} L${f2(50 + r1 * Math.cos(a))} ${f2(50 + r1 * Math.sin(a))} L${f2(50 + 30 * Math.cos(a + 0.05))} ${f2(50 + 30 * Math.sin(a + 0.05))}Z`
      }
      return (
        `<defs><radialGradient id="${g}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#e2b54e"/><stop offset="1" stop-color="#8a6116"/></radialGradient></defs>` +
        `<path d="${rays}" fill="url(#${g}c)"/>` +
        `<circle cx="50" cy="50" r="30" fill="#0b0906" stroke="url(#${g}c)" stroke-width="2.4"/>` +
        `<path d="${star(50, 50, 24)}" fill="none" stroke="url(#${g}c)" stroke-width="1.6"/>` +
        rosette(50, 50, 14, 8, `url(#${g}c)`, 0.36, -90) +
        `<circle cx="50" cy="50" r="3.6" fill="#0b0906"/>`
      )
    },
  },
  // A Samarkand twelve-point star in red and blue tile.
  rivals: {
    bg: ['#1a0f3a', '#07081a'],
    draw: () =>
      `<path d="${nStar(50, 50, 46, 34, 12)}" fill="#1d3f8f" stroke="#f2d27a" stroke-width="2"/>` +
      `<path d="${nStar(50, 50, 30, 22, 12, -Math.PI / 2 + Math.PI / 12)}" fill="#a3271f" stroke="#f2d27a" stroke-width="1.4"/>` +
      `<path d="${star(50, 50, 17)}" fill="#f4f7ff"/>` +
      rosette(50, 50, 10, 8, '#1d3f8f', 0.4, -90) +
      `<circle cx="50" cy="50" r="2.6" fill="#f2d27a"/>`,
  },
  // An Ottoman tulip between carnation buds.
  ember: {
    bg: ['#4a0d10', '#160406'],
    draw: () =>
      `<path d="M50 96 C30 90 16 74 16 52 C16 30 32 14 50 6 C68 14 84 30 84 52 C84 74 70 90 50 96Z" fill="#2a0509" stroke="#ffb64a" stroke-width="2.4"/>` +
      leafAt(50, 80, 215, 26, 5, '#e9a43c') +
      leafAt(50, 80, -35, 26, 5, '#e9a43c') +
      `<circle cx="27" cy="58" r="5" fill="#ff4d6d"/><circle cx="73" cy="58" r="5" fill="#ff4d6d"/>` +
      tulip(50, 54, 30, '#ff4d1a', '#ffb64a', '#e9a43c'),
  },
  // A ring of Al-Qatt Al-Asiri triangles around an eight-point star.
  heritage: {
    bg: ['#1d1a48', '#090c22'],
    draw: () => {
      const cols = ['#2aa3a6', '#9e2b25', '#e5b95e', '#2f4a8a']
      const p = (r: number, a: number) => `${f2(50 + r * Math.cos(a))},${f2(50 + r * Math.sin(a))}`
      let tri = ''
      for (let i = 0; i < 24; i++) {
        const a0 = (i / 24) * Math.PI * 2
        const a1 = ((i + 1) / 24) * Math.PI * 2
        const am = (a0 + a1) / 2
        tri +=
          i % 2 === 0
            ? `<polygon points="${p(33, a0)} ${p(46, am)} ${p(33, a1)}" fill="${cols[(i / 2) % 4]}"/>`
            : `<polygon points="${p(46, a0)} ${p(33, am)} ${p(46, a1)}" fill="${cols[((i - 1) / 2 + 2) % 4]}" opacity=".7"/>`
      }
      return (
        tri +
        `<circle cx="50" cy="50" r="46" fill="none" stroke="#e5b95e" stroke-width="1.6"/><circle cx="50" cy="50" r="32" fill="#090c22" stroke="#e5b95e" stroke-width="1.6"/>` +
        `<path d="${star(50, 50, 24)}" fill="#e5b95e"/><path d="${star(50, 50, 14, Math.PI / 8)}" fill="#090c22"/>` +
        `<circle cx="50" cy="50" r="5" fill="#2aa3a6"/>`
      )
    },
  },
  // A rose with leaves and buds.
  rawdah: {
    bg: ['#1d5a3a', '#0b2418'],
    draw: () =>
      `<circle cx="50" cy="50" r="46" fill="none" stroke="#e9cf8a" stroke-width="1.6"/>` +
      `<path d="M50 92 C46 80 54 72 50 60" fill="none" stroke="#5fae6e" stroke-width="2.4" stroke-linecap="round"/>` +
      leafAt(49, 82, 200, 26, 7, '#5fae6e') +
      leafAt(51, 74, -25, 26, 7, '#7cc489') +
      leafAt(50, 50, 140, 30, 7, '#3f8f55') +
      leafAt(50, 50, 40, 30, 7, '#3f8f55') +
      `<circle cx="22" cy="28" r="4.5" fill="#f3c8d3"/><circle cx="78" cy="28" r="4.5" fill="#f3c8d3"/>` +
      leafAt(22, 28, 120, 10, 3, '#7cc489') +
      leafAt(78, 28, 60, 10, 3, '#7cc489') +
      rose(50, 44, 22, '#e88aa2', '#f3b6c6', '#c94f72'),
  },
}

// ---------- title ornaments ----------

const d = (path: string, delay: number, dur = 1.6) => `<path class="fl-draw" pathLength="1" style="--d:${delay}s;--dur:${dur}s" d="${path}"/>`
const mirror = (inner: string) => `<g>${inner}</g><g transform="scale(-1 1)">${inner}</g>`

/** The arabesque (islimi) scroll under the title: two mirrored vines with curls, leaves and a centre bud. */
export function islamicFlourish(theme: ThemeId): string {
  const garden = theme === 'rawdah'
  const leaf = (x: number, y: number, r: number, delay: number) =>
    `<path class="fl-fade" style="--d:${delay}s" d="${LEAF(13, 4.2)}" transform="translate(${x} ${y}) rotate(${r})"/>`
  const flower = (x: number, y: number, delay: number) =>
    `<g class="fl-fade" style="--d:${delay}s">${rosette(x, y, 7, 5, 'var(--accent2)', 0.6, -90)}<circle cx="${x}" cy="${y}" r="1.8" fill="var(--accent)"/></g>`
  const half =
    `<g fill="none" style="stroke:var(--accent)" stroke-width="1.5" stroke-linecap="round">` +
    d('M8 0 C30 -15 52 -15 66 -3 C78 7 96 8 106 -2 C116 -12 132 -12 140 -2 C148 8 164 8 176 0', 0.4, 2) +
    d('M66 -3 C58 -20 80 -26 86 -14 C89 -7 82 -4 79 -9', 1.2, 1.2) +
    d('M140 -2 C146 15 166 17 168 6 C169 0 162 -1 161 4', 1.4, 1.2) +
    d('M106 -2 C104 -16 92 -20 88 -22', 1.5, 0.9) +
    `</g><g style="fill:var(--accent)" opacity=".85">` +
    leaf(30, -11, -150, 1.6) +
    leaf(48, -13, -20, 1.7) +
    leaf(96, 6, 30, 1.8) +
    leaf(120, -10, -160, 1.9) +
    leaf(156, 6, 20, 2) +
    leaf(176, 0, -10, 2.1) +
    `</g>` +
    (garden ? flower(86, -14, 2.2) + flower(168, 5, 2.3) : `<circle class="fl-fade" style="--d:2.2s;fill:var(--accent2)" cx="79" cy="-9" r="2.4"/><circle class="fl-fade" style="--d:2.3s;fill:var(--accent2)" cx="161" cy="4" r="2.4"/>`)
  const centre = garden
    ? `<g class="fl-fade" style="--d:.3s">${rose(0, 0, 11, 'var(--accent2)', 'var(--accent)', 'var(--accent2)')}</g>`
    : `<g class="fl-fade" style="--d:.3s"><path d="${star(0, 0, 10)}" style="fill:var(--accent)"/><path d="${star(0, 0, 5.5, Math.PI / 8)}" style="fill:var(--bg)"/></g>`
  return `<svg class="fl fl-isl" viewBox="-200 -30 400 60" aria-hidden="true">${mirror(half)}${centre}</svg>`
}

/** The Arabic name in Ruq'ah calligraphy above the title. */
export function islamicAbove(nameAr: string): string {
  return `<span class="isl-callig" lang="ar" dir="rtl">${nameAr.replace(/[<>&"]/g, '')}</span>`
}

/** Background art: a slowly turning girih lattice, or falling petals and leaves in the Garden theme. */
export function islamicAmbient(theme: ThemeId): string {
  if (theme === 'rawdah') {
    let s = ''
    for (let i = 0; i < 18; i++) s += `<i class="${i % 3 ? 'lf' : 'pt'}" style="left:${(i * 37 + 5) % 100}%;--i:${i};animation-duration:${14 + ((i * 7) % 11)}s;animation-delay:-${(i * 2.3) % 14}s"></i>`
    return `<div class="amb amb-rw" aria-hidden="true">${s}</div>`
  }
  const cell = `<path d="${star(30, 30, 18)}"/><path d="${star(30, 30, 10, Math.PI / 8)}"/><path d="M30 12 V0 M30 48 V60 M12 30 H0 M48 30 H60"/>`
  return (
    `<div class="amb amb-he amb-isl" aria-hidden="true"><svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"><defs><pattern id="gg-isl-geo" width="60" height="60" patternUnits="userSpaceOnUse">` +
    `<g fill="none" style="stroke:var(--accent)" stroke-width=".7">${cell}</g></pattern></defs><rect x="-300" y="-300" width="1200" height="1200" fill="url(#gg-isl-geo)"/></svg></div>`
  )
}

// ---------- category icons ----------

const STAR8 = star(12, 12, 9.5)
const circ = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
let beads = ''
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2
  beads += circ(+f2(12 + 6.2 * Math.cos(a)), +f2(9.5 + 6.2 * Math.sin(a)), 1.2)
}

const I = {
  book: 'M2.5 6.5c3.2-1.3 6.3-1.2 9.5.8 3.2-2 6.3-2.1 9.5-.8v9.3c-3.2-1.3-6.3-1.2-9.5.8-3.2-2-6.3-2.1-9.5-.8z M12 7.3v9.4 M7 21.5l10-4.6 M17 21.5L7 16.9',
  tajwid: 'M2.5 8c2.6-1 5.2-.9 7.5.7v10.5c-2.3-1.6-4.9-1.7-7.5-.7z M14 9.5c1.6 1.6 1.6 4.4 0 6 M17 7.5c2.7 2.7 2.7 7.3 0 10 M20 5.5c3.6 3.6 3.6 10.4 0 14',
  tafsir: 'M2.5 6c2.5-1 5-1 7.5.6V17c-2.5-1.6-5-1.6-7.5-.6z M10 6.6c2.5-1.6 5-1.6 7.5-.6v3.5 ' + circ(16, 15, 3.6) + ' M18.6 17.6l3 3',
  scroll: 'M7 3.5h10.5a2 2 0 0 1 2 2V17 M7 3.5a2 2 0 0 0-2 2v1.5h4V5.5a2 2 0 0 0-2-2z M9 5.5V18a2.5 2.5 0 0 0 2.5 2.5h8A2.5 2.5 0 0 0 22 18v-1H12v1a2.5 2.5 0 0 1-2.5 2.5 M12 8.5h5 M12 12h5',
  chain: 'M9.5 14.5l5-5 M10.5 7.5l1.6-1.6a3.6 3.6 0 0 1 5 5l-1.6 1.6 M13.5 16.5l-1.6 1.6a3.6 3.6 0 0 1-5-5l1.6-1.6',
  star: STAR8 + ' ' + circ(12, 12, 3),
  gate: 'M5 21.5V11a7 7 0 0 1 14 0v10.5 M9 21.5v-8a3 3 0 0 1 6 0v8 M3 21.5h18 M12 1v1.6 M5.6 3.4l1.1 1.1 M18.4 3.4l-1.1 1.1',
  ship: 'M3 13.5h18l-2.6 5H5.6z M12 13.5V3 M12 4.5l6 7h-6 M12 7l-4 4.5h4 M2 21.5c2 1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0',
  lamp: 'M12 1.5v3 M9 4.5h6 M8 7.5h8l-1-3H9z M7 7.5h10c0 4.5-1.6 8-5 10-3.4-2-5-5.5-5-10z M10 19.5h4l-.6 2h-2.8z M12 10.5v2.5',
  sea: 'M3 3v18 M3 6c1.6-1 2.6 1 4.2 0 M3 10c1.6-1 2.6 1 4.2 0 M3 14c1.6-1 2.6 1 4.2 0 M21 3v18 M16.8 6c1.6-1 2.6 1 4.2 0 M16.8 10c1.6-1 2.6 1 4.2 0 M16.8 14c1.6-1 2.6 1 4.2 0 M10 21.5l1.2-7 M14 21.5l-1.2-7',
  cave: 'M1.5 20.5l7.5-12 3 4.5 3-6.5 7.5 14z M10.6 20.5v-2.2a1.7 1.7 0 0 1 3.4 0v2.2 M19 2.5l.6 1.4 1.4.6-1.4.6L19 6.5l-.6-1.4-1.4-.6 1.4-.6z',
  palm: 'M12.4 21.5c.6-4 .6-8 0-11.5 M12 10C9 7 5 7 2.8 9.2 M12 10c3-3 7-3 9.2-.8 M12 10C10 6 7 4 3.8 4.4 M12 10c2-4 5-6 8.2-5.6 M12 10c-.4-3 .6-6-.2-8.5 M8 21.5h8',
  roots: 'M12 21V13 M12 13L6 7.5 M12 13l6-5.5 M12 13V4.5 ' + circ(6, 6.5, 1.8) + ' ' + circ(18, 6.5, 1.8) + ' ' + circ(12, 3.3, 1.8),
  marks: 'M4 6.5l6-2.2 M14.5 4.2c1.6-.2 2.4 1.4 1.3 2.6L14 9 M4 19.5l6-2.2 ' + circ(17, 17.5, 2.2) + ' M2.5 12h19',
  quill: 'M20.5 3.5C12.5 4.5 7.5 9.5 5 18.5 M20.5 3.5c-1 6.5-5 10.5-11.5 11.5 M5 18.5l-2.5 3 M8.5 11.5l3.5 1',
  heart: 'M12 20c-5.5-3.6-9-6.8-9-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 2.4c0 3.8-3.5 7-9 10.6z',
  heartHands: 'M12 12.5c-1.8-2.6-5.5-1.8-5.5.9 0 2.2 2.7 3.6 5.5 5.4 2.8-1.8 5.5-3.2 5.5-5.4 0-2.7-3.7-3.5-5.5-.9z M2 14.5c2 0 3.5 1.4 4 3.5l2 3.5 M22 14.5c-2 0-3.5 1.4-4 3.5l-2 3.5 M12 2v3 M6 4l1.5 2 M18 4l-1.5 2',
  tasbih: beads + ' M12 15.7v3 M10.3 21.6l1.7-2.9 1.7 2.9',
  stars: 'M4 18.5l5-6 5 3 6-9 ' + circ(4, 18.5, 1.6) + ' ' + circ(9, 12.5, 1.6) + ' ' + circ(14, 15.5, 1.6) + ' ' + circ(20, 6.5, 1.6) + ' M7 4l.5 1.2 1.2.5-1.2.5L7 7.4l-.5-1.2-1.2-.5 1.2-.5z',
  minaret: 'M10 21.5V9h4v12.5 M9 9h6 M10 9l2-4 2 4 M12 5V2.5 M15.5 21.5v-3.5a3 3 0 0 1 6 0v3.5 M2.5 21.5v-3.5a3 3 0 0 1 6 0v3.5 M1.5 21.5h21',
  books: 'M2.5 21h12.5 M3 21v-3h11.5v3 M4 18v-3h10v3 M5 15v-3h8v3 M16.5 21h5v-3.2l-1.2-1.3h-2.6l-1.2 1.3z M19 16.5v-2.5 M18.5 10l3.5-7.5',
  scales: 'M12 3v18.5 M8 21.5h8 M4.5 6.5h15 M4.5 6.5l-3 6.5a3 3 0 0 0 6 0z M19.5 6.5l-3 6.5a3 3 0 0 0 6 0z ' + circ(12, 3.6, 1.3),
  drop: 'M12 2.5c3.2 4.2 6.5 7.8 6.5 11.5a6.5 6.5 0 0 1-13 0c0-3.7 3.3-7.3 6.5-11.5z M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8',
  mat: 'M5.5 21V8a6.5 6.5 0 0 1 13 0v13z M9 21v-9a3 3 0 0 1 6 0v9 M6.5 21v2 M9.5 21v2 M14.5 21v2 M17.5 21v2',
  lantern: 'M12 1.5v2 M9 3.5h6 M8 6.5h8l-1.2-3H9.2z M8 6.5v9.5l4 4.5 4-4.5V6.5 M10.5 9.5v5 M13.5 9.5v5 M8 16h8',
  coins: 'M3.5 7c0-1.2 2.7-2.2 6-2.2s6 1 6 2.2-2.7 2.2-6 2.2-6-1-6-2.2z M3.5 7v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V7 M3.5 11v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-4 M15.5 13.2c3 .2 5 1 5 2v4c0 1.2-2.7 2.2-6 2.2-1.7 0-3.3-.3-4.4-.7',
  hand: 'M2.5 15h4l4 2h4a1.8 1.8 0 0 0 0-3.6h-3 M6.5 15v6 M2.5 21h4 M14.5 17l5.2-3.1a1.6 1.6 0 0 1 2 2.4L15.5 21.5h-9 ' + circ(15, 6, 3.2) + ' M15 4.6v2.8',
  tents: 'M1.5 20.5l5.5-10 5.5 10z M11.5 20.5l5.5-10 5.5 10z M7 10.5V7 M17 10.5V7 M7 7l2.5 1-2.5 1 M17 7l2.5 1-2.5 1 M1 20.5h22',
  family: 'M12 21.5v-6 M12 15.5c-4 0-6-2-6-5.5 M12 15.5c4 0 6-2 6-5.5 M12 15.5V8 ' + circ(6, 8.5, 2) + ' ' + circ(18, 8.5, 2) + ' ' + circ(12, 5.5, 2.2),
  money: 'M2.5 6.5h14v9h-14z ' + circ(9.5, 11, 2.2) + ' M6.5 18.5h15v-9 M5 9v4 M14 9v4',
  tools: 'M14.5 3.5l6 6-3 3-6-6z M11.5 6.5l-8.2 8.2a2.1 2.1 0 0 0 3 3l8.2-8.2 M14 15l3 3 M13 19l3-3 3 3-3 3z',
  pie: circ(12, 12, 9.5) + ' M12 2.5V12l7.8 5.3 M12 12l-8.6 4.1',
  tree: 'M12 3v11 M12 6.5L8 3.5 M12 6.5l4-3 M12 9.5l-5-2 M12 9.5l5-2 M12 14c-1 3-4 4-7.5 5 M12 14c1 3 4 4 7.5 5 M12 14v7.5 M2 14h20',
  pillars: 'M2.5 20.5h19 M4 8h16 M12 2.5l8.5 5.5h-17z M6 8v12.5 M9 8v12.5 M12 8v12.5 M15 8v12.5 M18 8v12.5',
  smile: 'M12 20c-5.5-3.6-9-6.8-9-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 2.4c0 3.8-3.5 7-9 10.6z M9 12.5c1.6 1.6 4.4 1.6 6 0 M9.5 10h.01 M14.5 10h.01',
  crescent: 'M14.5 2.5a9.5 9.5 0 1 0 7 15.8A8 8 0 0 1 14.5 2.5z M19 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z',
  flower: rosettePath(),
}

/** A small five-petal flower outline for kids' pages. */
function rosettePath() {
  let p = ''
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180
    const x = 12 + 5 * Math.cos(a)
    const y = 10 + 5 * Math.sin(a)
    p += circ(+f2(x), +f2(y), 3) + ' '
  }
  return p + circ(12, 10, 1.6) + ' M12 15v7 M12 19c-2-2-4-2-5.5-1.5 M12 18c2-2 4-2 5.5-1.5'
}

const CAT_ICON: Record<string, string> = {
  // groups
  quran: I.book, hadith: I.scroll, aqidah: I.star, fiqh: I.scales, prophets: I.lamp, arabic: I.quill, tazkiyah: I.heart, islamichistory: I.minaret, kids: I.crescent,
  // Islamic categories
  'isl-quran': I.book, 'isl-tajwid': I.tajwid, 'isl-tafsir': I.tafsir,
  'isl-hadith': I.scroll, 'isl-mustalah': I.chain,
  'isl-iman': I.star, 'isl-akhirah': I.gate,
  'isl-prophets-early': I.ship, 'isl-prophets-later': I.sea, 'isl-seerah-makkah': I.cave, 'isl-seerah-madinah': I.palm,
  'isl-sarf': I.roots, 'isl-nahw': I.marks, 'isl-balagha': I.quill,
  'isl-akhlaq': I.heartHands, 'isl-tasawwuf': I.tasbih,
  'isl-sahabah': I.stars, 'isl-history': I.minaret, 'isl-scholars': I.books,
  'isl-taharah': I.drop, 'isl-salah': I.mat, 'isl-sawm': I.lantern, 'isl-zakat': I.coins, 'isl-sadaqah': I.hand, 'isl-hajj': I.tents,
  'isl-kinship': I.family, 'isl-money': I.money, 'isl-work': I.tools, 'isl-faraid': I.pie, 'isl-usul': I.tree,
  // kids
  'kids-prophets': I.ship, 'kids-pillars': I.pillars, 'kids-wudu-salah': I.drop, 'kids-quran': I.book, 'kids-seerah': I.palm, 'kids-manners': I.smile, 'kids-calendar': I.crescent,
}

/** A line icon for a category or group, or '' if it has none. */
export function catIconSvg(id: string): string {
  const p = CAT_ICON[id]
  if (!p) return ''
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`
}

export const CAT_ICON_IDS = Object.keys(CAT_ICON)
