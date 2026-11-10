import { describe, expect, it } from 'vitest'
import { chooseGolden, createGame, drawCategory, exportCategory, isFinished, isPlayable, markUsed, parseImportedCategory, score, standings } from '../src/lib/game'
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
    levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: perLevel }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `Q${l}-${i}`, a: `A${l}-${i}` }))),
  }
}

describe('drawCategory', () => {
  it('picks one question from each level, in level order', () => {
    const { picks } = drawCategory(makeCat('x', 10), [], seeded())
    expect(picks).toHaveLength(5)
    picks.forEach((p, l) => expect(p.id.startsWith(`x-${l}-`)).toBe(true))
  })

  it('never repeats a question until the level runs out', () => {
    const cat = makeCat('x', 7)
    let used: string[] = []
    const seen = new Set<string>()
    for (let g = 0; g < 7; g++) {
      const r = drawCategory(cat, used, seeded(g + 3))
      r.picks.forEach((p) => {
        expect(seen.has(p.id)).toBe(false)
        seen.add(p.id)
      })
      used = r.used
    }
    expect(seen.size).toBe(35)
    // Eighth game: every level is exhausted, so it starts over without crashing
    const r = drawCategory(cat, used, seeded(99))
    expect(r.picks).toHaveLength(5)
    expect(r.used.length).toBe(5)
  })

  it('resets only the level that ran out', () => {
    const cat = makeCat('x', 2)
    cat.levels[4] = [...cat.levels[4], { id: 'x-4-extra', q: 'e', a: 'e' }]
    let used: string[] = []
    for (let g = 0; g < 2; g++) used = drawCategory(cat, used, seeded(g + 1)).used
    const r = drawCategory(cat, used, seeded(5))
    expect(r.picks[4].id).toBe('x-4-extra')
  })

  it('ignores used ids from other categories', () => {
    const r = drawCategory(makeCat('x', 1), ['y-0-0', 'y-1-0'], seeded())
    expect(r.used).toContain('y-0-0')
  })

  it('throws a readable error for an empty level', () => {
    const cat = makeCat('x', 3)
    cat.levels[2] = []
    expect(() => drawCategory(cat, [])).toThrow(/empty level/)
    expect(isPlayable(cat)).toBe(false)
    expect(isPlayable(makeCat('y', 1))).toBe(true)
  })

  it('spreads picks across the pool', () => {
    const cat = makeCat('x', 100)
    const counts = new Map<string, number>()
    const rng = seeded(7)
    for (let i = 0; i < 2000; i++) {
      const id = drawCategory(cat, [], rng).picks[0].id
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(counts.size).toBeGreaterThan(95)
  })
})

describe('chooseGolden', () => {
  it('returns the requested number of distinct tiles outside the 100 row', () => {
    for (let s = 1; s < 50; s++) {
      const g = chooseGolden(6, 3, seeded(s))
      expect(g.size).toBe(3)
      g.forEach((k) => {
        const [c, l] = k.split('-').map(Number)
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(6)
        expect(l).toBeGreaterThanOrEqual(1)
        expect(l).toBeLessThanOrEqual(4)
      })
    }
  })
  it('handles zero and more tiles than exist', () => {
    expect(chooseGolden(6, 0).size).toBe(0)
    expect(chooseGolden(1, 10).size).toBe(4)
  })
})

describe('createGame', () => {
  const cats = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeCat(id, 5))

  it('builds a board with values 100 to 500 and doubles golden tiles', () => {
    const { game, used } = createGame(cats, ['One', 'Two'], { timer: 30, deduct: true, golden: 2 }, {}, seeded(4))
    expect(game.cats).toHaveLength(6)
    expect(game.clues.every((col) => col.length === 5)).toBe(true)
    let golden = 0
    game.clues.forEach((col) =>
      col.forEach((clue, l) => {
        const base = (l + 1) * 100
        if (clue.golden) {
          golden++
          expect(clue.value).toBe(base * 2)
        } else expect(clue.value).toBe(base)
      }),
    )
    expect(golden).toBe(2)
    expect(Object.keys(used)).toHaveLength(6)
    expect(game.teams).toEqual([{ name: 'One', score: 0 }, { name: 'Two', score: 0 }])
  })

  it('rejects too few or too many categories and teams', () => {
    const s = { timer: 0, deduct: false, golden: 0 }
    expect(() => createGame([], ['a', 'b'], s, {})).toThrow()
    expect(() => createGame([...cats, makeCat('g', 1)], ['a', 'b'], s, {})).toThrow()
    expect(() => createGame(cats, ['a'], s, {})).toThrow()
    expect(() => createGame(cats, ['a', 'b', 'c', 'd', 'e'], s, {})).toThrow()
  })

  it('carries used questions between games', () => {
    const one = [makeCat('solo', 2)]
    const s = { timer: 0, deduct: false, golden: 0 }
    const g1 = createGame(one, ['a', 'b'], s, {}, seeded(1))
    const g2 = createGame(one, ['a', 'b'], s, g1.used, seeded(2))
    g1.game.clues[0].forEach((c, l) => expect(g2.game.clues[0][l].id).not.toBe(c.id))
  })
})

