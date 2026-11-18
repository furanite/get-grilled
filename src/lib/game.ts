import { ROUND_MODES, TOUR_KINDS, VALUES, type Category, type Clue, type Game, type GameSettings, type Madhhab, type ModeItem, type PoolEdit, type Question, type RoundMode, type Special, type Stage, type TileCounts, type TourRound, type TourStep } from './types'
import { isDiagram } from './diagram'

export type Rng = () => number

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Picks one question per level, preferring ones not in `used`.
 * When every question in a level has been used, that level starts over.
 * Returns the picked questions and the updated used list for this category.
 */
export function drawCategory(cat: Category, used: string[], rng: Rng = Math.random, taken?: Set<string>): { picks: Question[]; used: string[] } {
  let usedSet = new Set(used)
  const picks: Question[] = []
  cat.levels.forEach((pool) => {
    if (pool.length === 0) throw new Error(`Category "${cat.name}" has an empty level`)
    let fresh = pool.filter((q) => !usedSet.has(q.id))
    if (fresh.length === 0) {
      const ids = new Set(pool.map((q) => q.id))
      usedSet = new Set([...usedSet].filter((id) => !ids.has(id)))
      fresh = pool
    }
    // Some clues sit in two categories: never put the same clue twice in one game.
    if (taken) {
      const unique = fresh.filter((q) => !taken.has(clueKey(q)))
      if (unique.length) fresh = unique
    }
    const q = pick(fresh, rng)
    picks.push(q)
    usedSet.add(q.id)
    taken?.add(clueKey(q))
  })
  return { picks, used: [...usedSet] }
}

/** A clue's words, ignoring case, spacing and the end mark, so the same clue in two categories is spotted. */
export const clueKey = (q: Pick<Question, 'q' | 'img'>) => `${q.q.toLowerCase().replace(/\s+/g, ' ').replace(/[.?!]+$/, '').trim()}|${q.img ?? ''}`

export const emptyPool = (): PoolEdit => ({ off: [[], [], [], [], []], extra: [[], [], [], [], []] })

/** True when the edit changes nothing, so it can be dropped. */
export const isEmptyPool = (p: PoolEdit) => p.off.every((l) => !l.length) && p.extra.every((l) => !l.length)

/** The questions a game can draw from: the category's own, minus those taken out of play, plus the ones the host added. */
export function applyPool(cat: Category, edit?: PoolEdit): Category {
  if (!edit) return cat
  return {
    ...cat,
    levels: cat.levels.map((pool, i) => {
      const off = new Set(edit.off[i] ?? [])
      return [...pool, ...(edit.extra[i] ?? [])].filter((q) => !off.has(q.id))
    }),
  }
}

/**
 * Keeps the rulings of the chosen school of fiqh. Questions all schools agree on (no `sch`) always stay.
 * A level that would be left empty keeps its full pool, so the category stays playable.
 */
export function filterMadhhab(cat: Category, madhhab: Madhhab): Category {
  if (!madhhab) return cat
  return {
    ...cat,
    levels: cat.levels.map((pool) => {
      const kept = pool.filter((q) => !q.sch || q.sch.includes(madhhab))
      return kept.length ? kept : pool
    }),
  }
}

/** Questions in play per level, from the level sizes alone (built-in packs aren't loaded until a game starts). */
export function poolCounts(counts: number[], edit?: PoolEdit): number[] {
  if (!edit) return counts
  return counts.map((n, i) => Math.max(0, n + (edit.extra[i]?.length ?? 0) - (edit.off[i]?.length ?? 0)))
}

export function isPlayable(cat: Pick<Category, 'levels'>) {
  return cat.levels.length === 5 && cat.levels.every((l) => l.length > 0)
}

/** Chooses `count` distinct golden tiles, never in the 100 row. */
export function chooseGolden(cols: number, count: number, rng: Rng = Math.random): Set<string> {
  const slots: string[] = []
  for (let c = 0; c < cols; c++) for (let l = 1; l < 5; l++) slots.push(`${c}-${l}`)
  const out = new Set<string>()
  const n = Math.min(count, slots.length)
  while (out.size < n) out.add(pick(slots, rng))
  return out
}

/**
 * Places Steal and Audience tiles on slots that are not golden and not in the 100 row.
 * Returns tile key -> kind. Asks for more than there is room for simply place fewer.
 */
