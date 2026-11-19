import { describe, expect, it } from 'vitest'
import { publicGame } from '../src/lib/views'
import { aOf, dirOf, nameOf, namePair, qOf } from '../src/lib/lang'
import { STRINGS } from '../src/lib/i18n'
import type { Game } from '../src/lib/types'

const VALUES = [100, 200, 300, 400, 500]
const game = (): Game => ({
  cats: [{ id: 'a', name: 'A', nameUr: 'زمرہ' }],
  clues: [VALUES.map((value, l) => ({ id: `0-${l}`, q: `Q${l}`, a: `ANS${l}`, qUr: `سوال${l}`, aUr: `جواب${l}`, value, golden: false }))],
  teams: [{ name: 'Red', score: 0 }],
  used: [],
  settings: { timer: 30, deduct: false },
  startedAt: 1,
})

describe('Urdu (Munaafasatul Ilm)', () => {
  it('picks the Urdu clue, answer and name, and falls back to English when there is none', () => {
    const x = { q: 'Q', a: 'A', qUr: 'س', aUr: 'ج' }
    expect([qOf(x, 'ur'), aOf(x, 'ur'), qOf(x, 'ar'), aOf(x, 'en')]).toEqual(['س', 'ج', 'Q', 'A'])
    expect(nameOf({ name: 'N', nameAr: 'ع' }, 'ur')).toBe('N')
    expect(namePair({ name: 'N', nameAr: 'ع', nameUr: 'ا' }, 'ur')).toEqual(['ا', 'N'])
    expect(dirOf('ur')).toBe('rtl')
  })
  it('never shows an Urdu answer to other devices before the reveal', () => {
    const hidden = JSON.stringify(publicGame(game(), 'game', null))
    expect(hidden).not.toMatch(/جواب|سوال/)
    const open = JSON.stringify(publicGame(game(), 'game', { c: 0, l: 2, revealed: false }))
    expect(open).toContain('سوال2')
    expect(open).not.toMatch(/جواب/)
    expect(JSON.stringify(publicGame(game(), 'game', { c: 0, l: 2, revealed: true }))).toContain('جواب2')
  })
  it('has every interface string, fully in Urdu', () => {
    expect(STRINGS.ur.newGame).toBe('نیا کھیل')
    expect(STRINGS.ur.buzz.connect).toBe('بزر باکس جوڑیں')
    expect(Object.keys(STRINGS.ur).sort()).toEqual(Object.keys(STRINGS.en).sort())
  })
})
