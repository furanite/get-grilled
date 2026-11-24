/**
 * What other devices may see. The host's browser holds the whole game, answers included; the
 * projector, team tablets and audience phones get a copy with every question that isn't on show
 * blanked out, and every answer blanked until the host reveals it. Golden, Steal and Audience
 * tiles stay secret until they are opened.
 *
 * A question's own id is never sent either: it is made from the category and the clue's words, and the
 * question files are public, so a real id would let anyone look the question and its answer up. Every
 * question goes out under a plain position code instead (board tile "t2-3", lightning "l4", ...).
 */
import type { Clue, Game, Lang, ModeItem, Question, Screen, ThemeId } from './types'
import type { Live } from './edition'
import type { VoteState } from '../components/Vote'
import type { LobbyInfo } from './store'
import type { Division } from './bracket'

/** Everything a screen in the room needs to draw what the projector shows. */
export interface PublicView {
  screen: Screen
  game: Game | null
  live: Live | null
  vote: VoteState | null
  theme: ThemeId
  lang: Lang
  reduceFx: boolean
  /** Audience phones: playing along, and whether the projector shows the join QR code */
  audience?: { on: boolean; showJoin: boolean }
  /** Larger text and colour-blind friendly colours, as the host set them */
  display?: { big: boolean; cb: boolean }
  /** The waiting screen, while the host has it up */
  lobby?: LobbyInfo
  /** The bracket division on show, while the host has the bracket open */
  bracket?: Division
}

const HIDDEN = ''

/** The same question under a position code in place of its real id; where it came from is left out too. */
function recode<T extends Question | ModeItem>(q: T, code: string): T {
  const out = { ...q, id: code } as T
  delete (out as ModeItem).from
  return out
}

const NO_CAT = { id: '', name: '' }

function blankQ<T extends Question | ModeItem>(q: T): T {
  const out = { ...q, q: HIDDEN, a: HIDDEN } as T
  delete (out as ModeItem).cat
  delete (out as Question).qAr
  delete (out as Question).aAr
  delete (out as Question).qUr
  delete (out as Question).aUr
  delete out.img
  delete (out as ModeItem).v
  delete (out as ModeItem).k
  return out
}

function noAnswer<T extends Question | ModeItem>(q: T): T {
  const out = { ...q, a: HIDDEN } as T
  delete (out as Question).aAr
  delete (out as Question).aUr
  delete (out as ModeItem).v
  return out
}

const hiddenClue = (c: Clue, code: string): Clue => ({ id: code, q: HIDDEN, a: HIDDEN, value: c.value, golden: false })

/** The game as the room may see it right now. */
export function publicGame(game: Game, screen: Screen, live: Live | null): Game {
  const g: Game = { ...game }
  const onBoard = screen === 'game' && live
  g.clues = game.clues.map((col, c) =>
    col.map((clue, l) => {
      const code = `t${c}-${l}`
      if (!onBoard || live.c !== c || live.l !== l) return hiddenClue(clue, code)
      // The open tile: what kind of tile it is shows at once; the question after Next; the answer after the reveal.
      const shown: Clue = live.intro ? { ...hiddenClue(clue, code), golden: clue.golden, special: clue.special } : { ...clue, id: code }
      return live.revealed && !live.intro ? shown : noAnswer(shown)
    }),
  )

  if (game.lightning) {
    const st = game.lightningState
    g.lightning = game.lightning.map((real, i) => {
      const q = recode(real, `l${i}`)
      if (screen !== 'lightning' || !st?.startedAt || st.done || st.i !== i) return blankQ(q)
      return st.revealed ? { ...q } : noAnswer(q)
    })
  }

  if (game.final) {
    const step = game.finalState?.step ?? 'cat'
    const showQ = screen === 'final' && step !== 'cat'
    const showA = screen === 'final' && step === 'answer'
    const fq = recode(game.final.q, 'f')
    // The secret final's category stays secret too until the final is on screen.
    g.final = { cat: screen === 'final' ? game.final.cat : NO_CAT, q: showA ? fq : showQ ? noAnswer(fq) : blankQ(fq) }
  }

  if (game.modeRound) {
    const st = game.modeState
    const { mode, items } = game.modeRound
    g.modeRound = {
      mode,
      items: items.map((real, i) => {
        const item = recode(real, `m${i}`)
        if (screen !== 'mode' || !st || st.done || st.i !== i) return blankQ(item)
        if (st.revealed) return { ...item }
        const open = noAnswer(item)
        // Clue by clue: only the clues shown so far; the rest stay as blanks so the count still reads right.
        if (mode === 'clues') {
          const shown = st.shown ?? 1
          open.q = item.q
            .split(' | ')
            .map((s, k) => (k < shown ? s : '…'))
            .join(' | ')
        }
        return open
      }),
    }
  }

  if (game.tiebreak) {
    const st = game.tieState
    g.tiebreak = game.tiebreak.map((item, i) => {
      const current = screen === 'tiebreak' && st && st.i === i
      const open = current && st.shown
      const q = recode(item.q, `b${i}`)
      return { cat: current ? item.cat : NO_CAT, q: !open ? blankQ(q) : st.revealed ? q : noAnswer(q) }
    })
  }
  // The game log holds every question and answer already asked; the room doesn't need it.
  delete g.log

  if (game.tournament) {
    g.tournament = {
      ...game.tournament,
      rounds: game.tournament.rounds.map((r) => ({ kind: r.kind, mode: r.mode, cats: r.cats })),
    }
  }
  return g
}

/** The view sent to every screen in the room. */
export function publicView(v: PublicView): PublicView {
  return { ...v, game: v.game ? publicGame(v.game, v.screen, v.live) : null }
}
