/**
 * The competition bracket: for each division, teams are drawn into games (heats) of 2 to 4 teams,
 * each game's winner goes through, and the next round is drawn from the winners until one champion is left.
 * Kept on this device only (team names and results, nothing else).
 */
export interface BMatch {
  teams: string[]
  /** Index into teams of the winner, once recorded */
  winner?: number
}
export interface BRound {
  matches: BMatch[]
}
export interface Division {
  name: string
  teams: string[]
  /** Teams per game, 2 to 4 */
  per: number
  rounds: BRound[]
}
export interface Bracket {
  divisions: Division[]
  /** The division on screen */
  at: number
  /** The bracket game being played right now, so its winner can be recorded from the results screen */
  live?: { d: number; r: number; m: number }
}

export const MAX_BRACKET_TEAMS = 64
type Rng = () => number

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Splits teams into games of at most `per`, as even as possible (sizes differ by one at most). A game of one is a bye. */
export function group(teams: string[], per: number): BMatch[] {
  if (!teams.length) return []
  const n = Math.ceil(teams.length / per)
  const out: BMatch[] = Array.from({ length: n }, () => ({ teams: [] }))
  teams.forEach((tm, i) => out[i % n].teams.push(tm))
  for (const m of out) if (m.teams.length === 1) m.winner = 0
  return out
}

export function newDivision(name: string): Division {
  return { name, teams: [], per: 3, rounds: [] }
}

export function emptyBracket(names: string[]): Bracket {
  return { divisions: names.map(newDivision), at: 0 }
}

/** Draws the first round from the division's teams (shuffled). */
export function drawHeats(d: Division, rng: Rng = Math.random): Division {
  const teams = d.teams.map((s) => s.trim()).filter(Boolean)
  if (teams.length < 2) return { ...d, rounds: [] }
  return { ...d, rounds: grow([{ matches: group(shuffle(teams, rng), d.per) }], d.per) }
}

/** Once every game of the last round has a winner, the next round is drawn from them (in order), until one is left. */
function grow(rounds: BRound[], per: number): BRound[] {
  const out = [...rounds]
  for (;;) {
    const last = out[out.length - 1]
    if (!last || last.matches.some((m) => m.winner === undefined)) return out
    const winners = last.matches.map((m) => m.teams[m.winner!])
    if (winners.length < 2) return out
    out.push({ matches: group(winners, per) })
  }
}

/** Records (or changes) a game's winner. Later rounds are drawn again from the new results. */
export function setWinner(d: Division, r: number, m: number, winner: number | undefined): Division {
  const round = d.rounds[r]
  const match = round?.matches[m]
  if (!match || (winner !== undefined && (winner < 0 || winner >= match.teams.length))) return d
  const rounds = d.rounds.slice(0, r + 1).map((x, i) => (i === r ? { matches: x.matches.map((mm, j) => (j === m ? { ...mm, winner } : mm)) } : x))
  return { ...d, rounds: grow(rounds, d.per) }
}

/** The division's champion, once the last game has a winner. */
export function champion(d: Division): string | null {
  const last = d.rounds[d.rounds.length - 1]
  if (!last || last.matches.length !== 1 || last.matches[0].winner === undefined) return null
  if (d.rounds.length === 1 && last.matches[0].teams.length < 2) return null
  return last.matches[0].teams[last.matches[0].winner]
}

/** A round's name: Final for the last game, Semi-finals just before, Heats for the first round, else Round n. */
export function roundName(names: { heats: string; semi: string; final: string; round: string }, d: Division, r: number): string {
  const round = d.rounds[r]
  if (round?.matches.length === 1) return names.final
  if (r === 0) return names.heats
  if (round && round.matches.length === 2) return names.semi
  return `${names.round} ${r + 1}`
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

/** A saved bracket, checked field by field; anything odd is dropped. */
export function cleanBracket(raw: unknown, fallbackNames: string[]): Bracket {
  if (!isObj(raw) || !Array.isArray(raw.divisions)) return emptyBracket(fallbackNames)
  const divisions: Division[] = []
  for (const d of raw.divisions.slice(0, 4)) {
    if (!isObj(d) || !isStr(d.name)) continue
    const teams = Array.isArray(d.teams) ? d.teams.filter(isStr).map((s) => s.slice(0, 40)).slice(0, MAX_BRACKET_TEAMS) : []
    const per = typeof d.per === 'number' && d.per >= 2 && d.per <= 4 ? Math.floor(d.per) : 3
    const rounds: BRound[] = []
    if (Array.isArray(d.rounds))
      for (const r of d.rounds.slice(0, 12)) {
        if (!isObj(r) || !Array.isArray(r.matches)) break
        const matches: BMatch[] = []
        for (const m of r.matches.slice(0, 40)) {
          if (!isObj(m) || !Array.isArray(m.teams)) continue
          const mt = m.teams.filter(isStr).map((s) => s.slice(0, 40)).slice(0, 4)
          if (!mt.length) continue
          const w = typeof m.winner === 'number' && Number.isInteger(m.winner) && m.winner >= 0 && m.winner < mt.length ? m.winner : undefined
          matches.push(w === undefined ? { teams: mt } : { teams: mt, winner: w })
        }
        if (!matches.length) break
        rounds.push({ matches })
      }
    divisions.push({ name: d.name.slice(0, 40), teams, per, rounds })
  }
  if (!divisions.length) return emptyBracket(fallbackNames)
  const at = typeof raw.at === 'number' && raw.at >= 0 && raw.at < divisions.length ? Math.floor(raw.at) : 0
  const out: Bracket = { divisions, at }
  const lv = raw.live
  if (isObj(lv) && [lv.d, lv.r, lv.m].every((x) => typeof x === 'number')) {
    const d = lv.d as number, r = lv.r as number, m = lv.m as number
    if (divisions[d]?.rounds[r]?.matches[m]) out.live = { d, r, m }
  }
  return out
}