export function chooseSpecials(cols: number, golden: Set<string>, counts: { steal?: number; crowd?: number }, rng: Rng = Math.random): Map<string, Special> {
  const free: string[] = []
  for (let c = 0; c < cols; c++) for (let l = 1; l < 5; l++) if (!golden.has(`${c}-${l}`)) free.push(`${c}-${l}`)
  const out = new Map<string, Special>()
  const place = (kind: Special, n: number) => {
    for (let k = 0; k < n && free.length; k++) out.set(free.splice(Math.floor(rng() * free.length), 1)[0], kind)
  }
  place('steal', Math.max(0, Math.min(3, Math.floor(counts.steal ?? 0))))
  place('crowd', Math.max(0, Math.min(2, Math.floor(counts.crowd ?? 0))))
  return out
}

/** Points for each right answer in the lightning round, for the final question, and for a streak of three. */
export const LIGHTNING_VALUE = 100
export const LIGHTNING_SECS = 60
export const LIGHTNING_MAX = 25
export const FINAL_VALUE = 500
export const FINAL_SECS = 30
export const STREAK_AT = 3
export const STREAK_BONUS = 100

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Special rounds: how many items, the points for a right answer, and the points per clue still hidden in clue-by-clue. */
export const MODE_COUNT = 6
export const MODE_MIN = 3
export const MODE_VALUE = 200
export const CLUE_STEP = 100

/** Points a clue-by-clue item is worth with `shown` clues showing: fewer clues, more points. */
export function cluePoints(item: ModeItem, shown: number) {
  const n = item.q.split(' | ').length
  return CLUE_STEP * Math.max(1, n - Math.max(1, shown) + 1)
}

/** The clues of a clue-by-clue item, hardest first. */
export const cluesOf = (item: ModeItem) => item.q.split(' | ').map((s) => s.trim())

/** The items of an odd-one-out item. */
export const oddItems = (item: ModeItem) => item.q.split(' | ').map((s) => s.trim())

/** Every item a category can give a special round. Picture rounds use its picture questions. */
export function modeItemsOf(cat: Category, mode: RoundMode): ModeItem[] {
  if (mode === 'picture') return cat.levels.flat().filter((q) => q.img).map(({ id, q, a, img }) => ({ id, q, a, img, cat: cat.name, from: cat.id }))
  return (cat.modes?.[mode] ?? []).map((x) => ({ ...x, cat: cat.name, from: cat.id }))
}

/**
 * Draws the special round: items from the game's own categories first, then from `more`
 * (other built-in categories that have this kind of item), so any game can have any round.
 * Items already on the board or seen before are left for last. Returns null when there are too few.
 */
export function drawModeRound(mode: RoundMode, cats: Category[], more: Category[], skip: Set<string>, rng: Rng = Math.random, never?: Set<string>): ModeItem[] | null {
  const own = shuffle(cats.flatMap((c) => modeItemsOf(c, mode)), rng)
  const others = shuffle(more.filter((c) => !cats.some((x) => x.id === c.id)).flatMap((c) => modeItemsOf(c, mode)), rng)
  // Items in `never` (on this game's board already) are left out altogether when there are enough others.
  const every = [...own, ...others]
  const notInGame = every.filter((x) => !never || ((!x.id || !never.has(x.id)) && !never.has(clueKey(x))))
  const all = notInGame.length >= MODE_MIN ? notInGame : every
  const fresh = all.filter((x) => !x.id || !skip.has(x.id))
  const seen = all.filter((x) => x.id && skip.has(x.id))
  const list = [...fresh, ...seen].slice(0, MODE_COUNT)
  return list.length >= MODE_MIN ? list : null
}

/**
 * Draws one board: a question per level from each category, golden and special tiles placed at random.
 * `used` (question ids already played, per category) is updated in place. `mult` scales every tile's points.
 */
export function drawBoard(cats: Category[], tiles: TileCounts, used: Record<string, string[]>, rng: Rng = Math.random, mult = 1, taken: Set<string> = new Set()): Clue[][] {
  const golden = chooseGolden(cats.length, tiles.golden, rng)
  const specials = chooseSpecials(cats.length, golden, tiles, rng)
  return cats.map((cat, c) => {
    const { picks, used: u } = drawCategory(cat, used[cat.id] ?? [], rng, taken)
    used[cat.id] = u
    return picks.map((q, l) => {
      const isGold = golden.has(`${c}-${l}`)
      const clue: Clue = { ...q, value: VALUES[l] * mult * (isGold ? 2 : 1), golden: isGold }
      const sp = specials.get(`${c}-${l}`)
      if (sp) clue.special = sp
      return clue
    })
  })
}

