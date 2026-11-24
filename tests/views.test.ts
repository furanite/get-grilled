import { describe, expect, it } from 'vitest'
import { publicGame, publicView } from '../src/lib/views'
import type { Game } from '../src/lib/types'

const VALUES = [100, 200, 300, 400, 500]
function game(): Game {
  return {
    cats: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    clues: [0, 1].map((c) =>
      VALUES.map((value, l) => ({ id: `${c}-${l}`, q: `Q${c}${l}`, a: `ANS${c}${l}`, qAr: `سؤال${c}${l}`, aAr: `جواب${c}${l}`, value, golden: c === 1 && l === 2, special: c === 0 && l === 4 ? ('steal' as const) : undefined })),
    ),
    teams: [{ name: 'Red', score: 0 }, { name: 'Blue', score: 0 }],
    used: [],
    settings: { timer: 30, deduct: false },
    startedAt: 1,
    lightning: [{ id: 'l0', q: 'LQ0', a: 'LANS0' }, { id: 'l1', q: 'LQ1', a: 'LANS1' }],
    lightningState: { i: 1, revealed: false, startedAt: 5 },
    final: { cat: { id: 'a', name: 'A' }, q: { id: 'f', q: 'FQ', a: 'FANS' } },
    finalState: { step: 'cat', marks: [null, null] },
    modeRound: { mode: 'clues', items: [{ q: 'c1 | c2 | c3', a: 'MANS0' }, { q: 'TF', a: 'MANS1', v: 1, k: 'true' }] },
    modeState: { i: 0, revealed: false, shown: 1 },
    tournament: { at: 0, intro: false, rounds: [{ kind: 'board', cats: [{ id: 'a', name: 'A' }], clues: [[{ id: 'x', q: 'TQ', a: 'TANS', value: 100, golden: true }]] }, { kind: 'mode', mode: 'tf', items: [{ q: 'TFQ', a: 'TFANS', v: 0 }] }] },
  }
}
const text = (g: unknown) => JSON.stringify(g)
const answers = (s: string) => s.match(/[A-Z]*ANS\d*|جواب\d+/g) ?? []

