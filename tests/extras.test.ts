import { describe, expect, it } from 'vitest'
import { TIE_MAX, TIE_VALUE, addLog, createGame, missTie, nextTie, score, standings, startTie, tiedLeaders, winTie } from '../src/lib/game'
import { cleanGameExtras } from '../src/lib/store'
import { publicGame } from '../src/lib/views'
import { champion, cleanBracket, drawHeats, group, newDivision, roundName, setWinner } from '../src/lib/bracket'
import { hostReads } from '../src/lib/voice'
import { STRINGS } from '../src/lib/i18n'
import type { Category, Game } from '../src/lib/types'
// Sheets.tsx imports React components; the pure helpers are what's tested here.
import { logCsv, teamStats } from '../src/components/Sheets'

const cat = (id: string, n = 12): Category => ({
  id,
  name: id,
  builtIn: false,
  levels: [0, 1, 2, 3, 4].map((l) => Array.from({ length: n }, (_, i) => ({ id: `${id}-${l}-${i}`, q: `${id} q${l}.${i}`, a: `${id} a${l}.${i}` }))),
})
let seed = 11
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const base = { timer: 0, deduct: true, golden: 1 }
const make = () => createGame([cat('a'), cat('b')], ['A', 'B', 'C'], base, {}, rng)

describe('tie-breaker', () => {
  it('keeps sudden-death questions back, never on the board and not marked as played', () => {
    const { game, used } = make()
    expect(game.tiebreak?.length).toBe(TIE_MAX)
    const board = new Set(game.clues.flat().map((q) => q.id))
    for (const tb of game.tiebreak!) {
      expect(board.has(tb.q.id)).toBe(false)
      expect(Object.values(used).flat()).not.toContain(tb.q.id)
    }
    // middle levels only (300 and 400)
    expect(game.tiebreak!.every((x) => /-(2|3)-/.test(x.q.id))).toBe(true)
  })

  it('finds teams level at the top, and nobody when one team leads', () => {
    let g = make().game
    g = score(score(g, 0, 300), 1, 300)
    expect(tiedLeaders(g)).toEqual([0, 1])
    expect(tiedLeaders(score(g, 2, 900))).toEqual([])
  })

  it('a wrong answer costs nothing, the next question comes, and the first right answer wins', () => {
    let g = score(score(make().game, 0, 300), 1, 300)
    g = startTie(g)
    expect(g.tieState).toMatchObject({ i: 0, teams: [0, 1], shown: false })
    g = missTie(g, 0)
    g = missTie(g, 2) // not a tied team: ignored
    expect(g.tieState!.wrong).toEqual([0])
    expect(g.teams[0].score).toBe(300)
    g = nextTie(g)
    expect(g.tieState).toMatchObject({ i: 1, wrong: [] })
    g = winTie(g, 1)
    expect(g.teams[1].score).toBe(300 + TIE_VALUE)
    expect(g.tieState!.winner).toBe(1)
    expect(standings(g)[0].name).toBe('B')
    expect(tiedLeaders(g)).toEqual([])
    expect(winTie(g, 0)).toBe(g)
  })

  it('stops at the last question', () => {
    let g = startTie(score(score(make().game, 0, 100), 1, 100))
    for (let i = 0; i < TIE_MAX + 2; i++) g = nextTie(g)
    expect(g.tieState!.i).toBe(TIE_MAX - 1)
  })

  it('other screens see the question only once it is shown, and the answer only once revealed', () => {
    let g = startTie(score(score(make().game, 0, 100), 1, 100))
    const q = g.tiebreak![0].q
    let s = JSON.stringify(publicGame(g, 'tiebreak', null))
    expect(s).not.toContain(q.q)
    expect(s).not.toContain(q.a)
    g = { ...g, tieState: { ...g.tieState!, shown: true } }
    s = JSON.stringify(publicGame(g, 'tiebreak', null))
    expect(s).toContain(q.q)
    expect(s).not.toContain(q.a)
    s = JSON.stringify(publicGame(winTie(g, 0), 'tiebreak', null))
    expect(s).toContain(q.a)
    // never on other screens, and the other sudden-death questions stay hidden
    expect(JSON.stringify(publicGame(g, 'results', null))).not.toContain(q.q)
    expect(JSON.stringify(publicGame(g, 'tiebreak', null))).not.toContain(g.tiebreak![1].q.q)
  })

  it('a saved tie-breaker survives a reload, and a broken one is dropped', () => {
    const g = startTie(score(score(make().game, 0, 100), 1, 100))
    const back = cleanGameExtras(JSON.parse(JSON.stringify(g)) as Game)
    expect(back.tieState).toEqual(g.tieState)
    expect(back.tiebreak).toEqual(g.tiebreak)
    const bad = cleanGameExtras({ ...g, tieState: { i: 99, teams: [0, 7], shown: 'x' } } as unknown as Game)
    expect(bad.tieState).toBeUndefined()
  })
})