export function createGame(
  cats: Category[],
  teamNames: string[],
  settings: GameSettings & TileCounts,
  usedByCat: Record<string, string[]>,
  rng: Rng = Math.random,
  /** Other categories a special round may borrow items from */
  more: Category[] = [],
): { game: Game; used: Record<string, string[]>; taken?: Set<string> } {
  if (cats.length < 1 || cats.length > 6) throw new Error('Pick between 1 and 6 categories')
  if (teamNames.length < 2 || teamNames.length > 4) throw new Error('Play with 2 to 4 teams')
  const nextUsed = { ...usedByCat }
  const taken = new Set<string>()
  const clues = drawBoard(cats, settings, nextUsed, rng, 1, taken)
  const game: Game = {
    cats: cats.map(({ id, name, nameAr, respect }) => ({ id, name, nameAr, ...(respect ? { respect } : {}) })),
    clues,
    teams: teamNames.map((name) => ({ name: name.trim() || 'Team', score: 0 })),
    used: [],
    settings: cleanSettings(settings),
    startedAt: Date.now(),
    // A random team picks first; then the turn passes round the teams one at a time.
    turn: Math.floor(rng() * teamNames.length),
  }
  if (game.settings.gameMinutes) game.endsAt = game.startedAt + game.settings.gameMinutes * 60_000
  if (game.settings.streak) game.streaks = game.teams.map(() => 0)

  // Extra questions for the lightning round and the final, never ones already on the board.
  const onBoard = new Set(clues.flat().map((q) => q.id))
  const fresh = (cat: Category, levels: number[]) => {
    const seen = new Set(nextUsed[cat.id] ?? [])
    const all = levels.flatMap((l) => cat.levels[l] ?? []).filter((q) => !onBoard.has(q.id) && !q.img && !taken.has(clueKey(q)))
    const unseen = all.filter((q) => !seen.has(q.id))
    return unseen.length ? unseen : all
  }
  const take = (q: Question, catId: string) => {
    onBoard.add(q.id)
    taken.add(clueKey(q))
    nextUsed[catId] = [...(nextUsed[catId] ?? []), q.id]
  }
  if (game.settings.mode) {
    const seen = new Set([...onBoard, ...Object.values(nextUsed).flat()])
    const items = drawModeRound(game.settings.mode, cats, more, seen, rng, new Set([...onBoard, ...taken]))
    if (items) {
      game.modeRound = { mode: game.settings.mode, items }
      for (const it of items) {
        taken.add(clueKey(it))
        if (!it.id) continue
        onBoard.add(it.id)
        if (it.from) nextUsed[it.from] = [...(nextUsed[it.from] ?? []), it.id]
      }
    } else delete game.settings.mode
  }
  if (game.settings.final) {
    for (const ci of shuffle(cats.map((_, i) => i), rng)) {
      const pool = fresh(cats[ci], [4])
      if (!pool.length) continue
      const q = pick(pool, rng)
      take(q, cats[ci].id)
      const { id, name, nameAr } = cats[ci]
      game.final = { cat: { id, name, nameAr }, q: { ...q } }
      break
    }
    if (!game.final) game.settings.final = false
  }
  if (game.settings.lightning) {
    // Short, quick questions: the two easiest levels, a few from every category in turn.
    const perCat = cats.map((cat) => shuffle(fresh(cat, [0, 1]), rng))
    const list: Question[] = []
    for (let round = 0; list.length < LIGHTNING_MAX && perCat.some((p) => p.length > round); round++)
      perCat.forEach((p, ci) => {
        if (list.length < LIGHTNING_MAX && p[round] && !taken.has(clueKey(p[round]))) {
          list.push({ ...p[round] })
          take(p[round], cats[ci].id)
        }
      })
    if (list.length >= 5) game.lightning = list
    else game.settings.lightning = false
  }
  return { game, used: nextUsed, taken }
}

