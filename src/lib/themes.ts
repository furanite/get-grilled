import type { ThemeId } from './types'
import { ISLAMIC_SET } from './edition'
import { ISLAMIC_THEME_TEXT } from './islamic'
import { currentPlace } from './place'

export interface ThemeInfo {
  id: ThemeId
  name: string
  nameAr: string
  swatch: string
  blurb: string
}

const BASE_THEMES: ThemeInfo[] = [
  { id: 'amethyst', name: 'Royal Amethyst', nameAr: 'الجمشت الملكي', swatch: 'linear-gradient(135deg,#3c1b72,#f5cd72)', blurb: 'Plum, violet and gold foil' },
  { id: 'emerald', name: 'Emerald Oasis', nameAr: 'واحة الزمرد', swatch: 'linear-gradient(135deg,#105a4a,#e9c47f)', blurb: 'Emerald, teal and brass' },
  { id: 'neon', name: 'Neon Circuit', nameAr: 'دائرة النيون', swatch: 'linear-gradient(135deg,#14164a,#2ef2ff 60%,#ff3fd8)', blurb: 'Indigo, cyan and magenta' },
  { id: 'onyx', name: 'Black & Gold', nameAr: 'الأسود والذهبي', swatch: 'linear-gradient(135deg,#050403 40%,#f2cd6b)', blurb: 'Gloss black and polished gold' },
  { id: 'rivals', name: 'Red vs Blue', nameAr: 'الأحمر ضد الأزرق', swatch: 'linear-gradient(135deg,#ff3d5a,#14287a)', blurb: 'Head-to-head red and cobalt' },
  { id: 'ember', name: 'Molten Ember', nameAr: 'الجمر المنصهر', swatch: 'linear-gradient(135deg,#6e1322,#ffb64a)', blurb: 'Crimson and molten orange' },
  { id: 'heritage', name: 'Heritage', nameAr: 'التراث', swatch: 'linear-gradient(135deg,#0f5257,#e5b95e)', blurb: 'Najdi, Sadu and Asiri art' },
]

/** The themes on offer. The Islamic site renames them and adds the Garden theme (leaves and flowers). */
const byId = (id: ThemeId): ThemeInfo => ({ ...(BASE_THEMES.find((t) => t.id === id) ?? { id, name: '', nameAr: '', swatch: '', blurb: '' }), ...ISLAMIC_THEME_TEXT[id] })

/**
 * The themes on offer. The Islamic site keeps its seven Islamic art themes, adds seven themes named after
 * the prayers (Fajr to Qiyam al-Layl) and six from Muslim cultures across the world, and replaces Heritage with two timed themes:
 * Eid of the Mu'mineen (Friday) and Blessed Mawlid (Monday).
 */
export const THEMES: ThemeInfo[] = ISLAMIC_SET
  ? ([
      'amethyst', 'emerald', 'neon', 'onyx', 'rivals', 'ember', 'rawdah',
      'fajr', 'duha', 'zuhr', 'asr', 'maghrib', 'isha', 'qiyam',
      'mughal', 'sahel', 'swahili', 'nusantara', 'zellige', 'suzani', 'bosnia', 'tatar', 'kubachi', 'hui',
      'jumuah', 'mawlid',
    ] as ThemeId[]).map(byId)
  : BASE_THEMES

/** The theme to fall back to when a timed theme closes. */
export const DEFAULT_THEME: ThemeId = 'amethyst'

// ---------- Maghrib at the host's or player's own location ----------

const RAD = Math.PI / 180

/** Sunset (Maghrib) on the given calendar day at `place`, from the standard sunrise equation (within a minute or two). */
export function maghribAt(y: number, m: number, d: number, place: { lat: number; lon: number }): Date {
  const jd = Date.UTC(y, m - 1, d, 12) / 86400_000 + 2440587.5
  const n = Math.round(jd - 2451545.0 + 0.0008)
  const js = n - place.lon / 360
  const M = (357.5291 + 0.98560028 * js) % 360
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const L = (M + C + 180 + 102.9372) % 360
  const transit = 2451545.0 + js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD)
  const decl = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD))
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(place.lat * RAD) * Math.sin(decl)) / (Math.cos(place.lat * RAD) * Math.cos(decl))
  // Far north or south the sun may not set or rise; clamp so the window still has an edge.
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / RAD
  return new Date((transit + w / 360 - 2440587.5) * 86400_000)
}

