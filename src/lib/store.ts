import type { Category, Game, Lang, LogEntry, LogKind, Madhhab, ModeItem, PoolEdit, Question, ThemeId, TourRound, Tournament } from './types'
import { ROUND_MODES, TOUR_KINDS } from './types'
import { isDiagram } from './diagram'
import { URDU } from './edition'
import { isClueSecs } from './game'
import { cleanDraft, type StudyDraft } from './studyset'

// Get Grilled and this site are served from one web address (furanite.github.io), so the browser gives them one
// shared storage. Every key here is this site's own, so a game, Terms acceptance or setting from one site never
// turns up on the other. (Older copies of this site used Get Grilled's keys: see moveFromSharedKeys below.)
const KEYS = {
  settings: 'gg.settings.ilm.v1',
  custom: 'gg.custom.ilm.v1',
  used: 'gg.used.ilm.v1',
  game: 'gg.game.ilm.v1',
  consent: 'gg.consent.ilm.v1',
  pools: 'gg.pools.ilm.v1',
  madhhab: 'gg.madhhab.ilm.v1',
  studyDraft: 'gg.studyDraft.ilm.v1',
  tipsSeen: 'gg.tipsSeen.ilm.v1',
  flags: 'gg.flags.ilm.v1',
  lobby: 'gg.lobby.ilm.v1',
  bracket: 'gg.bracket.ilm.v1',
  view: 'gg.view.ilm.v1',
}

/** The keys this site shared with Get Grilled before it had its own. */
export const SHARED_KEYS = {
  settings: 'gg.settings.v1',
  custom: 'gg.custom.v1',
  used: 'gg.used.v1',
  game: 'gg.game.v1',
  pools: 'gg.pools.v1',
  madhhab: 'gg.madhhab.v1',
  studyDraft: 'gg.studyDraft.v1',
} as const

/** A saved game is this site's when every category is an Islamic or Kids one, or one the host made. */
export const isOwnGame = (raw: string | null) => {
  try {
    const g = JSON.parse(raw ?? 'null') as { cats?: { id?: unknown }[] } | null
    return !!g && Array.isArray(g.cats) && g.cats.length > 0 && g.cats.every((c) => typeof c?.id === 'string' && /^(isl-|kids-|c-)/.test(c.id))
  } catch {
    return false
  }
}

/**
 * Once, on the first visit after the keys changed: copies this site's things from the shared keys to its own.
 * The Terms acceptance is NOT copied (each site asks for its own Terms), and a saved game is copied only when it
 * is an Islamic or Kids game. The shared keys are left alone, because they belong to Get Grilled too.
 */
export function moveFromSharedKeys(store: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  try {
    if (store.getItem('gg.moved.ilm.v1')) return
    for (const [name, oldKey] of Object.entries(SHARED_KEYS) as [keyof typeof SHARED_KEYS, string][]) {
      const raw = store.getItem(oldKey)
      if (raw === null || store.getItem(KEYS[name]) !== null) continue
      if (name === 'game' && !isOwnGame(raw)) continue
      store.setItem(KEYS[name], raw)
    }
    store.setItem('gg.moved.ilm.v1', '1')
  } catch {
    // Storage blocked or full: the site starts fresh, which is safe.
  }
}
moveFromSharedKeys(typeof localStorage === 'undefined' ? { getItem: () => '1', setItem: () => {} } : localStorage)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Returns false when the browser refused to store it (storage full or blocked). The app still works for this session. */
function save(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export interface Settings {
  theme: ThemeId
  lang: Lang
  /** "Reduce effects": turns off the moving background, sparkles and transitions. */
  reduceFx: boolean
  /** Sound effects and music. On unless turned off. */
  sound: boolean
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
    lang: r.lang === 'ar' || (r.lang === 'ur' && URDU) ? r.lang : 'en',
    reduceFx: r.reduceFx === true,
    sound: r.sound !== false,
  }
}
export const saveSettings = (s: Settings) => save(KEYS.settings, s)

function cleanQuestion(v: unknown): Question | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.q) || !isStr(v.a)) return null
  const q: Question = { id: v.id, q: v.q, a: v.a }
  if (isStr(v.qAr)) q.qAr = v.qAr
  if (isStr(v.aAr)) q.aAr = v.aAr
  if (isStr(v.qUr)) q.qUr = v.qUr
  if (isStr(v.aUr)) q.aUr = v.aUr
  if (isDiagram(v.img)) q.img = v.img
  if (isClueSecs(v.secs)) q.secs = v.secs
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
    if (isStr(c.nameUr)) cat.nameUr = c.nameUr
    if (isObj(c.set) && isStr(c.set.id) && isStr(c.set.title)) cat.set = { id: c.set.id, title: c.set.title }
    out.push(cat)
  }
  return out
}
export const loadCustom = (): Category[] => cleanCategories(load<unknown>(KEYS.custom, []))
export const saveCustom = (cats: Category[]) => save(KEYS.custom, cats)

