/**
 * Category icons: one line drawing per built-in category, in a 48 x 48 box.
 * Colours come from CSS tokens (--ci-*) set per theme in index.css, so the same
 * markup suits every theme. Fixed strings with no user input, so safe to inject.
 */

const f2 = (n: number) => +n.toFixed(2)
const dot = (x: number, y: number, w = 5) => `<path d="M${x} ${y}h0" stroke-width="${w}"/>`

function star8(cx: number, cy: number, r: number, rot = 0) {
  const p: string[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2 + rot
    const rr = k % 2 ? r * 0.7654 : r
    p.push(f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a)))
  }
  return 'M' + p.join(' L') + 'Z'
}

// Turn sampled points into a path, starting a new subpath whenever keep() is false.
type Pt = [number, number]
function samples(pts: Pt[], keep: (x: number, y: number) => boolean) {
  let d = ''
  let on = false
  for (const [x, y] of pts) {
    if (keep(x, y)) { d += (on ? 'L' : 'M') + f2(x) + ' ' + f2(y); on = true } else on = false
  }
  return d
}

function saturn() {
  const cx = 23, cy = 25, r = 10.5, rx = 19, ry = 5.6, tilt = (-18 * Math.PI) / 180
  const ring: [number, number, boolean][] = []
  for (let i = 0; i <= 240; i++) {
    const t = (i / 240) * Math.PI * 2
    const x0 = rx * Math.cos(t), y0 = ry * Math.sin(t)
    ring.push([cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt), Math.sin(t) > 0])
  }
  let d = ''
  let on = false
  for (const [x, y, front] of ring) {
    const inside = Math.hypot(x - cx, y - cy) < r + 2
    if (front || !inside) { d += (on ? 'L' : 'M') + f2(x) + ' ' + f2(y); on = true } else on = false
  }
  // Break the planet outline where the front of the ring crosses it.
  const front = ring.filter((p) => p[2])
  const circ: Pt[] = []
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2
    circ.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
  }
  const planet = samples(circ, (x, y) => !front.some(([fx, fy]) => Math.hypot(fx - x, fy - y) < 2.4))
  return `<path d="${planet}"/><path d="${d}"/>` +
    `<path d="M40 6.5c.4 2.6 1.2 3.4 3.8 3.8-2.6.4-3.4 1.2-3.8 3.8-.4-2.6-1.2-3.4-3.8-3.8 2.6-.4 3.4-1.2 3.8-3.8z" stroke-width="1.6"/>` +
    dot(8, 9, 3) + dot(42, 40, 3)
}

function football() {
  const c = 24, R = 17, p = 6.2
  const v = (r: number, k: number): Pt => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return [c + r * Math.cos(a), c + r * Math.sin(a)] }
  let pent = ''
  for (let k = 0; k < 5; k++) pent += (k ? 'L' : 'M') + v(p, k).map(f2).join(' ')
  let spokes = ''
  for (let k = 0; k < 5; k++) { const [a, b] = v(p, k); const [x, y] = v(11.5, k); spokes += `M${f2(a)} ${f2(b)}L${f2(x)} ${f2(y)}` }
  // Small seams from each spoke end out to the rim.
  let seams = ''
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
    const [x, y] = v(11.5, k)
    for (const s of [-1, 1]) {
      const b = a + s * 0.42
      seams += `M${f2(x)} ${f2(y)}L${f2(c + R * Math.cos(b))} ${f2(c + R * Math.sin(b))}`
    }
  }
  return `<circle cx="24" cy="24" r="${R}"/><path d="${pent}Z" stroke-linejoin="round"/><path d="${spokes}${seams}"/>`
}

function atom() {
  let s = ''
  for (const a of [0, 60, 120]) s += `<ellipse cx="24" cy="24" rx="18" ry="6.6" transform="rotate(${a} 24 24)"/>`
  return s + dot(24, 24, 6.5)
}

function lattice() {
  const P: Record<string, Pt> = { t: [24, 6.5], ur: [39.5, 15.5], lr: [39.5, 33], b: [24, 42], ll: [8.5, 33], ul: [8.5, 15.5], c: [24, 24.5] }
  const L = (a: string, b: string) => `M${P[a][0]} ${P[a][1]}L${P[b][0]} ${P[b][1]}`
  const lines = L('t', 'ur') + L('ur', 'lr') + L('lr', 'b') + L('b', 'll') + L('ll', 'ul') + L('ul', 't') + L('c', 'ul') + L('c', 'ur') + L('c', 'b')
  return `<path d="${lines}" stroke-linejoin="round"/>` + Object.values(P).map(([x, y]) => dot(x, y, 6)).join('')
}

