import { VALUES, type Category, type Clue, type Game, type GameSettings, type Question } from './types'

export type Rng = () => number

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Picks one question per level, preferring ones not in `used`.
 * When every question in a level has been used, that level starts over.
 * Returns the picked questions and the updated used list for this category.
 */
export function drawCategory(cat: Category, used: string[], rng: Rng = Math.random): { picks: Question[]; used: string[] } {
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
    const q = pick(fresh, rng)
    picks.push(q)
    usedSet.add(q.id)
  })
  return { picks, used: [...usedSet] }
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

export function createGame(
  cats: Category[],
  teamNames: string[],
  settings: GameSettings & { golden: number },
  usedByCat: Record<string, string[]>,
  rng: Rng = Math.random,
): { game: Game; used: Record<string, string[]> } {
  if (cats.length < 1 || cats.length > 6) throw new Error('Pick between 1 and 6 categories')
  if (teamNames.length < 2 || teamNames.length > 4) throw new Error('Play with 2 to 4 teams')
  const golden = chooseGolden(cats.length, settings.golden, rng)
  const nextUsed = { ...usedByCat }
  const clues: Clue[][] = cats.map((cat, c) => {
    const { picks, used } = drawCategory(cat, usedByCat[cat.id] ?? [], rng)
    nextUsed[cat.id] = used
    return picks.map((q, l) => {
      const isGold = golden.has(`${c}-${l}`)
      return { ...q, value: VALUES[l] * (isGold ? 2 : 1), golden: isGold }
    })
  })
  const game: Game = {
    cats: cats.map(({ id, name, nameAr, respect }) => ({ id, name, nameAr, ...(respect ? { respect } : {}) })),
    clues,
    teams: teamNames.map((name) => ({ name: name.trim() || 'Team', score: 0 })),
    used: [],
    settings: { timer: settings.timer, deduct: settings.deduct },
    startedAt: Date.now(),
  }
  return { game, used: nextUsed }
}

export const tileKey = (c: number, l: number) => `${c}-${l}`

/** Adds or removes points for one team. Returns a new game. */
export function score(game: Game, team: number, delta: number): Game {
  return { ...game, teams: game.teams.map((t, i) => (i === team ? { ...t, score: t.score + delta } : t)) }
}

export function markUsed(game: Game, c: number, l: number): Game {
  const key = tileKey(c, l)
  return game.used.includes(key) ? game : { ...game, used: [...game.used, key] }
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
export const LIMITS = { name: 40, clue: 400, answer: 200, perLevel: 1000, fileBytes: 2_000_000 }

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
    levels: cat.levels.map((l) => l.map(({ q, a, qAr, aAr }) => ({ q, a, qAr, aAr }))),
  }
}
