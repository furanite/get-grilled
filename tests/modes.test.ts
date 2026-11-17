import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error plain JS build script
import { parsePack, verdictOf } from '../scripts/build-packs.mjs'
import { MODE_COUNT, MODE_VALUE, cluePoints, createGame, drawModeRound, modeItemsOf, nextStage } from '../src/lib/game'
import { packToCategory } from '../src/lib/packs'
import type { Category, ModeItem } from '../src/lib/types'

const head = 'id: t\nname: T\ngroup: law\n## 100\nA :: a\n## 200\nB :: b\n## 300\nC :: c\n## 400\nD :: d\n## 500\nE :: e\n'
let seed = 7
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

describe('special round sections in pack files', () => {
  it('reads every kind of section', () => {
    const r = parsePack(head + '## tf\nRiba is allowed. :: Not halal (it is forbidden)\nThe sun is a star. :: True\n## case\nAli signs a deal. :: Valid\n## translate\nShukriya :: Thank you\n## clues\nHard | Medium | Easy :: Answer\n## odd\nRed | Blue | Green | Table :: Table (not a colour)\n')
    expect(r.errors).toEqual([])
    expect(r.modes.tf[0]).toEqual({ q: 'Riba is allowed.', a: 'Not halal (it is forbidden)', v: 0, k: 'halal' })
    expect(r.modes.tf[1]).toMatchObject({ v: 1, k: 'true' })
    expect(Object.keys(r.modes).sort()).toEqual(['case', 'clues', 'odd', 'tf', 'translate'])
  })
  it('rejects broken items', () => {
    const r = parsePack(head + '## tf\nX :: Maybe\n## clues\nOnly one :: A\n## odd\nA | B | C :: A\n## odd\nA | B | C | D :: E\n')
    const all = r.errors.join('\n')
    expect(all).toMatch(/must start with True, False/)
    expect(all).toMatch(/2 to 6 clues/)
    expect(all).toMatch(/4 or 5 items/)
    expect(all).toMatch(/appears twice/)
  })
  it('knows the verdict words', () => {
    expect(verdictOf('Legal (with a licence)')).toEqual({ v: 1, k: 'legal' })
    expect(verdictOf('Not legal')).toEqual({ v: 0, k: 'legal' })
    expect(verdictOf('Halal')).toEqual({ v: 1, k: 'halal' })
    expect(verdictOf('False, because')).toEqual({ v: 0, k: 'true' })
    expect(verdictOf('Truly')).toBeNull()
  })
  it('every built-in true-or-false item has a verdict', () => {
    const dir = join(__dirname, '..', 'questions')
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.txt'))) {
      const r = parsePack(readFileSync(join(dir, f), 'utf8'), f)
      for (const x of r.modes?.tf ?? []) expect([0, 1], `${f}: ${x.q}`).toContain(x.v)
    }
  })
})

const cat = (id: string, modes: Category['modes'] = {}, pics = 0): Category => ({
  id,
  name: id.toUpperCase(),
  builtIn: true,
  levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: 8 }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `${id} ${l} ${i}`, a: 'a', ...(l === 1 && i < pics ? { img: `packs/img/x${i}.svg` } : {}) }))),
  modes,
})
const items = (id: string, m: string, n: number): ModeItem[] => Array.from({ length: n }, (_, i) => ({ id: `${id}-${m}-${i}`, q: `${m} ${i}`, a: 'True', v: 1, k: 'true' }))

describe('special rounds', () => {
  it('draws from the game categories first, then borrows from others', () => {
    const a = cat('a', { tf: items('a', 'tf', 2) })
    const b = cat('b', { tf: items('b', 'tf', 10) })
    const list = drawModeRound('tf', [a], [b], new Set(), rng)!
    expect(list).toHaveLength(MODE_COUNT)
    expect(list.filter((x) => x.from === 'a')).toHaveLength(2)
    expect(drawModeRound('tf', [a], [], new Set(), rng)).toBeNull()
  })
  it('uses picture questions for the picture round', () => {
    const list = drawModeRound('picture', [cat('p', {}, 6)], [], new Set(), rng)!
    expect(list.every((x) => x.img)).toBe(true)
    expect(modeItemsOf(cat('q'), 'picture')).toEqual([])
  })
  it('clue by clue pays more for fewer clues', () => {
    const it4 = { q: 'a | b | c | d', a: 'x' }
    expect([1, 2, 3, 4].map((s) => cluePoints(it4, s))).toEqual([400, 300, 200, 100])
    expect(MODE_VALUE).toBe(200)
  })
  it('creates the round with the game and puts it right after the board', () => {
    const a = cat('a', { odd: items('a', 'odd', 9) })
    const { game, used } = createGame([a], ['X', 'Y'], { timer: 0, deduct: false, golden: 0, mode: 'odd', lightning: true }, {}, rng)
    expect(game.modeRound?.items).toHaveLength(MODE_COUNT)
    expect(nextStage(game, 'board')).toBe('mode')
    expect(nextStage(game, 'mode')).toBe('lightning')
    expect(used.a.filter((id) => id.includes('-odd-'))).toHaveLength(MODE_COUNT)
  })
  it('drops the round when there are too few items, and ignores unknown modes', () => {
    const { game } = createGame([cat('a')], ['X', 'Y'], { timer: 0, deduct: false, golden: 0, mode: 'tf' }, {}, rng)
    expect(game.modeRound).toBeUndefined()
    expect(game.settings.mode).toBeUndefined()
    expect(nextStage(game, 'board')).toBeNull()
    const bad = createGame([cat('a', { tf: items('a', 'tf', 9) })], ['X', 'Y'], { timer: 0, deduct: false, golden: 0, mode: 'nope' as never }, {}, rng)
    expect(bad.game.modeRound).toBeUndefined()
  })
  it('loads mode items from pack files with stable ids', () => {
    const c = packToCategory({ id: 'p', name: 'P', levels: [[], [], [], [], []], modes: { tf: [{ q: 'x', a: 'True', v: 1, k: 'true' }] } })
    expect(c.modes?.tf?.[0].id).toBe('p-tf-0')
  })
})

describe('saved special rounds', () => {
  it('keep good data and drop tampered data', async () => {
    const { cleanGameExtras } = await import('../src/lib/store')
    const base = createGame([cat('a', { tf: items('a', 'tf', 9) })], ['X', 'Y'], { timer: 0, deduct: false, golden: 0, mode: 'tf' }, {}, rng).game
    const ok = cleanGameExtras({ ...base, stage: 'mode', modeState: { i: 2, revealed: true, shown: 1 } })
    expect(ok.modeRound?.items).toHaveLength(MODE_COUNT)
    expect(ok.stage).toBe('mode')
    expect(ok.modeState).toEqual({ i: 2, revealed: true, shown: 1 })
    const bad = cleanGameExtras({ ...base, stage: 'mode', modeRound: { mode: 'evil' as never, items: [{ q: '<img>', a: 1 as never }] }, settings: { ...base.settings, mode: 'evil' as never } })
    expect(bad.modeRound).toBeUndefined()
    expect(bad.stage).toBeUndefined()
    expect(bad.settings.mode).toBeUndefined()
  })
})
