import type { IslamicOnlyTheme, ThemeId } from './types'

/**
 * Islamic art for the Munaafasatul Ilm site (built with VITE_THEMESET=islamic):
 * theme names, logo marks, the arabesque under the title, the Arabic calligraphy above it,
 * the ambient background and the category icons.
 * Everything here is fixed markup with no user input, so it is safe to inject.
 * No Qur'anic text and no Names of Allah are drawn, and no place is shown.
 */

const f2 = (n: number) => n.toFixed(2)

/** Themes drawn only by this file: the Garden, the prayer themes, Eid of the Mu'mineen (Friday) and Blessed Mawlid (Monday). */
const ISLAMIC_ONLY: ThemeId[] = ['rawdah', 'jumuah', 'mawlid', 'fajr', 'duha', 'zuhr', 'asr', 'maghrib', 'isha', 'qiyam', 'mughal', 'sahel', 'swahili', 'nusantara', 'zellige', 'suzani', 'bosnia', 'tatar', 'kubachi', 'hui']
export const isIslamicOnly = (t: ThemeId): t is IslamicOnlyTheme => ISLAMIC_ONLY.includes(t)

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
  rawdah: { name: 'The Garden', nameAr: 'الروضة', blurb: 'Leaves, flowers and vines', swatch: 'linear-gradient(135deg,#14402a,#f3c8d3 55%,#e9cf8a)' },
  fajr: { name: 'Fajr', nameAr: 'الفجر', blurb: 'First light: indigo, rose and peach', swatch: 'linear-gradient(180deg,#2b1f55,#e98aa0 70%,#ffc9a8)' },
  duha: { name: 'Duha', nameAr: 'الضحى', blurb: 'Morning sun over turquoise', swatch: 'linear-gradient(180deg,#0f4a66,#9ee6d9 65%,#ffe08a)' },
  zuhr: { name: 'Zuhr', nameAr: 'الظهر', blurb: 'High noon: azure and white gold', swatch: 'linear-gradient(180deg,#fff3c4,#1565a8 45%,#04213f)' },
  asr: { name: "'Asr", nameAr: 'العصر', blurb: 'Late afternoon amber and gold', swatch: 'linear-gradient(180deg,#ffd27a,#8a5418 55%,#2a1606)' },
  maghrib: { name: 'Maghrib', nameAr: 'المغرب', blurb: 'Sunset crimson into dusk violet', swatch: 'linear-gradient(180deg,#3d1240,#a8381f 60%,#ffb36b)' },
  isha: { name: "'Isha'", nameAr: 'العشاء', blurb: 'Night blue, crescent and stars', swatch: 'linear-gradient(135deg,#050b24,#1b2d7a 60%,#dfe7ff)' },
  qiyam: { name: 'Qiyam al-Layl', nameAr: 'قيام الليل', blurb: 'Tahajjud: deep night and a lamp', swatch: 'linear-gradient(135deg,#03040c,#141a36 60%,#f2d27a)' },
  mughal: { name: 'Mughal Marble', nameAr: 'المرمر المغولي', blurb: 'Subcontinent: sandstone, marble and inlaid flowers', swatch: 'linear-gradient(135deg,#8f2f1f,#f5efe6 60%,#2fa36b)' },
  sahel: { name: 'Sahel Mudcloth', nameAr: 'طين الساحل', blurb: 'West Africa: earth, ochre and bogolan marks', swatch: 'linear-gradient(135deg,#3b2614,#d98a3a 55%,#f2e6cf)' },
  swahili: { name: 'Swahili Coast', nameAr: 'الساحل السواحيلي', blurb: 'East Africa: carved doors, brass and ocean', swatch: 'linear-gradient(135deg,#0d3342,#6b4a2b 50%,#e8c27a)' },
  nusantara: { name: 'Nusantara Songket', nameAr: 'سونكيت الأرخبيل', blurb: 'South-East Asia: maroon and gold weave', swatch: 'linear-gradient(135deg,#521033,#7a1747 50%,#f4c95d)' },
  zellige: { name: 'Moroccan Zellige', nameAr: 'الزليج المغربي', blurb: 'North Africa: green, white and blue tilework', swatch: 'linear-gradient(135deg,#11704f,#f2f0e6 55%,#2b6fd6)' },
  suzani: { name: 'Bukhara Suzani', nameAr: 'سوزاني بخارى', blurb: 'Central Asia: embroidered red medallions', swatch: 'linear-gradient(135deg,#3a1420,#8a1c2b 50%,#f3d9a4)' },
  bosnia: { name: 'Bosnian Kilim', nameAr: 'الكليم البوسني', blurb: 'Balkans: red, black and white woven diamonds', swatch: 'linear-gradient(135deg,#3d0f0f,#9e1b1b 50%,#f2ead8)' },
  tatar: { name: 'Tatar Embroidery', nameAr: 'التطريز التتاري', blurb: 'Volga: flowers in silk and gold on green velvet', swatch: 'linear-gradient(135deg,#0d2a1d,#1f5a3e 45%,#e05a6b 75%,#e9c46a)' },
  kubachi: { name: 'Kubachi Silver', nameAr: 'فضة كوباتشي', blurb: 'Caucasus: engraved silver and black niello', swatch: 'linear-gradient(135deg,#0b0c10,#2a2e38 50%,#e3e6ec)' },
  hui: { name: 'Hui Lacquer', nameAr: 'فن الهوي', blurb: 'China: red lacquer, gold clouds and lotus', swatch: 'linear-gradient(135deg,#4a0a0c,#a3171a 50%,#f2c14e)' },
  jumuah: { name: "Eid of the Mu'mineen", nameAr: 'عيد المؤمنين', blurb: 'Friday: lanterns, pearl and gold', swatch: 'linear-gradient(135deg,#0b3b31,#f1d389 55%,#fff4dc)' },
  mawlid: { name: 'Blessed Mawlid', nameAr: 'المولد المبارك', blurb: 'Monday: roses, light and gold', swatch: 'linear-gradient(135deg,#16224f,#0f4a3a 35%,#ff9fb5 68%,#ffd98a)' },
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

