import { describe, expect, it } from 'vitest'
import { answering, buzzOrder, cleanBuzzSettings, lightCommand, modeCommand, parseLine } from '../src/lib/buzz'
import { Sim } from '../src/lib/buzzer'

describe('buzzer box messages', () => {
  it('reads every kind of message', () => {
    expect(parseLine('GG BUZZ 1 8\r')).toEqual({ kind: 'hello', version: 1, buttons: 8 })
    expect(parseLine('P 2 84123')).toEqual({ kind: 'press', button: 2, us: 84123 })
    expect(parseLine('E 0')).toEqual({ kind: 'early', button: 0 })
    expect(parseLine('T 7')).toEqual({ kind: 'test', button: 7 })
    expect(parseLine('R')).toEqual({ kind: 'reset' })
    expect(parseLine('PONG')).toEqual({ kind: 'pong' })
  })

  it('ignores anything else, including broken or out-of-range messages', () => {
    for (const bad of ['', 'MicroPython v1.24 on 2025-01-01', 'P 8 100', 'P -1 100', 'P 1', 'P 1 2 3', 'P 1 1.5', 'GG BUZZ 1 9', 'GG BUZZ 1 0', 'E x', 'R 1', '>>> '])
      expect(parseLine(bad)).toBeNull()
  })

  it('writes mode and light commands', () => {
    expect(modeCommand('idle')).toBe('IDLE')
    expect(modeCommand('ready')).toBe('READY')
    expect(modeCommand('open')).toBe('OPEN')
    expect(lightCommand([])).toBe('LIGHT 0')
    expect(lightCommand([0, 2])).toBe('LIGHT 5')
    expect(lightCommand([7, 9, -1, 1.5])).toBe('LIGHT 128')
  })
})

describe('buzz order', () => {
  const map = [0, 1, 2, 3]

  it('ranks teams by press time and gives the gap to the first', () => {
    const o = buzzOrder([{ button: 2, us: 400_000 }, { button: 0, us: 100_000 }, { button: 1, us: 184_000 }], map)
    expect(o.map((p) => [p.team, p.rank, p.tie])).toEqual([[0, 1, false], [1, 2, false], [2, 3, false]])
    expect(o[1].gap).toBeCloseTo(0.084)
    expect(o[2].gap).toBeCloseTo(0.3)
  })

  it('marks presses inside the tie window as a tie that shares a place', () => {
    const o = buzzOrder([{ button: 1, us: 1000 }, { button: 3, us: 4000 }, { button: 0, us: 20_000 }], map, 5)
    expect(o.map((p) => [p.team, p.rank, p.tie])).toEqual([[1, 1, true], [3, 1, true], [0, 3, false]])
  })

  it('treats presses in the very same instant as a tie even with no window', () => {
    const o = buzzOrder([{ button: 0, us: 500 }, { button: 1, us: 500 }], map, 0)
    expect(o.every((p) => p.rank === 1 && p.tie)).toBe(true)
  })

  it('measures a tie from the first press of its group, so a chain does not stretch it', () => {
    const o = buzzOrder([{ button: 0, us: 0 }, { button: 1, us: 4000 }, { button: 2, us: 8000 }], map, 5)
    expect(o.map((p) => p.rank)).toEqual([1, 1, 3])
    expect(o[2].tie).toBe(false)
  })

  it('follows the button map, keeps one press per team and drops unused buttons', () => {
    const o = buzzOrder([{ button: 5, us: 10 }, { button: 6, us: 20 }, { button: 5, us: 5 }, { button: 7, us: 1 }], [5, 6])
    expect(o.map((p) => p.team)).toEqual([0, 1])
    expect(o[0].gap).toBe(0)
  })

  it('passes the turn down the order as teams are marked wrong', () => {
    const o = buzzOrder([{ button: 0, us: 0 }, { button: 1, us: 2000 }, { button: 2, us: 90_000 }], map, 5)
    expect(answering(o, [])).toEqual([0, 1])
    expect(answering(o, [0])).toEqual([1])
    expect(answering(o, [0, 1])).toEqual([2])
    expect(answering(o, [0, 1, 2])).toEqual([])
  })
})

describe('buzzer settings', () => {
  it('fills in defaults and repairs bad values', () => {
    expect(cleanBuzzSettings(null)).toEqual({ map: [0, 1, 2, 3], tieMs: 5, autoOpen: false })
    expect(cleanBuzzSettings({ map: [3, 'x', 9], tieMs: 500, autoOpen: 'yes' })).toEqual({ map: [3, 1, 2, 3], tieMs: 50, autoOpen: false })
    expect(cleanBuzzSettings({ map: [1, 0, 2, 3, 4, 5], tieMs: -3, autoOpen: true })).toEqual({ map: [1, 0, 2, 3], tieMs: 0, autoOpen: true })
  })
})

describe('practice box (behaves like the firmware)', () => {
  const make = () => {
    let now = 0
    const out: string[] = []
    const sim = new Sim((l) => out.push(l), () => now)
    return { sim, out, at: (us: number) => (now = us) }
  }

  it('reports test presses when idle and early presses while the clue is read', () => {
    const { sim, out } = make()
    sim.press(1)
    sim.command('READY')
    sim.press(2)
    expect(out).toEqual(['T 1', 'E 2'])
  })

  it('locks an early button out for a quarter of a second after the buzzers open', () => {
    const { sim, out, at } = make()
    sim.command('READY')
    at(1_000_000)
    sim.press(0)
    at(1_100_000)
    sim.command('OPEN')
    at(1_200_000)
    sim.press(0) // still locked out
    sim.press(1)
    at(1_300_000)
    sim.press(0) // lock-out over
    expect(out).toEqual(['E 0', 'P 1 100000', 'P 0 200000'])
  })

  it('counts only the first press of each button and lights the first team', () => {
    const { sim, out, at } = make()
    sim.command('OPEN')
    at(5000)
    sim.press(3)
    sim.press(3)
    at(9000)
    sim.press(1)
    expect(out).toEqual(['P 3 5000', 'P 1 9000'])
    expect(sim.lit).toEqual([3])
    sim.command('LIGHT 2')
    expect(sim.lit).toEqual([1])
  })

  it('answers hello and ping', () => {
    const { sim, out } = make()
    sim.command('HELLO')
    sim.command('PING')
    expect(out).toEqual(['GG BUZZ 1 8', 'PONG'])
  })
})
