import { describe, expect, it } from 'vitest'
import { gameAnswers, makeChoices, norm } from '../src/lib/choices'
import type { Game } from '../src/lib/types'

const pool = [
  ['Ohm', 'Volt', 'Amp', 'Watt', 'Joule'],
  ['Newton', 'Pascal', 'Hertz', 'Tesla', 'Weber'],
  ['Kelvin', 'Mole', 'Candela'],
  ['Farad', 'Henry', 'Siemens'],
  ['Coulomb', 'Lux', 'Gray'],
]

describe('audience multiple choice', () => {
  it('gives the right answer plus three different wrong ones from the same level first', () => {
    const m = makeChoices('Volt', pool, 0, [], 'seed-1')
    expect(m.choices).toHaveLength(4)
    expect(m.choices[m.correct]).toBe('Volt')
    expect(new Set(m.choices.map(norm)).size).toBe(4)
    expect(m.choices.filter((c) => c !== 'Volt').every((c) => pool[0].includes(c))).toBe(true)
  })

  it('never uses an answer drawn for the game, or one that reads like the right answer', () => {
    const m = makeChoices('Volt', [['volt', 'VOLT!', 'Ohm', 'Amp', 'Watt', 'Joule']], 0, ['Ohm', 'Amp'], 's')
    expect(m.choices.sort()).toEqual(['Joule', 'Volt', 'Watt'])
  })

  it('borrows from nearby levels when a level runs short, and is the same every time for the same clue', () => {
    const a = makeChoices('Kelvin', pool, 2, ['Mole', 'Candela'], 'clue-7')
    const b = makeChoices('Kelvin', pool, 2, ['Mole', 'Candela'], 'clue-7')
    expect(a).toEqual(b)
    expect(a.choices).toHaveLength(4)
    expect(a.choices.filter((c) => c !== 'Kelvin').every((c) => [...pool[1], ...pool[3]].includes(c))).toBe(true)
  })

  it('collects every answer of the game, closing rounds and tournament boards included', () => {
    const g = {
      cats: [], teams: [], used: [], settings: { timer: 0, deduct: false }, startedAt: 0,
      clues: [[{ id: 'x', q: 'q', a: 'A1', aAr: 'ع', value: 100, golden: false }]],
      lightning: [{ id: 'l', q: 'q', a: 'L1' }],
      final: { cat: { id: 'c', name: 'C' }, q: { id: 'f', q: 'q', a: 'F1' } },
      tournament: { at: 0, intro: false, rounds: [{ kind: 'board', clues: [[{ id: 'y', q: 'q', a: 'T1', value: 100, golden: false }]] }] },
    } as unknown as Game
    expect(gameAnswers(g).sort()).toEqual(['A1', 'F1', 'L1', 'T1', 'ع'])
  })
})