/** A hanging lantern (fanous): chain, cap, pierced glass body and finial. */
function lantern(cx: number, top: number, h: number, gold: string, glass: string, chain = 0): string {
  const w = h * 0.42
  const y0 = top + chain, y1 = y0 + h * 0.18, y2 = y0 + h * 0.36, y3 = y0 + h * 0.74, y4 = y0 + h * 0.86
  return (
    (chain ? `<path d="M${cx} ${top}V${y0}" stroke="${gold}" stroke-width="${f2(h * 0.025)}"/>` : '') +
    `<path d="M${cx} ${y0}L${f2(cx + w * 0.32)} ${y1}H${f2(cx - w * 0.32)}Z" fill="${gold}"/>` +
    `<path d="M${f2(cx - w * 0.32)} ${y1}H${f2(cx + w * 0.32)}L${f2(cx + w / 2)} ${y2}L${f2(cx + w * 0.42)} ${y3}L${cx} ${y4}L${f2(cx - w * 0.42)} ${y3}L${f2(cx - w / 2)} ${y2}Z" fill="${glass}" stroke="${gold}" stroke-width="${f2(h * 0.03)}"/>` +
    `<path d="M${cx} ${y1}V${y4} M${f2(cx - w / 2)} ${y2}H${f2(cx + w / 2)} M${f2(cx - w * 0.42)} ${y3}H${f2(cx + w * 0.42)}" stroke="${gold}" stroke-width="${f2(h * 0.018)}" opacity=".8"/>` +
    `<path d="${star(cx, (y2 + y3) / 2, w * 0.2)}" fill="${gold}" opacity=".9"/>` +
    `<path d="M${cx} ${y4}V${f2(y4 + h * 0.1)}" stroke="${gold}" stroke-width="${f2(h * 0.03)}"/><circle cx="${cx}" cy="${f2(y4 + h * 0.12)}" r="${f2(h * 0.03)}" fill="${gold}"/>`
  )
}