describe('game log', () => {
  const g0 = make().game
  const g = [
    (x: Game) => addLog(score(x, 0, 100), { kind: 'right', team: 0, delta: 100, cat: 'a', value: 100, q: 'Q1', a: 'A1' }),
    (x: Game) => addLog(score(x, 0, 200), { kind: 'right', team: 0, delta: 200, cat: 'a', value: 200, q: 'Q2', a: 'A2' }),
    (x: Game) => addLog(score(x, 1, -300), { kind: 'wrong', team: 1, delta: -300, cat: 'b', value: 300, q: '=cmd()', a: 'A3' }),
    (x: Game) => addLog(score(x, 2, -400), { kind: 'steal', team: 2, delta: -400, by: 0, cat: 'b', value: 400 }),
    (x: Game) => addLog(x, { kind: 'nobody', team: -1, delta: 0, cat: 'a', value: 300, q: 'Q4' }),
    (x: Game) => addLog(score(x, 1, 50), { kind: 'adjust', team: 1, delta: 50 }),
  ].reduce((x, f) => f(x), g0)

  it('works out each team’s stats', () => {
    const s = teamStats(g)
    expect(s[0]).toMatchObject({ right: 2, wrong: 0, bestRun: 2, stole: 400, bestCat: 'a' })
    expect(s[1]).toMatchObject({ right: 0, wrong: 1, adjusted: 50 })
    expect(s[2]).toMatchObject({ lost: 400 })
  })

  it('downloads as a spreadsheet that can’t run formulas', () => {
    const csv = logCsv(STRINGS.en, g, 'en')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"\'=cmd()"')
    expect(csv).toContain('"Q1"')
    expect(csv.split('\r\n').length).toBeGreaterThan(8)
  })

  it('is kept with a saved game, checked line by line, and never sent to other screens', () => {
    const back = cleanGameExtras(JSON.parse(JSON.stringify({ ...g, log: [...g.log!, { kind: 'hack', team: 0, delta: 1, at: 1 }, { kind: 'right', team: 9, delta: 1, at: 1 }] })) as Game)
    expect(back.log).toHaveLength(g.log!.length)
    expect(publicGame(g, 'game', null).log).toBeUndefined()
  })

  it('logs the tournament round', () => {
    const t = addLog({ ...g0, tournament: { rounds: [{ kind: 'board' }, { kind: 'final' }], at: 1, intro: false } }, { kind: 'final', team: 0, delta: 500 })
    expect(t.log![0].round).toBe(2)
  })
})

describe('competition bracket', () => {
  it('splits teams into even games, with a bye for a team on its own', () => {
    expect(group(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3).map((m) => m.teams.length)).toEqual([3, 2, 2])
    const bye = group(['a', 'b', 'c'], 2)
    expect(bye.map((m) => m.teams.length)).toEqual([2, 1])
    expect(bye[1].winner).toBe(0)
  })

  it('draws the next round from the winners until a champion is left', () => {
    let d = drawHeats({ ...newDivision('Men'), teams: Array.from({ length: 9 }, (_, i) => `T${i}`), per: 3 }, rng)
    expect(d.rounds[0].matches).toHaveLength(3)
    d = setWinner(d, 0, 0, 0)
    d = setWinner(d, 0, 1, 1)
    expect(d.rounds).toHaveLength(1)
    d = setWinner(d, 0, 2, 2)
    expect(d.rounds).toHaveLength(2)
    expect(d.rounds[1].matches).toHaveLength(1)
    const names = { heats: 'Heats', semi: 'Semi', final: 'Final', round: 'Round' }
    expect(roundName(names, d, 0)).toBe('Heats')
    expect(roundName(names, d, 1)).toBe('Final')
    expect(champion(d)).toBeNull()
    d = setWinner(d, 1, 0, 2)
    expect(champion(d)).toBe(d.rounds[1].matches[0].teams[2])
    // changing a heat's winner draws the later rounds again
    d = setWinner(d, 0, 0, 1)
    expect(champion(d)).toBeNull()
    expect(d.rounds[1].matches[0].winner).toBeUndefined()
  })

  it('a saved bracket is checked; rubbish gives an empty one', () => {
    expect(cleanBracket('x', ['M', 'W']).divisions.map((d) => d.name)).toEqual(['M', 'W'])
    const d = drawHeats({ ...newDivision('Men'), teams: ['a', 'b', 'c', 'd'], per: 2 }, rng)
    const back = cleanBracket(JSON.parse(JSON.stringify({ divisions: [d], at: 5, live: { d: 0, r: 0, m: 9 } })), ['M'])
    expect(back.divisions[0].rounds).toEqual(d.rounds)
    expect(back.at).toBe(0)
    expect(back.live).toBeUndefined()
  })
})

describe('read-aloud', () => {
  it('leaves clues that name a Prophet or Companion to the host', () => {
    expect(hostReads('The Blessed Prophet ﵇ who was swallowed by a big fish.')).toBe(true)
    expect(hostReads('Our Beloved and our master Muhammad ﷺ')).toBe(true)
    expect(hostReads('Abu Bakr ﵁ was the first caliph.')).toBe(true)
    expect(hostReads('بِسۡمِ ٱللَّهِ …')).toBe(true)
    expect(hostReads('Complete it: ﴿ قُلْ هُوَ ٱللَّهُ أَحَدٌ ﴾')).toBe(true)
    expect(hostReads('The month of fasting.')).toBe(false)
  })
})
