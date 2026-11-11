import type { Category, Game, Lang, Question, ThemeId } from './types'

const KEYS = {
  settings: 'gg.settings.v1',
  custom: 'gg.custom.v1',
  used: 'gg.used.v1',
  game: 'gg.game.v1',
  consent: 'gg.consent.v1',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be blocked; the app still works for this session */
  }
}

export interface Settings {
  theme: ThemeId
  lang: Lang
  /** "Reduce effects": turns off the moving background, sparkles and transitions. */
  reduceFx: boolean
}

const THEME_IDS: ThemeId[] = ['amethyst', 'emerald', 'neon', 'onyx', 'rivals', 'ember', 'heritage', 'rawdah', 'jumuah', 'mawlid', 'fajr', 'duha', 'zuhr', 'asr', 'maghrib', 'isha', 'qiyam', 'mughal', 'sahel', 'swahili', 'nusantara', 'zellige', 'suzani', 'bosnia', 'tatar', 'kubachi', 'hui']
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

/** Saved data is checked field by field, so a corrupted or hand-edited value can never blank the app. */
export const loadSettings = (): Settings => {
  const raw = load<unknown>(KEYS.settings, {})
  const r = isObj(raw) ? raw : {}
  return {
    theme: THEME_IDS.includes(r.theme as ThemeId) ? (r.theme as ThemeId) : 'amethyst',
    lang: r.lang === 'ar' ? 'ar' : 'en',
    reduceFx: r.reduceFx === true,
  }
}
export const saveSettings = (s: Settings) => save(KEYS.settings, s)

function cleanQuestion(v: unknown): Question | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.q) || !isStr(v.a)) return null
  const q: Question = { id: v.id, q: v.q, a: v.a }
  if (isStr(v.qAr)) q.qAr = v.qAr
  if (isStr(v.aAr)) q.aAr = v.aAr
  return q
}
export function cleanCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return []
  const out: Category[] = []
  for (const c of raw) {
    if (!isObj(c) || !isStr(c.id) || !isStr(c.name) || !Array.isArray(c.levels) || c.levels.length !== 5) continue
    const levels = c.levels.map((l) => (Array.isArray(l) ? l.map(cleanQuestion).filter((q): q is Question => !!q) : []))
    const cat: Category = { id: c.id, name: c.name, builtIn: false, levels }
    if (isStr(c.nameAr)) cat.nameAr = c.nameAr
    out.push(cat)
  }
  return out
}
export const loadCustom = (): Category[] => cleanCategories(load<unknown>(KEYS.custom, []))
export const saveCustom = (cats: Category[]) => save(KEYS.custom, cats)

/** Question ids already played, per category, so new games avoid repeats until a pool runs out. */
export const loadUsed = (): Record<string, string[]> => {
  const raw = load<unknown>(KEYS.used, {})
  const out: Record<string, string[]> = {}
  if (isObj(raw)) for (const [k, v] of Object.entries(raw)) if (Array.isArray(v)) out[k] = v.filter(isStr)
  return out
}
export const saveUsed = (u: Record<string, string[]>) => save(KEYS.used, u)

export function isValidGame(g: unknown): g is Game {
  if (!isObj(g) || !Array.isArray(g.cats) || !Array.isArray(g.clues) || !Array.isArray(g.teams) || !Array.isArray(g.used) || !isObj(g.settings)) return false
  if (!g.cats.length || g.cats.length !== g.clues.length || !g.teams.length) return false
  if (!g.cats.every((c) => isObj(c) && isStr(c.id) && isStr(c.name))) return false
  if (!g.teams.every((t) => isObj(t) && isStr(t.name) && typeof t.score === 'number' && Number.isFinite(t.score))) return false
  return g.clues.every((col) => Array.isArray(col) && col.length === 5 && col.every((c) => isObj(c) && isStr(c.id) && isStr(c.q) && isStr(c.a) && typeof c.value === 'number'))
}
export const loadGame = (): Game | null => {
  const g = load<unknown>(KEYS.game, null)
  return isValidGame(g) ? g : null
}
export const saveGame = (g: Game | null) => save(KEYS.game, g)

export function uid(prefix = 'c') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export interface Consent {
  version: string
  date: string
}
export const loadConsent = (): Consent | null => {
  const c = load<Consent | null>(KEYS.consent, null)
  return c && typeof c.version === 'string' && typeof c.date === 'string' ? c : null
}
export const saveConsent = (c: Consent) => save(KEYS.consent, c)
/** True when the saved acceptance matches the current Terms version. */
export const hasConsent = (version: string) => loadConsent()?.version === version
