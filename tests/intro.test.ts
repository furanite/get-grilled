import { describe, expect, it } from 'vitest'
import { FACT_MAX, MAX_MEMBERS, finishIntro, withIntro } from '../src/lib/game'
import type { Game } from '../src/lib/types'

const game = (): Game => ({
  cats: [],
  clues: [],
  teams: [{ name: 'A', score: 0 }, { name: 'B', score: 0 }],
  used: [],
  settings: { timer: 30, deduct: true, gameMinutes: 20 },
  startedAt: 1000,
  endsAt: 1000 + 20 * 60_000,
})

describe('team introductions', () => {
  it('tidies members, keeps the captain on the right person and switches the introductions on', () => {
    const g = withIntro(game(), [
      { members: [{ name: '  ', role: 'x' }, { name: ' Omar ', role: ' Civil Eng. ' }, { name: 'Ali', role: '' }], captain: 2, fact: ' Never agree on lunch. ' },
      { members: [{ name: '', role: '' }], captain: 0, fact: '' },
    ])
    expect(g.intro).toEqual({ i: 0, auto: true })
    expect(g.teams[0]).toEqual({ name: 'A', score: 0, members: [{ name: 'Omar', role: 'Civil Eng.' }, { name: 'Ali' }], captain: 1, fact: 'Never agree on lunch.' })
    // A team with nothing filled in still gets introduced, by name only.
    expect(g.teams[1]).toEqual({ name: 'B', score: 0 })
  })

  it('keeps at most five members and a fact of at most 120 characters', () => {
    const many = Array.from({ length: 8 }, (_, k) => ({ name: `P${k}`, role: '' }))
    const g = withIntro(game(), [{ members: many, captain: null, fact: 'x'.repeat(300) }])
    expect(g.teams[0].members).toHaveLength(MAX_MEMBERS)
    expect(g.teams[0].fact).toHaveLength(FACT_MAX)
    expect(g.teams[0].captain).toBeUndefined()
  })

  it('starting the game ends the introductions and starts the game clock from that moment', () => {
    const g = finishIntro(withIntro(game(), []), 50_000)
    expect(g.intro).toBeUndefined()
    expect(g.startedAt).toBe(50_000)
    expect(g.endsAt).toBe(50_000 + 20 * 60_000)
  })
})