/** Tournament limits: rounds in a plan, and categories the host may pick (split across the boards). */
export const TOUR_MAX_ROUNDS = 8
export const TOUR_MAX_CATS = 12
/** Ready-made plans. Special rounds the categories can't fill are swapped or left out when the game is made. */
export const TOUR_PLANS: Record<'short' | 'full', TourStep[]> = {
  short: [{ kind: 'board' }, { kind: 'mode', mode: 'picture' }, { kind: 'lightning' }, { kind: 'final' }],
  full: [{ kind: 'board' }, { kind: 'mode', mode: 'picture' }, { kind: 'double' }, { kind: 'mode', mode: 'clues' }, { kind: 'lightning' }, { kind: 'final' }],
}

/**
 * Tidies a plan: known kinds only, special rounds need a known mode, at most one lightning round,
 * at most one final and always last, at least one board, and no more than TOUR_MAX_ROUNDS rounds.
 */
export function cleanPlan(plan: TourStep[]): TourStep[] {
  const ok = plan.filter((r) => r && (TOUR_KINDS as readonly string[]).includes(r.kind) && (r.kind !== 'mode' || (ROUND_MODES as readonly string[]).includes(r.mode ?? '')))
  const out: TourStep[] = []
  let lightning = false
  for (const r of ok) {
    if (r.kind === 'final') continue
    if (r.kind === 'lightning') {
      if (lightning) continue
      lightning = true
    }
    out.push(r.kind === 'mode' ? { kind: 'mode', mode: r.mode } : { kind: r.kind })
  }
  if (!out.some((r) => r.kind === 'board' || r.kind === 'double')) out.unshift({ kind: 'board' })
  const hasFinal = ok.some((r) => r.kind === 'final')
  const max = TOUR_MAX_ROUNDS - (hasFinal ? 1 : 0)
  const kept = out.slice(0, max)
  if (!kept.some((r) => r.kind === 'board' || r.kind === 'double')) kept[kept.length - 1] = { kind: 'board' }
  return hasFinal ? [...kept, { kind: 'final' }] : kept
}

/** How many board rounds (plain or double) a plan has. */
export const boardRounds = (plan: TourStep[]) => plan.filter((r) => r.kind === 'board' || r.kind === 'double').length

/**
 * Shares the picked categories out between the board rounds. Up to 6 categories: every board uses all of them,
 * each time with new questions. More than 6: they are dealt out in turn so each board gets its own set (6 at most).
 * Throws when there are more than the boards can hold.
 */
export function splitCategories<T>(cats: T[], boards: number): T[][] {
  const n = Math.max(1, boards)
  if (cats.length <= 6) return Array.from({ length: n }, () => cats)
  if (cats.length > n * 6) throw new Error(`A board holds up to 6 categories, so ${n === 1 ? 'one board' : `${n} boards`} can take ${n * 6} at most`)
  const groups: T[][] = Array.from({ length: n }, () => [])
  cats.forEach((c, i) => groups[i % n].push(c))
  return groups
}

/**
 * Makes a tournament: every round is drawn now, so nothing repeats from round to round.
 * `groups` holds each board round's categories in order (see splitCategories). The lightning and final questions
 * come from the first board's categories; special rounds may use them all. A special round that can't be filled is left out. Scores carry over from round to round.
 */