/** Whether this browser has already seen the study tips (shown once, after the Terms). Nothing else is kept. */
export const tipsSeen = (): boolean => load<unknown>(KEYS.tipsSeen, false) === true
export const saveTipsSeen = () => save(KEYS.tipsSeen, true)

/** The question file an instructor is working on, kept so closing the page does not lose it. */
export const loadStudyDraft = (): StudyDraft | null => cleanDraft(load<unknown>(KEYS.studyDraft, null))
export const saveStudyDraft = (d: StudyDraft | null) => save(KEYS.studyDraft, d)

export function cleanPools(raw: unknown): Record<string, PoolEdit> {
  const out: Record<string, PoolEdit> = {}
  if (!isObj(raw)) return out
  const five = <T,>(v: unknown, each: (x: unknown) => T | null): T[][] =>
    [0, 1, 2, 3, 4].map((i) => (Array.isArray(v) && Array.isArray(v[i]) ? (v[i] as unknown[]).map(each).filter((x): x is T => x !== null) : []))
  for (const [id, v] of Object.entries(raw)) {
    if (!isObj(v)) continue
    out[id] = { off: five(v.off, (x) => (isStr(x) ? x : null)), extra: five(v.extra, cleanQuestion) }
  }
  return out
}
/** The host's choice of questions per category (see PoolEdit). */
export const loadPools = (): Record<string, PoolEdit> => cleanPools(load<unknown>(KEYS.pools, {}))
export const savePools = (p: Record<string, PoolEdit>) => save(KEYS.pools, p)

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
/** The optional parts of a saved game (rounds, streaks) are checked too; anything odd is dropped, not trusted. */
export function cleanGameExtras(g: Game): Game {
  const out: Game = { ...g }
  const n = g.teams.length
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  if (!(Array.isArray(g.streaks) && g.streaks.length === n && g.streaks.every((x) => num(x) && x >= 0))) delete out.streaks
  if (!(g.stage === 'board' || g.stage === 'mode' || g.stage === 'lightning' || g.stage === 'final')) delete out.stage
  if (Array.isArray(g.lightning)) {
    const list = g.lightning.map(cleanQuestion).filter((q): q is Question => !!q)
    if (list.length) out.lightning = list
    else delete out.lightning
  } else delete out.lightning
  const ls = g.lightningState as unknown
  if (isObj(ls) && num(ls.i) && ls.i >= 0) out.lightningState = { i: Math.floor(ls.i), revealed: ls.revealed === true, ...(num(ls.startedAt) ? { startedAt: ls.startedAt } : {}), ...(ls.done === true ? { done: true } : {}) }
  else delete out.lightningState
  const f = g.final as unknown
  const fq = isObj(f) ? cleanQuestion(f.q) : null
  if (isObj(f) && fq && isObj(f.cat) && isStr(f.cat.id) && isStr(f.cat.name)) out.final = { cat: { id: f.cat.id, name: f.cat.name, ...(isStr(f.cat.nameAr) ? { nameAr: f.cat.nameAr } : {}), ...(isStr(f.cat.nameUr) ? { nameUr: f.cat.nameUr } : {}) }, q: fq }
  else delete out.final
  const fs = g.finalState as unknown
  if (isObj(fs) && (fs.step === 'cat' || fs.step === 'q' || fs.step === 'answer') && Array.isArray(fs.marks) && fs.marks.length === n)
    out.finalState = { step: fs.step, marks: fs.marks.map((m) => (m === true ? true : m === false ? false : null)), ...(num(fs.startedAt) ? { startedAt: fs.startedAt } : {}) }
  else delete out.finalState
  if (!isStr(g.night)) delete out.night
  if (!(num(g.turn) && Number.isInteger(g.turn) && g.turn >= 0 && g.turn < n)) delete out.turn
  // The special round: a known kind and items with text, nothing else
  const mr = g.modeRound as unknown
  const isMode = (m: unknown): m is (typeof ROUND_MODES)[number] => (ROUND_MODES as readonly unknown[]).includes(m)
  if (isObj(mr) && isMode(mr.mode) && Array.isArray(mr.items)) {
    const items = cleanItems(mr.items)
    if (items.length) out.modeRound = { mode: mr.mode, items }
    else delete out.modeRound
  } else delete out.modeRound
  const ms = g.modeState as unknown
  if (out.modeRound && isObj(ms) && num(ms.i) && ms.i >= 0) out.modeState = { i: Math.floor(ms.i), revealed: ms.revealed === true, shown: num(ms.shown) && ms.shown >= 1 ? Math.floor(ms.shown) : 1, ...(ms.done === true ? { done: true } : {}) }
  else delete out.modeState
  if (out.settings && !isMode(out.settings.mode)) {
    out.settings = { ...out.settings }
    delete out.settings.mode
  }
  if (out.stage === 'mode' && !out.modeRound) delete out.stage
  if (!(g.mult === 2)) delete out.mult
  const tour = cleanTournament(g.tournament, n)
  if (tour) out.tournament = tour
  else delete out.tournament
  // Tie-breaker questions and where it is
  const tb = Array.isArray(g.tiebreak)
    ? (g.tiebreak as unknown[]).flatMap((x) => {
        const q = isObj(x) ? cleanQuestion(x.q) : null
        if (!isObj(x) || !q || !isObj(x.cat) || !isStr(x.cat.id) || !isStr(x.cat.name)) return []
        return [{ cat: { id: x.cat.id, name: x.cat.name, ...(isStr(x.cat.nameAr) ? { nameAr: x.cat.nameAr } : {}), ...(isStr(x.cat.nameUr) ? { nameUr: x.cat.nameUr } : {}) }, q }]
      })
    : []
  if (tb.length) out.tiebreak = tb
  else delete out.tiebreak
  const ts = g.tieState as unknown
  const team = (v: unknown): v is number => num(v) && Number.isInteger(v) && v >= 0 && v < n
  if (out.tiebreak && isObj(ts) && num(ts.i) && ts.i >= 0 && ts.i < out.tiebreak.length && Array.isArray(ts.teams) && ts.teams.length > 1 && ts.teams.every(team))
    out.tieState = {
      i: Math.floor(ts.i),
      teams: ts.teams as number[],
      shown: ts.shown === true,
      revealed: ts.revealed === true,
      wrong: Array.isArray(ts.wrong) ? (ts.wrong as unknown[]).filter(team) : [],
      ...(team(ts.winner) ? { winner: ts.winner } : {}),
    }
  else delete out.tieState
  const log = Array.isArray(g.log) ? (g.log as unknown[]).map((e) => cleanLog(e, n)).filter((e): e is LogEntry => !!e) : []
  if (log.length) out.log = log.slice(-1500)
  else delete out.log
  return out
}

