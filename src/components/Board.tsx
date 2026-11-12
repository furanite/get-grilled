import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Source from './Source'
import { CatIcon } from './Brand'
import type { Game, Lang } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { adjustScore, clueSeconds, isFinished, markUsed, score, tileKey } from '../lib/game'
import { createPortal } from 'react-dom'
import AdjustScores, { type Adjustment } from './AdjustScores'
import { burst, burstAt, reducedMotion } from '../lib/fx'
import { CONSENT_TEXT } from '../lib/legal'
import { HOST_EDITION, type Live } from '../lib/edition'
import { diagramSrc } from '../lib/diagram'
import { GameClock, TimerBar, type Clock } from './Timer'
import { sfx, stopSuspense, suspense } from '../lib/sound'

interface Props {
  t: Strings
  lang: Lang
  game: Game
  setGame: (u: Game | ((g: Game) => Game)) => void
  onEnd: () => void
  /** Host edition: tells the audience screen which clue is open and whether its answer is shown. */
  onLive?: (live: Live | null) => void
}

interface Open {
  c: number
  l: number
  el: HTMLElement
}

export default function Board({ t, lang, game, setGame, onEnd, onLive }: Props) {
  const [open, setOpen] = useState<Open | null>(null)
  const [intro] = useState(() => game.used.length === 0)
  const [adjusting, setAdjusting] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [adjustLog, setAdjustLog] = useState<Adjustment[]>([])
  const boardRef = useRef<HTMLDivElement>(null)
  const cols = game.cats.length
  const left = cols * 5 - game.used.length

  const [cardState, setCardState] = useState<{ revealed: boolean; clock: Clock | null }>({ revealed: false, clock: null })
  useEffect(() => {
    onLive?.(open ? { c: open.c, l: open.l, revealed: cardState.revealed, clock: cardState.clock } : null)
  }, [open, cardState, onLive])
  useEffect(() => () => onLive?.(null), [onLive])

  // Random glints on unplayed tiles
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || !boardRef.current || reducedMotion()) return
      const tiles = [...boardRef.current.querySelectorAll<HTMLElement>('.tile:not(.used)')]
      if (!tiles.length) return
      const tile = tiles[Math.floor(Math.random() * tiles.length)]
      const g = document.createElement('span')
      g.className = 'glint'
      g.style.left = 10 + Math.random() * 70 + '%'
      g.style.top = 10 + Math.random() * 60 + '%'
      tile.appendChild(g)
      g.onanimationend = () => g.remove()
    }, 700)
    return () => clearInterval(id)
  }, [])

  // The whole-game clock: when it runs out, the game ends once no clue is open.
  const [timeUp, setTimeUp] = useState(() => !!game.endsAt && Date.now() >= game.endsAt)
  useEffect(() => {
    if (!game.endsAt || timeUp) return
    const id = setInterval(() => Date.now() >= game.endsAt! && setTimeUp(true), 500)
    return () => clearInterval(id)
  }, [game.endsAt, timeUp])
  useEffect(() => {
    if (timeUp && !open) {
      sfx.timeUp()
      const id = setTimeout(onEnd, 1800)
      return () => clearTimeout(id)
    }
  }, [timeUp, open, onEnd])

  useEffect(() => {
    if (isFinished(game) && !open) {
      const id = setTimeout(onEnd, 1400)
      return () => clearTimeout(id)
    }
  }, [game, open, onEnd])

  const award = (team: number, delta: number) => {
    setGame((g) => score(g, team, delta))
    if (delta > 0) sfx.right()
    else sfx.wrong()
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-team="${team}"]`)
      el?.classList.add('pop')
      setTimeout(() => el?.classList.remove('pop'), 600)
      if (delta > 0) burstAt(el?.querySelector('span') ?? null, 22, 140)
    })
  }

  const adjust = (team: number, delta: number) => {
    const before = game.teams[team]?.score
    const next = adjustScore(game, team, delta)
    if (next.teams[team]?.score === before) return
    setGame(next)
    sfx.soft()
    setAdjustLog((l) => [...l, { team, delta }])
  }
  const undoAdjust = () => {
    const last = adjustLog[adjustLog.length - 1]
    if (!last) return
    setGame((g) => adjustScore(g, last.team, -last.delta))
    setAdjustLog((l) => l.slice(0, -1))
  }

  return (
    <main className="stack">
      <div className="game-top">
        <span className="row" style={{ gap: 12 }}>
          <span className="label">
            {num(left, lang)} {t.round}
          </span>
          {game.endsAt && <GameClock endsAt={game.endsAt} lang={lang} leftText={t.gameLeft} overText={t.gameOver} />}
        </span>
        <div className="game-top-actions">
          <button className="ghost" onClick={() => setAdjusting(true)} disabled={!!open} data-testid="adjust-open">
            {t.adjust}
          </button>
          {confirmEnd ? (
            <span className="end-confirm" role="group" aria-label={t.endGame}>
              <span className="end-q">{t.endConfirm}</span>
              <button className="btn bad" onClick={onEnd} data-testid="end-confirm" autoFocus>
                {t.endYes}
              </button>
              <button className="ghost" onClick={() => setConfirmEnd(false)}>
                {t.cancel}
              </button>
            </span>
          ) : (
            <button className="ghost" onClick={() => setConfirmEnd(true)} disabled={!!open} data-testid="end">
              {t.endGame}
            </button>
          )}
        </div>
      </div>
      {adjusting &&
        createPortal(
          <AdjustScores t={t} lang={lang} game={game} log={adjustLog} onAdjust={adjust} onUndo={undoAdjust} onClose={() => setAdjusting(false)} />,
          document.body,
        )}
      <section className="stage">
        <div className="sadu-band" aria-hidden="true" />
        <div className="board-scroll">
          <div className="board" ref={boardRef} style={{ gridTemplateColumns: `repeat(${cols},minmax(0,var(--colmax)))`, ['--cols' as string]: cols }}>
            {game.cats.map((c, i) => {
              const [main, sub] = lang === 'ar' && c.nameAr ? [c.nameAr, c.name] : [c.name, c.nameAr]
              return (
                <div className="cat" key={'h' + i} style={{ ['--d' as string]: intro ? `${i * 60}ms` : '0ms' }}>
                  <CatIcon id={c.id} />
                  <span className="main" style={{ ['--w' as string]: Math.max(...main.split(/\s+/).map((w) => w.length)) }}>
                  {main}
                </span>
                  {sub && <span className="sub">{sub}</span>}
                </div>
              )
            })}
            {VALUES.map((_, l) =>
              game.cats.map((c, i) => {
                const used = game.used.includes(tileKey(i, l))
                return (
                  <button
                    key={tileKey(i, l)}
                    className={`tile${used ? ' used static' : ''}`}
                    style={{ ['--d' as string]: intro ? `${300 + (l + i) * 70}ms` : '0ms', animation: intro || used ? undefined : 'none' }}
                    disabled={used}
                    aria-label={`${c.name} ${VALUES[l]}`}
                    data-tile={tileKey(i, l)}
                    onClick={(e) => {
                      if (open) return
                      setCardState({ revealed: false, clock: null })
                      setOpen({ c: i, l, el: e.currentTarget })
                      sfx.open()
                    }}
                  >
                    <span className="med" />
                    <span className="v">{num(VALUES[l], lang)}</span>
                  </button>
                )
              }),
            )}
          </div>
        </div>
        <div className="scores">
          {game.teams.map((tm, i) => (
            <div className={`team${tm.score < 0 ? ' neg' : ''}`} key={i} data-team={i}>
              <b>{tm.name}</b>
              <span>{num(tm.score, lang)}</span>
            </div>
          ))}
        </div>
        <p className="hint">{t.shortcuts}</p>
      </section>
      {open && (
        <ClueCard
          key={tileKey(open.c, open.l)}
          t={t}
          lang={lang}
          game={game}
          open={open}
          timeUp={timeUp}
          onState={setCardState}
          onJudge={(team, right) => {
            const clue = game.clues[open.c][open.l]
            if (right) award(team, clue.value)
            else if (game.settings.deduct) award(team, -clue.value)
            else sfx.wrong()
          }}
          onClose={(used) => {
            setOpen(null)
            if (used) {
              const tile = open.el
              tile.classList.add('used')
              setGame((g) => markUsed(g, open.c, open.l))
            }
          }}
        />
      )}
    </main>
  )
}

interface CardProps {
  t: Strings
  lang: Lang
  game: Game
  open: Open
  onJudge: (team: number, right: boolean) => void
  onClose: (used: boolean) => void
  onState: (s: { revealed: boolean; clock: Clock | null }) => void
  timeUp: boolean
}

function ClueCard({ t, lang, game, open, onJudge, onClose, onState, timeUp }: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')
  const [revealed, setRevealed] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])
  const [clock, setClock] = useState<Clock | null>(null)
  const clue = game.clues[open.c][open.l]
  const cat = game.cats[open.c]
  const q = lang === 'ar' && clue.qAr ? clue.qAr : clue.q
  const a = lang === 'ar' && clue.aAr ? clue.aAr : clue.a
  const timerSecs = clueSeconds(game.settings, open.l, clue)

  const rectStyle = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }
  }

  useLayoutEffect(() => {
    const card = ref.current!
    Object.assign(card.style, rectStyle(open.el))
    card.getBoundingClientRect()
    const W = Math.min(clue.img ? 960 : 820, innerWidth - 24)
    const H = Math.min(clue.img ? 760 : 560, innerHeight - 32)
    requestAnimationFrame(() => {
      setPhase('open')
      Object.assign(card.style, { left: (innerWidth - W) / 2 + 'px', top: (innerHeight - H) / 2 + 'px', width: W + 'px', height: H + 'px' })
    })
    if (clue.golden && !cat.respect) {
      setTimeout(() => burst(innerWidth / 2, innerHeight / 2, 46, 260), 500)
      sfx.golden()
    }
  }, [open.el, clue.golden, clue.img, cat.respect])

  // The countdown starts once the card has finished opening.
  useEffect(() => {
    if (!timerSecs) return
    const id = setTimeout(() => setClock({ start: Date.now(), total: timerSecs }), 650)
    return () => clearTimeout(id)
  }, [timerSecs])

  // A quiet heartbeat on the daff until the answer is shown (Islamic site only).
  useEffect(() => {
    if (revealed) return
    const id = setTimeout(suspense, 700)
    return () => {
      clearTimeout(id)
      stopSuspense()
    }
  }, [revealed])

  const stopTimer = () => setClock((c) => (c && c.stoppedAt === undefined ? { ...c, stoppedAt: Math.min(Date.now(), c.start + c.total * 1000) } : c))

  const stateRef = useRef(onState)
  stateRef.current = onState
  useEffect(() => {
    stateRef.current({ revealed, clock })
  }, [revealed, clock])

  const reveal = useCallback(() => {
    if (revealed) return
    setRevealed(true)
    stopTimer()
    sfx.reveal()
    if (!cat.respect) setTimeout(() => burstAt(document.getElementById('answer'), 14, 110), 350)
  }, [revealed, cat.respect])

  const close = useCallback(
    (used: boolean) => {
      if (phase === 'closing') return
      setPhase('closing')
      const card = ref.current!
      setTimeout(() => Object.assign(card.style, rectStyle(open.el)), 120)
      setTimeout(() => onClose(used), reducedMotion() ? 10 : 780)
    },
    [phase, open.el, onClose],
  )

  const judge = useCallback(
    (team: number, right: boolean) => {
      if (phase === 'closing' || team >= game.teams.length || wrong.includes(team)) return
      onJudge(team, right)
      if (right) {
        if (!revealed) setRevealed(true)
        stopTimer()
        setTimeout(() => close(true), revealed ? 200 : 900)
      } else {
        setWrong((w) => [...w, team])
      }
    },
    [phase, game.teams.length, wrong, onJudge, revealed, close],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        reveal()
      } else if (e.key === 'Escape') close(false)
      else {
        const m = /^Digit([1-4])$/.exec(e.code)
        if (m) judge(+m[1] - 1, !e.shiftKey)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [reveal, close, judge])

  return (
    <>
      <div className={`scrim${phase === 'open' ? ' on' : ''}`} onClick={() => close(false)} />
      <div ref={ref} className={`card${phase === 'open' ? ' open' : ''}${phase === 'closing' ? ' closing' : ''}${clue.golden && phase === 'open' ? ' golden' : ''}${cat.respect ? ' calm' : ''}`} role="dialog" aria-modal="true" aria-label={cat.name} data-testid="clue">
        <div className="card-in">
          <div className="meta">
            <span className="meta-cat"><CatIcon id={cat.id} />{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</span>
            <span className="row">
              {clue.golden && <span className="pill g">{t.golden}</span>}
              <span className="pill">{num(clue.value, lang)}</span>
            </span>
          </div>
          <p className="q" data-testid="question" dir="auto">{q}</p>
          {clue.img && (
            <div className="q-fig">
              <img className="q-img" src={diagramSrc(clue.img)} alt={t.diagramAlt} data-testid="question-img" />
            </div>
          )}
          <div className={`answer${revealed ? ' show' : HOST_EDITION ? ' peek' : ''}`} dir="auto" id="answer" aria-hidden={!revealed && !HOST_EDITION} data-peek={t.hostOnly} data-testid="answer">
            {a}
            <Source t={t} q={clue} />
          </div>
          {timerSecs > 0 && <TimerBar clock={clock} total={timerSecs} lang={lang} timeUpText={t.timeUp} onTick={(n) => (n === 0 ? sfx.timeUp() : sfx.tick(n === 1))} />}
          <div className="judge">
            {game.teams.map((tm, i) => (
              <div className="t" key={i}>
                <span>{tm.name}</span>
                <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  <button className="ok" onClick={() => judge(i, true)} disabled={wrong.includes(i)} aria-label={`${tm.name} ${t.right}`} data-judge={`${i}-ok`}>
                    ✓
                  </button>
                  <button className="no" onClick={() => judge(i, false)} disabled={wrong.includes(i)} aria-label={`${tm.name} ${t.wrong}`} data-judge={`${i}-no`}>
                    ✗
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="actions">
            <div className="row">
              <button className="btn" onClick={reveal} disabled={revealed} data-testid="reveal">
                {HOST_EDITION ? t.showOnScreen : t.reveal}
              </button>
              <button className="btn alt" onClick={() => close(true)} data-testid="nobody">
                {t.nobody}
              </button>
            </div>
            <button className="btn alt" onClick={() => close(false)} data-testid="back">
              {t.close}
            </button>
          </div>
          {timeUp && (
            <p className="game-over-note" role="status" data-testid="game-over-note">
              {t.gameOverSoon}
            </p>
          )}
          <p className="report" data-testid="report">
            {CONSENT_TEXT[lang].report}
          </p>
        </div>
      </div>
    </>
  )
}
