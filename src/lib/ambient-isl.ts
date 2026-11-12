/**
 * Animated backgrounds for the prayer-time themes and the Muslim-culture themes
 * (Munaafasatul Ilm). Fixed markup strings, no user input. Animations live in
 * index.css and are switched off by "Reduce effects" and prefers-reduced-motion.
 *
 * Respect rules: no people, no Makkah or Madinah, no Qur'anic text. Buildings
 * are generic silhouettes (domes, minarets, a Sahel mud mosque).
 */
import type { ThemeId } from './types'

const r2 = (n: number) => Math.round(n * 100) / 100

/** Eight-point star outline as a path. */
function star8(cx: number, cy: number, r: number, inner = 0.72): string {
  let d = ''
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2
    const rr = k % 2 ? r * inner : r
    d += `${k ? 'L' : 'M'}${r2(cx + rr * Math.cos(a))} ${r2(cy + rr * Math.sin(a))}`
  }
  return d + 'Z'
}

/** Scattered twinkling dots. */
function dots(n: number, cls: string, seed = 0): string {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = (i * 37 + seed * 11 + 5) % 100
    const y = (i * 61 + seed * 7 + 9) % 100
    s += `<i class="${cls}" style="left:${x}%;top:${y}%;--i:${i};animation-delay:-${r2((i * 0.71) % 6)}s"></i>`
  }
  return s
}

/** A row of generic domes and minarets along the bottom edge. */
function skyline(fill: string, h = 120): string {
  let d = `M0 ${h}V96`
  let x = 0
  const parts = [
    [60, 'flat', 92], [40, 'min', 30], [90, 'dome', 54], [50, 'flat', 88], [36, 'min', 22], [120, 'dome', 40],
    [36, 'min', 22], [60, 'flat', 86], [80, 'dome', 60], [70, 'flat', 94], [40, 'min', 34], [100, 'dome', 50],
    [60, 'flat', 90], [36, 'min', 28], [80, 'dome', 62], [66, 'flat', 96],
  ] as const
  for (const [w, kind, top] of parts) {
    if (kind === 'flat') d += `H${x}V${top}H${x + w}`
    if (kind === 'dome') {
      const base = top + w * 0.42
      d += `H${x}V${r2(base)}C${x} ${top} ${x + w / 2} ${top - 8} ${x + w / 2} ${top - 18}C${x + w / 2} ${top - 8} ${x + w} ${top} ${x + w} ${r2(base)}`
    }
    if (kind === 'min') {
      const c = x + w / 2
      d += `H${c - 6}V${top + 14}L${c - 8} ${top + 10}H${c - 4}V${top}L${c} ${top - 12}L${c + 4} ${top}V${top + 10}H${c + 8}L${c + 6} ${top + 14}V96`
    }
    x += w
  }
  d += `H1200V${h}Z`
  return `<svg class="skyline" viewBox="0 0 1200 ${h}" preserveAspectRatio="xMidYMax slice"><path d="${d}" fill="${fill}"/></svg>`
}

const crescent = (fill: string) => `<svg class="cres" viewBox="0 0 40 40"><path d="M27 5a15 15 0 1 0 9 26A12 12 0 1 1 27 5z" fill="${fill}"/></svg>`

function birds(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += `<svg class="bd" style="--i:${i};top:${18 + ((i * 13) % 26)}%;animation-delay:-${i * 2.7}s" viewBox="0 0 20 8"><path d="M0 6Q5 0 10 5Q15 0 20 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`
  return s
}

function clouds(n: number, cls = 'cl'): string {
  let s = ''
  for (let i = 0; i < n; i++) s += `<i class="${cls}" style="top:${8 + ((i * 17) % 40)}%;--i:${i};animation-duration:${70 + i * 23}s;animation-delay:-${i * 31}s"></i>`
  return s
}


// ---------- silhouettes of each culture's own mosques (generic, not any one building) ----------