function mesh() {
  const n: Pt[] = [[24, 7], [40, 19], [34, 39], [14, 39], [8, 19]]
  let d = ''
  for (let i = 0; i < 5; i++) { const a = n[i], b = n[(i + 1) % 5]; d += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M24 24.5L${a[0]} ${a[1]}` }
  return `<path d="${d}" stroke-width="1.6"/>` + n.map(([x, y]) => dot(x, y, 6.5)).join('') + dot(24, 24.5, 9)
}

function tree() {
  const N: Pt[] = [[24, 8], [13.5, 23], [34.5, 23], [7.5, 39], [19.5, 39], [28.5, 39], [40.5, 39]]
  const E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]
  const d = E.map(([a, b]) => `M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`).join('')
  return `<path d="${d}"/>` + N.map(([x, y], i) => dot(x, y, i ? 6.5 : 8)).join('')
}

const GLYPHS: Record<string, () => string> = {
  // Engineering
  circuits: () => `<circle cx="7" cy="24" r="3"/><circle cx="41" cy="24" r="3"/><path d="M10 24h4l2.5-7 5 14 5-14 5 14 2.5-7h4" stroke-linejoin="round"/>`,
  engineers: () => `<path d="M18.5 32.5c0-4.5-6.5-7.5-6.5-14a12 12 0 0 1 24 0c0 6.5-6.5 9.5-6.5 14z" stroke-linejoin="round"/><path d="M19 37h10M21 41.5h6M20.5 27l3.5-6.5 3.5 6.5"/><path d="M24 1.5v2.5M8 7.5l1.8 1.8M40 7.5l-1.8 1.8M3.5 19h2.5M42 19h2.5" stroke-width="1.6"/>`,
  statics: () => `<path d="M4 34h40M9 34l7-13h16l7 13M16 21l4.5 13 3.5-13 3.5 13 4.5-13" stroke-linejoin="round"/><path d="M9 34l-3.5 6.5h7zM39 34l-3.5 6.5h7z" stroke-linejoin="round"/>`,
  thermo: () => `<path d="M18 30.5V10a4 4 0 0 1 8 0v20.5a7 7 0 1 1-8 0z"/><path d="M22 16v17"/>${dot(22, 36.2, 6)}<path d="M31 11h4M31 16h4M31 21h4M31 26h2.5" stroke-width="1.8"/>`,
  fluids: () => `<path d="M24 5.5c6.5 9.5 12.5 15.5 12.5 22.5a12.5 12.5 0 0 1-25 0c0-7 6-13 12.5-22.5z" stroke-linejoin="round"/><path d="M16.5 28c2.5-1.7 5-1.7 7.5 0s5 1.7 7.5 0M19 34c1.7-1.2 3.3-1.2 5 0s3.3 1.2 5 0"/>`,
  materials: lattice,
  dynamics: () => `<path d="M13 6.5h22"/><path d="M24 6.5L31.6 28" /><circle cx="33.4" cy="33.2" r="5.5"/><path d="M24 6.5L16.4 28" opacity=".38"/><circle cx="14.6" cy="33.2" r="5.5" opacity=".38"/><path d="M12 43c8 2.4 16 2.4 24 0" stroke-width="1.6" stroke-dasharray="2.2 3"/>`,
  power: () => `<path d="M24 5L15 43M24 5l9 38M10 13h28M13.5 21h21M19.3 25l11.8 10M28.7 25L16.9 35M12 43h24" stroke-linejoin="round"/><path d="M10 13v3.5M38 13v3.5M13.5 21v3.5M34.5 21v3.5" stroke-width="1.8"/>`,
  civil: () => `<path d="M12 42V9.5M17 42V9.5M12 14l5 5-5 5 5 5-5 5 5 5M5 9.5h37M14.5 3.5L12 9.5M14.5 3.5L17 9.5M14.5 3.5L41 9.5M7 42h15" stroke-linejoin="round"/><rect x="5" y="9.5" width="5" height="4.5" rx=".5"/><path d="M35 9.5v14"/><rect x="30" y="23.5" width="10" height="7.5" rx="1"/>`,
  math: () => `<path d="M24.5 7c-4.5-2-8.2.2-8.7 5.5L13.2 35c-.6 5.3-4.2 7.5-8.7 5.5"/><path d="M22 26c2.2-6 4.4-6 6.6 0s4.4 6 6.6 0 4.4-6 6.6 0"/><path d="M21 33.5h21" stroke-width="1.6" opacity=".55"/>`,
  // CCES
  micro: () => `<rect x="13" y="13" width="22" height="22" rx="2.5"/><rect x="19" y="19" width="10" height="10" rx="1" stroke-width="1.6"/>${dot(16.5, 16.5, 2.6)}<path d="M18 13V6.5M24 13V6.5M30 13V6.5M18 35v6.5M24 35v6.5M30 35v6.5M13 18H6.5M13 24H6.5M13 30H6.5M35 18h6.5M35 24h6.5M35 30h6.5"/>`,
  logicdesign: () => `<path d="M4 20h5v-9h8v9h8v-9h8v9h8v-9h3" stroke-linejoin="round"/><path d="M4 38h9v-9h12v9h12v-9h7" stroke-linejoin="round"/><path d="M9 6v36M33 6v36" stroke-width="1.4" stroke-dasharray="2 2.6" opacity=".5"/>`,
  code: () => `<path d="M16 13L6 24l10 11M32 13l10 11-10 11M27.5 8l-7 32" stroke-linejoin="round"/>`,
  dsa: tree,
  databases: () => `<ellipse cx="24" cy="10.5" rx="14" ry="5"/><path d="M10 10.5v27c0 2.8 6.3 5 14 5s14-2.2 14-5v-27M10 19.5c0 2.8 6.3 5 14 5s14-2.2 14-5M10 28.5c0 2.8 6.3 5 14 5s14-2.2 14-5"/>`,
  networks: mesh,
  os: () => `<rect x="5.5" y="8.5" width="37" height="31" rx="3.5"/><path d="M5.5 15.5h37"/>${dot(10.5, 12, 2.6)}${dot(14.5, 12, 2.6)}${dot(18.5, 12, 2.6)}<path d="M12 23l5 4-5 4M21 31.5h9" stroke-linejoin="round"/>`,
  cyber: () => `<path d="M24 4.5l15.5 5.5v11.5c0 10-6.6 17-15.5 21.5-8.9-4.5-15.5-11.5-15.5-21.5V10z" stroke-linejoin="round"/><rect x="17.5" y="22" width="13" height="10" rx="1.6"/><path d="M20.2 22v-3.2a3.8 3.8 0 0 1 7.6 0V22M24 25.6v2.8"/>`,
  ai: () => `<path d="M21 6c1.1 8.4 4.6 11.9 13 13-8.4 1.1-11.9 4.6-13 13-1.1-8.4-4.6-11.9-13-13 8.4-1.1 11.9-4.6 13-13z" stroke-linejoin="round"/><path d="M36 28.5c.6 3.8 1.7 4.9 5.5 5.5-3.8.6-4.9 1.7-5.5 5.5-.6-3.8-1.7-4.9-5.5-5.5 3.8-.6 4.9-1.7 5.5-5.5z" stroke-linejoin="round"/>${dot(12, 39, 4)}`,
  softeng: () => `<path d="M14 9v30M34 13v4c0 8.5-20 7-20 16"/>${dot(14, 8.5, 7.5)}${dot(14, 39.5, 7.5)}${dot(34, 12.5, 7.5)}${dot(14, 24, 4.5)}`,
  digital: () => `<path d="M15 8h6a16 16 0 0 1 0 32h-6z" stroke-linejoin="round"/><path d="M4.5 16H15M4.5 32H15M37 24h7"/>${dot(4.5, 16, 4.5)}${dot(4.5, 32, 4.5)}${dot(44, 24, 4.5)}`,
  discrete: () => `<circle cx="18" cy="24" r="12.5"/><circle cx="30" cy="24" r="12.5"/><path d="M24 14.6c2.8 2.4 4.3 5.7 4.3 9.4s-1.5 7-4.3 9.4c-2.8-2.4-4.3-5.7-4.3-9.4s1.5-7 4.3-9.4z" stroke-width="0" fill="currentColor" opacity=".35"/>`,
  // General
  animals: () => `<path d="M24 25.5c-5.2 0-10.5 6.4-10.5 11 0 3 2.3 4.7 5 4.7 2 0 3.5-1 5.5-1s3.5 1 5.5 1c2.7 0 5-1.7 5-4.7 0-4.6-5.3-11-10.5-11z" stroke-linejoin="round"/><ellipse cx="11.5" cy="21.5" rx="3.4" ry="4.4" transform="rotate(-28 11.5 21.5)"/><ellipse cx="36.5" cy="21.5" rx="3.4" ry="4.4" transform="rotate(28 36.5 21.5)"/><ellipse cx="18.5" cy="12" rx="3.6" ry="4.7" transform="rotate(-10 18.5 12)"/><ellipse cx="29.5" cy="12" rx="3.6" ry="4.7" transform="rotate(10 29.5 12)"/>`,
  arabworld: () => `<path d="M10 42V23c0-8 6-13.5 14-18 8 4.5 14 10 14 18v19M16 42V25c0-5 3.3-8.6 8-11.5 4.7 2.9 8 6.5 8 11.5v17M5 42h38" stroke-linejoin="round"/><path d="${star8(24, 29, 4.3)}" stroke-width="1.5" stroke-linejoin="round"/>`,
  body: () => `<path d="M24 40.5S6.5 30.5 6.5 18.5A8.7 8.7 0 0 1 24 14.6a8.7 8.7 0 0 1 17.5 3.9c0 12-17.5 22-17.5 22z" stroke-linejoin="round"/><path d="M11 25h6.5l2.8-5.5 4.2 11 3-6.5H37" stroke-linejoin="round"/>`,
  food: () => `<path d="M6.5 23h35c0 8.6-7.6 15-17.5 15S6.5 31.6 6.5 23z" stroke-linejoin="round"/><path d="M17.5 42h13"/><path d="M17 18c-2-2.4 2-4.6 0-7M24 18c-2-2.4 2-4.6 0-7.5M31 18c-2-2.4 2-4.6 0-7" stroke-width="1.8"/>`,
  geography: () => `<circle cx="24" cy="24" r="17.5"/><ellipse cx="24" cy="24" rx="7.6" ry="17.5"/><path d="M6.5 24h35M9.3 14.8h29.4M9.3 33.2h29.4" stroke-width="1.6"/>`,
  history: () => `<path d="M6.5 11.5h35L24 4.5z" stroke-linejoin="round"/><path d="M9.5 15.5h29M14 15.5v20.5M20.7 15.5v20.5M27.3 15.5v20.5M34 15.5v20.5M9.5 36h29M6.5 41h35"/>`,
  saudi: () => `<path d="M24 3.5v3"/><path d="M19.2 11.5c0-2.8 2.1-4.6 4.8-4.6s4.8 1.8 4.8 4.6z" stroke-linejoin="round"/><path d="M20 11.5l-.8 6.5h9.6l-.8-6.5" stroke-linejoin="round"/><path d="M19.2 18c-5.2 3-8.2 9-8.2 16.2 0 2.9.9 5 2 6.3h22c1.1-1.3 2-3.4 2-6.3 0-7.2-3-13.2-8.2-16.2" stroke-linejoin="round"/><path d="M12.3 31.5C7.6 28.6 6 20.5 3 13.8l3.6.6c1.9 5 4.2 9.6 7.6 11.6" stroke-linejoin="round"/><path d="M35.5 23c3.5-.3 5.5 2.4 5 5.8-.4 3-2.2 5.2-4.2 6.4" /><path d="M10.5 43.5h27"/>`,
  science: atom,
  space: saturn,
  sports: football,
  words: () => `<path d="M24 12.5c-4.4-3-10.4-4.2-17.5-3.2v28c7.1-1 13.1.2 17.5 3.2 4.4-3 10.4-4.2 17.5-3.2v-28c-7.1-1-13.1.2-17.5 3.2zM24 12.5v27.5" stroke-linejoin="round"/><path d="M11 16.3c3-.3 6 .1 8.8 1.2M11 22.3c3-.3 6 .1 8.8 1.2M11 28.3c3-.3 6 .1 8.8 1.2M28.2 17.5c2.8-1.1 5.8-1.5 8.8-1.2M28.2 23.5c2.8-1.1 5.8-1.5 8.8-1.2" stroke-width="1.6"/>`,
  riddles: () => `<path d="M8 16h10a5 5 0 1 1 10 0h10v9a5 5 0 1 1 0 10v8H8z" stroke-linejoin="round"/>`,
  weird: () => `<path d="M12 15a6.5 6.5 0 1 1 9.6 5.7c-2.1 1.2-3.1 2.6-3.1 5v2.3"/>${dot(18.5, 36, 5)}<path d="M33 8v20"/>${dot(33, 36, 5)}`,
  sayings: () => `<path d="M9 9h30a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H22l-9 7v-7H9a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" stroke-linejoin="round"/>${dot(15, 21.5, 4.5)}${dot(24, 21.5, 4.5)}${dot(33, 21.5, 4.5)}`,
  mathpuzzles: () => `<path d="M14 8v12M8 14h12M28 14h12M9 29l10 10M19 29L9 39M28 31h12M28 37h12"/>`,
  inventions: () => `<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="4.5"/><path d="M37 24h3M33.2 33.2l2.1 2.1M24 37v3M14.8 33.2l-2.1 2.1M11 24H8M14.8 14.8l-2.1-2.1M24 11V8M33.2 14.8l2.1-2.1" stroke-width="5.5" stroke-linecap="butt"/>`,
  cars: () => `<path d="M9.5 33H5v-8l5.5-2 6-8.5h14l7 8.5 6 2v8h-4.5M18.5 33h11" stroke-linejoin="round"/><path d="M17.5 22.5h13" stroke-width="1.6"/><circle cx="14" cy="33" r="4.5"/><circle cx="34" cy="33" r="4.5"/>`,
  gaming: () => `<path d="M15 14h18c6 0 9 6.5 10 15.5.5 5-4 7.5-7.5 4L32 30H16l-3.5 3.5c-3.5 3.5-8 1-7.5-4C6 20.5 9 14 15 14z" stroke-linejoin="round"/><path d="M15.5 19v7.5M11.75 22.75h7.5"/>${dot(31, 21, 4.5)}${dot(36, 25.5, 4.5)}`,
  records: () => `<path d="M15 7h18v10a9 9 0 0 1-18 0z" stroke-linejoin="round"/><path d="M15 10H9c0 6 3 9.5 7 10M33 10h6c0 6-3 9.5-7 10M24 26v7M17 41h14M19.5 41l1-8h7l1 8" stroke-linejoin="round"/>`,
  flags: () => `<path d="M10 43V6"/><path d="M10 8c6-3 11-3 16 0s10 3 14 0v18c-4 3-9 3-14 0s-10-3-16 0" stroke-linejoin="round"/>`,
  custom: () => `<path d="M17.5 17.5a6.5 6.5 0 1 1 9.6 5.7c-2.1 1.2-3.1 2.6-3.1 5v2.3"/>${dot(24, 37, 5)}<circle cx="24" cy="24" r="19" stroke-width="1.6" opacity=".5"/>`,
}

/** A five-point star outline, for the themed nights tile. */
function star5(cx: number, cy: number, r: number) {
  const p: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return `M${p.join('L')}z`
}

/** Themed nights (game modes) use keys "night-<id>"; "nights" is the folded list itself. */
Object.assign(GLYPHS, {
  nights: () => `<path d="M7 14h34v6a4 4 0 0 0 0 8v6H7v-6a4 4 0 0 0 0-8z" stroke-linejoin="round"/><path d="M17 16v3M17 23v2M17 29v3" stroke-width="1.8"/><path d="${star5(29.5, 24, 6)}" stroke-width="1.8" stroke-linejoin="round"/>`,
  'night-eng-vs-cces': () => `<circle cx="13" cy="24" r="6"/><circle cx="13" cy="24" r="2" stroke-width="1.6"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${(13 + 7.5 * Math.cos(r)).toFixed(1)} ${(24 + 7.5 * Math.sin(r)).toFixed(1)}L${(13 + 10 * Math.cos(r)).toFixed(1)} ${(24 + 10 * Math.sin(r)).toFixed(1)}" stroke-width="3"/>` }).join('')}<path d="M31 16l-6 8 6 8M37 16l6 8-6 8" stroke-linejoin="round"/>`,
  'night-fun-night': () => `<path d="M7 42l9-23 14 14z" stroke-linejoin="round"/><path d="M12 30l6 6" stroke-width="1.6"/><path d="M25 12c2 2-1 4 1 6M35 26c2-1 4 1 6-1M31 8l2 3M41 15l-3 1"/>${dot(36, 18, 4.5)}${dot(28, 25, 4.5)}${dot(42, 33, 4.5)}`,
  'night-builders': () => `<path d="M11 33c0-8.5 5.5-14.5 13-14.5S37 24.5 37 33" stroke-linejoin="round"/><path d="M20 19.5V15h8v4.5M24 15v18" stroke-linejoin="round"/><rect x="5.5" y="33" width="37" height="5" rx="2.5"/>`,
  'night-code-night': () => `<rect x="5.5" y="8.5" width="37" height="31" rx="4"/><path d="M5.5 15.5h37" stroke-width="1.6"/><path d="M13 23l5 4.5-5 4.5M22 33h10" stroke-linejoin="round"/>`,
  'night-picture-night': () => `<rect x="5.5" y="8.5" width="37" height="31" rx="3"/><path d="M6 34l11-11 8 8 5-5 12 12" stroke-linejoin="round"/><circle cx="32" cy="18" r="3.5"/>`,
  'night-arabia': () => `<path d="M24 42c-.6-7.5-1.2-14.5 0-22"/><path d="M24 20c-4-5.5-10.5-6.5-16-3.5M24 20c4-5.5 10.5-6.5 16-3.5M24 20c-6-.5-11.5 3-13.5 9M24 20c6-.5 11.5 3 13.5 9M24 20c-1-5 .5-9.5 4-13" stroke-linejoin="round"/><path d="M13 42h22"/>`,
  'night-brain-night': () => `<path d="M17 31c-4-3-6.5-7-6.5-11.5a13.5 13.5 0 0 1 27 0c0 4.5-2.5 8.5-6.5 11.5v3.5H17z" stroke-linejoin="round"/><path d="M18 38.5h12M20.5 42.5h7"/><path d="M21 31v-6l3 3 3-3v6" stroke-width="1.6" stroke-linejoin="round"/>`,
} satisfies Record<string, () => string>)

