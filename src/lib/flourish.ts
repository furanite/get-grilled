import type { ThemeId } from './types'
import { star } from './marks'
import { APP_NAME_AR, ISLAMIC_SET } from './edition'
import { islamicAbove, islamicAmbient, islamicFlourish, isIslamicOnly } from './islamic'

/**
 * Each theme's title ornament and its ambient background, as fixed markup strings (no user input).
 * Paths use pathLength="1" with the .fl-draw class, which draws them in on mount and rests fully drawn.
 */

const d = (path: string, delay: number, dur = 1.6, cls = '') =>
  `<path class="fl-draw ${cls}" pathLength="1" style="--d:${delay}s;--dur:${dur}s" d="${path}"/>`
const mirror = (inner: string) => `<g>${inner}</g><g transform="scale(-1 1)">${inner}</g>`

let uid = 0

export function flourishBelow(theme: ThemeId): string {
  if (ISLAMIC_SET || isIslamicOnly(theme)) return islamicFlourish(theme)
  const g = `fl${++uid}`
  switch (theme) {
    case 'amethyst':
      return (
        `<svg class="fl fl-am" viewBox="-200 -26 400 52" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="#d9a548"/><stop offset=".5" stop-color="#fff1c2"/><stop offset="1" stop-color="#d9a548"/></linearGradient></defs>` +
        `<g fill="none" stroke="url(#${g})" stroke-width="1.4" stroke-linecap="round">` +
        mirror(
          d('M10 0 C40 0 58 -16 84 -13 C104 -10 106 10 90 12 C78 13 76 0 86 -1', 0.5, 1.8) +
            d('M96 4 C122 16 152 10 168 2 C178 -3 186 -2 192 2', 0.9) +
            d('M38 2 C48 14 62 16 70 9 C74 5 70 1 66 4', 1.1, 1.2) +
            d('M120 -2 C130 -14 146 -16 152 -9 C156 -4 150 -1 146 -5', 1.2, 1.2) +
            `<path class="fl-glint" fill="#fff8e4" stroke="none" d="M192 -3 l1.2 3.8 3.8 1.2 -3.8 1.2 -1.2 3.8 -1.2 -3.8 -3.8 -1.2 3.8 -1.2z"/>`,
        ) +
        `</g><path class="fl-fade" style="--d:.4s" d="M0 -7 L6 0 L0 7 L-6 0Z" fill="url(#${g})"/></svg>`
      )
    case 'emerald': {
      let stars = ''
      let i = 0
      for (let x = -225; x <= 225; x += 30, i++) {
        stars += `<path class="fl-wave" style="--i:${i}" d="${star(x, 0, 11)}"/><path class="fl-wave dot" style="--i:${i}" d="${star(x, 0, 5)}"/>`
        if (x < 225) stars += `<path d="M${x + 11} 0 H${x + 19}" stroke-width="1"/>`
      }
      return `<svg class="fl fl-em" viewBox="-250 -15 500 30" aria-hidden="true"><g fill="none" stroke="#e9c47f" stroke-width="1.3">${stars}</g></svg>`
    }
    case 'neon':
      return (
        `<svg class="fl fl-ne" viewBox="-300 -30 600 60" aria-hidden="true">` +
        mirror(
          d('M40 0 H150 L170 -20 H260', 0.2, 1.2, 'base') +
            d('M60 10 H130 L150 26 H220', 0.35, 1.2, 'base') +
            `<path class="pulse" pathLength="1" style="stroke:#2ef2ff" d="M40 0 H150 L170 -20 H260"/>` +
            `<path class="pulse" pathLength="1" style="stroke:#ff3fd8;animation-delay:-1.6s" d="M60 10 H130 L150 26 H220"/>` +
            `<circle cx="260" cy="-20" r="4.5"/><circle cx="220" cy="26" r="4"/>`,
        ) +
        `<rect class="fl-fade" style="--d:.6s" x="-14" y="-2" width="28" height="4" rx="2" fill="#ff3fd8"/></svg>`
      )
    case 'onyx':
      return (
        `<svg class="fl fl-on" viewBox="-260 -16 520 32" aria-hidden="true"><g fill="none" stroke="#e2b54e" stroke-width="1.1">` +
        mirror(d('M16 -3 H230', 0.8) + d('M16 3 H200', 0.95) + d('M230 -3 V-9 H244 V3 H200', 1.1, 0.8)) +
        `</g><path class="fl-fade" style="--d:.7s" d="M0 -9 L9 0 L0 9 L-9 0Z" fill="#e2b54e"/><path class="fl-fade" style="--d:.75s" d="M0 -14 L14 0 L0 14 L-14 0Z" fill="none" stroke="#e2b54e"/></svg>`
      )
    case 'rivals':
      return `<div class="fl fl-rv" aria-hidden="true"><span class="bar r"></span><span class="vs">VS</span><span class="bar b"></span></div>`
    case 'ember':
      return `<div class="fl fl-mb" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`
    case 'heritage': {
      const half =
        d('M16 -2 H236', 0.7, 1.4) +
        d('M16 3 H200', 0.85, 1.4, 'thin') +
        `<path class="fl-pop" style="--d:1.2s" d="M70 -2 l4 -4 4 4 -4 4z"/>` +
        `<path class="fl-pop" style="--d:1.4s" d="M130 -2 l4 -4 4 4 -4 4z"/>` +
        `<path class="fl-pop" style="--d:1.6s" d="M190 -2 l4 -4 4 4 -4 4z"/>` +
        `<path class="fl-pop" style="--d:1.9s" d="${star(244, -2, 5)}"/>`
      return (
        `<svg class="fl fl-he" viewBox="-260 -16 520 32" aria-hidden="true"><g fill="#e5b95e" stroke="#e5b95e">` +
        mirror(half) +
        `</g><g class="fl-star"><path d="${star(0, 0, 13)}" fill="#e5b95e"/><path d="${star(0, 0, 7.5)}" fill="#090c22"/><circle r="2.6" fill="#e5b95e"/></g></svg>`
      )
    }
  }
}

