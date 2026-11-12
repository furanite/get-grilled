import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { FINAL_VALUE, STREAK_BONUS, answerRight, answerWrong, chooseGolden, chooseSpecials, createGame, lastPlace, nextStage, steal } from '../src/lib/game'
import { cleanGameExtras } from '../src/lib/store'
import type { Category, Game } from '../src/lib/types'
// @ts-expect-error plain JS build script
import { checkNights, parsePack } from '../scripts/build-packs.mjs'

const cat = (id: string, n = 12): Category => ({
  id,
  name: id,
  builtIn: false,
  levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: n }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `${id} q${l}.${i}`, a: 'a' }))),
})
let seed = 7
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const base = { timer: 0, deduct: true, golden: 1 }

function play(extra = {}) {
  return createGame([cat('a'), cat('b'), cat('c')], ['A', 'B', 'C'], { ...base, steal: 2, crowd: 1, streak: true, comeback: true, lightning: true, final: true, ...extra }, {}, rng).game
}

describe('special tiles', () => {
  it('places steal and audience tiles away from golden tiles and the 100 row', () => {
    for (let k = 0; k < 30; k++) {
      const golden = chooseGolden(3, 2, rng)
      const sp = chooseSpecials(3, golden, { steal: 3, crowd: 2 }, rng)
      expect([...sp.values()].filter((v) => v === 'steal')).toHaveLength(3)
      expect([...sp.values()].filter((v) => v === 'crowd')).toHaveLength(2)
      for (const key of sp.keys()) {
        expect(golden.has(key)).toBe(false)
        expect(key.endsWith('-0')).toBe(false)
      }
    }
  })
  it('places fewer when the board is too small, and none when asked for none', () => {
    const sp = chooseSpecials(1, new Set(['0-1', '0-2', '0-3']), { steal: 3, crowd: 2 }, rng)
    expect(sp.size).toBe(1)
    expect(chooseSpecials(6, new Set(), {}, rng).size).toBe(0)
  })
  it('a classic game has no extras', () => {
    const g = createGame([cat('a')], ['A', 'B'], base, {}, rng).game
    expect(g.clues.flat().some((c) => c.special)).toBe(false)
    expect(g.lightning).toBeUndefined()
    expect(g.final).toBeUndefined()
    expect(g.streaks).toBeUndefined()
    expect(nextStage(g, 'board')).toBeNull()
  })
})

describe('closing rounds', () => {
  it('draws lightning and final questions that are not on the board and marks them used', () => {
    const r = createGame([cat('a'), cat('b')], ['A', 'B'], { ...base, lightning: true, final: true }, {}, rng)
    const board = new Set(r.game.clues.flat().map((q) => q.id))
    expect(r.game.lightning!.length).toBeGreaterThanOrEqual(5)
    expect(r.game.lightning!.some((q) => board.has(q.id))).toBe(false)
    expect(board.has(r.game.final!.q.id)).toBe(false)
    expect(r.game.final!.q.id).toMatch(/-4-/)
    expect(r.game.lightning!.every((q) => /-[01]-/.test(q.id))).toBe(true)
    expect(new Set(r.game.lightning!.map((q) => q.id)).size).toBe(r.game.lightning!.length)
    expect(r.used.a).toEqual(expect.arrayContaining(r.game.lightning!.filter((q) => q.id.startsWith('a-')).map((q) => q.id)))
    expect(nextStage(r.game, 'board')).toBe('lightning')
    expect(nextStage(r.game, 'lightning')).toBe('final')
    expect(nextStage(r.game, 'final')).toBeNull()
  })
  it('skips a round when the categories are too small to fill it', () => {
    const g = createGame([cat('a', 1)], ['A', 'B'], { ...base, lightning: true, final: true }, {}, rng).game
    expect(g.settings.lightning).toBeFalsy()
    expect(g.settings.final).toBeFalsy()
    expect(nextStage(g, 'board')).toBeNull()
  })
})

describe('streaks, steals and comebacks', () => {
  it('gives the bonus on the third right answer in a row, and another team ends the run', () => {
    let g: Game = play()
    let r = answerRight(g, 0, 100)
    r = answerRight(r.game, 0, 200)
    expect(r.bonus).toBe(0)
    r = answerRight(r.game, 0, 300)
    expect(r.bonus).toBe(STREAK_BONUS)
    expect(r.game.teams[0].score).toBe(600 + STREAK_BONUS)
    g = answerRight(r.game, 1, 100).game
    expect(g.streaks).toEqual([0, 1, 0])
    g = answerWrong(g, 1)
    expect(g.streaks).toEqual([0, 0, 0])
  })
  it('without the streak option, points are plain', () => {
    const g = play({ streak: false })
    const r = answerRight(answerRight(answerRight(g, 0, 100).game, 0, 100).game, 0, 100)
    expect(r.game.teams[0].score).toBe(300)
  })
  it('steal moves points between two different teams only', () => {
    const g = play()
    const s = steal(g, 1, 0, 400)
    expect(s.teams.map((t) => t.score)).toEqual([400, -400, 0])
    expect(steal(g, 1, 1, 400)).toBe(g)
    expect(steal(g, 1, 9, 400)).toBe(g)
  })
  it('names every team in last place, and nobody when all are level', () => {
    const g = play()
    expect(lastPlace(g)).toEqual([])
    const h = answerRight(g, 0, 100).game
    expect(lastPlace(h)).toEqual([1, 2])
  })
})

describe('saved games', () => {
  it('keeps good round state and drops broken parts', () => {
    const g = play()
    const ok = cleanGameExtras({ ...g, stage: 'final', finalState: { step: 'answer', marks: [true, null, false] } })
    expect(ok.stage).toBe('final')
    expect(ok.finalState!.marks).toEqual([true, null, false])
    expect(ok.lightning!.length).toBe(g.lightning!.length)
    const bad = cleanGameExtras({ ...g, stage: 'x', streaks: [1], lightning: 'no', final: { q: 1 }, finalState: { step: 'q', marks: [] }, lightningState: { i: -1 } } as unknown as Game)
    expect(bad.stage).toBeUndefined()
    expect(bad.streaks).toBeUndefined()
    expect(bad.lightning).toBeUndefined()
    expect(bad.final).toBeUndefined()
    expect(bad.finalState).toBeUndefined()
    expect(bad.lightningState).toBeUndefined()
    expect(FINAL_VALUE).toBe(500)
  })
})

describe('themed nights file', () => {
  // Category ids straight from the question files, so this runs before the packs are built
  const qdir = join(__dirname, '..', 'questions')
  const known = readdirSync(qdir).filter((f) => f.endsWith('.txt')).map((f) => parsePack(readFileSync(join(qdir, f), 'utf8'), f).meta.id as string)
  it('the built-in nights are valid', () => {
    expect(checkNights(JSON.parse(readFileSync(join(__dirname, '..', 'questions', 'nights.json'), 'utf8')), known)).toEqual([])
  })
  it('catches unknown categories, bad team lists and bad extras', () => {
    const errs = checkNights([{ id: 'x', name: 'X', about: 'a', cats: ['nope'], teams: ['one'], extras: { steal: 9, final: 'yes' } }, { id: 'x', name: '', about: 'a', cats: [] }], known).join('\n')
    expect(errs).toMatch(/unknown category "nope"/)
    expect(errs).toMatch(/"teams" must be 2 to 4/)
    expect(errs).toMatch(/extras.steal/)
    expect(errs).toMatch(/extras.final/)
    expect(errs).toMatch(/duplicate id/)
    expect(errs).toMatch(/needs 1 to 6 "cats"/)
  })
})