/** Ottoman pencil minaret: thin shaft, one or two balconies, a tall cone and a crescent finial. */
function pencil(x: number, base: number, h: number, balconies = 2): string {
  const w = 5
  let d = `M${x - w} ${base}V${base - h + 30}`
  for (let b = 0; b < balconies; b++) {
    const y = base - h * (0.55 + b * 0.18)
    d += `M${x - w} ${r2(y)}h-3v-3h${2 * w + 6}v3h-3`
  }
  d += `M${x - w} ${base - h + 30}L${x} ${base - h}L${x + w} ${base - h + 30}V${base}Z`
  return `<path d="${d}"/><path d="M${x} ${base - h}v-6m-3-5a4 4 0 1 0 6 0" fill="none" stroke-width="1.4"/>`
}
/** A domed prayer hall, Ottoman style, with half-domes. */
function ottomanMosque(x: number, base: number, w: number): string {
  const top = base - w * 0.55
  return `<path d="M${x} ${base}V${r2(top + w * 0.25)}h${r2(w * 0.12)}a${r2(w * 0.14)} ${r2(w * 0.12)} 0 0 1 ${r2(w * 0.2)} 0a${r2(w * 0.24)} ${r2(w * 0.3)} 0 0 1 ${r2(w * 0.36)} 0a${r2(w * 0.14)} ${r2(w * 0.12)} 0 0 1 ${r2(w * 0.2)} 0h${r2(w * 0.12)}V${base}Z"/>` +
    `<path d="M${r2(x + w / 2)} ${r2(top - w * 0.05)}v-8" stroke-width="2"/>`
}
const svgRow = (cls: string, inner: string, fill: string, h = 200) =>
  `<svg class="${cls}" viewBox="0 0 1200 ${h}" preserveAspectRatio="xMidYMax slice"><g fill="${fill}" stroke="${fill}">${inner}</g></svg>`

