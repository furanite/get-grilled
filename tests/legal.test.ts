// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONSENT_TEXT, LEGAL, PRIVACY, TERMS } from '../src/lib/legal'
import { hasConsent, loadConsent, loadSettings, saveConsent } from '../src/lib/store'
import { maxTwinkleHz } from '../src/lib/fx'

beforeEach(() => localStorage.clear())

describe('consent record', () => {
  it('is missing on a first visit', () => {
    expect(loadConsent()).toBeNull()
    expect(hasConsent(LEGAL.termsVersion)).toBe(false)
  })
  it('saves the version and date, and a new Terms version asks again', () => {
    saveConsent({ version: '1.0', date: '2026-11-10T00:00:00Z' })
    expect(hasConsent('1.0')).toBe(true)
    expect(hasConsent('1.1')).toBe(false)
  })
  it('ignores a damaged record', () => {
    localStorage.setItem('gg.consent.v1', '{"version":3}')
    expect(loadConsent()).toBeNull()
    localStorage.setItem('gg.consent.v1', 'not json')
    expect(loadConsent()).toBeNull()
  })
  it('Reduce effects is off by default and kept with the settings', () => {
    expect(loadSettings().reduceFx).toBe(false)
    localStorage.setItem('gg.settings.v1', JSON.stringify({ theme: 'neon', lang: 'ar', reduceFx: true }))
    expect(loadSettings()).toEqual({ theme: 'neon', lang: 'ar', reduceFx: true })
  })
})

describe('legal text', () => {
  it('English and Arabic Terms have the same 18 clauses, and Privacy the same sections', () => {
    expect(TERMS.en.clauses).toHaveLength(18)
    expect(TERMS.ar.clauses).toHaveLength(18)
    expect(PRIVACY.ar.clauses).toHaveLength(PRIVACY.en.clauses.length)
    TERMS.en.clauses.forEach((c, i) => expect(TERMS.ar.clauses[i].title.split('.')[0]).toBe(c.title.split('.')[0]))
  })
  it('has the independence line, acceptable-use rules and Arabic precedence', () => {
    const en = JSON.stringify(TERMS.en)
    expect(en).toContain('not affiliated with, endorsed by, or connected to any television show')
    expect(TERMS.en.clauses[5].list).toHaveLength(4)
    expect(en).toContain('the Arabic version prevails')
    expect(JSON.stringify(TERMS.ar)).toContain('يُعتمد النص العربي')
  })
  it('names the owner as Moinuddeen and publishes no contact email', () => {
    expect(LEGAL.owner).toBe('Moinuddeen')
    expect(TERMS.en.clauses[0].body[0]).toBe('Get Grilled ("the Game") is operated by Moinuddeen ("we", "us").')
    expect(JSON.stringify(TERMS.ar)).toContain('Moinuddeen')
    const all = JSON.stringify([TERMS, PRIVACY, CONSENT_TEXT])
    expect(all).not.toMatch(/@|mailto|\[[A-Zا-ي]+\]/)
    expect(JSON.stringify(TERMS.en.clauses[17])).toContain('Tell your game host')
  })
  it('pop-up text exists in both languages with the same keys', () => {
    expect(Object.keys(CONSENT_TEXT.ar).sort()).toEqual(Object.keys(CONSENT_TEXT.en).sort())
    expect(CONSENT_TEXT.en.declined).toBe('You need to accept the Terms to play Get Grilled.')
    expect(CONSENT_TEXT.ar.points).toHaveLength(CONSENT_TEXT.en.points.length)
  })
  it('clue note sends disputes to the host in both languages', () => {
    expect(CONSENT_TEXT.en.report).toBe("Think an answer is wrong? Tell your host. The host's ruling is final.")
    expect(CONSENT_TEXT.ar.report).toContain('مقدّم اللعبة')
  })
})

describe('photosensitivity (WCAG 2.3.1: no more than 3 flashes a second)', () => {
  it('background twinkles stay under 3 per second', () => {
    expect(maxTwinkleHz()).toBeLessThanOrEqual(3)
  })
  it('no repeating CSS animation cycles faster than 3 times a second', () => {
    const css = readFileSync(join(__dirname, '..', 'src', 'index.css'), 'utf8')
    const repeating = [...css.matchAll(/animation:([^;}]*infinite[^;}]*)/g)].map((m) => m[1])
    expect(repeating.length).toBeGreaterThan(0)
    for (const a of repeating) {
      const secs = [...a.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map(([, n, u]) => (u === 'ms' ? +n / 1000 : +n))
      const dur = secs[0]
      // An "alternate" animation brightens on one cycle and dims on the next.
      const flashPeriod = /alternate/.test(a) ? dur * 2 : dur
      expect(1 / flashPeriod, a).toBeLessThanOrEqual(3)
    }
  })
  it('Reduce effects also stops repeating animations', () => {
    const css = readFileSync(join(__dirname, '..', 'src', 'index.css'), 'utf8')
    expect(css).toMatch(/:root\[data-reduce-fx="on"\][^{]*\{[^}]*animation-iteration-count:1!important/)
  })
})
