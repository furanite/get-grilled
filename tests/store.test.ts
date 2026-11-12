// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCustom, loadGame, loadSettings, loadUsed, saveCustom, saveGame, saveSettings, saveUsed, uid } from '../src/lib/store'
import { num } from '../src/lib/i18n'
import { STRINGS } from '../src/lib/i18n'
import { packToCategory } from '../src/lib/packs'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual({ theme: 'amethyst', lang: 'en', reduceFx: false, sound: true })
    expect(loadCustom()).toEqual([])
    expect(loadUsed()).toEqual({})
    expect(loadGame()).toBeNull()
  })

  it('saves and loads each kind of data', () => {
    saveSettings({ theme: 'neon', lang: 'ar', reduceFx: false, sound: true })
    saveCustom([{ id: 'c1', name: 'X', builtIn: false, levels: [[], [], [], [], []] }])
    saveUsed({ a: ['a-0-1'] })
    expect(loadSettings()).toEqual({ theme: 'neon', lang: 'ar', reduceFx: false, sound: true })
    expect(loadCustom()[0].name).toBe('X')
    expect(loadUsed()).toEqual({ a: ['a-0-1'] })
  })

  it('clears a finished game', () => {
    saveGame({ cats: [{ id: 'k', name: 'K' }], clues: [[100, 200, 300, 400, 500].map((value, i) => ({ id: `k-${i}`, q: 'Q', a: 'A', value, golden: false }))], teams: [{ name: 'T', score: 0 }], used: [], settings: { timer: 0, deduct: false }, startedAt: 1 })
    expect(loadGame()).not.toBeNull()
    saveGame(null)
    expect(loadGame()).toBeNull()
  })

  it('survives corrupted data and blocked storage', () => {
    localStorage.setItem('gg.custom.v1', '{not json')
    expect(loadCustom()).toEqual([])
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveCustom([])).not.toThrow()
    expect(loadSettings().theme).toBe('amethyst')
    get.mockRestore()
    set.mockRestore()
  })

  it('makes unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid()))
    expect(ids.size).toBe(500)
  })
})

describe('text helpers', () => {
  it('writes Arabic-Indic numerals in Arabic', () => {
    expect(num(1250, 'ar')).toBe('١٢٥٠')
    expect(num(-300, 'ar')).toBe('-٣٠٠')
    expect(num(400, 'en')).toBe('400')
  })
  it('has every English string translated to Arabic', () => {
    const en = Object.keys(STRINGS.en).sort()
    expect(Object.keys(STRINGS.ar).sort()).toEqual(en)
    for (const k of en) expect((STRINGS.ar as Record<string, string>)[k].length).toBeGreaterThan(0)
  })
  it('gives built-in questions stable ids', () => {
    const c = packToCategory({ id: 'p', name: 'P', levels: [[{ q: 'a', a: 'b' }], [], [], [], []] })
    expect(c.levels[0][0].id).toBe('p-0-0')
    expect(c.builtIn).toBe(true)
  })
})

describe('corrupted or tampered saved data never breaks loading', () => {
  it('settings fall back field by field', () => {
    localStorage.setItem('gg.settings.v1', '{"theme":"bogus","lang":"fr","reduceFx":"yes"}')
    expect(loadSettings()).toEqual({ theme: 'amethyst', lang: 'en', reduceFx: false, sound: true })
    localStorage.setItem('gg.settings.v1', 'null')
    expect(loadSettings().theme).toBe('amethyst')
    localStorage.setItem('gg.settings.v1', '{"theme":"neon","lang":"ar","reduceFx":true}')
    expect(loadSettings()).toEqual({ theme: 'neon', lang: 'ar', reduceFx: true, sound: true })
  })
  it('custom categories drop bad entries and keep good ones', () => {
    localStorage.setItem('gg.custom.v1', '{"x":1}')
    expect(loadCustom()).toEqual([])
    const good = { id: 'c-1', name: 'Mine', builtIn: true, levels: [[{ id: 'q', q: 'Q', a: 'A' }, null, 5], [], [], [], []] }
    localStorage.setItem('gg.custom.v1', JSON.stringify([null, 5, { id: 'a' }, { id: 'b', name: 'x', levels: 'nope' }, good]))
    const cats = loadCustom()
    expect(cats).toHaveLength(1)
    expect(cats[0].builtIn).toBe(false)
    expect(cats[0].levels[0]).toEqual([{ id: 'q', q: 'Q', a: 'A' }])
  })
  it('a malformed saved game is ignored', () => {
    for (const bad of ['[]', '{"cats":[{"id":"x"}],"teams":null}', '{"cats":[],"clues":[],"teams":[],"used":[],"settings":{}}', 'not json'])
      (localStorage.setItem('gg.game.v1', bad), expect(loadGame()).toBeNull())
  })
  it('a malformed list of played questions is ignored', () => {
    localStorage.setItem('gg.used.v1', '"str"')
    expect(loadUsed()).toEqual({})
    localStorage.setItem('gg.used.v1', '{"a":["x",1],"b":3}')
    expect(loadUsed()).toEqual({ a: ['x'] })
  })
})

describe('question pools and diagrams', () => {
  beforeEach(() => localStorage.clear())
  it('keeps pool edits and drops junk', async () => {
    const { loadPools, savePools } = await import('../src/lib/store')
    savePools({ x: { off: [['a'], [], [], [], []], extra: [[], [{ id: 'e1', q: 'Q', a: 'A' }], [], [], []] } })
    expect(loadPools().x.off[0]).toEqual(['a'])
    expect(loadPools().x.extra[1][0].q).toBe('Q')
    localStorage.setItem('gg.pools.v1', '{"x":{"off":"nope","extra":[[{"q":1}]]},"y":5}')
    expect(loadPools()).toEqual({ x: { off: [[], [], [], [], []], extra: [[], [], [], [], []] } })
  })
  it('keeps a valid diagram on a saved question and drops a bad one', async () => {
    const { cleanCategories } = await import('../src/lib/store')
    const good = 'data:image/png;base64,iVBORw0KGgo='
    const cats = cleanCategories([{ id: 'c', name: 'C', levels: [[{ id: '1', q: 'q', a: 'a', img: good }, { id: '2', q: 'q', a: 'a', img: 'javascript:alert(1)' }], [], [], [], []] }])
    expect(cats[0].levels[0][0].img).toBe(good)
    expect(cats[0].levels[0][1].img).toBeUndefined()
  })
})