/** Sunset in Riyadh (kept for reference and tests). */
export const maghribRiyadh = (y: number, m: number, d: number) => maghribAt(y, m, d, { lat: 24.7136, lon: 46.6753 })

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** The calendar date, in time zone `tz` (the device's own when empty), that is `days` days after the one containing `now`. */
function localDay(now: Date, days: number, tz: string) {
  const at = new Date(now.getTime() + days * 86400_000)
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(at)
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(at)
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')), dow: DOW[get('weekday')] ?? at.getDay() }
}

export type Where = { place?: { lat: number; lon: number }; tz?: string }
const resolve = (w: Where) => ({ place: w.place ?? currentPlace(), tz: w.tz ?? '' })

/** Open from Maghrib on weekday `eve` until Maghrib the next day (the Islamic day starts at Maghrib). */
function maghribWindowOpen(eve: number, now: Date, where: Where) {
  const { place, tz } = resolve(where)
  const t = localDay(now, 0, tz)
  const sunset = maghribAt(t.y, t.m, t.d, place).getTime()
  if (t.dow === eve) return now.getTime() >= sunset
  if (t.dow === (eve + 1) % 7) return now.getTime() < sunset
  return false
}

function msUntilMaghribOf(eve: number, now: Date, where: Where) {
  const { place, tz } = resolve(where)
  for (let i = 0; i <= 8; i++) {
    const t = localDay(now, i, tz)
    if (t.dow !== eve) continue
    const ms = maghribAt(t.y, t.m, t.d, place).getTime() - now.getTime()
    if (ms > 0) return ms
  }
  return 0
}

/** Blessed Mawlid: from Maghrib on Sunday to Maghrib on Monday, at the host's or player's own location. */
export const mawlidOpen = (now = new Date(), where: Where = {}) => maghribWindowOpen(0, now, where)
/** Eid of the Mu'mineen: from Maghrib on Thursday to Maghrib on Friday, at the host's or player's own location. */
export const jumuahOpen = (now = new Date(), where: Where = {}) => maghribWindowOpen(4, now, where)

/** Whether a theme can be picked now. Only the timed themes are ever closed. */
export function themeOpen(id: ThemeId, now = new Date(), where: Where = {}) {
  if (id === 'heritage') return heritageOpen(now)
  if (id === 'jumuah') return jumuahOpen(now, where)
  if (id === 'mawlid') return mawlidOpen(now, where)
  return true
}

/** Milliseconds until a timed theme next opens. */
export function msUntilOpen(id: ThemeId, now = new Date(), where: Where = {}) {
  if (id === 'jumuah') return msUntilMaghribOf(4, now, where)
  if (id === 'mawlid') return msUntilMaghribOf(0, now, where)
  return msUntilHeritage(now)
}

/** Day of week and hour in Riyadh, whatever the device's own time zone is. */
function riyadhNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { day: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) }
}

/** The Heritage theme is open on Fridays from 12:00 to midnight, Riyadh time. */
export function heritageOpen(now = new Date()) {
  const { day, hour } = riyadhNow(now)
  return day === 'Fri' && hour >= 12
}

/** Milliseconds until the next Friday 12:00 in Riyadh (UTC+3, no daylight saving). */
export function msUntilHeritage(now = new Date()) {
  const riyadh = new Date(now.getTime() + 3 * 3600_000)
  const target = new Date(riyadh)
  const daysAhead = (5 - riyadh.getUTCDay() + 7) % 7
  target.setUTCDate(riyadh.getUTCDate() + daysAhead)
  target.setUTCHours(12, 0, 0, 0)
  if (target.getTime() <= riyadh.getTime()) target.setUTCDate(target.getUTCDate() + 7)
  return target.getTime() - riyadh.getTime()
}

export function formatCountdown(ms: number, lang: 'en' | 'ar') {
  const d = Math.floor(ms / 86400_000)
  const h = Math.floor((ms % 86400_000) / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  if (lang === 'ar') return `${d} يوم ${h} ساعة ${m} دقيقة`
  return `${d}d ${h}h ${m}m`
}