function bosniaRow(): string {
  // The old bridge's single high arch with its two towers, then mosques with pencil minarets.
  const bridge = `<path d="M330 200V120h40v-26h24v26h0C430 70 520 52 560 52s130 18 166 68V94h24v26h40v80h-60V150C700 108 640 84 560 84s-140 24-170 66v50Z"/>`
  return svgRow('row', bridge + ottomanMosque(40, 200, 140) + pencil(200, 200, 170) + ottomanMosque(880, 200, 160) + pencil(1060, 200, 180) + pencil(1130, 200, 120, 1), '#100303')
}
function tatarRow(): string {
  // Volga-Tatar mosques: a pitched-roof hall with a tall tiered minaret rising from the roof.
  const m = (x: number, s: number) => {
    const b = 200
    return `<path d="M${x} ${b}V${b - 60 * s}L${x + 70 * s} ${b - 92 * s}L${x + 140 * s} ${b - 60 * s}V${b}Z"/>` +
      `<path d="M${x + 58 * s} ${b - 86 * s}V${b - 150 * s}h-4v-6h32v6h-4V${b - 86 * s}Z M${x + 62 * s} ${b - 156 * s}V${b - 196 * s}h-3v-5h22v5h-3V${b - 156 * s}Z M${x + 64 * s} ${b - 201 * s}L${x + 70 * s} ${b - 232 * s}L${x + 76 * s} ${b - 201 * s}Z"/>` +
      `<path d="M${x + 70 * s} ${b - 232 * s}v-6m-3-5a4 4 0 1 0 6 0" fill="none" stroke-width="1.4"/>`
  }
  return svgRow('row', m(30, 0.8) + m(820, 0.9) + m(1040, 0.7), '#04110a', 220)
}
function demakRow(): string {
  // Javanese mosques: three stacked hipped roofs (tajug) with a finial (mustaka).
  const m = (x: number, w: number) => {
    const b = 200
    let d = `M${x + w * 0.08} ${b}V${b - 34}H${x + w * 0.92}V${b}Z`
    const tiers = [[0, 34, 1, 0.3], [0.14, 64, 0.72, 0.26], [0.27, 92, 0.46, 0.24]]
    for (const [ox, y, ww, hh] of tiers) {
      const L = x + w * ox, R = L + w * ww
      d += `M${r2(L - 6)} ${b - y}L${r2(L + w * 0.1)} ${r2(b - y - w * hh * 0.5)}H${r2(R - w * 0.1)}L${r2(R + 6)} ${b - y}Z`
    }
    d += `M${r2(x + w / 2 - 4)} ${r2(b - 92 - w * 0.12)}L${r2(x + w / 2)} ${r2(b - 92 - w * 0.12 - 26)}L${r2(x + w / 2 + 4)} ${r2(b - 92 - w * 0.12)}Z`
    return `<path d="${d}"/>`
  }
  return svgRow('row', m(20, 220) + m(940, 240), '#16030c', 240)
}
function bukharaRow(): string {
  // A tapering brick minaret with a lantern top, and turquoise ribbed domes on tall drums.
  const minaret = `<path d="M560 200L572 40H628L640 200Z"/><path d="M566 40h68v-10l-6-14h-56l-6 14Z"/>`
  const dome = (x: number, w: number) => `<path d="M${x} 200V${200 - w * 0.6}h${w}V200Z"/><path d="M${x - 4} ${200 - w * 0.6}C${x - 4} ${200 - w * 1.25} ${x + w / 2} ${200 - w * 1.45} ${x + w / 2} ${200 - w * 1.5}C${x + w / 2} ${200 - w * 1.45} ${x + w + 4} ${200 - w * 1.25} ${x + w + 4} ${200 - w * 0.6}Z" fill="#1f8f8a" stroke="#1f8f8a"/>`
  const portal = `<path d="M720 200V70h150v130h-30v-80c0-24-18-40-45-40s-45 16-45 40v80Z"/>`
  return svgRow('row', dome(80, 90) + dome(960, 110) + minaret + portal, '#160609', 230)
}
function huiRow(): string {
  // A Chinese-style mosque: a pagoda minaret with upturned eaves (as at Xi'an), and a hall.
  const eave = (cx: number, y: number, w: number) => `M${cx - w / 2 - 14} ${y}Q${cx - w / 2} ${y + 4} ${cx - w / 2 + 6} ${y - 10}H${cx + w / 2 - 6}Q${cx + w / 2} ${y + 4} ${cx + w / 2 + 14} ${y}L${cx + w / 2} ${y + 6}H${cx - w / 2}Z`
  const pag = (cx: number) => `<path d="M${cx - 34} 200V160H${cx + 34}V200Z${eave(cx, 160, 90)}M${cx - 26} 154V124H${cx + 26}V154Z${eave(cx, 124, 70)}M${cx - 18} 118V94H${cx + 18}V118Z${eave(cx, 94, 50)}M${cx - 3} 88L${cx} 66L${cx + 3} 88Z"/>`
  const hall = (x: number, w: number) => `<path d="M${x} 200V150H${x + w}V200Z${eave(x + w / 2, 150, w)}"/>`
  return svgRow('row', pag(130) + hall(220, 220) + pag(1060) + hall(760, 220), '#120102', 220)
}
function swahiliDoor(): string {
  // A carved Zanzibar door: arched lintel, chain border, rosettes and brass studs.
  let studs = ''
  for (let y = 70; y < 380; y += 34) studs += `<circle cx="132" cy="${y}" r="4"/><circle cx="188" cy="${y}" r="4"/>`
  let chain = ''
  for (let y = 60; y < 400; y += 16) chain += `<circle cx="96" cy="${y}" r="6"/><circle cx="224" cy="${y}" r="6"/>`
  return `<svg class="door" viewBox="0 0 320 420" preserveAspectRatio="xMidYMax meet"><g fill="none" stroke="#e8c27a" stroke-width="2">` +
    `<path d="M80 420V60C80 20 120 4 160 4s80 16 80 56v360"/><path d="M110 420V70h100v350"/><path d="M160 70V420"/>${chain}` +
    `<g transform="translate(160 36)">${rosette(20, 8, 'none', 'none', '#e8c27a')}</g></g><g fill="#e8c27a">${studs}</g></svg>`
}

const wrap = (cls: string, inner: string) => `<div class="amb amb-x amb-${cls}" aria-hidden="true">${inner}</div>`

/** Flower drawn as petals around a centre, for Suzani medallions and Tatar embroidery. */
function rosette(r: number, petals: number, fill: string, centre: string, ring?: string): string {
  let p = ''
  for (let k = 0; k < petals; k++) {
    const a = (k * 360) / petals
    p += `<ellipse cx="0" cy="${-r * 0.62}" rx="${r2(r * 0.22)}" ry="${r2(r * 0.36)}" transform="rotate(${a})" fill="${fill}"/>`
  }
  return (ring ? `<circle r="${r}" fill="none" stroke="${ring}" stroke-width="${r2(r * 0.05)}" stroke-dasharray="${r2(r * 0.12)} ${r2(r * 0.08)}"/>` : '') + p + `<circle r="${r2(r * 0.28)}" fill="${centre}"/>`
}