describe('what other devices may see', () => {
  it('shows no question, answer or special tile on the board before a tile opens', () => {
    const s = text(publicGame(game(), 'game', null))
    expect(answers(s)).toEqual([])
    expect(s).not.toMatch(/"Q\d\d"|سؤال/)
    expect(s).not.toContain('"golden":true')
    expect(s).not.toContain('steal')
    expect(s).not.toContain('FQ')
    expect(s).not.toContain('LQ')
    expect(s).not.toMatch(/c1|TF/)
  })

  it('never sends a question\'s real id, where it came from, or the secret final\'s category', () => {
    // Real ids are made from the category and the clue's words, and the question files are public,
    // so a real id on a team tablet would be enough to look up the question and its answer.
    const g = game()
    g.clues = g.clues.map((col, c) => col.map((clue, l) => ({ ...clue, id: `science-${l}-REALID${c}${l}` })))
    g.lightning = g.lightning!.map((q, i) => ({ ...q, id: `science-0-REALIDL${i}` }))
    g.final = { cat: { id: 'secretcat', name: 'SECRETCAT' }, q: { ...g.final!.q, id: 'science-4-REALIDF' } }
    g.modeRound = { mode: 'tf', items: [{ id: 'science-tf-REALIDM0', q: 'M0', a: 'True', v: 1, cat: 'SRCNAME', from: 'science' }, { id: 'science-tf-REALIDM1', q: 'M1', a: 'False', v: 0, cat: 'SRCNAME', from: 'science' }] }
    g.tiebreak = [{ cat: { id: 'tbcat', name: 'TBCAT' }, q: { id: 'science-2-REALIDT', q: 'TBQ', a: 'TBANS' } }]
    g.tieState = { i: 0, teams: [0, 1], shown: false, revealed: false, wrong: [] }
    const screens = ['game', 'lightning', 'final', 'mode', 'tiebreak', 'results'] as const
    for (const screen of screens) {
      for (const live of [null, { c: 1, l: 3, revealed: false }, { c: 1, l: 3, revealed: true }]) {
        const s = text(publicGame(g, screen, screen === 'game' ? live : null))
        expect(s, screen).not.toContain('REALID')
        expect(s, screen).not.toContain('"from"')
        if (screen !== 'final') expect(s, screen).not.toMatch(/secretcat/i)
        if (screen !== 'tiebreak') expect(s, screen).not.toMatch(/tbcat/i)
      }
    }
    // Hidden special-round items don't say which category they came from; the one on show does.
    const mode = publicGame(g, 'mode', null)
    expect(mode.modeRound!.items[0].cat).toBe('SRCNAME')
    expect(mode.modeRound!.items[1].cat).toBeUndefined()
    // Each tile still has its own code, so screens can tell them apart.
    const ids = publicGame(g, 'game', null).clues.flat().map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    // The final's category appears once the final is on screen.
    expect(publicGame(g, 'final', null).final!.cat.name).toBe('SECRETCAT')
  })

  it('shows the open question but not its answer, then the answer after the reveal', () => {
    const open = publicGame(game(), 'game', { c: 1, l: 3, revealed: false })
    expect(open.clues[1][3].q).toBe('Q13')
    expect(open.clues[1][3].qAr).toBe('سؤال13')
    expect(answers(text(open))).toEqual([])
    const shown = publicGame(game(), 'game', { c: 1, l: 3, revealed: true })
    expect(answers(text(shown))).toEqual(['ANS13', 'جواب13'])
  })

  it('a special tile says what it is before Next, without its question', () => {
    const g = publicGame(game(), 'game', { c: 1, l: 2, revealed: false, intro: true })
    expect(g.clues[1][2].golden).toBe(true)
    expect(g.clues[1][2].q).toBe('')
    expect(answers(text(g))).toEqual([])
    const steal = publicGame(game(), 'game', { c: 0, l: 4, revealed: false, intro: true })
    expect(steal.clues[0][4].special).toBe('steal')
  })

  it('lightning round: only the question on screen, answer after the reveal', () => {
    const g = game()
    expect(text(publicGame(g, 'lightning', null))).toContain('LQ1')
    expect(text(publicGame(g, 'lightning', null))).not.toContain('LQ0')
    expect(answers(text(publicGame(g, 'lightning', null)))).toEqual([])
    g.lightningState!.revealed = true
    expect(answers(text(publicGame(g, 'lightning', null)))).toEqual(['LANS1'])
  })

  it('final question: category first, then the question, the answer only at the end', () => {
    const g = game()
    expect(text(publicGame(g, 'final', null))).not.toContain('FQ')
    g.finalState!.step = 'q'
    expect(text(publicGame(g, 'final', null))).toContain('FQ')
    expect(answers(text(publicGame(g, 'final', null)))).toEqual([])
    g.finalState!.step = 'answer'
    expect(answers(text(publicGame(g, 'final', null)))).toEqual(['FANS'])
  })

  it('special rounds: clue by clue shows only the clues so far, and true-or-false hides its verdict', () => {
    const g = game()
    let s = publicGame(g, 'mode', null)
    expect(s.modeRound!.items[0].q).toBe('c1 | … | …')
    expect(answers(text(s))).toEqual([])
    g.modeState = { i: 1, revealed: false, shown: 1 }
    s = publicGame(g, 'mode', null)
    expect(s.modeRound!.items[1].q).toBe('TF')
    expect(s.modeRound!.items[1].v).toBeUndefined()
    g.modeState.revealed = true
    expect(publicGame(g, 'mode', null).modeRound!.items[1].v).toBe(1)
  })

  it('tournament rounds keep their kinds and categories but none of their questions', () => {
    const s = text(publicGame(game(), 'round', null))
    expect(s).not.toMatch(/TQ|TFQ|TANS|TFANS/)
    expect(s).toContain('"kind":"mode"')
  })

  it('does not change the host\'s own game', () => {
    const g = game()
    const before = text(g)
    publicView({ screen: 'game', game: g, live: { c: 0, l: 0, revealed: false }, vote: null, theme: 'neon', lang: 'en', reduceFx: false })
    expect(text(g)).toBe(before)
  })
})

describe('shiftView (devices whose clock differs from the host)', () => {
  it('moves every host-clock time by the same amount and leaves the rest alone', async () => {
    const { shiftView } = await import('../src/lib/live')
    const v = {
      screen: 'game',
      theme: 'amethyst',
      lang: 'en',
      reduceFx: false,
      vote: null,
      live: { c: 0, l: 0, revealed: false, clock: { start: 1000, total: 30, stoppedAt: 5000 } },
      game: { endsAt: 9000, lightningState: { i: 0, revealed: false, startedAt: 2000 }, finalState: { step: 'q', startedAt: 3000, marks: [] }, startedAt: 1 },
    } as unknown as Parameters<typeof shiftView>[0]
    const s = shiftView(v, 500)!
    expect(s.live!.clock).toEqual({ start: 1500, total: 30, stoppedAt: 5500 })
    expect(s.game!.endsAt).toBe(9500)
    expect(s.game!.lightningState!.startedAt).toBe(2500)
    expect(s.game!.finalState!.startedAt).toBe(3500)
    expect(s.game!.startedAt).toBe(1)
    // The original view is not changed
    expect(v!.live!.clock!.start).toBe(1000)
    expect(shiftView(v, 0)).toBe(v)
    expect(shiftView(null, 500)).toBe(null)
  })
})