/** Thin sun rays around a centre. */
function rays(cx: number, cy: number, r0: number, r1: number, n: number, stroke: string, width: number): string {
  let p = ''
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = i % 2 ? r1 * 0.88 : r1
    p += `M${f2(cx + r0 * Math.cos(a))} ${f2(cy + r0 * Math.sin(a))}L${f2(cx + r * Math.cos(a))} ${f2(cy + r * Math.sin(a))}`
  }
  return `<path d="${p}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`
}

/** A prayer-time sky seen through a round window: the sun or moon at its hour over a mosque on the horizon. */
function skyMark(
  g: string,
  o: { sky: [string, string]; ring: string; ground: string; sun?: [number, number, number, string]; moon?: [number, number, number, string]; stars?: number; glow?: string; lamp?: boolean },
): string {
  let st = ''
  for (let i = 0; i < (o.stars ?? 0); i++) st += `<circle cx="${f2(14 + ((i * 37) % 72))}" cy="${f2(12 + ((i * 23) % 44))}" r="${i % 3 ? 0.8 : 1.3}" fill="#fff" opacity="${i % 2 ? 0.6 : 0.95}"/>`
  const sun = o.sun ? `<circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="${o.sun[2] * 2.2}" fill="${o.sun[3]}" opacity=".25"/><circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="${o.sun[2]}" fill="${o.sun[3]}"/>` : ''
  const moon = o.moon ? `<circle cx="${o.moon[0]}" cy="${o.moon[1]}" r="${o.moon[2]}" fill="${o.moon[3]}"/><circle cx="${f2(o.moon[0] + o.moon[2] * 0.45)}" cy="${f2(o.moon[1] - o.moon[2] * 0.2)}" r="${o.moon[2]}" fill="url(#${g}sky)"/>` : ''
  const glow = o.glow ? `<ellipse cx="50" cy="74" rx="44" ry="16" fill="${o.glow}" opacity=".55"/>` : ''
  const mosque =
    `<path d="M4 96V74H22V66H26V74H36Q36 58 50 52Q64 58 64 74H74V66H78V74H96V96Z" fill="${o.ground}"/>` +
    `<path d="M22 66V40L24 34L26 40V66Z M74 66V40L76 34L78 40V66Z M50 52V46" fill="${o.ground}" stroke="${o.ground}" stroke-width="1.4"/>` +
    (o.lamp ? `<path d="M46 74V66Q50 61 54 66V74Z" fill="#f2d27a"/><circle cx="50" cy="69" r="7" fill="#f2d27a" opacity=".25"/>` : '')
  return (
    `<defs><linearGradient id="${g}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient>` +
    `<clipPath id="${g}win"><circle cx="50" cy="50" r="44"/></clipPath></defs>` +
    `<g clip-path="url(#${g}win)"><rect width="100" height="100" fill="url(#${g}sky)"/>${st}${glow}${sun}${moon}${mosque}</g>` +
    `<circle cx="50" cy="50" r="45" fill="none" stroke="${o.ring}" stroke-width="2.4"/><circle cx="50" cy="50" r="48.5" fill="none" stroke="${o.ring}" stroke-width=".8" opacity=".6"/>`
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
  // The prayer themes: the sky at each prayer time.
  fajr: { bg: ['#2b1f55', '#120f2e'], draw: (g) => skyMark(g, { sky: ['#2b1f55', '#e98aa0'], ring: '#ffc9a8', ground: '#120f2e', glow: '#ffc9a8', moon: [30, 28, 6, '#fff3e0'], stars: 6 }) },
  duha: { bg: ['#0f4a66', '#07243a'], draw: (g) => skyMark(g, { sky: ['#4fb6c8', '#bfeee6'], ring: '#ffe08a', ground: '#07243a', sun: [70, 36, 8, '#ffe08a'] }) },
  zuhr: { bg: ['#0b4f8a', '#04213f'], draw: (g) => skyMark(g, { sky: ['#1565a8', '#7fd3ff'], ring: '#fff3c4', ground: '#04213f', sun: [50, 20, 9, '#fffbe6'] }) },
  asr: { bg: ['#5a3410', '#2a1606'], draw: (g) => skyMark(g, { sky: ['#c97a2a', '#ffd27a'], ring: '#ffd27a', ground: '#2a1606', sun: [27, 42, 8, '#fff0c2'] }) },
  maghrib: { bg: ['#5a1a2e', '#1c0a24'], draw: (g) => skyMark(g, { sky: ['#3d1240', '#ff7a4a'], ring: '#ffb36b', ground: '#1c0a24', sun: [50, 72, 13, '#ffb36b'], stars: 3 }) },
  isha: { bg: ['#101d52', '#050b24'], draw: (g) => skyMark(g, { sky: ['#050b24', '#1b2d7a'], ring: '#dfe7ff', ground: '#03061a', moon: [66, 28, 9, '#f3f6ff'], stars: 14 }) },
  qiyam: { bg: ['#0d1124', '#03040c'], draw: (g) => skyMark(g, { sky: ['#020310', '#141a36'], ring: '#f2d27a', ground: '#000', moon: [30, 24, 6, '#e9e6d8'], stars: 20, lamp: true }) },
  // Muslim cultures of the world.
  // Mughal: a cusped arch of red sandstone framing white marble with an inlaid flower (pietra dura).
  mughal: {
    bg: ['#5a1e16', '#2a0f0c'],
    draw: () => {
      const cusp = 'M24 90V48C24 44 27 42 29 40C28 36 31 32 35 32C35 27 39 24 43 25C44 20 47 17 50 15C53 17 56 20 57 25C61 24 65 27 65 32C69 32 72 36 71 40C73 42 76 44 76 48V90Z'
      return (
        `<rect x="8" y="6" width="84" height="88" rx="6" fill="#8f2f1f" stroke="#f5efe6" stroke-width="1.6"/>` +
        `<rect x="13" y="11" width="74" height="78" rx="3" fill="none" stroke="#f5efe6" stroke-width=".8" opacity=".7"/>` +
        `<path d="${cusp}" fill="#f5efe6"/>` +
        `<path d="M50 84C50 74 50 66 50 58" stroke="#2fa36b" stroke-width="2"/>` +
        leafAt(50, 76, 210, 13, 4, '#2fa36b') + leafAt(50, 70, -30, 13, 4, '#2fa36b') +
        tulip(50, 60, 20, '#c0392b', '#e57b5c', '#2fa36b') +
        `<circle cx="38" cy="54" r="2.4" fill="#2b6fd6"/><circle cx="62" cy="54" r="2.4" fill="#2b6fd6"/><circle cx="50" cy="31" r="2.6" fill="#e6b84a"/>`
      )
    },
  },
  // Sahel bogolan (mudcloth): cream marks of crosses, dots and zigzags on earth brown.
  sahel: {
    bg: ['#3b2614', '#1e130a'],
    draw: () => {
      let dots = ''
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        dots += `<circle cx="${f2(50 + 40 * Math.cos(a))}" cy="${f2(50 + 40 * Math.sin(a))}" r="2" fill="#f2e6cf"/>`
      }
      return (
        `<circle cx="50" cy="50" r="46" fill="#4a2e16" stroke="#d98a3a" stroke-width="2"/>` + dots +
        `<path d="M50 14L86 50L50 86L14 50Z" fill="#2e1d0f" stroke="#f2e6cf" stroke-width="2.2"/>` +
        `<path d="M26 50L32 44L38 50L44 44L50 50L56 44L62 50L68 44L74 50" fill="none" stroke="#f2e6cf" stroke-width="1.8"/>` +
        `<path d="M26 56L32 62L38 56L44 62L50 56L56 62L62 56L68 62L74 56" fill="none" stroke="#d98a3a" stroke-width="1.6"/>` +
        `<path d="M50 24V36 M44 30H56 M50 64V76 M44 70H56" stroke="#f2e6cf" stroke-width="2.4"/>`
      )
    },
  },
  // Swahili coast: a carved wooden door with a chain border and brass studs, the sea behind.
  swahili: {
    bg: ['#0d3342', '#071a24'],
    draw: () => {
      let studs = ''
      for (const y of [44, 58, 72]) for (const x of [38, 50, 62]) studs += `<circle cx="${x}" cy="${y}" r="2.6" fill="#e8c27a"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r=".9" fill="#fff4d6"/>`
      let chain = ''
      for (let i = 0; i < 8; i++) chain += `<ellipse cx="${24 + i * 7.4}" cy="22" rx="3.6" ry="2.2" fill="none" stroke="#e8c27a" stroke-width="1"/>`
      return (
        `<circle cx="50" cy="50" r="46" fill="#0d3342" stroke="#4fc3c8" stroke-width="1.6"/>` +
        `<path d="M8 74C20 70 30 78 42 74S64 70 76 74S92 78 94 74V82H8Z" fill="#4fc3c8" opacity=".35"/>` +
        `<path d="M22 92V30Q22 16 50 14Q78 16 78 30V92Z" fill="#6b4a2b" stroke="#e8c27a" stroke-width="2"/>` + chain +
        `<path d="M28 92V32H72V92" fill="#3a2615" stroke="#e8c27a" stroke-width="1.2"/><path d="M50 32V92" stroke="#e8c27a" stroke-width="1.2"/>` +
        `<path d="M30 30C36 24 44 24 50 28C56 24 64 24 70 30" fill="none" stroke="#e8c27a" stroke-width="1.4"/>` + studs
      )
    },
  },
  // Nusantara songket: gold pucuk rebung (bamboo shoot) triangles woven on maroon.
  nusantara: {
    bg: ['#521033', '#2a0718'],
    draw: () => {
      let shoots = ''
      for (let i = 0; i < 5; i++) {
        const x = 18 + i * 16
        shoots += `<path d="M${x - 7} 86L${x} 62L${x + 7} 86Z" fill="none" stroke="#f4c95d" stroke-width="1.4"/><path d="M${x} 70L${x} 84 M${x - 3} 80L${x} 76L${x + 3} 80" stroke="#f4c95d" stroke-width="1"/>`
        shoots += `<path d="M${x - 7} 14L${x} 38L${x + 7} 14Z" fill="none" stroke="#f4c95d" stroke-width="1.4"/>`
      }
      return (
        `<rect x="6" y="6" width="88" height="88" rx="8" fill="#7a1747" stroke="#f4c95d" stroke-width="2"/>` + shoots +
        `<path d="M50 34L66 50L50 66L34 50Z" fill="#f4c95d"/><path d="M50 40L60 50L50 60L40 50Z" fill="#7a1747"/><path d="M50 45L55 50L50 55L45 50Z" fill="#e8a0c0"/>` +
        `<path d="M6 50H30 M70 50H94" stroke="#f4c95d" stroke-width="1.4" stroke-dasharray="3 2"/>`
      )
    },
  },
  // Moroccan zellige: a sixteen-point star of cut tiles in green, blue, white and ochre.
  zellige: {
    bg: ['#0d3d2a', '#062418'],
    draw: () => {
      let petals = ''
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2
        const c = ['#11704f', '#2b6fd6', '#f2f0e6', '#d9a43a'][i % 4]
        petals += `<path d="M${f2(50 + 20 * Math.cos(a - 0.17))} ${f2(50 + 20 * Math.sin(a - 0.17))}L${f2(50 + 44 * Math.cos(a))} ${f2(50 + 44 * Math.sin(a))}L${f2(50 + 20 * Math.cos(a + 0.17))} ${f2(50 + 20 * Math.sin(a + 0.17))}Z" fill="${c}" stroke="#0a1a12" stroke-width=".8"/>`
      }
      return (
        `<circle cx="50" cy="50" r="47" fill="#0a1a12"/>` + petals +
        `<path d="${nStar(50, 50, 21, 15, 16)}" fill="#f2f0e6" stroke="#0a1a12" stroke-width=".8"/>` +
        `<path d="${star(50, 50, 13)}" fill="#11704f"/><path d="${star(50, 50, 7, Math.PI / 8)}" fill="#2b6fd6"/>`
      )
    },
  },
  // Bukhara suzani: an embroidered red medallion ringed with petals and vine leaves on cream thread.
  suzani: {
    bg: ['#3a1420', '#1a0a10'],
    draw: () => {
      let ring = ''
      for (let i = 0; i < 12; i++) ring += leafAt(50, 50, i * 30 + 15, 44, 6, i % 2 ? '#2f6b4a' : '#e8743b', ' opacity=".9"')
      return (
        `<circle cx="50" cy="50" r="47" fill="#f3d9a4" opacity=".14"/>` + ring +
        `<circle cx="50" cy="50" r="27" fill="#8a1c2b" stroke="#f3d9a4" stroke-width="2"/>` +
        rosette(50, 50, 20, 10, '#c0392b', 0.5, -90) +
        `<circle cx="50" cy="50" r="11" fill="#f3d9a4"/><circle cx="50" cy="50" r="7" fill="#8a1c2b"/><circle cx="50" cy="50" r="3" fill="#e8743b"/>`
      )
    },
  },
  // Bosnian kilim: stepped diamonds with hooked edges in red, black and white.
  bosnia: {
    bg: ['#3a1414', '#1a0c0c'],
    draw: () => {
      const hooks = (cx: number, cy: number, r: number, c: string) => {
        let h = ''
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) h += `<path d="M${cx + dx * r} ${cy + dy * r}l${dx * 6 + dy * 3} ${dy * 6 + dx * 3}l${-dy * 4} ${dx * 4}" fill="none" stroke="${c}" stroke-width="2"/>`
        return h
      }
      return (
        `<rect x="6" y="6" width="88" height="88" rx="4" fill="#9e1b1b" stroke="#f2ead8" stroke-width="2"/>` +
        `<path d="M6 16H94 M6 84H94" stroke="#1a0c0c" stroke-width="4"/><path d="M6 16H94 M6 84H94" stroke="#f2ead8" stroke-width="1" stroke-dasharray="4 4"/>` +
        `<path d="M50 20L80 50L50 80L20 50Z" fill="#1a0c0c"/><path d="M50 28L72 50L50 72L28 50Z" fill="#f2ead8"/><path d="M50 36L64 50L50 64L36 50Z" fill="#9e1b1b"/><path d="M50 44L56 50L50 56L44 50Z" fill="#2f4f8a"/>` +
        hooks(50, 50, 30, '#f2ead8')
      )
    },
  },
  // Tatar embroidery: a tulip and two flowers in silk on green velvet, with gold thread.
  tatar: {
    bg: ['#1b3a2b', '#0d1a14'],
    draw: () =>
      `<circle cx="50" cy="50" r="46" fill="#1f5a3e" stroke="#e9c46a" stroke-width="2"/><circle cx="50" cy="50" r="41" fill="none" stroke="#e9c46a" stroke-width=".8" stroke-dasharray="2 2"/>` +
      `<path d="M50 88C48 76 52 70 50 60" stroke="#e9c46a" stroke-width="2" fill="none"/>` +
      leafAt(50, 80, 200, 20, 6, '#7cc489') + leafAt(50, 74, -20, 20, 6, '#7cc489') +
      `<path d="M50 70C42 66 34 62 28 54 M50 70C58 66 66 62 72 54" stroke="#e9c46a" stroke-width="1.4" fill="none"/>` +
      rose(27, 50, 9, '#e05a6b', '#f4a3ae', '#b8324a') + rose(73, 50, 9, '#5b7fd6', '#a9c0f2', '#34529e') +
      tulip(50, 58, 28, '#e05a6b', '#f4a3ae', '#7cc489'),
  },
  // Kubachi silver: an engraved silver medallion with scrolling leaves on black niello.
  kubachi: {
    bg: ['#1c1f27', '#0b0c10'],
    draw: () => {
      let sc = ''
      for (let i = 0; i < 8; i++) {
        const a = i * 45
        sc += `<g transform="rotate(${a} 50 50)"><path d="M50 30C58 22 66 24 66 31C66 36 60 37 58 33" fill="none" stroke="#e3e6ec" stroke-width="1.3"/>${leafAt(56, 26, -30, 9, 3, '#e3e6ec')}</g>`
      }
      return (
        `<circle cx="50" cy="50" r="47" fill="#e3e6ec"/><circle cx="50" cy="50" r="43" fill="#121419"/>` + sc +
        `<circle cx="50" cy="50" r="18" fill="#2a2e38" stroke="#e3e6ec" stroke-width="1.6"/>` +
        rosette(50, 50, 14, 8, '#e3e6ec', 0.45, -90) + `<circle cx="50" cy="50" r="4" fill="#121419"/>`
      )
    },
  },
  // Hui lacquer: gold cloud scrolls around a lotus on red lacquer, with jade.
  hui: {
    bg: ['#3d0c0c', '#1a0606'],
    draw: () => {
      const cloud = (x: number, y: number, s: number) => `<path d="M${x} ${y}c${-6 * s} 0 ${-6 * s} ${-7 * s} 0 ${-7 * s}c${1 * s} ${-5 * s} ${8 * s} ${-5 * s} ${9 * s} 0c${6 * s} ${-1 * s} ${8 * s} ${6 * s} ${2 * s} ${7 * s}z M${x + 2 * s} ${y - 3 * s}c${2 * s} ${-2 * s} ${5 * s} 0 ${3 * s} ${2 * s}" fill="none" stroke="#f2c14e" stroke-width="1.4"/>`
      return (
        `<circle cx="50" cy="50" r="46" fill="#a3171a" stroke="#f2c14e" stroke-width="2"/><circle cx="50" cy="50" r="41" fill="none" stroke="#f2c14e" stroke-width=".8"/>` +
        cloud(24, 30, 1) + cloud(66, 28, 1) + cloud(20, 74, 0.9) + cloud(70, 76, 0.9) +
        rosette(50, 52, 18, 8, '#f2c14e', 0.5, -90) + rosette(50, 52, 11, 8, '#f6b3a8', 0.55, -67.5) +
        `<circle cx="50" cy="52" r="4.5" fill="#3fa17a"/>` +
        `<path d="M40 76Q50 70 60 76" fill="none" stroke="#3fa17a" stroke-width="2"/>`
      )
    },
  },
  // Eid of the Mu'mineen: a glowing lantern under a gold pointed arch, with rays of light.
  jumuah: {
    bg: ['#0e4a3d', '#03191a'],
    draw: () =>
      rays(50, 50, 36, 47, 32, '#f1d389', 1.2) +
      `<circle cx="50" cy="50" r="35" fill="#062a25" stroke="#f1d389" stroke-width="2"/>` +
      `<path d="M28 82V50C28 34 40 24 50 16C60 24 72 34 72 50V82Z" fill="#0b3b31" stroke="#f1d389" stroke-width="1.8"/>` +
      `<circle cx="50" cy="55" r="15" fill="#fff4dc" opacity=".18"/>` +
      lantern(50, 26, 46, '#f1d389', '#fff1c9', 6) +
      `<circle cx="37" cy="72" r="1.6" fill="#fff4dc"/><circle cx="63" cy="72" r="1.6" fill="#fff4dc"/>`,
  },
  // Blessed Mawlid: a rose at the heart of a sixteen-point star of light, ringed by sun rays.
  mawlid: {
    bg: ['#1b2a63', '#070b22'],
    draw: () =>
      rays(50, 50, 30, 48, 48, '#ffd98a', 1) +
      `<path d="${nStar(50, 50, 40, 31, 16)}" fill="#0f4a3a" stroke="#ffd98a" stroke-width="1.6"/>` +
      `<path d="${star(50, 50, 30)}" fill="none" stroke="#ffd98a" stroke-width="1.2"/><path d="${star(50, 50, 30, Math.PI / 8)}" fill="none" stroke="#ffd98a" stroke-width="1.2" opacity=".7"/>` +
      `<circle cx="50" cy="50" r="22" fill="#0a2f27" stroke="#ffd98a" stroke-width="1.4"/>` +
      leafAt(50, 50, 135, 21, 6, '#3f9f6b') +
      leafAt(50, 50, 45, 21, 6, '#3f9f6b') +
      leafAt(50, 50, 200, 16, 5, '#5fbf86') +
      leafAt(50, 50, -20, 16, 5, '#5fbf86') +
      rose(50, 48, 15, '#ff7f9f', '#ffb3c4', '#e0466f') +
      `<circle cx="50" cy="5" r="2.2" fill="#fff4dc"/><circle cx="50" cy="95" r="2.2" fill="#fff4dc"/><circle cx="5" cy="50" r="2.2" fill="#fff4dc"/><circle cx="95" cy="50" r="2.2" fill="#fff4dc"/>`,
  },
}

