import { describe, expect, it } from 'vitest'
import { TOUR_MAX_ROUNDS, TOUR_PLANS, boardRounds, cleanPlan, createTournament, enterRound, nextRound, splitCategories } from '../src/lib/game'
import { cleanGameExtras, isValidGame } from '../src/lib/store'
import type { Category, ModeItem, TourStep } from '../src/lib/types'

let seed = 11
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

/** A category with `n` questions per level, a picture question in each level, and a few clue-by-clue items. */
function cat(id: string, n = 20): Category {
  const clues: ModeItem[] = Array.from({ length: 4 }, (_, i) => ({ id: `${id}-c${i}`, q: `Hard ${i} | Medium ${i} | Easy ${i}`, a: `A${i}` }))
  return {
    id,
    name: id.toUpperCase(),
    builtIn: true,
    levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: n }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `${id} q${l}.${i}`, a: `a${i}`, ...(i === 0 ? { img: 'packs/img/x.svg' } : {}) }))),
    modes: { clues },
  }
}
const settings = { timer: 30, deduct: true, golden: 1, steal: 1, crowd: 1, streak: true }

describe('tournament plans', () => {
  it('keeps one final at the end, one lightning round and at least one board', () => {
    const p = cleanPlan([{ kind: 'final' }, { kind: 'lightning' }, { kind: 'mode', mode: 'tf' }, { kind: 'lightning' }, { kind: 'final' }])
    expect(p).toEqual([{ kind: 'board' }, { kind: 'lightning' }, { kind: 'mode', mode: 'tf' }, { kind: 'final' }])
  })
  it('drops unknown rounds and caps the length', () => {
    const junk = [{ kind: 'nope' }, { kind: 'mode', mode: 'nope' }, { kind: 'mode' }] as unknown as TourStep[]
    expect(cleanPlan(junk)).toEqual([{ kind: 'board' }])
    const long = cleanPlan([...Array.from({ length: 12 }, (): TourStep => ({ kind: 'mode', mode: 'tf' })), { kind: 'final' }])
    expect(long).toHaveLength(TOUR_MAX_ROUNDS)
    expect(long.at(-1)).toEqual({ kind: 'final' })
    expect(boardRounds(long)).toBe(1)
  })
  it('ready-made plans are already tidy', () => {
    for (const p of Object.values(TOUR_PLANS)) expect(cleanPlan(p)).toEqual(p)
  })
})

describe('sharing categories between boards', () => {
  it('every board uses all of up to 6 categories', () => {
    expect(splitCategories([1, 2, 3], 2)).toEqual([[1, 2, 3], [1, 2, 3]])
  })
  it('deals more than 6 out in turn', () => {
    expect(splitCategories([1, 2, 3, 4, 5, 6, 7, 8], 2)).toEqual([[1, 3, 5, 7], [2, 4, 6, 8]])
  })
  it('refuses more than the boards can hold', () => {
    expect(() => splitCategories([1, 2, 3, 4, 5, 6, 7], 1)).toThrow(/up to 6/)
  })
})

describe('a full tournament', () => {
  const cats = [cat('a'), cat('b'), cat('c')]
  const make = (plan = TOUR_PLANS.full) => createTournament(splitCategories(cats, boardRounds(plan)), ['Red', 'Blue', 'Green'], settings, plan, {}, rng)

  it('draws every round up front, starting on the first title card', () => {
    const { game } = make()
    const t = game.tournament!
    expect(t.rounds.map((r) => (r.kind === 'mode' ? `mode:${r.mode}` : r.kind))).toEqual(['board', 'mode:picture', 'double', 'mode:clues', 'lightning', 'final'])
    expect(t.at).toBe(0)
    expect(t.intro).toBe(true)
    expect(game.stage).toBe('board')
    expect(game.lightning!.length).toBeGreaterThanOrEqual(5)
    expect(game.final).toBeTruthy()
  })

  it('never repeats a question between rounds', () => {
    const { game } = make()
    const ids: string[] = []
    for (const r of game.tournament!.rounds) {
      if (r.clues) ids.push(...r.clues.flat().map((q) => q.id))
      if (r.items) ids.push(...r.items.flatMap((x) => (x.id ? [x.id] : [])))
    }
    ids.push(...game.lightning!.map((q) => q.id), game.final!.q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the double-points board is worth twice as much, golden tiles four times', () => {
    const { game } = make()
    const d = game.tournament!.rounds[2]
    for (const col of d.clues!) col.forEach((q, l) => expect(q.value).toBe((l + 1) * 100 * 2 * (q.golden ? 2 : 1)))
    const g = enterRound(game, 2)
    expect(g.mult).toBe(2)
    expect(g.used).toEqual([])
  })

  it('moves round by round with the scores carried over', () => {
    let { game } = make()
    game = { ...game, teams: game.teams.map((t, i) => ({ ...t, score: (i + 1) * 100 })), used: ['0-0'] }
    const stages: (string | undefined)[] = [game.stage]
    for (let k = nextRound(game); k !== null; k = nextRound(game)) {
      game = enterRound(game, k)
      stages.push(game.stage)
      expect(game.teams.map((t) => t.score)).toEqual([100, 200, 300])
    }
    expect(stages).toEqual(['board', 'mode', 'board', 'mode', 'lightning', 'final'])
    expect(nextRound(game)).toBeNull()
  })

  it('leaves out a special round nothing can fill', () => {
    const plain: Category[] = cats.map((c) => ({ ...c, modes: {} }))
    const { game } = createTournament([plain], ['A', 'B'], settings, [{ kind: 'board' }, { kind: 'mode', mode: 'tf' }, { kind: 'final' }], {}, rng)
    expect(game.tournament!.rounds.map((r) => r.kind)).toEqual(['board', 'final'])
  })

  it('split categories give each board its own set', () => {
    const many = 'abcdefgh'.split('').map((x) => cat(x))
    const plan: TourStep[] = [{ kind: 'board' }, { kind: 'double' }]
    const { game } = createTournament(splitCategories(many, 2), ['A', 'B'], settings, plan, {}, rng)
    const [b1, b2] = game.tournament!.rounds
    expect(b1.cats!.map((c) => c.id)).toEqual(['a', 'c', 'e', 'g'])
    expect(b2.cats!.map((c) => c.id)).toEqual(['b', 'd', 'f', 'h'])
  })

  it('survives being saved and loaded, and a broken save loses only the tournament', () => {
    const { game } = make()
    const back = JSON.parse(JSON.stringify(enterRound(game, 2)))
    expect(isValidGame(back)).toBe(true)
    const clean = cleanGameExtras(back)
    expect(clean.tournament).toEqual(back.tournament)
    expect(clean.mult).toBe(2)
    const broken = { ...back, tournament: { ...back.tournament, rounds: [{ kind: 'board', cats: [], clues: 'x' }] } }
    expect(cleanGameExtras(broken).tournament).toBeUndefined()
    const badAt = { ...back, tournament: { ...back.tournament, at: 99 } }
    expect(cleanGameExtras(badAt).tournament).toBeUndefined()
  })
})