export function createTournament(
  groups: Category[][],
  teamNames: string[],
  settings: GameSettings & TileCounts,
  plan: TourStep[],
  usedByCat: Record<string, string[]>,
  rng: Rng = Math.random,
  more: Category[] = [],
): { game: Game; used: Record<string, string[]> } {
  const steps = cleanPlan(plan)
  if (groups.length < 1 || groups.some((g) => g.length < 1 || g.length > 6)) throw new Error('Every board needs between 1 and 6 categories')
  const all: Category[] = []
  for (const g of groups) for (const c of g) if (!all.some((x) => x.id === c.id)) all.push(c)
  const firstMode = steps.find((r) => r.kind === 'mode')?.mode
  const rest: GameSettings & TileCounts = { ...settings }
  delete rest.lightning
  delete rest.final
  delete rest.mode
  // The base game draws the first board, the first special round, the lightning questions and the final.
  const base = createGame(groups[0], teamNames, { ...rest, lightning: steps.some((r) => r.kind === 'lightning'), final: steps.some((r) => r.kind === 'final'), ...(firstMode ? { mode: firstMode } : {}) }, usedByCat, rng, [...all.slice(groups[0].length), ...more])
  const game = base.game
  const used = base.used
  const taken = base.taken ?? new Set<string>()
  const seen = () => new Set([...game.clues.flat().map((q) => q.id), ...Object.values(used).flat()])
  const rounds: TourRound[] = []
  let b = 0
  let firstModeUsed = false
  for (const st of steps) {
    if (st.kind === 'board' || st.kind === 'double') {
      const cats = groups[b % groups.length]
      const mult = st.kind === 'double' ? 2 : 1
      const clues = b === 0 ? game.clues.map((col) => col.map((q) => ({ ...q, value: q.value * mult }))) : drawBoard(cats, settings, used, rng, mult, taken)
      rounds.push({ kind: st.kind, cats: cats.map(({ id, name, nameAr }) => ({ id, name, nameAr })), clues })
      b++
    } else if (st.kind === 'mode') {
      let items: ModeItem[] | null = null
      if (!firstModeUsed && game.modeRound && st.mode === game.modeRound.mode) {
        items = game.modeRound.items
        firstModeUsed = true
      } else {
        items = drawModeRound(st.mode!, all, more, seen(), rng, taken)
        for (const it of items ?? []) {
          taken.add(clueKey(it))
          if (it.id && it.from) used[it.from] = [...(used[it.from] ?? []), it.id]
        }
      }
      if (items) rounds.push({ kind: 'mode', mode: st.mode, items })
    } else if (st.kind === 'lightning') {
      if (game.lightning?.length) rounds.push({ kind: 'lightning' })
    } else if (st.kind === 'final') {
      if (game.final) rounds.push({ kind: 'final' })
    }
  }
  delete game.modeRound
  delete game.settings.mode
  return { game: enterRound({ ...game, tournament: { rounds, at: 0, intro: true } }, 0), used }
}

/** Moves a tournament to round k: puts that round's board or items in place and shows its title card. */
export function enterRound(game: Game, k: number): Game {
  const tour = game.tournament
  const r = tour?.rounds[k]
  if (!tour || !r) return game
  const g: Game = { ...game, tournament: { ...tour, at: k, intro: true } }
  if ((r.kind === 'board' || r.kind === 'double') && r.cats && r.clues) {
    g.cats = r.cats
    g.clues = r.clues
    g.used = []
    g.mult = r.kind === 'double' ? 2 : 1
    g.stage = 'board'
  } else if (r.kind === 'mode' && r.mode && r.items) {
    g.modeRound = { mode: r.mode, items: r.items }
    delete g.modeState
    g.stage = 'mode'
  } else if (r.kind === 'lightning') {
    delete g.lightningState
    g.stage = 'lightning'
  } else if (r.kind === 'final') {
    delete g.finalState
    g.stage = 'final'
  }
  return g
}

/** The next round of a tournament, or null after the last one. */
export function nextRound(game: Game): number | null {
  const t = game.tournament
  if (!t) return null
  return t.at + 1 < t.rounds.length ? t.at + 1 : null
}

/** Time limits the host can choose (seconds per clue, minutes per game). */
export const CLUE_SECS = [10, 15, 20, 30, 45, 60, 90, 120, 180]
export const GAME_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120]
const okSecs = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 5 && n <= 600

function cleanSettings(s: GameSettings): GameSettings {
  const out: GameSettings = { timer: okSecs(s.timer) ? s.timer : 0, deduct: !!s.deduct }
  if (Array.isArray(s.levelTimers) && s.levelTimers.some(okSecs)) out.levelTimers = [0, 1, 2, 3, 4].map((i) => (okSecs(s.levelTimers![i]) ? s.levelTimers![i] : null))
  if (typeof s.gameMinutes === 'number' && s.gameMinutes > 0 && s.gameMinutes <= 600) out.gameMinutes = Math.round(s.gameMinutes)
  for (const k of ['streak', 'comeback', 'lightning', 'final'] as const) if (s[k] === true) out[k] = true
  if (s.mode && (ROUND_MODES as readonly string[]).includes(s.mode)) out.mode = s.mode
  return out
}

/** A question's own seconds win, then the level's, then the game's seconds per clue. 0 means no timer. */
export function clueSeconds(settings: GameSettings, level: number, q?: { secs?: number }): number {
  if (q && okSecs(q.secs)) return q.secs
  const l = settings.levelTimers?.[level]
  if (okSecs(l)) return l
  return okSecs(settings.timer) ? settings.timer : 0
}

/** Accepts a per-question time from a file or storage: whole seconds between 5 and 600. */
export const isClueSecs = okSecs

