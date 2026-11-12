// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clearPlace, coarse, currentPlace, requestExactPlace, savePlace } from '../src/lib/place'
import { catIconSvg } from '../src/lib/islamic'
import { LEGAL, PRIVACY } from '../src/lib/legal'
import { META_CSP, SECURITY_HEADERS } from '../security-headers.mjs'

const KEY = 'gg.place.v1'
beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('location for the Maghrib themes', () => {
  it('is kept rounded to 0.1 degree (about 11 km), never finer', () => {
    savePlace(26.28741, 50.11393)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ lat: 26.3, lon: 50.1 })
    expect(currentPlace()).toMatchObject({ lat: 26.3, lon: 50.1, exact: true })
  })
  it('coarsens a finer value saved by an older version, and overwrites it', () => {
    localStorage.setItem(KEY, JSON.stringify({ lat: 26.29, lon: 50.11 }))
    expect(currentPlace()).toMatchObject({ lat: 26.3, lon: 50.1 })
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ lat: 26.3, lon: 50.1 })
  })
  it('ignores impossible or damaged values', () => {
    savePlace(NaN, 10)
    savePlace(95, 10)
    expect(localStorage.getItem(KEY)).toBeNull()
    localStorage.setItem(KEY, '{"lat":"x"}')
    expect(currentPlace().exact).toBe(false)
    localStorage.setItem(KEY, 'null')
    expect(currentPlace().exact).toBe(false)
  })
  it('is removed by Forget my location', () => {
    savePlace(24.7, 46.7)
    clearPlace()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(currentPlace().exact).toBe(false)
  })
  it('asks the browser once, at low accuracy, and sends nothing over the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const getCurrentPosition = vi.fn((ok: PositionCallback, _err: PositionErrorCallback, opts: PositionOptions) => {
      expect(opts.enableHighAccuracy).toBe(false)
      ok({ coords: { latitude: 21.42251, longitude: 39.82617 } } as GeolocationPosition)
    })
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    expect(await requestExactPlace()).toBe(true)
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ lat: 21.4, lon: 39.8 })
  })
  it('falls back to the time zone when the player says no', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_ok: unknown, err: () => void) => err() }, configurable: true })
    expect(await requestExactPlace()).toBe(false)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('rounds half-way values the expected way', () => {
    expect(coarse(26.25)).toBe(26.3)
    expect(coarse(-0.04)).toBe(-0)
  })
})

describe('security policy', () => {
  it('allows location for this site only, and no camera or microphone', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=(self)')
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()')
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('microphone=()')
  })
  it('the page carries the same CSP as a meta tag (GitHub Pages sends no headers), with no outside hosts', () => {
    expect(META_CSP).toContain("script-src 'self'")
    expect(META_CSP).toContain("connect-src 'self'")
    expect(META_CSP).not.toContain('frame-ancestors')
    expect(META_CSP).not.toMatch(/https?:/)
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')
    expect(html).toContain('http-equiv="Content-Security-Policy"')
    expect(html).toContain('<meta name="referrer" content="no-referrer" />')
  })
  it('category icons come only from the fixed set, whatever a custom category is called', () => {
    for (const id of ['constructor', '__proto__', 'toString', '"><script>alert(1)</script>']) expect(catIconSvg(id)).toBe('')
  })
})

describe('privacy notice', () => {
  it('explains location and scholar reviews in both languages, and cites the PDPL', () => {
    expect(LEGAL.termsVersion).toBe('1.2')
    const en = JSON.stringify(PRIVACY.en)
    expect(en).toContain('rounded to about 10 km')
    expect(en).toContain('never sent to us')
    expect(en).toContain('public review page')
    expect(en).toContain('Personal Data Protection Law')
    const ar = JSON.stringify(PRIVACY.ar)
    expect(ar).toContain('نظام حماية البيانات الشخصية')
    expect(ar).toContain('١٠ كم')
  })
})
