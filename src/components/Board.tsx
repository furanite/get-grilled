import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Source from './Source'
import { CatIcon } from './Brand'
import type { Game, Lang } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { isFinished, markUsed, score, tileKey } from '../lib/game'
import { burst, burstAt, reducedMotion } from '../lib/fx'
import { CONSENT_TEXT } from '../lib/legal'
import { HOST_EDITION, type Live } from '../lib/edition'

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
  const boardRef = useRef<HTMLDivElement>(null)
  const cols = game.cats.length
  const left = cols * 5 - game.used.length

  useEffect(() => {
    onLive?.(open ? { c: open.c, l: open.l, revealed: false } : null)
  }, [open, onLive])
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

  useEffect(() => {
    if (isFinished(game) && !open) {
      const id = setTimeout(onEnd, 1400)
      return () => clearTimeout(id)
    }
  }, [game, open, onEnd])

  const award = (team: number, delta: number) => {
    setGame((g) => score(g, team, delta))
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-team="${team}"]`)
      el?.classList.add('pop')
      setTimeout(() => el?.classList.remove('pop'), 600)
      if (delta > 0) burstAt(el?.querySelector('span') ?? null, 22, 140)
    })
  }

  return (
    <main className="stack">
      <div className="game-top">
        <span className="label">
          {num(left, lang)} {t.round}
        </span>
        <button className="ghost" onClick={onEnd} data-testid="end">
          {t.endGame}
        </button>
      </div>
      <section className="stage">
        <div className="sadu-band" aria-hidden="true" />
        <div className="board-scroll">
          <div className="board" ref={boardRef} style={{ gridTemplateColumns: `repeat(${cols},minmax(0,var(--colmax)))`, ['--cols' as string]: cols }}>
            {game.cats.map((c, i) => {
              const [main, sub] = lang === 'ar' && c.nameAr ? [c.nameAr, c.name] : [c.name, c.nameAr]
              return (
                <div className="cat" key={'h' + i} style={{ ['--d' as string]: intro ? `${i * 60}ms` : '0ms' }}>
                  <CatIcon id={c.id} />
                  <span>{main}</span>
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
                    onClick={(e) => !open && setOpen({ c: i, l, el: e.currentTarget })}
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
          onReveal={() => onLive?.({ c: open.c, l: open.l, revealed: true })}
          onJudge={(team, right) => {
            const clue = game.clues[open.c][open.l]
            if (right) award(team, clue.value)
            else if (game.settings.deduct) award(team, -clue.value)
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
  onReveal: () => void
}

function ClueCard({ t, lang, game, open, onJudge, onClose, onReveal }: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')
  const [revealed, setRevealed] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])
  const [low, setLow] = useState(false)
  const clue = game.clues[open.c][open.l]
  const cat = game.cats[open.c]
  const q = lang === 'ar' && clue.qAr ? clue.qAr : clue.q
  const a = lang === 'ar' && clue.aAr ? clue.aAr : clue.a
  const timerSecs = game.settings.timer

  const rectStyle = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }
  }

  useLayoutEffect(() => {
    const card = ref.current!
    Object.assign(card.style, rectStyle(open.el))
    card.getBoundingClientRect()
    const W = Math.min(820, innerWidth - 24)
    const H = Math.min(560, innerHeight - 32)
    requestAnimationFrame(() => {
      setPhase('open')
      Object.assign(card.style, { left: (innerWidth - W) / 2 + 'px', top: (innerHeight - H) / 2 + 'px', width: W + 'px', height: H + 'px' })
    })
    if (clue.golden && !cat.respect) setTimeout(() => burst(innerWidth / 2, innerHeight / 2, 46, 260), 500)
  }, [open.el, clue.golden, cat.respect])

  // Timer bar
  useEffect(() => {
    if (!timerSecs || !barRef.current) return
    const bar = barRef.current
    bar.style.transform = 'scaleX(1)'
    const start = setTimeout(() => {
      bar.style.transition = `transform ${timerSecs}s linear`
      bar.style.transform = 'scaleX(0)'
    }, 650)
    const lowId = setTimeout(() => setLow(true), 650 + Math.max(0, timerSecs - 5) * 1000)
    return () => {
      clearTimeout(start)
      clearTimeout(lowId)
    }
  }, [timerSecs])

  const stopTimer = () => {
    const bar = barRef.current
    if (!bar) return
    const cur = getComputedStyle(bar).transform
    bar.style.transition = 'none'
    bar.style.transform = cur
    setLow(false)
  }

  const revealRef = useRef(onReveal)
  revealRef.current = onReveal
  useEffect(() => {
    if (revealed) revealRef.current()
  }, [revealed])

  const reveal = useCallback(() => {
    if (revealed) return
    setRevealed(true)
    stopTimer()
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
            <span>{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</span>
            <span className="row">
              {clue.golden && <span className="pill g">{t.golden}</span>}
              <span className="pill">{num(clue.value, lang)}</span>
            </span>
          </div>
          <p className="q" data-testid="question" dir="auto">{q}</p>
          <div className={`answer${revealed ? ' show' : HOST_EDITION ? ' peek' : ''}`} dir="auto" id="answer" aria-hidden={!revealed && !HOST_EDITION} data-peek={t.hostOnly} data-testid="answer">
            {a}
            <Source t={t} q={clue} />
          </div>
          {timerSecs > 0 && (
            <div className={`timer${low ? ' low' : ''}`}>
              <i ref={barRef} />
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
          <p className="report" data-testid="report">
            {CONSENT_TEXT[lang].report}
          </p>
        </div>
      </div>
    </>
  )
}