/** The icon id for a themed night: its own drawing when there is one, else the general nights ticket. */
export function nightIconId(id: string): string {
  return glyphKey(`night-${id}`) ? `night-${id}` : 'nights'
}

/** Built-in ids that share a drawing with another id. */
const ALIAS: Record<string, string> = { engmath: 'math' }

/** The drawing name for an id. Own keys only, so ids like "constructor" never match. */
function glyphKey(id: string): string | undefined {
  const k = Object.prototype.hasOwnProperty.call(ALIAS, id) ? ALIAS[id] : id
  return Object.prototype.hasOwnProperty.call(GLYPHS, k) ? k : undefined
}

export function hasCatIcon(id: string): boolean {
  return id !== 'custom' && glyphKey(id) !== undefined
}

let uid = 0
const drawn = new Map<string, string>()

/**
 * The icon for a category as an SVG string. Unknown ids (categories people make)
 * get the fallback drawing. Layers: red and blue offsets and a glow (shown only by
 * themes that use them), the gradient line, and a thin bright core.
 */
export function catIconSvg(id: string): string {
  const key = glyphKey(id) ?? 'custom'
  let g = drawn.get(key)
  if (!g) drawn.set(key, (g = GLYPHS[key]()))
  const u = `ci${++uid}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6.8 -6.8 61.6 61.6" fill="none" stroke-linecap="round" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="${u}" gradientUnits="userSpaceOnUse" x1="0" y1="48" x2="0" y2="0">` +
    `<stop offset="0" class="ci-s1"/><stop offset=".55" class="ci-s2"/><stop offset="1" class="ci-s3"/></linearGradient></defs>` +
    `<g class="ci-l" transform="translate(-1.1 0)">${g}</g><g class="ci-r" transform="translate(1.1 0)">${g}</g>` +
    `<g class="ci-glow">${g}</g><g class="ci-main" stroke="url(#${u})">${g}</g><g class="ci-core">${g}</g></svg>`
  )
}