export const tileKey = (c: number, l: number) => `${c}-${l}`

/** Adds or removes points for one team. Returns a new game. */
export function score(game: Game, team: number, delta: number): Game {
  return { ...game, teams: game.teams.map((t, i) => (i === team ? { ...t, score: t.score + delta } : t)) }
}

/** Largest single hand adjustment the host can make, so a typo can't wreck a score. */
export const MAX_ADJUST = 10_000

/**
 * Host's manual correction (an overturned ruling, a wrong answer key, a penalty).
 * Rounds to whole points; ignores amounts that are zero, not numbers, too large, or for a team that doesn't exist.
 */
export function adjustScore(game: Game, team: number, delta: number): Game {
  const d = Math.round(delta)
  if (!Number.isFinite(d) || d === 0 || Math.abs(d) > MAX_ADJUST) return game
  if (!Number.isInteger(team) || team < 0 || team >= game.teams.length) return game
  return score(game, team, d)
}

export function markUsed(game: Game, c: number, l: number): Game {
  const key = tileKey(c, l)
  if (game.used.includes(key)) return game
  return { ...game, used: [...game.used, key], turn: ((game.turn ?? 0) + 1) % game.teams.length }
}

/** The team whose turn it is to pick, or null when the game is over (or an old saved game has no turn). */
export function turnTeam(game: Game): number | null {
  if (isFinished(game) || game.turn === undefined) return null
  return game.turn
}

/**
 * A right answer on the board: adds the clue's points and, with the streak bonus on, counts the team's run.
 * Another team's right answer ends a run. Returns the new game and whether the team just hit a streak.
 */
export function answerRight(game: Game, team: number, points: number): { game: Game; streak: number; bonus: number } {
  let g = score(game, team, points)
  if (!game.settings.streak) return { game: g, streak: 0, bonus: 0 }
  const runs = game.teams.map((_, i) => (i === team ? (game.streaks?.[i] ?? 0) + 1 : 0))
  const bonus = runs[team] >= STREAK_AT && runs[team] % STREAK_AT === 0 ? STREAK_BONUS : 0
  if (bonus) g = score(g, team, bonus)
  return { game: { ...g, streaks: runs }, streak: runs[team], bonus }
}

/** A wrong answer ends that team's run. */
export function answerWrong(game: Game, team: number): Game {
  if (!game.settings.streak || !game.streaks?.[team]) return game
  return { ...game, streaks: game.streaks.map((n, i) => (i === team ? 0 : n)) }
}

/** Steal tile: the points move from one team to another (points only, nothing is wagered). */
export function steal(game: Game, from: number, to: number, points: number): Game {
  if (from === to || !game.teams[from] || !game.teams[to]) return game
  return score(score(game, to, points), from, -points)
}

/** Teams in last place, for comeback picks. Empty when everyone is level (nobody is behind). */
export function lastPlace(game: Game): number[] {
  const low = Math.min(...game.teams.map((t) => t.score))
  const at = game.teams.map((t, i) => (t.score === low ? i : -1)).filter((i) => i >= 0)
  return at.length === game.teams.length ? [] : at
}

/** What comes after the given stage: the special round, the lightning round, then the final question, then the results (null). */
export function nextStage(game: Game, after: Stage): Stage | null {
  const order: Stage[] = ['board', 'mode', 'lightning', 'final']
  for (const s of order.slice(order.indexOf(after) + 1)) {
    if (s === 'mode' && game.settings.mode && game.modeRound?.items.length) return s
    if (s === 'lightning' && game.settings.lightning && game.lightning?.length) return s
    if (s === 'final' && game.settings.final && game.final) return s
  }
  return null
}

export function isFinished(game: Game) {
  return game.used.length >= game.cats.length * 5
}

/** Teams sorted by score, with ties sharing a rank. */
export function standings(game: Game) {
  const sorted = game.teams.map((t, i) => ({ ...t, index: i })).sort((a, b) => b.score - a.score)
  let rank = 0
  return sorted.map((t, i) => {
    if (i === 0 || t.score !== sorted[i - 1].score) rank = i + 1
    return { ...t, rank }
  })
}

/** Validates and normalises a category from an imported file. Throws with a readable message. */
/** Limits for player-made categories, matching the builder's inputs. */
export const LIMITS = { name: 40, clue: 400, answer: 200, perLevel: 1000, fileBytes: 20_000_000 }