const LOG_KINDS: LogKind[] = ['right', 'wrong', 'nobody', 'bonus', 'steal', 'adjust', 'lightning', 'mode', 'final', 'tiebreak']
function cleanLog(e: unknown, teams: number): LogEntry | null {
  if (!isObj(e) || !LOG_KINDS.includes(e.kind as LogKind)) return null
  const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  if (!n(e.at) || !n(e.delta) || !n(e.team) || !Number.isInteger(e.team) || e.team < -1 || e.team >= teams) return null
  const out: LogEntry = { at: e.at, kind: e.kind as LogKind, team: e.team, delta: e.delta }
  if (isStr(e.cat)) out.cat = e.cat.slice(0, 80)
  if (n(e.value)) out.value = e.value
  if (isStr(e.q)) out.q = e.q.slice(0, 600)
  if (isStr(e.a)) out.a = e.a.slice(0, 300)
  if (n(e.round)) out.round = e.round
  if (n(e.by) && Number.isInteger(e.by) && e.by >= 0 && e.by < teams) out.by = e.by
  return out
}

function cleanItems(raw: unknown[]): ModeItem[] {
  return raw
    .filter((x): x is Record<string, unknown> => isObj(x) && isStr(x.q) && isStr(x.a))
    .map((x) => {
      const it: ModeItem = { q: x.q as string, a: x.a as string }
      if (isStr(x.id)) it.id = x.id
      if (isDiagram(x.img)) it.img = x.img
      if (x.v === 0 || x.v === 1) it.v = x.v
      if (x.k === 'true' || x.k === 'halal' || x.k === 'legal') it.k = x.k
      if (isStr(x.cat)) it.cat = x.cat
      if (isStr(x.from)) it.from = x.from
      return it
    })
}

