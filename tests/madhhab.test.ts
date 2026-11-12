import { describe, expect, it } from 'vitest'
import { filterMadhhab } from '../src/lib/game'
import type { Category } from '../src/lib/types'
// @ts-expect-error plain JS build script
import { schoolsOf } from '../scripts/schools.mjs'

describe('school tagging', () => {
  it('reads the schools a ruling names', () => {
    expect(schoolsOf('In the Hanafi school, witr is this ruling.')).toBe('h')
    expect(schoolsOf("In the Shafi'i, Maliki and Hanbali schools, witr is this ruling.")).toBe('msb')
    expect(schoolsOf("By Abu Hanifah's view, horse meat is this.")).toBe('h')
    expect(schoolsOf('The opening du\'a, said in prayer (not in the Maliki school).')).toBe('hsb')
  })
  it('leaves agreed points and book questions general', () => {
    expect(schoolsOf('By the four schools, the mule is this to eat.')).toBe('')
    expect(schoolsOf('The famous Hanafi book of fiqh by al-Marghinani.')).toBe('')
    expect(schoolsOf('The number of daily prayers.')).toBe('')
  })
})

describe('filterMadhhab', () => {
  const q = (id: string, sch?: string) => ({ id, q: id, a: 'x', ...(sch ? { sch } : {}) })
  const cat: Category = { id: 'c', name: 'C', levels: [[q('all'), q('han', 'h'), q('sha', 's')], [q('han2', 'h')], [q('a')], [q('b')], [q('c')]] }
  it('keeps agreed points and the chosen school', () => {
    expect(filterMadhhab(cat, 's').levels[0].map((x) => x.id)).toEqual(['all', 'sha'])
    expect(filterMadhhab(cat, '').levels[0].length).toBe(3)
  })
  it('never empties a level', () => {
    expect(filterMadhhab(cat, 's').levels[1].map((x) => x.id)).toEqual(['han2'])
  })
})
