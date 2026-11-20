import { describe, expect, it } from 'vitest'
import { createGame, createTournament, drawCategory, ROW_LEVELS, rowLevels } from '../src/lib/game'
import type { Category } from '../src/lib/types'

function seeded(seed = 1) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function makeCat(id: string, perLevel: number): Category {
  return {
    id,
    name: id,
    builtIn: true,
    levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: perLevel }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `${id} Q${l}-${i}`, a: `A${l}-${i}` }))),
  }
}
const levelOf = (id: string) => +id.split('-')[1]
const base = { timer: 30, deduct: true, golden: 0 }

describe('overall difficulty', () => {
  it('maps rows to levels', () => {
    expect(rowLevels()).toEqual([[0], [1], [2], [3], [4]])
    expect(rowLevels('easy')).toEqual([[0], [0], [1], [2], [3]])
    expect(rowLevels('balanced')).toEqual([[0], [0, 1], [1, 2], [2, 3], [3, 4]])
    expect(rowLevels('hard')).toEqual([[1], [2], [3], [4], [4]])
    expect(rowLevels('bogus' as never)).toEqual(ROW_LEVELS.standard)
  })

  for (const d of ['easy', 'balanced', 'standard', 'hard'] as const) {
    it(`${d}: every row draws from its mapped level, points unchanged, no repeats on the board`, () => {
      for (let g = 0; g < 20; g++) {
        const { game } = createGame([makeCat('a', 6), makeCat('b', 6)], ['A', 'B'], { ...base, difficulty: d, lightning: true, final: true }, {}, seeded(g + 1))
        for (const col of game.clues) {
          col.forEach((c, r) => expect(ROW_LEVELS[d][r]).toContain(levelOf(c.id)))
          expect(col.map((c) => c.value)).toEqual([100, 200, 300, 400, 500])
          expect(new Set(col.map((c) => c.id)).size).toBe(5)
        }
        expect(ROW_LEVELS[d][4]).toContain(levelOf(game.final!.q.id))
        const light = new Set([...ROW_LEVELS[d][0], ...ROW_LEVELS[d][1]])
        for (const q of game.lightning ?? []) expect(light.has(levelOf(q.id))).toBe(true)
        const tie = new Set([...ROW_LEVELS[d][2], ...ROW_LEVELS[d][3]])
        for (const t of game.tiebreak ?? []) expect(tie.has(levelOf(t.q.id))).toBe(true)
        const all = [...game.clues.flat().map((c) => c.id), game.final!.q.id, ...(game.lightning ?? []).map((q) => q.id), ...(game.tiebreak ?? []).map((t) => t.q.id)]
        expect(new Set(all).size).toBe(all.length)
      }
    })
  }

  it('keeps the setting on the game, and leaves standard out', () => {
    expect(createGame([makeCat('a', 5)], ['A', 'B'], { ...base, difficulty: 'easy' }, {}, seeded()).game.settings.difficulty).toBe('easy')
    expect(createGame([makeCat('a', 5)], ['A', 'B'], { ...base, difficulty: 'balanced' }, {}, seeded()).game.settings.difficulty).toBe('balanced')
    expect(createGame([makeCat('a', 5)], ['A', 'B'], { ...base, difficulty: 'standard' }, {}, seeded()).game.settings.difficulty).toBeUndefined()
  })

  it('easy: shared level never gives the same question twice, even with two questions in it', () => {
    const cat = makeCat('x', 2)
    let used: string[] = []
    for (let g = 0; g < 10; g++) {
      const r = drawCategory(cat, used, seeded(g + 7), undefined, ROW_LEVELS.easy)
      expect(r.picks[0].id).not.toBe(r.picks[1].id)
      used = r.used
    }
  })

  it('easy: goes through the whole easiest level before repeating', () => {
    const cat = makeCat('x', 10)
    let used: string[] = []
    const seen: string[] = []
    for (let g = 0; g < 5; g++) {
      const r = drawCategory(cat, used, seeded(g + 1), undefined, ROW_LEVELS.easy)
      seen.push(r.picks[0].id, r.picks[1].id)
      used = r.used
    }
    expect(new Set(seen).size).toBe(10)
  })

  it('balanced: over many games, rows above 100 use both of their levels', () => {
    const seen = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()]
    for (let g = 0; g < 40; g++) createGame([makeCat('a', 30)], ['A', 'B'], { ...base, difficulty: 'balanced' }, {}, seeded(g + 11)).game.clues[0].forEach((c, r) => seen[r].add(levelOf(c.id)))
    expect(seen.map((s) => [...s].sort())).toEqual([[0], [0, 1], [1, 2], [2, 3], [3, 4]])
  })

  it('tournament boards follow the difficulty', () => {
    const { game } = createTournament([[makeCat('a', 8)]], ['A', 'B'], { ...base, difficulty: 'hard' }, [{ kind: 'board' }, { kind: 'double' }], {}, seeded(3))
    for (const r of game.tournament!.rounds) for (const col of r.clues ?? []) expect(col.map((c) => levelOf(c.id))).toEqual(ROW_LEVELS.hard.map((l) => l[0]))
  })
})
