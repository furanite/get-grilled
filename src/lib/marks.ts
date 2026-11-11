import type { ThemeId } from './types'

/**
 * Each theme's logo mark, drawn in a 100 x 100 box, as an SVG string.
 * These are fixed strings with no user input, so they are safe to inject.
 */

const FLAME = 'M50 12c4.6 12.5 20.3 20.3 20.3 39 0 6.3-2.5 11.6-6.2 15H35.9c-3.7-3.4-6.2-8.7-6.2-15 0-9.4 5.6-14.7 10.3-19.7.9 5.3 3.1 8.8 6.9 10.3C45.3 31.4 46.9 22 50 12z'
const CORE = 'M50 40c3.1 6.3 9.4 10.2 9.4 18 0 3.1-1.1 5.9-3 8h-12.8c-1.9-2-3-4.9-3-8 0-5.3 3.9-7.8 6.3-10.9.6 2.2 1.6 3.4 3 4.1-.8-4.4-.6-7.8.1-11.2z'

const f2 = (n: number) => n.toFixed(2)

/** Eight-point star (two overlapping squares) as one outline. */
export function star(cx: number, cy: number, r: number, rot = 0): string {
  const p: string[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2 + rot
    const rr = k % 2 ? r * 0.7654 : r
    p.push(f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a)))
  }
  return 'M' + p.join(' L') + 'Z'
}

const flame = (s: number, cx: number, cy: number, fill: string, core?: string) =>
  `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-50 -39)"><path d="${FLAME}" fill="${fill}"/>${core ? `<path d="${CORE}" fill="${core}"/>` : ''}</g>`

const lin = (id: string, stops: [number, string][], vertical = true) =>
  `<linearGradient id="${id}" ${vertical ? 'x1="0" y1="1" x2="0" y2="0"' : 'x1="0" x2="1"'}>${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`

function leaves(cx: number, cy: number, r: number, a0: number, a1: number, n: number, side: number): string {
  let out = ''
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    const rot = (a * 180) / Math.PI + 90 + side * 28
    out += `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="7.4" ry="2.9" transform="rotate(${rot.toFixed(1)} ${f2(x)} ${f2(y)})"/>`
  }
  return out
}

type Mark = { bg: [string, string]; draw: (g: string) => string }

