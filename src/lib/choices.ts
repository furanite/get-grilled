/**
 * Multiple choice for the audience's phones. The question packs have one right answer and no wrong
 * options, so the three wrong options are taken from other answers in the same category's pool,
 * preferring the same level. Answers of any question drawn for this game are never used, so the
 * phones can't give away the answers to tiles still on the board.
 */
import type { Category, Game } from './types'
import { loadPack } from './packs'
import { loadCustom } from './store'

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** A small seeded random number source, so the same clue always gets the same options in the same order. */
function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Up to `wrong` wrong options for `correct`, from `pool` (answers per level), level `level` first.
 * Leaves out anything in `avoid` and anything that reads the same as the right answer.
 */
export function makeChoices(correct: string, pool: string[][], level: number, avoid: string[], seed: string, wrong = 3): { choices: string[]; correct: number } {
  const r = rng(seed)
  const banned = new Set([norm(correct), ...avoid.map(norm)])
  const picked: string[] = []
  const order = [level, level - 1, level + 1, level - 2, level + 2, level - 3, level + 3, level - 4, level + 4].filter((l) => l >= 0 && l < pool.length)
  for (const l of order) {
    const options = pool[l].filter((a) => a && a.length <= 120 && !banned.has(norm(a)))
    while (options.length && picked.length < wrong) {
      const a = options.splice(Math.floor(r() * options.length), 1)[0]
      if (banned.has(norm(a))) continue
      banned.add(norm(a))
      picked.push(a)
    }
    if (picked.length >= wrong) break
  }
  const all = [correct, ...picked]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return { choices: all, correct: all.indexOf(correct) }
}

/** Every answer drawn for this game, in any round: none of them may appear as a wrong option. */
export function gameAnswers(g: Game): string[] {
  const out: string[] = []
  for (const col of g.clues) for (const c of col) out.push(c.a, c.aAr ?? '')
  for (const q of g.lightning ?? []) out.push(q.a)
  if (g.final) out.push(g.final.q.a)
  for (const r of g.tournament?.rounds ?? []) for (const col of r.clues ?? []) for (const c of col) out.push(c.a)
  return out.filter(Boolean)
}

const pools = new Map<string, Promise<Category | null>>()
async function categoryPool(id: string): Promise<Category | null> {
  const custom = loadCustom().find((c) => c.id === id)
  if (custom) return custom
  if (!pools.has(id)) pools.set(id, loadPack(id).catch(() => null))
  return pools.get(id)!
}

/** The options for clue (c, l) of the game, with which one is right. */
export async function clueChoices(g: Game, c: number, l: number, lang: 'en' | 'ar'): Promise<{ q: string; choices: string[]; correct: number } | null> {
  const clue = g.clues[c]?.[l]
  if (!clue) return null
  const ar = lang === 'ar' && !!clue.aAr
  const right = ar ? clue.aAr! : clue.a
  const cat = await categoryPool(g.cats[c].id)
  const pool = cat ? cat.levels.map((lv) => lv.map((q) => (ar ? q.aAr ?? '' : q.a))) : [[], [], [], [], []]
  // A small category may not have enough: fall back to the other categories' pools.
  let made = makeChoices(right, pool, l, gameAnswers(g), clue.id)
  if (made.choices.length < 4) {
    for (const other of g.cats) {
      if (other.id === g.cats[c].id || made.choices.length >= 4) continue
      const o = await categoryPool(other.id)
      if (!o) continue
      const merged = pool.map((lv, i) => [...lv, ...o.levels[i].map((q) => (ar ? q.aAr ?? '' : q.a))])
      made = makeChoices(right, merged, l, gameAnswers(g), clue.id)
    }
  }
  if (made.choices.length < 2) return null
  return { q: ar && clue.qAr ? clue.qAr : clue.q, ...made }
}
