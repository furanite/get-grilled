/**
 * What other devices may see. The host's browser holds the whole game, answers included; the
 * projector, team tablets and audience phones get a copy with every question that isn't on show
 * blanked out, and every answer blanked until the host reveals it. Golden, Steal and Audience
 * tiles stay secret until they are opened.
 */
import type { Clue, Game, Lang, ModeItem, Question, Screen, ThemeId } from './types'
import type { Live } from './edition'
import type { VoteState } from '../components/Vote'

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
}

const HIDDEN = ''

function blankQ<T extends Question | ModeItem>(q: T): T {
  const out = { ...q, q: HIDDEN, a: HIDDEN } as T
  delete (out as Question).qAr
  delete (out as Question).aAr
  delete out.img
  delete (out as ModeItem).v
  delete (out as ModeItem).k
  return out
}

function noAnswer<T extends Question | ModeItem>(q: T): T {
  const out = { ...q, a: HIDDEN } as T
  delete (out as Question).aAr
  delete (out as ModeItem).v
  return out
}

const hiddenClue = (c: Clue): Clue => ({ id: c.id, q: HIDDEN, a: HIDDEN, value: c.value, golden: false })

/** The game as the room may see it right now. */
export function publicGame(game: Game, screen: Screen, live: Live | null): Game {
  const g: Game = { ...game }
  const onBoard = screen === 'game' && live
  g.clues = game.clues.map((col, c) =>
    col.map((clue, l) => {
      if (!onBoard || live.c !== c || live.l !== l) return hiddenClue(clue)
      // The open tile: what kind of tile it is shows at once; the question after Next; the answer after the reveal.
      const shown: Clue = live.intro ? { ...hiddenClue(clue), golden: clue.golden, special: clue.special } : { ...clue }
      return live.revealed && !live.intro ? shown : noAnswer(shown)
    }),
  )

  if (game.lightning) {
    const st = game.lightningState
    g.lightning = game.lightning.map((q, i) => {
      if (screen !== 'lightning' || !st?.startedAt || st.done || st.i !== i) return blankQ(q)
      return st.revealed ? { ...q } : noAnswer(q)
    })
  }

  if (game.final) {
    const step = game.finalState?.step ?? 'cat'
    const showQ = screen === 'final' && step !== 'cat'
    const showA = screen === 'final' && step === 'answer'
    g.final = { cat: game.final.cat, q: showA ? { ...game.final.q } : showQ ? noAnswer(game.final.q) : blankQ(game.final.q) }
  }

  if (game.modeRound) {
    const st = game.modeState
    const { mode, items } = game.modeRound
    g.modeRound = {
      mode,
      items: items.map((item, i) => {
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