export const MARKS: Record<ThemeId, Mark> = {
  // Laurel wreath around the flame.
  amethyst: {
    bg: ['#3a1a6e', '#160a2c'],
    draw: (g) =>
      `<defs>${lin(g + 'f', [[0, '#a23cff'], [0.55, '#ff9fe3'], [1, '#f8dc93']])}</defs>` +
      `<g fill="#f3cd76">${leaves(50, 52, 37, 100, 235, 7, -1)}${leaves(50, 52, 37, 80, -55, 7, 1)}</g>` +
      `<path d="M46 89 A37 37 0 0 1 20 30 M54 89 A37 37 0 0 0 80 30" fill="none" stroke="#f3cd76" stroke-width="1.4" stroke-linecap="round"/>` +
      `<circle cx="50" cy="90" r="2.6" fill="#f3cd76"/>` +
      flame(0.72, 50, 50, `url(#${g}f)`, '#fff3e0'),
  },
  // Flame inside an eight-point star.
  emerald: {
    bg: ['#0f5a48', '#03201a'],
    draw: (g) =>
      `<defs>${lin(g + 'f', [[0, '#159a7a'], [0.55, '#86f3d4'], [1, '#f4e2b8']])}</defs>` +
      `<path d="${star(50, 50, 44)}" fill="none" stroke="#e9c47f" stroke-width="2.4"/>` +
      `<path d="${star(50, 50, 37, Math.PI / 8)}" fill="none" stroke="#86f3d4" stroke-width=".9" opacity=".7"/>` +
      flame(0.56, 50, 50, `url(#${g}f)`, '#fff7e0'),
  },
  // Flame bent from neon tube.
  neon: {
    bg: ['#141050', '#060722'],
    draw: () =>
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(50 44) scale(1.05) translate(-50 -39)">` +
      `<path d="${FLAME}" stroke="#ff3fd8" stroke-width="9" opacity=".25" style="filter:blur(3px)"/>` +
      `<path d="${FLAME}" stroke="#ff3fd8" stroke-width="3.6"/><path d="${FLAME}" stroke="#ffd1f5" stroke-width="1.2"/>` +
      `<path d="${CORE}" stroke="#2ef2ff" stroke-width="3.2"/><path d="${CORE}" stroke="#d6fdff" stroke-width="1"/></g>` +
      `<g stroke-linecap="round"><path d="M24 86 H76" stroke="#2ef2ff" stroke-width="8" opacity=".25" style="filter:blur(3px)"/>` +
      `<path d="M24 86 H76" stroke="#2ef2ff" stroke-width="3.4"/><path d="M24 86 H76" stroke="#d6fdff" stroke-width="1"/></g>`,
  },
  // A minted gold coin with the flame cut out.
  onyx: {
    bg: ['#2a2115', '#070605'],
    draw: (g) => {
      let ticks = ''
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        ticks += `M${f2(50 + 40 * Math.cos(a))} ${f2(50 + 40 * Math.sin(a))} L${f2(50 + 43 * Math.cos(a))} ${f2(50 + 43 * Math.sin(a))}`
      }
      return (
        `<defs><radialGradient id="${g}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#e2b54e"/><stop offset="1" stop-color="#8a6116"/></radialGradient></defs>` +
        `<circle cx="50" cy="50" r="46" fill="url(#${g}c)"/><path d="${ticks}" stroke="#5c3f0c" stroke-width="1" opacity=".55"/>` +
        `<circle cx="50" cy="50" r="37" fill="none" stroke="#5c3f0c" stroke-width="1.2" opacity=".6"/>` +
        flame(0.66, 50, 49, '#0b0906', '#e2b54e')
      )
    },
  },
  // Shield with a red and blue split flame and a white strike.
  rivals: {
    bg: ['#1a0f3a', '#07081a'],
    draw: (g) =>
      `<defs><clipPath id="${g}l"><rect x="0" y="0" width="50" height="100"/></clipPath><clipPath id="${g}r"><rect x="50" y="0" width="50" height="100"/></clipPath></defs>` +
      `<path d="M14 10 H86 V54 C86 74 68 86 50 94 C32 86 14 74 14 54Z" fill="none" stroke="#f4f7ff" stroke-width="2.6"/>` +
      `<g transform="translate(50 50) scale(.66) translate(-50 -40)"><path d="${FLAME}" fill="#ff3d5a" clip-path="url(#${g}l)"/><path d="${FLAME}" fill="#5a7bff" clip-path="url(#${g}r)"/></g>` +
      `<path d="M58 18 L44 50 H54 L42 82" fill="none" stroke="#f4f7ff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`,
  },
  // Bold flame over glowing grill bars.
  ember: {
    bg: ['#4a0d10', '#160406'],
    draw: (g) =>
      `<defs>${lin(g + 'f', [[0, '#ff4d1a'], [0.55, '#ff9a1f'], [1, '#ffd24a']])}</defs>` +
      `<g transform="translate(50 42) scale(.92) translate(-50 -40)"><path d="${FLAME}" fill="url(#${g}f)" style="filter:drop-shadow(0 0 5px rgba(255,120,40,.7))"/><path d="${CORE}" fill="#fff3c4"/></g>` +
      `<rect x="16" y="76" width="68" height="6" rx="3" fill="#ffb64a"/><rect x="22" y="87" width="56" height="5.5" rx="2.75" fill="#ff7a2e"/>`,
  },
  // A ring of Al-Qatt Al-Asiri painted triangles around the flame.
  heritage: {
    bg: ['#1d1a48', '#090c22'],
    draw: (g) => {
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
        `<defs>${lin(g + 'f', [[0, '#c9873a'], [0.6, '#e5b95e'], [1, '#fff0c8']])}</defs>${tri}` +
        `<circle cx="50" cy="50" r="46" fill="none" stroke="#e5b95e" stroke-width="1.6"/><circle cx="50" cy="50" r="32" fill="#090c22" stroke="#e5b95e" stroke-width="1.6"/>` +
        flame(0.54, 50, 50, `url(#${g}f)`, '#2aa3a6')
      )
    },
  },
}

let uid = 0

/** The mark as a full SVG. `tile: true` puts it on the rounded app-icon background. */
export function markSvg(theme: ThemeId, opts: { tile?: boolean; id?: string } = {}): string {
  const m = MARKS[theme] ?? MARKS.amethyst
  const g = opts.id ?? `gg-${theme}-${++uid}-`
  const inner = m.draw(g)
  const body = opts.tile
    ? `<defs><radialGradient id="${g}b" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="${m.bg[0]}"/><stop offset="1" stop-color="${m.bg[1]}"/></radialGradient></defs>` +
      `<rect width="100" height="100" rx="22" fill="url(#${g}b)"/><rect x=".75" y=".75" width="98.5" height="98.5" rx="21.5" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="1.5"/>` +
      `<g transform="translate(50 50) scale(.76) translate(-50 -50)">${inner}</g>`
    : inner
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`
}
