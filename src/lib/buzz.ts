/**
 * Buzzer logic that needs no hardware: the messages the buzzer box sends and understands,
 * and turning a list of presses into a ranked order with ties.
 *
 * The box (a Raspberry Pi Pico running buzzer/firmware/main.py) stamps every press with the
 * microseconds since the host opened the buzzers, so the order never depends on how fast the
 * message travelled. Two presses closer together than the tie window share a place.
 */

/** One press from the box: which button (0-based) and microseconds since the buzzers opened. */
export interface Press {
  button: number
  us: number
}

/** A message from the box, already parsed. */
export type BoxEvent =
  | { kind: 'hello'; version: number; buttons: number }
  | { kind: 'press'; button: number; us: number }
  | { kind: 'early'; button: number }
  | { kind: 'test'; button: number }
  | { kind: 'reset' }
  | { kind: 'pong' }

/** What the box should be doing. idle: no clue open (presses are only tests). ready: the clue is being read (a press is early). open: buzzers are live. */
export type BoxMode = 'idle' | 'ready' | 'open'

/** The most buttons a box can have; the app uses one per team. */
export const MAX_BUTTONS = 8

/** Default tie window in milliseconds. */
export const DEFAULT_TIE_MS = 5

/** Read one line from the box. Anything that isn't a message from the box (MicroPython start-up text, typos) gives null. */
export function parseLine(raw: string): BoxEvent | null {
  const line = raw.trim()
  if (!line) return null
  const parts = line.split(/\s+/)
  const n = (i: number) => {
    const v = Number(parts[i])
    return Number.isInteger(v) && v >= 0 ? v : null
  }
  const button = (i: number) => {
    const v = n(i)
    return v !== null && v < MAX_BUTTONS ? v : null
  }
  switch (parts[0]) {
    case 'GG': {
      if (parts[1] !== 'BUZZ') return null
      const version = n(2)
      const buttons = n(3)
      return version !== null && buttons !== null && buttons >= 1 && buttons <= MAX_BUTTONS ? { kind: 'hello', version, buttons } : null
    }
    case 'P': {
      const b = button(1)
      const us = n(2)
      return b !== null && us !== null && parts.length === 3 ? { kind: 'press', button: b, us } : null
    }
    case 'E': {
      const b = button(1)
      return b !== null && parts.length === 2 ? { kind: 'early', button: b } : null
    }
    case 'T': {
      const b = button(1)
      return b !== null && parts.length === 2 ? { kind: 'test', button: b } : null
    }
    case 'R':
      return parts.length === 1 ? { kind: 'reset' } : null
    case 'PONG':
      return { kind: 'pong' }
    default:
      return null
  }
}

/** The command that puts the box in a mode. */
export const modeCommand = (mode: BoxMode) => (mode === 'idle' ? 'IDLE' : mode === 'ready' ? 'READY' : 'OPEN')

/** The command that lights exactly these buttons (0-based). */
export function lightCommand(buttons: number[]): string {
  let mask = 0
  for (const b of buttons) if (Number.isInteger(b) && b >= 0 && b < MAX_BUTTONS) mask |= 1 << b
  return `LIGHT ${mask}`
}

/** One place in the buzz order. */
export interface Place {
  team: number
  /** 1 for the first, 2 for the next; teams that tied share a place */
  rank: number
  /** Seconds after the first press */
  gap: number
  /** True when this team tied with another team */
  tie: boolean
}

/**
 * Turn presses into an order of teams. map[team] is the button that team presses.
 * Presses from buttons no team uses are left out, and only a team's first press counts.
 * A team ties with the press that starts its group when they are within tieMs of each other.
 */
export function buzzOrder(presses: Press[], map: number[], tieMs: number = DEFAULT_TIE_MS): Place[] {
  const teamOf = new Map<number, number>()
  map.forEach((b, team) => {
    if (!teamOf.has(b)) teamOf.set(b, team)
  })
  const first = new Map<number, number>()
  for (const p of presses) {
    const team = teamOf.get(p.button)
    if (team === undefined) continue
    const seen = first.get(team)
    if (seen === undefined || p.us < seen) first.set(team, p.us)
  }
  const sorted = [...first.entries()].map(([team, us]) => ({ team, us })).sort((a, b) => a.us - b.us || a.team - b.team)
  if (!sorted.length) return []
  const win = Math.max(0, tieMs) * 1000
  const out: Place[] = []
  let groupStart = sorted[0].us
  let rank = 1
  sorted.forEach((p, i) => {
    if (i > 0 && p.us - groupStart > win) {
      groupStart = p.us
      rank = i + 1
    }
    out.push({ team: p.team, rank, gap: (p.us - sorted[0].us) / 1e6, tie: false })
  })
  for (const p of out) p.tie = out.some((q) => q !== p && q.rank === p.rank)
  return out
}

/**
 * Who answers now: the teams at the best place among those not yet marked wrong.
 * Usually one team; two or more when they tied.
 */
export function answering(order: Place[], wrong: number[]): number[] {
  const left = order.filter((p) => !wrong.includes(p.team))
  if (!left.length) return []
  const best = left[0].rank
  return left.filter((p) => p.rank === best).map((p) => p.team)
}

/** Buzzer settings kept in the browser. */
export interface BuzzSettings {
  /** map[team] = the button (0-based) that team presses */
  map: number[]
  tieMs: number
  /** Open the buzzers by itself as soon as the question shows (off: the host presses Open buzzers after reading it) */
  autoOpen: boolean
}

export const DEFAULT_BUZZ: BuzzSettings = { map: [0, 1, 2, 3], tieMs: DEFAULT_TIE_MS, autoOpen: false }

/** Clean settings read from storage, filling in anything missing or broken. */
export function cleanBuzzSettings(raw: unknown): BuzzSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<BuzzSettings>
  const map = Array.isArray(r.map) ? r.map.slice(0, 4).map((b, i) => (Number.isInteger(b) && b >= 0 && b < MAX_BUTTONS ? b : i)) : []
  while (map.length < 4) map.push(map.length)
  const tie = Number(r.tieMs)
  return {
    map,
    tieMs: Number.isFinite(tie) ? Math.min(50, Math.max(0, Math.round(tie))) : DEFAULT_TIE_MS,
    autoOpen: r.autoOpen === true,
  }
}
