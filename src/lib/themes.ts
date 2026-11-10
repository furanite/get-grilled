import type { ThemeId } from './types'

export interface ThemeInfo {
  id: ThemeId
  name: string
  nameAr: string
  swatch: string
  blurb: string
}

export const THEMES: ThemeInfo[] = [
  { id: 'amethyst', name: 'Royal Amethyst', nameAr: 'الجمشت الملكي', swatch: 'linear-gradient(135deg,#3c1b72,#f5cd72)', blurb: 'Plum, violet and gold foil' },
  { id: 'emerald', name: 'Emerald Oasis', nameAr: 'واحة الزمرد', swatch: 'linear-gradient(135deg,#105a4a,#e9c47f)', blurb: 'Emerald, teal and brass' },
  { id: 'neon', name: 'Neon Circuit', nameAr: 'دائرة النيون', swatch: 'linear-gradient(135deg,#14164a,#2ef2ff 60%,#ff3fd8)', blurb: 'Indigo, cyan and magenta' },
  { id: 'onyx', name: 'Black & Gold', nameAr: 'الأسود والذهبي', swatch: 'linear-gradient(135deg,#050403 40%,#f2cd6b)', blurb: 'Gloss black and polished gold' },
  { id: 'rivals', name: 'Red vs Blue', nameAr: 'الأحمر ضد الأزرق', swatch: 'linear-gradient(135deg,#ff3d5a,#14287a)', blurb: 'Head-to-head red and cobalt' },
  { id: 'ember', name: 'Molten Ember', nameAr: 'الجمر المنصهر', swatch: 'linear-gradient(135deg,#6e1322,#ffb64a)', blurb: 'Crimson and molten orange' },
  { id: 'heritage', name: 'Heritage', nameAr: 'التراث', swatch: 'linear-gradient(135deg,#0f5257,#e5b95e)', blurb: 'Najdi, Sadu and Asiri art' },
]

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