/** Ornament above the title (only Black & Gold has one: a sunburst). */
export function flourishAbove(theme: ThemeId): string {
  if (ISLAMIC_SET) return islamicAbove(APP_NAME_AR)
  if (theme !== 'onyx') return ''
  let rays = ''
  const n = 21
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI
    const r1 = i % 2 === 0 ? 76 : 54
    rays += `<line class="fl-draw" pathLength="1" style="--d:${(0.05 + Math.abs(i - (n - 1) / 2) * 0.04).toFixed(2)}s;--dur:.7s" x1="${(Math.cos(a) * 18).toFixed(2)}" y1="${(Math.sin(a) * 18).toFixed(2)}" x2="${(Math.cos(a) * r1).toFixed(2)}" y2="${(Math.sin(a) * r1).toFixed(2)}"/>`
  }
  return `<svg class="fl-above fl-rays" viewBox="-150 -80 300 84" aria-hidden="true"><g stroke="#e2b54e" stroke-width="1">${rays}</g><path d="M-14 0 A14 14 0 0 1 14 0Z" fill="#e2b54e"/></svg>`
}

/** Slow background motion behind a title. */
export function ambient(theme: ThemeId): string {
  if (ISLAMIC_SET || isIslamicOnly(theme)) return islamicAmbient(theme)
  switch (theme) {
    case 'amethyst': {
      let s = ''
      for (let i = 0; i < 14; i++) s += `<i style="left:${(i * 37 + 7) % 100}%;top:${(i * 53 + 11) % 100}%;--i:${i}"></i>`
      return `<div class="amb amb-am" aria-hidden="true">${s}</div>`
    }
    case 'emerald': {
      let p = ''
      for (const r of [96, 78, 60, 40, 22]) p += star(0, 0, r)
      for (let k = 0; k < 8; k++) p += star(Math.cos((k * Math.PI) / 4) * 69, Math.sin((k * Math.PI) / 4) * 69, 8)
      return `<div class="amb amb-em" aria-hidden="true"><svg viewBox="-100 -100 200 200"><path d="${p}"/></svg></div>`
    }
    case 'neon':
      return `<div class="amb amb-ne" aria-hidden="true"></div>`
    case 'onyx':
      return `<div class="amb amb-on" aria-hidden="true"><i></i></div>`
    case 'rivals': {
      let s = ''
      for (let i = 0; i < 14; i++) s += `<i class="${i % 2 ? 'b' : 'r'}" style="top:${8 + ((i * 37) % 84)}%;width:${6 + ((i * 53) % 12)}%;animation-duration:${(1.8 + ((i * 7) % 10) / 6).toFixed(2)}s;animation-delay:${-(i * 0.37).toFixed(2)}s"></i>`
      return `<div class="amb amb-rv" aria-hidden="true">${s}</div>`
    }
    case 'ember':
      return (
        `<div class="amb amb-mb" aria-hidden="true"><svg viewBox="0 0 300 120"><path d="M80 120 C70 90 100 80 88 55 C78 35 96 20 92 0"/>` +
        `<path d="M150 120 C160 92 132 78 146 52 C158 30 140 16 146 0" style="animation-delay:-2.2s"/><path d="M220 120 C210 95 238 82 226 58 C216 38 232 22 228 0" style="animation-delay:-4.1s"/></svg></div>`
      )
    case 'heritage': {
      // A tiled lattice of eight-point stars joined by octagon gaps, drifting and turning very slowly.
      const cell = `<path d="${star(30, 30, 18)}"/><path d="${star(30, 30, 10, Math.PI / 8)}"/><path d="M30 12 V0 M30 48 V60 M12 30 H0 M48 30 H60"/>`
      return (
        `<div class="amb amb-he" aria-hidden="true"><svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"><defs><pattern id="gg-he-geo" width="60" height="60" patternUnits="userSpaceOnUse">` +
        `<g fill="none" stroke="#e5b95e" stroke-width=".7">${cell}</g></pattern></defs><rect x="-300" y="-300" width="1200" height="1200" fill="url(#gg-he-geo)"/></svg></div>`
      )
    }
  }
}