describe('scoring', () => {
  const base = createGame([makeCat('a', 1), makeCat('b', 1)], ['A', 'B', 'C'], { timer: 0, deduct: true, golden: 0 }, {}).game

  it('adds and subtracts points without touching other teams', () => {
    let g = score(base, 1, 300)
    g = score(g, 1, -100)
    g = score(g, 0, -200)
    expect(g.teams.map((t) => t.score)).toEqual([-200, 200, 0])
    expect(base.teams[1].score).toBe(0)
  })

  it('marks tiles used once and knows when the board is done', () => {
    let g = base
    for (let c = 0; c < 2; c++) for (let l = 0; l < 5; l++) g = markUsed(markUsed(g, c, l), c, l)
    expect(g.used).toHaveLength(10)
    expect(isFinished(g)).toBe(true)
    expect(isFinished(base)).toBe(false)
  })

  it('ranks teams and shares ranks on ties', () => {
    let g = score(base, 0, 500)
    g = score(g, 2, 500)
    const s = standings(g)
    expect(s.map((r) => [r.name, r.rank])).toEqual([
      ['A', 1],
      ['C', 1],
      ['B', 3],
    ])
  })
})

describe('import and export', () => {
  it('round-trips a category', () => {
    const cat = makeCat('orig', 3)
    cat.name = 'Fluids'
    cat.nameAr = 'الموائع'
    cat.levels[0][0].qAr = 'سؤال'
    const back = parseImportedCategory(JSON.parse(JSON.stringify(exportCategory(cat))), () => 'new1')
    expect(back.id).toBe('new1')
    expect(back.builtIn).toBe(false)
    expect(back.name).toBe('Fluids')
    expect(back.nameAr).toBe('الموائع')
    expect(back.levels.map((l) => l.length)).toEqual([3, 3, 3, 3, 3])
    expect(back.levels[0][0]).toMatchObject({ id: 'new1-0-0', q: 'Q0-0', a: 'A0-0', qAr: 'سؤال' })
  })

  it('accepts [clue, answer] pairs and trims text', () => {
    const c = parseImportedCategory({ name: '  Mix ', levels: [[['  q1 ', ' a1 ']], [], [], [], []] }, () => 'z')
    expect(c.name).toBe('Mix')
    expect(c.levels[0][0]).toEqual({ id: 'z-0-0', q: 'q1', a: 'a1' })
  })

  it('explains what is wrong with a bad file', () => {
    const id = () => 'x'
    expect(() => parseImportedCategory(null, id)).toThrow(/does not contain/)
    expect(() => parseImportedCategory({ levels: [] }, id)).toThrow(/name/)
    expect(() => parseImportedCategory({ name: 'a', levels: [[], []] }, id)).toThrow(/5 difficulty/)
    expect(() => parseImportedCategory({ name: 'a', levels: [[{ q: 'x' }], [], [], [], []] }, id)).toThrow(/Level 100, question 1/)
    expect(() => parseImportedCategory({ name: 'a', levels: ['nope', [], [], [], []] }, id)).toThrow(/not a list/)
  })
})

describe('import limits', () => {
  const lv = (q = 'Q', a = 'A') => [[{ q, a }], [], [], [], []]
  it('rejects over-long names, clues and answers, and huge levels', () => {
    expect(() => parseImportedCategory({ name: 'x'.repeat(41), levels: lv() }, () => 'i')).toThrow(/longer than 40/)
    expect(() => parseImportedCategory({ name: 'N', levels: lv('q'.repeat(401)) }, () => 'i')).toThrow(/too long/)
    expect(() => parseImportedCategory({ name: 'N', levels: lv('Q', 'a'.repeat(201)) }, () => 'i')).toThrow(/too long/)
    expect(() => parseImportedCategory({ name: 'N', levels: [Array(1001).fill({ q: 'Q', a: 'A' }), [], [], [], []] }, () => 'i')).toThrow(/more than 1000/)
  })
  it('keeps markup as plain text', () => {
    const c = parseImportedCategory({ name: '<b>x</b>', levels: lv('<img src=x onerror=alert(1)>') }, () => 'i')
    expect(c.levels[0][0].q).toBe('<img src=x onerror=alert(1)>')
  })
})
