import { describe, expect, it } from 'vitest'
import { THEMES, formatCountdown, heritageOpen, msUntilHeritage } from '../src/lib/themes'

// Riyadh is UTC+3 all year. 2026-11-13 is a Friday.
const utc = (s: string) => new Date(s + 'Z')

describe('heritage lock', () => {
  it('opens at 12:00 Friday Riyadh time and closes at midnight', () => {
    expect(heritageOpen(utc('2026-11-13T08:59:59'))).toBe(false) // Fri 11:59 Riyadh
    expect(heritageOpen(utc('2026-11-13T09:00:00'))).toBe(true) // Fri 12:00
    expect(heritageOpen(utc('2026-11-13T15:30:00'))).toBe(true) // Fri 18:30
    expect(heritageOpen(utc('2026-11-13T20:59:59'))).toBe(true) // Fri 23:59
    expect(heritageOpen(utc('2026-11-13T21:00:00'))).toBe(false) // Sat 00:00
  })

  it('uses Riyadh time, not the UTC date', () => {
    expect(heritageOpen(utc('2026-11-12T22:00:00'))).toBe(false) // Thu in UTC, Fri 01:00 Riyadh
    expect(heritageOpen(utc('2026-11-14T10:00:00'))).toBe(false) // Saturday
    expect(heritageOpen(utc('2026-11-10T10:00:00'))).toBe(false) // Tuesday
  })

  it('is closed on every non-Friday hour of a week and open on Friday afternoons', () => {
    let open = 0
    for (let h = 0; h < 24 * 7; h++) if (heritageOpen(new Date(utc('2026-11-09T21:00:00').getTime() + h * 3600_000))) open++
    expect(open).toBe(12)
  })

  it('counts down to the next opening', () => {
    expect(msUntilHeritage(utc('2026-11-13T08:00:00'))).toBe(3600_000)
    expect(msUntilHeritage(utc('2026-11-10T09:00:00'))).toBe(3 * 86400_000)
    expect(msUntilHeritage(utc('2026-11-13T21:00:00'))).toBe(6 * 86400_000 + 12 * 3600_000)
    expect(msUntilHeritage(utc('2026-11-13T09:00:00'))).toBe(7 * 86400_000)
  })

  it('formats the countdown in both languages', () => {
    expect(formatCountdown(86400_000 + 2 * 3600_000 + 5 * 60_000, 'en')).toBe('1d 2h 5m')
    expect(formatCountdown(3600_000, 'ar')).toContain('ساعة')
  })

  it('has seven themes with unique ids', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(7)
  })
})

import { jumuahOpen, mawlidOpen, msUntilOpen, maghribAt } from '../src/lib/themes'

describe('Maghrib-timed themes use the local place', () => {
  const khobar = { place: { lat: 26.2172, lon: 50.1971 }, tz: 'Asia/Riyadh' }
  const london = { place: { lat: 51.5074, lon: -0.1278 }, tz: 'Europe/London' }
  it('opens the Friday theme at Thursday Maghrib in al-Khobar, not Riyadh', () => {
    const sunset = maghribAt(2026, 11, 12, khobar.place).getTime() // Thursday 12 Nov 2026
    expect(jumuahOpen(new Date(sunset - 60_000), khobar)).toBe(false)
    expect(jumuahOpen(new Date(sunset + 60_000), khobar)).toBe(true)
    // al-Khobar's sunset is about 15 minutes before Riyadh's
    const riyadh = maghribAt(2026, 11, 12, { lat: 24.7136, lon: 46.6753 }).getTime()
    expect((riyadh - sunset) / 60_000).toBeGreaterThan(10)
    expect((riyadh - sunset) / 60_000).toBeLessThan(20)
  })
  it('closes at Friday Maghrib', () => {
    const fri = maghribAt(2026, 11, 13, khobar.place).getTime()
    expect(jumuahOpen(new Date(fri - 60_000), khobar)).toBe(true)
    expect(jumuahOpen(new Date(fri + 60_000), khobar)).toBe(false)
  })
  it('follows the local day and sunset in London', () => {
    const thu = maghribAt(2026, 11, 12, london.place)
    // London sunset in mid-November is about 16:05 GMT
    expect(thu.getUTCHours()).toBe(16)
    expect(jumuahOpen(new Date(thu.getTime() + 60_000), london)).toBe(true)
    expect(jumuahOpen(new Date(thu.getTime() - 60_000), london)).toBe(false)
  })
  it('opens Blessed Mawlid on Sunday Maghrib and counts down to it', () => {
    const sun = maghribAt(2026, 11, 15, khobar.place).getTime() // Sunday 15 Nov 2026
    expect(mawlidOpen(new Date(sun + 60_000), khobar)).toBe(true)
    expect(mawlidOpen(new Date(sun - 60_000), khobar)).toBe(false)
    expect(msUntilOpen('mawlid', new Date(sun - 3600_000), khobar)).toBe(3600_000)
  })
  it('never fails far north', () => {
    const tromso = { place: { lat: 69.65, lon: 18.96 }, tz: 'Europe/Oslo' }
    expect(Number.isFinite(maghribAt(2026, 12, 20, tromso.place).getTime())).toBe(true)
    expect(typeof jumuahOpen(new Date('2026-12-17T20:00:00Z'), tromso)).toBe('boolean')
  })
})