export function parseImportedCategory(raw: unknown, newId: () => string): Category {
  if (!raw || typeof raw !== 'object') throw new Error('The file does not contain a category')
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) throw new Error('The category needs a name')
  if (name.length > LIMITS.name) throw new Error(`The category name is longer than ${LIMITS.name} characters`)
  if (!Array.isArray(r.levels) || r.levels.length !== 5) throw new Error('The category needs exactly 5 difficulty levels')
  const id = newId()
  const levels = r.levels.map((lvl, li) => {
    if (!Array.isArray(lvl)) throw new Error(`Level ${VALUES[li]} is not a list of questions`)
    if (lvl.length > LIMITS.perLevel) throw new Error(`Level ${VALUES[li]} has more than ${LIMITS.perLevel} questions`)
    return lvl.map((item, qi) => {
      const pair: Record<string, unknown> = Array.isArray(item) ? { q: item[0], a: item[1] } : ((item ?? {}) as Record<string, unknown>)
      const q = typeof pair?.q === 'string' ? pair.q.trim() : ''
      const a = typeof pair?.a === 'string' ? pair.a.trim() : ''
      if (!q || !a) throw new Error(`Level ${VALUES[li]}, question ${qi + 1} needs both a clue and an answer`)
      if (q.length > LIMITS.clue || a.length > LIMITS.answer) throw new Error(`Level ${VALUES[li]}, question ${qi + 1} is too long (clue up to ${LIMITS.clue} characters, answer up to ${LIMITS.answer})`)
      const out: Question = { id: `${id}-${li}-${qi}`, q, a }
      if (typeof pair.qAr === 'string' && pair.qAr.trim()) out.qAr = pair.qAr.trim().slice(0, LIMITS.clue)
      if (typeof pair.aAr === 'string' && pair.aAr.trim()) out.aAr = pair.aAr.trim().slice(0, LIMITS.answer)
      if (isDiagram(pair.img)) out.img = pair.img
      if (okSecs(pair.secs)) out.secs = pair.secs
      return out
    })
  })
  const cat: Category = { id, name, builtIn: false, levels }
  if (typeof r.nameAr === 'string' && r.nameAr.trim()) cat.nameAr = r.nameAr.trim().slice(0, LIMITS.name)
  return cat
}

export function exportCategory(cat: Category) {
  return {
    format: 'get-grilled-category',
    version: 1,
    name: cat.name,
    nameAr: cat.nameAr,
    levels: cat.levels.map((l) => l.map(({ q, a, qAr, aAr, img, secs }) => ({ q, a, qAr, aAr, img, secs }))),
  }
}

/* ---------- Team introductions ---------- */

/** How long each team's introduction stays up when it moves on by itself. */
export const INTRO_MS = 9000
export const MAX_MEMBERS = 5
export const MEMBER_MAX = 24
export const ROLE_MAX = 30
export const FACT_MAX = 120

/** What the host typed for a team's introduction. */
export interface TeamDetails {
  members: { name: string; role: string }[]
  captain: number | null
  fact: string
}

/** Tidies what the host typed (trims, drops empty members, keeps lengths in bounds) and adds it to the game's teams, with the introductions switched on. */
export function withIntro(game: Game, details: TeamDetails[]): Game {
  const teams = game.teams.map((team, i) => {
    const d = details[i]
    if (!d) return team
    const kept = d.members.map((m, k) => ({ k, name: m.name.trim().slice(0, MEMBER_MAX), role: m.role.trim().slice(0, ROLE_MAX) })).filter((m) => m.name).slice(0, MAX_MEMBERS)
    const members = kept.map((m) => (m.role ? { name: m.name, role: m.role } : { name: m.name }))
    const cap = kept.findIndex((m) => m.k === d.captain)
    const fact = d.fact.trim().slice(0, FACT_MAX)
    return { ...team, ...(members.length ? { members } : {}), ...(cap >= 0 ? { captain: cap } : {}), ...(fact ? { fact } : {}) }
  })
  return { ...game, teams, intro: { i: 0, auto: true } }
}

/** The host pressed Start game: the introductions end, and the game's clocks start from now. */
export function finishIntro(game: Game, now = Date.now()): Game {
  const next: Game = { ...game, startedAt: now }
  delete next.intro
  if (game.settings.gameMinutes) next.endsAt = now + game.settings.gameMinutes * 60_000
  return next
}