/** A saved tournament: known round kinds, boards shaped like a game's, special rounds with items. Anything odd drops it. */
function cleanTournament(raw: unknown, teams: number): Tournament | null {
  if (!isObj(raw) || !Array.isArray(raw.rounds) || !raw.rounds.length || raw.rounds.length > 12) return null
  const at = raw.at
  if (typeof at !== 'number' || !Number.isInteger(at) || at < 0 || at >= raw.rounds.length) return null
  const rounds: TourRound[] = []
  for (const r of raw.rounds) {
    if (!isObj(r) || !(TOUR_KINDS as readonly unknown[]).includes(r.kind)) return null
    const kind = r.kind as TourRound['kind']
    if (kind === 'board' || kind === 'double') {
      const board = { cats: r.cats, clues: r.clues, teams: Array.from({ length: teams }, () => ({ name: 'x', score: 0 })), used: [], settings: {} }
      if (!isValidGame(board)) return null
      rounds.push({ kind, cats: board.cats.map((c) => ({ id: c.id, name: c.name, ...(isStr(c.nameAr) ? { nameAr: c.nameAr } : {}), ...(isStr(c.nameUr) ? { nameUr: c.nameUr } : {}) })), clues: board.clues })
    } else if (kind === 'mode') {
      if (!(ROUND_MODES as readonly unknown[]).includes(r.mode) || !Array.isArray(r.items)) return null
      const items = cleanItems(r.items)
      if (!items.length) return null
      rounds.push({ kind, mode: r.mode as TourRound['mode'], items })
    } else rounds.push({ kind })
  }
  return { rounds, at, intro: raw.intro === true }
}

export const loadGame = (): Game | null => {
  const g = load<unknown>(KEYS.game, null)
  return isValidGame(g) ? cleanGameExtras(g) : null
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

/** The school of fiqh the host plays by ('' = show every school's rulings). */
export const loadMadhhab = (): Madhhab => {
  const v = load<unknown>(KEYS.madhhab, '')
  return v === 'h' || v === 'm' || v === 's' || v === 'b' ? v : ''
}
export const saveMadhhab = (m: Madhhab) => save(KEYS.madhhab, m)
/** A question the host flagged during a game as wrong or unclear, to check later. */
export interface Flag {
  /** The question's id, the category it came from, and its level (0 = 100 ... 4 = 500) */
  id: string
  catId: string
  cat: string
  level: number
  q: string
  a: string
  at: number
  note?: string
  /** Set once the host has taken it out of play */
  out?: boolean
}
export const FLAGS_MAX = 300
export function loadFlags(): Flag[] {
  const raw = load<unknown>(KEYS.flags, [])
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Record<string, unknown> => isObj(f) && isStr(f.id) && isStr(f.catId) && isStr(f.cat) && isStr(f.q) && isStr(f.a) && typeof f.level === 'number' && typeof f.at === 'number')
    .map((f) => ({
      id: f.id as string,
      catId: f.catId as string,
      cat: (f.cat as string).slice(0, 80),
      level: Math.max(0, Math.min(4, Math.floor(f.level as number))),
      q: (f.q as string).slice(0, 600),
      a: (f.a as string).slice(0, 300),
      at: f.at as number,
      ...(isStr(f.note) ? { note: f.note.slice(0, 300) } : {}),
      ...(f.out === true ? { out: true } : {}),
    }))
    .slice(-FLAGS_MAX)
}
export const saveFlags = (f: Flag[]) => save(KEYS.flags, f.slice(-FLAGS_MAX))

/** Display options for this device: larger text, colour-blind friendly colours, read-aloud, keep the screen awake. */
export interface ViewPrefs {
  big: boolean
  cb: boolean
  voice: boolean
  awake: boolean
}
export function loadView(): ViewPrefs {
  const r = load<unknown>(KEYS.view, {})
  const o = isObj(r) ? r : {}
  return { big: o.big === true, cb: o.cb === true, voice: o.voice === true, awake: o.awake !== false }
}
export const saveView = (v: ViewPrefs) => save(KEYS.view, v)

/** The waiting screen's words, start time and logos. */
export interface LobbyInfo {
  name: string
  sub: string
  /** Start time as "HH:MM" today, or empty */
  start: string
  logos: string[]
  rules: boolean
}
export const LOGO_MAX_BYTES = 300_000
export function loadLobby(): LobbyInfo {
  const r = load<unknown>(KEYS.lobby, {})
  const o = isObj(r) ? r : {}
  const logos = Array.isArray(o.logos) ? (o.logos as unknown[]).filter((x): x is string => isStr(x) && /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(x) && x.length < LOGO_MAX_BYTES * 1.4).slice(0, 4) : []
  return {
    name: isStr(o.name) ? o.name.slice(0, 80) : '',
    sub: isStr(o.sub) ? o.sub.slice(0, 120) : '',
    start: isStr(o.start) && /^\d\d:\d\d$/.test(o.start) ? o.start : '',
    logos,
    rules: o.rules !== false,
  }
}
export const saveLobby = (l: LobbyInfo) => save(KEYS.lobby, l)

export const loadBracketRaw = (): unknown => load<unknown>(KEYS.bracket, null)
export const saveBracketRaw = (b: unknown) => save(KEYS.bracket, b)