// ---------- title ornaments ----------

const d = (path: string, delay: number, dur = 1.6) => `<path class="fl-draw" pathLength="1" style="--d:${delay}s;--dur:${dur}s" d="${path}"/>`
const mirror = (inner: string) => `<g>${inner}</g><g transform="scale(-1 1)">${inner}</g>`

/** The arabesque (islimi) scroll under the title: two mirrored vines with curls, leaves and a centre bud. */
export function islamicFlourish(theme: ThemeId): string {
  const garden = theme === 'rawdah' || theme === 'mawlid'
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
  const centre = theme === 'mawlid'
    ? `<g class="fl-fade" style="--d:.3s">${rays(0, 0, 12, 22, 24, 'var(--accent)', 0.8)}${rose(0, 0, 12, 'var(--accent2)', '#ffd1dc', '#e0466f')}</g>`
    : theme === 'jumuah'
    ? `<g class="fl-fade" style="--d:.3s">${rays(0, 0, 10, 20, 24, 'var(--accent)', 0.8)}<path d="${nStar(0, 0, 11, 7.5, 16)}" style="fill:var(--accent)"/><path d="${star(0, 0, 5.5, Math.PI / 8)}" style="fill:var(--bg)"/><circle r="2" style="fill:var(--accent2)"/></g>`
    : garden
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
  if (theme === 'jumuah') {
    // Lanterns hanging from the top at different heights, swaying slowly, over a large faint "Jumu'ah Mubarakah".
    const spots = [8, 22, 78, 92, 36, 64]
    let ls = ''
    spots.forEach((x, i) => {
      const chain = 40 + ((i * 53) % 90)
      ls += `<svg class="lt" style="left:${x}%;--i:${i};animation-duration:${7 + (i % 3)}s;animation-delay:-${i * 1.3}s" viewBox="0 0 40 ${chain + 70}" width="40" height="${chain + 70}"><g>${lantern(20, 0, 64, '#f1d389', 'rgba(255,241,201,.55)', chain)}</g></svg>`
    })
    let sp = ''
    for (let i = 0; i < 26; i++) sp += `<i style="left:${(i * 37 + 3) % 100}%;top:${(i * 59 + 11) % 100}%;animation-delay:-${(i * 0.77) % 6}s"></i>`
    return `<div class="amb amb-jm" aria-hidden="true"><span class="amb-word" lang="ar" dir="rtl">جمعة مباركة</span>${ls}<div class="sp">${sp}</div></div>`
  }
  if (theme === 'mawlid') {
    // Slow rays of light from above, a faint "Mawlid al-Habib ﷺ", and rose petals and gold drifting down.
    let s2 = ''
    for (let i = 0; i < 24; i++) s2 += `<i class="${i % 4 === 0 ? 'gd' : i % 3 ? 'pt' : 'lf'}" style="left:${(i * 41 + 7) % 100}%;--i:${i};animation-duration:${15 + ((i * 7) % 12)}s;animation-delay:-${(i * 2.1) % 15}s"></i>`
    return `<div class="amb amb-ml" aria-hidden="true"><div class="nur"></div><span class="amb-word" lang="ar" dir="rtl">مولد الحبيب ﷺ</span><div class="amb-rw">${s2}</div></div>`
  }
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
