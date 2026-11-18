import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAudienceRound } from './LiveAudience'
import { CatIcon } from './Brand'
import type { Game, Lang } from '../lib/types'
import TileIntro from './TileIntro'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { STREAK_AT, adjustScore, answerRight, answerWrong, clueSeconds, isFinished, lastPlace, markUsed, nextRound, score, tileKey, turnTeam } from '../lib/game'
import { roundTitle } from './Tournament'
import { createPortal } from 'react-dom'
import AdjustScores, { type Adjustment } from './AdjustScores'
import { burst, burstAt, reducedMotion } from '../lib/fx'
import { CONSENT_TEXT } from '../lib/legal'
import { HOST_EDITION, type AudView, type Live } from '../lib/edition'
import { diagramSrc } from '../lib/diagram'
import { photoCredit } from '../lib/photos'
import { GameClock, TimerBar, type Clock } from './Timer'
import { clockStart, clockStop, drumRoll, prepareSuspense, sfx } from '../lib/sound'
import { BuzzOrder, type BuzzView, useBuzzRound } from './Buzzers'

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
  // Make the buzzer, the wrong-answer sound and the theme's clock and roll while the board shows.
  useEffect(() => prepareSuspense(), [])
  const [open, setOpen] = useState<Open | null>(null)
  const [intro] = useState(() => game.used.length === 0)
  const [adjusting, setAdjusting] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [adjustLog, setAdjustLog] = useState<Adjustment[]>([])
  const boardRef = useRef<HTMLDivElement>(null)
  const cols = game.cats.length
  const left = cols * 5 - game.used.length

  const [cardState, setCardState] = useState<{ revealed: boolean; clock: Clock | null; intro?: boolean; buzz?: BuzzView | null; aud?: AudView | null }>({ revealed: false, clock: null })
  useEffect(() => {
    onLive?.(open ? { c: open.c, l: open.l, revealed: cardState.revealed, clock: cardState.clock, intro: cardState.intro, buzz: cardState.buzz ?? null, aud: cardState.aud ?? null } : null)
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

  const [fire, setFire] = useState<{ team: number; id: number } | null>(null)
  useEffect(() => {
    if (!fire) return
    const id = setTimeout(() => setFire(null), 2800)
    return () => clearTimeout(id)
  }, [fire])

  const celebrate = (team: number, good: boolean) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-team="${team}"]`)
      el?.classList.add('pop')
      setTimeout(() => el?.classList.remove('pop'), 600)
      if (good) burstAt(el?.querySelector('span') ?? null, 22, 140)
    })
  }

  /** Right: points, the streak bonus, and applause for big wins. Wrong: the streak ends and points come off if the host chose that. */
  const judgeClue = (team: number, right: boolean, c: number, l: number) => {
    const clue = game.clues[c][l]
    if (right) {
      const r = answerRight(game, team, clue.value)
      setGame(r.game)
      sfx.right()
      celebrate(team, true)
      if (r.bonus) {
        setTimeout(() => sfx.streak(), 380)
        setFire({ team, id: Date.now() })
      }
      if (clue.value >= 400 || clue.special === 'crowd') setTimeout(() => sfx.applause(), 250)
    } else {
      let g = answerWrong(game, team)
      if (game.settings.deduct) g = score(g, team, -clue.value)
      setGame(g)
      sfx.wrong()
      if (game.settings.deduct) celebrate(team, false)
    }
  }

  const behind = game.settings.comeback && game.used.length > 0 && !isFinished(game) ? lastPlace(game) : []
  // The comeback pick, when there is one, comes before the usual turn order.
  const turn = behind.length ? null : turnTeam(game)

  const moreRounds = nextRound(game) !== null

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
          {game.tournament && (
            <span className="pill round-pill" data-testid="round-pill">
              {t.roundWord} {num(game.tournament.at + 1, lang)}/{num(game.tournament.rounds.length, lang)} · {roundTitle(t, game.tournament.rounds[game.tournament.at])}
            </span>
          )}
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
              <span className="end-q">{moreRounds ? t.endRoundConfirm : t.endConfirm}</span>
              <button className="btn bad" onClick={onEnd} data-testid="end-confirm" autoFocus>
                {moreRounds ? t.endRoundYes : t.endYes}
              </button>
              <button className="ghost" onClick={() => setConfirmEnd(false)}>
                {t.cancel}
              </button>
            </span>
          ) : (
            <button className="ghost" onClick={() => setConfirmEnd(true)} disabled={!!open} data-testid="end">
              {moreRounds ? t.endRound : t.endGame}
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
                  {sub && <span className="sub" style={{ ['--sw' as string]: Math.max(...sub.split(/\s+/).map((w) => w.length)) }}>{sub}</span>}
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
                      const cl = game.clues[i][l]
                      setCardState({ revealed: false, clock: null, intro: !!(cl.golden || cl.special) })
                      setOpen({ c: i, l, el: e.currentTarget })
                      sfx.open()
                      const sp = game.clues[i][l].special
                      if (sp === 'steal') setTimeout(() => sfx.steal(), 450)
                      if (sp === 'crowd') sfx.crowd()
                    }}
                  >
                    <span className="med" />
                    <span className="v">{num(VALUES[l] * (game.mult ?? 1), lang)}</span>
                  </button>
                )
              }),
            )}
          </div>
        </div>
        <div className="scores">
          {game.teams.map((tm, i) => {
            const run = game.streaks?.[i] ?? 0
            return (
              <div className={`team${tm.score < 0 ? ' neg' : ''}${run >= STREAK_AT ? ' fire' : ''}${behind.includes(i) ? ' behind' : ''}${turn === i ? ' turn' : ''}`} key={i} data-team={i}>
                <b>{tm.name}</b>
                <span>{num(tm.score, lang)}</span>
                {run >= STREAK_AT && (
                  <em className="fire-badge" data-testid="fire-badge">
                    <span aria-hidden="true">🔥</span> {t.onFire} ×{num(run, lang)}
                  </em>
                )}
              </div>
            )
          })}
        </div>
        {behind.length > 0 && (
          <p className="comeback" role="status" data-testid="comeback">
            <span className="pill">{t.comebackLabel}</span> {behind.map((i) => game.teams[i].name).join(' · ')} {t.picksNext}
          </p>
        )}
        {turn !== null && (
          <p className="comeback turn-note" role="status" data-testid="turn">
            <span className="pill">{t.turnLabel}</span> {game.teams[turn].name} {t.picksNext}
          </p>
        )}
        {fire && (
          <div className="streak-pop" role="status" key={fire.id} data-testid="streak-pop">
            <span aria-hidden="true">🔥</span> {game.teams[fire.team]?.name}: {t.streakNote}
          </div>
        )}
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
          onJudge={(team, right) => judgeClue(team, right, open.c, open.l)}
          onSteal={(from) => {
            const clue = game.clues[open.c][open.l]
            setGame((g) => score(g, from, -clue.value))
            sfx.steal()
            celebrate(from, false)
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
  /** Steal tile: take the clue's points from this team (the team that answered already has them). */
  onSteal: (from: number) => void
  onClose: (used: boolean) => void
  onState: (s: { revealed: boolean; clock: Clock | null; intro: boolean; buzz: BuzzView | null; aud: AudView | null }) => void
  timeUp: boolean
}

function ClueCard({ t, lang, game, open, onJudge, onSteal, onClose, onState, timeUp }: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')
  const [revealed, setRevealed] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])
  const [clock, setClock] = useState<Clock | null>(null)
  const [stealer, setStealer] = useState<number | null>(null)
  const clue = game.clues[open.c][open.l]
  // Golden, Steal and Audience tiles first say what they are; the question (and its timer) comes after Next.
  const [intro, setIntro] = useState(() => !!(clue.golden || clue.special))
  const cat = game.cats[open.c]
  const q = lang === 'ar' && clue.qAr ? clue.qAr : clue.q
  const a = lang === 'ar' && clue.aAr ? clue.aAr : clue.a
  const timerSecs = clueSeconds(game.settings, open.l, clue)

  // The card animates with transform only (no layout work per frame): it sits at its open size and place,
  // and toTile() is the transform that shrinks it back onto its tile.
  const toTile = (card: HTMLElement) => {
    const t = open.el.getBoundingClientRect()
    const r = card.getBoundingClientRect()
    if (!r.width || !r.height) return 'none'
    const dx = t.left + t.width / 2 - (r.left + r.width / 2)
    const dy = t.top + t.height / 2 - (r.top + r.height / 2)
    return `translate(${dx}px, ${dy}px) scale(${t.width / r.width}, ${t.height / r.height})`
  }

  useLayoutEffect(() => {
    const card = ref.current!
    const W = Math.min(clue.img ? 960 : 820, innerWidth - 24)
    const H = Math.min(clue.img ? 760 : 560, innerHeight - 32)
    card.style.transition = 'none'
    Object.assign(card.style, { left: (innerWidth - W) / 2 + 'px', top: (innerHeight - H) / 2 + 'px', width: W + 'px', height: H + 'px' })
    card.style.transform = 'none'
    card.style.transform = toTile(card)
    card.getBoundingClientRect()
    requestAnimationFrame(() => {
      card.style.transition = ''
      setPhase('open')
      card.style.transform = 'none'
    })
    if (clue.golden) {
      setTimeout(() => burst(innerWidth / 2, innerHeight / 2, 46, 260), 500)
      sfx.golden()
    }
  }, [open.el, clue.golden, clue.img])

  // A tablet turned round (or a window resized) while the card is open: fit the card to the new screen,
  // so it and its buttons don't end up off the edge.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => {
    const refit = () => {
      const card = ref.current
      if (!card || phaseRef.current === 'closing') return
      const W = Math.min(clue.img ? 960 : 820, innerWidth - 24)
      const H = Math.min(clue.img ? 760 : 560, innerHeight - 32)
      Object.assign(card.style, { left: (innerWidth - W) / 2 + 'px', top: (innerHeight - H) / 2 + 'px', width: W + 'px', height: H + 'px' })
    }
    addEventListener('resize', refit)
    return () => removeEventListener('resize', refit)
  }, [clue.img])

  // The countdown starts once the question is on show: after the card opens, or after Next on a special tile.
  const introAtOpen = useRef(intro)
  useEffect(() => {
    if (!timerSecs || intro) return
    const id = setTimeout(() => setClock({ start: Date.now(), total: timerSecs }), introAtOpen.current ? 350 : 650)
    return () => clearTimeout(id)
  }, [timerSecs, intro])
  const showQuestion = useCallback(() => setIntro(false), [])

  // The theme's ticking clock plays while the question is up; pressing Reveal swaps it for a drum roll,
  // and the answer appears on the crash.
  const [rolling, setRolling] = useState(false)
  useEffect(() => prepareSuspense(), [])
  useEffect(() => {
    if (intro || revealed || rolling || phase !== 'open') return
    clockStart()
    return () => clockStop()
  }, [intro, revealed, rolling, phase])

  const stopTimer = () => setClock((c) => (c && c.stoppedAt === undefined ? { ...c, stoppedAt: Math.min(Date.now(), c.start + c.total * 1000) } : c))

  // Buzzers (when a box is plugged in): ready while the question is up, quiet once the answer shows.
  const buzz = useBuzzRound({ live: !intro && !revealed && !rolling && phase !== 'closing', wrong, teams: game.teams.length })
  const buzzView: BuzzView | null = buzz.ready ? { open: buzz.isOpen, order: buzz.order, wrong } : null
  const buzzKey = buzzView ? JSON.stringify(buzzView) : ''
  // On the Pi: the audience's phones answer too.
  const aud = useAudienceRound({ game, c: open.c, l: open.l, intro, revealed, secs: timerSecs, lang })
  const audKey = aud ? JSON.stringify(aud) : ''

  const stateRef = useRef(onState)
  stateRef.current = onState
  useEffect(() => {
    stateRef.current({ revealed, clock, intro, buzz: buzzView, aud })
    // buzzKey stands for buzzView, which is a new object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, clock, intro, buzzKey, audKey])

  const reveal = useCallback(() => {
    if (revealed || intro || rolling) return
    stopTimer()
    const show = (bells: boolean) => {
      setRevealed(true)
      if (bells) sfx.reveal()
      setTimeout(() => burstAt(document.getElementById('answer'), 14, 110), bells ? 350 : 60)
    }
    const wait = drumRoll()
    if (!wait) return show(true)
    setRolling(true)
    setTimeout(() => {
      setRolling(false)
      show(false)
    }, wait)
  }, [revealed, intro, rolling])

  const close = useCallback(
    (used: boolean) => {
      if (phase === 'closing') return
      setPhase('closing')
      // Once the answer is out or a team has been marked, the tile is spent: closing the card
      // (Back, Esc or a click outside) can't put it back on the board for another go.
      used = used || revealed || rolling || wrong.length > 0
      const card = ref.current!
      setTimeout(() => {
        card.style.transform = 'none'
        card.style.transform = toTile(card)
      }, 120)
      setTimeout(() => onClose(used), reducedMotion() ? 10 : 780)
    },
    [phase, open.el, onClose, revealed, rolling, wrong.length],
  )

  const judge = useCallback(
    (team: number, right: boolean) => {
      if (intro || phase === 'closing' || stealer !== null || team >= game.teams.length || wrong.includes(team)) return
      onJudge(team, right)
      if (right) {
        if (!revealed) setRevealed(true)
        stopTimer()
        // A Steal tile waits for the host to pick whose points are taken.
        if (clue.special === 'steal' && game.teams.length > 1) setStealer(team)
        else setTimeout(() => close(true), revealed ? 200 : 900)
      } else {
        setWrong((w) => [...w, team])
      }
    },
    [intro, phase, stealer, clue.special, game.teams.length, wrong, onJudge, revealed, close],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (intro && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault()
        showQuestion()
      } else if (e.code === 'Space') {
        e.preventDefault()
        reveal()
      } else if (e.key === 'Escape') close(stealer !== null)
      else if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey && !e.altKey) buzz.open()
      else {
        const m = /^Digit([1-4])$/.exec(e.code)
        if (m) judge(+m[1] - 1, !e.shiftKey)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [intro, showQuestion, reveal, close, judge, stealer, buzz])

  return (
    <>
      <div className={`scrim${phase === 'open' ? ' on' : ''}`} onClick={() => close(stealer !== null)} />
      <div ref={ref} className={`card${phase === 'open' ? ' open' : ''}${phase === 'closing' ? ' closing' : ''}${clue.golden && phase === 'open' ? ' golden' : ''}`} role="dialog" aria-modal="true" aria-label={cat.name} data-testid="clue">
        <div className="card-in">
          <div className="meta">
            <span className="meta-cat"><CatIcon id={cat.id} />{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</span>
            <span className="row">
              {clue.golden && <span className="pill g">{t.golden}</span>}
              {clue.special === 'steal' && <span className="pill steal">{t.steal}</span>}
              {clue.special === 'crowd' && <span className="pill crowd">{t.crowd}</span>}
              <span className="pill">{num(clue.value, lang)}</span>
            </span>
          </div>
          {intro ? (
            <TileIntro t={t} clue={clue} />
          ) : (
            <>
            <p className="q" data-testid="question" dir="auto">{q}</p>
            {clue.img && (
              <div className="q-fig">
                <img className={`q-img${photoCredit(clue.img) ? ' photo' : ''}`} src={diagramSrc(clue.img)} alt={t.diagramAlt} data-testid="question-img" />
                {photoCredit(clue.img) && <p className="q-credit" data-testid="photo-credit">{photoCredit(clue.img)}</p>}
              </div>
            )}
            <div className={`answer${revealed ? ' show' : HOST_EDITION ? ' peek' : ''}`} dir="auto" id="answer" aria-hidden={!revealed && !HOST_EDITION} data-peek={t.hostOnly} data-testid="answer">
              {a}
            </div>
            {timerSecs > 0 && <TimerBar clock={clock} total={timerSecs} lang={lang} timeUpText={t.timeUp} onTick={(n) => (n === 0 ? (clockStop(), sfx.timeUp()) : sfx.tick(n === 1))} />}
            {buzzView && !revealed && (
              <div className="buzz-bar" data-testid="buzz-bar">
                <button className={buzz.isOpen && !buzz.order.length ? 'ghost' : 'btn'} onClick={buzz.open} disabled={buzz.isOpen && !buzz.order.length} data-testid="buzz-arm" title={t.buzz.keys}>
                  {buzz.isOpen ? (buzz.order.length ? t.buzz.reopen : t.buzz.waiting) : t.buzz.open}
                </button>
                {!buzz.isOpen && <span className="muted small">{t.buzz.locked}</span>}
                {buzz.early && (
                  <span className="pill bad buzz-early" key={buzz.early.id} role="status" data-testid="buzz-early">
                    {game.teams[buzz.early.team]?.name}: {t.buzz.early}
                  </span>
                )}
                <BuzzOrder t={t} lang={lang} view={buzzView} teams={game.teams} />
              </div>
            )}
            {stealer !== null && (
              <div className="steal-pick" role="group" aria-label={t.stealFrom} data-testid="steal-pick">
                <span className="label">
                  {game.teams[stealer].name}: {t.stealFrom}
                </span>
                <div className="row">
                  {game.teams.map((tm, i) =>
                    i === stealer ? null : (
                      <button key={i} className="btn bad" data-steal={i} onClick={() => {
                        onSteal(i)
                        close(true)
                      }}>
                        {tm.name} −{num(clue.value, lang)}
                      </button>
                    ),
                  )}
                  <button className="ghost" onClick={() => close(true)} data-steal="none">
                    {t.skip}
                  </button>
                </div>
              </div>
            )}
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
            </>
          )}
          {intro ? (
            <div className="actions">
              <button className="btn" onClick={showQuestion} data-testid="intro-next" autoFocus>
                {t.showQuestion}
              </button>
              <button className="btn alt" onClick={() => close(false)} data-testid="back">
                {t.close}
              </button>
            </div>
          ) : (
            <>
            <div className="actions">
              <div className="row">
                <button className="btn" onClick={reveal} disabled={revealed || rolling} data-testid="reveal">
                  {HOST_EDITION ? t.showOnScreen : t.reveal}
                </button>
                <button className="btn alt" onClick={() => { sfx.nobody(); close(true) }} data-testid="nobody">
                  {t.nobody}
                </button>
              </div>
              <button className="btn alt" onClick={() => close(stealer !== null)} data-testid="back">
                {t.close}
              </button>
            </div>
            </>
          )}
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