function tulip(fill: string, leaf: string): string {
  return `<path d="M0 30V2" stroke="${leaf}" stroke-width="2.2" fill="none"/><path d="M0 22C-10 18-14 8-12 2 -4 6 -1 14 0 22Z" fill="${leaf}"/><path d="M0 16C9 14 13 6 12 0 4 3 1 10 0 16Z" fill="${leaf}"/>` +
    `<path d="M0 4C-9 2-11-8-8-16-4-11-2-12 0-18 2-12 4-11 8-16 11-8 9 2 0 4Z" fill="${fill}"/><path d="M0 4C-4 0-4-8 0-14 4-8 4 0 0 4Z" fill="#ffffff" fill-opacity=".25"/>`
}

export function cultureAmbient(theme: ThemeId): string | null {
  switch (theme) {

    // ---------- Islamic art themes ----------
    case 'amethyst': {
      // Night of Cordoba: rows of double horseshoe arches with red-and-white voussoirs, under stars.
      const arch = (x: number) => {
        let v = ''
        for (let k = 0; k < 11; k++) {
          const a0 = Math.PI * (1.1 + k * 0.08), a1 = a0 + Math.PI * 0.08
          const p = (r: number, a: number) => `${r2(x + 40 + r * Math.cos(a))} ${r2(80 + r * Math.sin(a))}`
          v += `<path d="M${p(30, a0)}L${p(44, a0)}A44 44 0 0 1 ${p(44, a1)}L${p(30, a1)}A30 30 0 0 0 ${p(30, a0)}Z" fill="${k % 2 ? '#c8372d' : '#f2e6d0'}"/>`
        }
        return v + `<path d="M${x + 6} 200V96M${x + 74} 200V96" stroke="#e8d3a8" stroke-width="7"/>`
      }
      let row = ''
      for (let x = -40; x < 1240; x += 80) row += arch(x)
      return wrap('cordoba', `<div class="st">${dots(26, 's', 2)}</div><svg class="arcade" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice"><g opacity=".9">${row}</g></svg><div class="shade"></div>`)
    }
    case 'emerald': {
      // Emerald Mihrab: a great mihrab niche with muqarnas steps, and lamps glowing in it.
      let muq = ''
      for (let row = 0; row < 3; row++) for (let k = 0; k <= 6 - row * 2; k++) {
        const x = 200 - (6 - row * 2) * 18 + k * 36, y = 150 + row * 26
        muq += `<path d="M${x - 16} ${y + 22}Q${x - 16} ${y} ${x} ${y - 6}Q${x + 16} ${y} ${x + 16} ${y + 22}"/>`
      }
      let lamps = ''
      for (let i = 0; i < 5; i++) lamps += `<i class="lp" style="left:${20 + i * 15}%;--i:${i};animation-delay:-${i * 1.3}s"></i>`
      return wrap('mihrab', `<svg class="mih" viewBox="0 0 400 600" preserveAspectRatio="xMidYMax meet"><g fill="none" stroke="#86f3d4" stroke-width="1.6"><path d="M50 600V250C50 150 120 80 200 40 280 80 350 150 350 250V600"/><path d="M80 600V256C80 170 140 110 200 76 260 110 320 170 320 256V600"/>${muq}<path d="M20 600V230C20 120 110 40 200 6 290 40 380 120 380 230V600" stroke-opacity=".4"/></g></svg>${lamps}`)
    }
    case 'neon': {
      // Iznik: tulips, carnations and saz leaves on cobalt, swaying gently.
      const tul = `<g transform="translate(30 70)">${tulip('#e0453a', '#3fd0c9')}</g>`
      const carn = `<g transform="translate(30 40)"><path d="M0 40V0" stroke="#3fd0c9" stroke-width="2"/><path d="M-12 -2l4-10 4 6 4-10 4 10 4-6 4 10z" fill="#e0453a"/><path d="M-12-2h24c-2 6-8 8-12 8s-10-2-12-8z" fill="#ffffff" fill-opacity=".85"/></g>`
      const saz = `<path d="M6 76C10 40 30 14 56 4 46 30 30 56 6 76Z" fill="#3fd0c9" fill-opacity=".85"/><path d="M8 72C22 50 36 30 52 10" stroke="#0d2a6b" stroke-width="1.4" fill="none"/>`
      const spots = [[6, 66, 'a'], [18, 30, 'b'], [32, 74, 'c'], [64, 70, 'a'], [80, 26, 'c'], [92, 68, 'b'], [48, 18, 'b'], [72, 46, 'a']] as const
      let f = ''
      spots.forEach(([x, y, k], i) => {
        f += `<svg class="fl" style="left:${x}%;top:${y}%;--i:${i};animation-delay:-${i * 1.1}s" viewBox="0 0 60 110">${k === 'a' ? tul : k === 'b' ? carn : saz}</svg>`
      })
      return wrap('iznik', f)
    }
    case 'onyx': {
      // Gold Illumination: a shamsa (sunburst medallion) turning slowly, framed by an illuminated border.
      let rays = ''
      for (let k = 0; k < 48; k++) rays += `<path d="M0 -150L4 -108H-4Z" transform="rotate(${k * 7.5})"/>`
      let pet = ''
      for (let k = 0; k < 16; k++) pet += `<path d="M0 -104C14 -86 14 -66 0 -56C-14 -66 -14 -86 0 -104Z" transform="rotate(${k * 22.5})"/>`
      return wrap('shamsa', `<svg class="sh" viewBox="-160 -160 320 320"><g fill="#f2cd6b">${rays}</g><g fill="none" stroke="#f2cd6b" stroke-width="1.4">${pet}<circle r="108"/><circle r="52"/><path d="${star8(0, 0, 46, 0.62)}"/></g></svg><div class="frame"></div>`)
    }
    case 'rivals': {
      // Samarkand: tiled portals and ribbed blue domes, with a band of tile stars drifting by.
      const portal = (x: number, w: number) => `<path d="M${x} 200V${200 - w * 1.3}h${w}V200h-${w * 0.25}v-${w * 0.7}c0-${w * 0.3}-${w * 0.25}-${w * 0.45}-${w * 0.25}-${w * 0.45}s-${w * 0.25} ${w * 0.15}-${w * 0.25} ${w * 0.45}v${w * 0.7}Z" fill="#0b1638"/>`
      const dome = (x: number, w: number) => `<path d="M${x} 200V${200 - w * 0.9}h${w}V200Z" fill="#0b1638"/><path d="M${x - 6} ${200 - w * 0.9}C${x - 6} ${200 - w * 1.6} ${x + w / 2} ${200 - w * 1.8} ${x + w / 2} ${200 - w * 1.85}C${x + w / 2} ${200 - w * 1.8} ${x + w + 6} ${200 - w * 1.6} ${x + w + 6} ${200 - w * 0.9}Z" fill="#1d6fd6"/>`
      const row = dome(60, 90) + portal(220, 140) + portal(520, 160) + portal(860, 140) + dome(1050, 90)
      return wrap('samarkand', `<div class="tiles"></div><svg class="row" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice">${row}</svg>`)
    }
    case 'ember': {
      // Ottoman Tulip: tulips and carnations rising slowly on warm air.
      let f = ''
      for (let i = 0; i < 12; i++) {
        const inner = i % 3 === 2 ? `<g transform="translate(30 40)"><path d="M-12 -2l4-10 4 6 4-10 4 10 4-6 4 10z" fill="#ff8a3d"/><path d="M-12-2h24c-2 6-8 8-12 8s-10-2-12-8z" fill="#ffd27a"/></g>` : `<g transform="translate(30 50) scale(.8)">${tulip(i % 2 ? '#ff5a3c' : '#ffb04a', '#7a3a1a')}</g>`
        f += `<svg class="up" style="left:${(i * 37 + 5) % 100}%;--i:${i};animation-duration:${18 + ((i * 5) % 12)}s;animation-delay:-${(i * 2.4) % 18}s" viewBox="0 0 60 80">${inner}</svg>`
      }
      return wrap('tulip', `<div class="warm"></div>${f}`)
    }

    // ---------- prayer times ----------
    case 'fajr':
      return wrap('fajr', `<div class="sky"></div><div class="hz"></div><div class="st">${dots(30, 's')}</div>${crescent('#fff3e0')}${skyline('#120f2e')}`)
    case 'duha':
      return wrap('duha', `<div class="sky"></div><div class="sun"><span class="rays"></span><span class="disc"></span></div>${clouds(5)}<div class="glint">${dots(16, 'g', 3)}</div>`)
    case 'zuhr':
      return wrap('zuhr', `<div class="sky"></div><div class="sun"><span class="rays"></span><span class="disc"></span></div>${clouds(4)}<div class="haze"></div>`)
    case 'asr':
      return wrap('asr', `<div class="sky"></div><div class="beam b1"></div><div class="beam b2"></div><div class="beam b3"></div><div class="sun"><span class="disc"></span></div><div class="mote">${dots(28, 'm', 5)}</div>${skyline('#2a1606')}`)
    case 'maghrib':
      return wrap('maghrib', `<div class="sky"></div><div class="sun"><span class="disc"></span></div><div class="bands"></div><div class="flock">${birds(5)}</div><div class="st">${dots(10, 's', 2)}</div>${skyline('#1c0a24')}`)
    case 'isha': {
      let shoot = ''
      for (let i = 0; i < 3; i++) shoot += `<i class="sh" style="--i:${i};top:${8 + i * 14}%;left:${20 + i * 25}%;animation-delay:-${i * 4.3}s"></i>`
      return wrap('isha', `<div class="sky"></div><div class="st">${dots(70, 's', 1)}</div>${shoot}${crescent('#eef2ff')}${skyline('#030718')}`)
    }
    case 'qiyam': {
      const lamp =
        `<svg class="lamp" viewBox="0 0 80 220"><path d="M40 0V92" stroke="#f2d27a" stroke-opacity=".55" stroke-width="1.2"/>` +
        `<path d="M28 92h24l-4 10H32z" fill="#f2d27a"/><path d="M22 102h36c0 22-8 40-18 48-10-8-18-26-18-48z" fill="rgba(255,233,176,.18)" stroke="#f2d27a" stroke-width="1.5"/>` +
        `<path d="M40 106v40M30 108c0 16 4 28 10 36M50 108c0 16-4 28-10 36" stroke="#f2d27a" stroke-opacity=".5" stroke-width=".8" fill="none"/>` +
        `<ellipse class="flame" cx="40" cy="128" rx="4" ry="7" fill="#fff1c4"/><path d="M34 150h12l-2 6h-8z" fill="#f2d27a"/></svg>`
      const arch = `<svg class="arch" viewBox="0 0 400 600" preserveAspectRatio="xMidYMax meet"><path d="M40 600V260C40 140 120 60 200 20 280 60 360 140 360 260V600" fill="none" stroke="#f2d27a" stroke-width="2"/><path d="M70 600V270C70 165 140 95 200 60 260 95 330 165 330 270V600" fill="none" stroke="#f2d27a" stroke-width="1"/></svg>`
      return wrap('qiyam', `<div class="sky"></div><div class="st">${dots(24, 's', 4)}</div>${arch}<div class="halo"></div>${lamp}`)
    }

    // ---------- Muslim cultures ----------
    case 'mughal': {
      // A marble jali screen with light moving behind it, and rose petals drifting down.
      let cell = star8(30, 30, 16, 0.62) + star8(30, 30, 8, 0.62) + 'M30 14V0M30 46V60M14 30H0M46 30H60M18.7 18.7L8 8M41.3 18.7L52 8M18.7 41.3L8 52M41.3 41.3L52 52'
      cell = `<path d="${cell}"/>`
      let pet = ''
      for (let i = 0; i < 14; i++) pet += `<i class="${i % 3 ? 'pt' : 'lf'}" style="left:${(i * 41 + 9) % 100}%;--i:${i};animation-duration:${16 + ((i * 5) % 10)}s;animation-delay:-${r2((i * 2.3) % 16)}s"></i>`
      return wrap('mughal', `<div class="light"></div><svg class="jali" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"><defs><pattern id="gg-jali" width="60" height="60" patternUnits="userSpaceOnUse"><g fill="none" stroke="#f5efe6" stroke-width="1.6">${cell}</g></pattern></defs><rect width="600" height="600" fill="url(#gg-jali)"/></svg><div class="petals">${pet}</div>`)
    }
    case 'sahel': {
      // A Sahel mud mosque (as at Djenne) with its toron beams, Hausa mosque-wall relief arabesques, and a hot sun.
      const towers = [
        [300, 40], [380, 10], [460, 40], [560, 30], [640, 0], [720, 30], [820, 40], [900, 10],
      ]
      let d = 'M200 120V70H300'
      for (const [x, t] of towers) d += `V${t + 30}h4v-8h8v-${12}h4v${12}h8v8h4V70H${x + 60}`
      d += 'V70H1000V120Z'
      let tor = ''
      for (let x = 210; x < 1000; x += 26) tor += `M${x} ${84 + ((x / 26) % 2) * 14}h-10`
      return wrap('sahel', `<div class="sun"></div><div class="relief"></div><svg class="mosque" viewBox="0 0 1200 120" preserveAspectRatio="xMidYMax slice"><path d="${d}" fill="#1a1008"/><path d="${tor}" stroke="#1a1008" stroke-width="3"/></svg><div class="heat"></div>`)
    }
    case 'swahili': {
      // A dhow with a lateen sail crossing a warm sea, with rolling waves.
      const dhow = `<svg class="dhow" viewBox="0 0 120 100"><path d="M10 78h96l-12 14H24z" fill="#2b1a0e"/><path d="M58 78V8" stroke="#2b1a0e" stroke-width="2.5"/><path d="M58 10L20 70H96Z" fill="#f2e2c4" fill-opacity=".9"/><path d="M58 10L20 70" stroke="#2b1a0e" stroke-width="2"/></svg>`
      const wave = (c: string, o: number, y: number, dur: number) =>
        `<svg class="wv" style="bottom:${y}%;animation-duration:${dur}s" viewBox="0 0 1200 60" preserveAspectRatio="none"><path d="M0 30Q75 10 150 30T300 30T450 30T600 30T750 30T900 30T1050 30T1200 30V60H0Z" fill="${c}" fill-opacity="${o}"/></svg>`
      return wrap('swahili', `<div class="sky"></div><div class="sun"></div><div class="zidaka"></div>${swahiliDoor()}${dhow}${wave('#0d4a5c', 0.9, 6, 18)}${wave('#0a3a49', 0.95, 2, 13)}${wave('#062b37', 1, -2, 9)}<div class="spark">${dots(14, 'g', 6)}</div>`)
    }
    case 'nusantara':
      // Songket: a gold diamond weave with a light sweeping across, and bamboo-shoot (pucuk rebung) borders.
      return wrap('nusantara', `<div class="weave"></div><div class="sheen"></div><div class="band top"></div>${demakRow()}`)
    case 'zellige': {
      // Zellige tilework: coloured eight-point stars, turning very slowly, with glints.
      const cell =
        `<path d="${star8(40, 40, 20, 0.7)}" fill="#f2f0e6" fill-opacity=".9"/><path d="${star8(40, 40, 11, 0.7)}" fill="#2b6fd6"/>` +
        `<path d="${star8(0, 0, 13, 0.7)}${star8(80, 0, 13, 0.7)}${star8(0, 80, 13, 0.7)}${star8(80, 80, 13, 0.7)}" fill="#11704f"/>` +
        `<path d="M40 20L40 0M40 60L40 80M20 40H0M60 40H80" stroke="#f2f0e6" stroke-opacity=".5" stroke-width="1.5"/>`
      return wrap('zellige', `<svg class="tess" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice"><defs><pattern id="gg-zel" width="80" height="80" patternUnits="userSpaceOnUse">${cell}</pattern></defs><rect x="-400" y="-400" width="1600" height="1600" fill="url(#gg-zel)"/></svg><div class="glints">${dots(14, 'g', 8)}</div>`)
    }
    case 'suzani': {
      // Suzani embroidery: large sun-medallions slowly turning, joined by vines.
      const spots = [[14, 24, 90], [84, 20, 70], [50, 78, 110], [10, 82, 60], [90, 76, 80]]
      let m = ''
      spots.forEach(([x, y, r], i) => {
        m += `<svg class="med" style="left:${x}%;top:${y}%;width:${r * 2}px;height:${r * 2}px;--i:${i};animation-duration:${80 + i * 20}s;animation-direction:${i % 2 ? 'reverse' : 'normal'}" viewBox="${-r} ${-r} ${2 * r} ${2 * r}">` +
          rosette(r * 0.98, 12, '#b8263a', '#e2a33c', '#f3d9a4') + `<g transform="scale(.5)">${rosette(r, 8, '#f3d9a4', '#3a1420')}</g></svg>`
      })
      return wrap('suzani', `${bukharaRow()}<svg class="vine" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M14 24C35 10 60 40 84 20M14 24C10 50 30 70 50 78M84 20C95 45 70 65 50 78M10 82C25 90 40 70 50 78M90 76C75 90 60 72 50 78" fill="none" stroke="#3fa36b" stroke-width=".35" stroke-opacity=".6"/></svg>${m}`)
    }
    case 'bosnia':
      // Bosnian kilim: woven bands of stepped diamonds drifting in opposite directions.
      return wrap('bosnia', `<div class="glow"></div><div class="kb k1"></div><div class="kb k2"></div>${bosniaRow()}`)
    case 'tatar': {
      // Tatar gold-and-silk embroidery: tulips and roses blooming and fading across green velvet.
      const spots = [[10, 20], [26, 70], [44, 14], [62, 82], [80, 30], [92, 74], [6, 52], [70, 52], [36, 44]]
      let f = ''
      spots.forEach(([x, y], i) => {
        const inner = i % 2 ? `<g transform="translate(30 30)">${rosette(16, 6, '#e05a6b', '#e9c46a', '#e9c46a')}</g>` : `<g transform="translate(30 40)">${tulip(i % 4 ? '#e05a6b' : '#e9c46a', '#5fbf86')}</g>`
        f += `<svg class="fl" style="left:${x}%;top:${y}%;--i:${i};animation-delay:-${i * 1.7}s" viewBox="0 0 60 80">${inner}</svg>`
      })
      return wrap('tatar', `<div class="velvet"></div>${f}${tatarRow()}<div class="gold">${dots(22, 'g', 9)}</div>`)
    }
    case 'kubachi': {
      // Kubachi engraved silver: spiral scrollwork with a light sweeping across, as on polished metal.
      const s = 'M30 30m-12 0a12 12 0 1 1 24 0a8 8 0 1 1-16 0a4 4 0 1 1 8 0 M0 30h6 M54 30h6 M30 0v6 M30 54v6 M8 8c6 2 8 6 8 10 M52 52c-6-2-8-6-8-10 M52 8c-2 6-6 8-10 8 M8 52c2-6 6-8 10-8'
      return wrap('kubachi', `<svg class="scroll" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"><defs><pattern id="gg-kub" width="60" height="60" patternUnits="userSpaceOnUse"><path d="${s}" fill="none" stroke="#e3e6ec" stroke-width="1"/></pattern></defs><rect width="600" height="600" fill="url(#gg-kub)"/></svg><div class="polish"></div>`)
    }
    case 'hui': {
      // Hui lacquer: auspicious gold clouds drifting, and lotus flowers floating gently.
      const cloud = `<path d="M10 40c-8 0-8-12 0-12 0-10 14-12 18-4 4-10 20-8 20 2 8-2 12 8 4 12H10z" fill="none" stroke="#f2c14e" stroke-width="2"/><path d="M18 34c0-4 6-4 6 0M34 30c0-5 8-5 8 0" fill="none" stroke="#f2c14e" stroke-width="1.5"/>`
      let c = ''
      for (let i = 0; i < 6; i++) c += `<svg class="cl" style="top:${6 + ((i * 15) % 60)}%;--i:${i};animation-duration:${60 + i * 17}s;animation-delay:-${i * 19}s" viewBox="0 0 60 44">${cloud}</svg>`
      const lotus = `<path d="M30 40C18 38 10 30 8 20 16 22 24 28 30 40Z M30 40C42 38 50 30 52 20 44 22 36 28 30 40Z" fill="#f29aa0"/><path d="M30 40C22 32 22 18 30 6 38 18 38 32 30 40Z" fill="#ffc2c4"/><path d="M4 42h52" stroke="#3fa36b" stroke-width="2"/>`
      let l = ''
      for (let i = 0; i < 4; i++) l += `<svg class="lo" style="left:${8 + i * 26}%;--i:${i};animation-delay:-${i * 1.9}s" viewBox="0 0 60 46">${lotus}</svg>`
      return wrap('hui', `<div class="lattice"></div>${c}${huiRow()}${l}`)
    }
  }
  return null
}
