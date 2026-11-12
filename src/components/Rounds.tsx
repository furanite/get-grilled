import { useCallback, useEffect, useState } from 'react'
import type { Game, Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { FINAL_SECS, FINAL_VALUE, LIGHTNING_SECS, LIGHTNING_VALUE, score } from '../lib/game'
import { HOST_EDITION } from '../lib/edition'
import { TimerBar } from './Timer'
import { CatIcon } from './Brand'
import { sfx } from '../lib/sound'
import { burstAt } from '../lib/fx'

interface Props {
  t: Strings
  lang: Lang
  game: Game
  setGame: (u: Game | ((g: Game) => Game)) => void
  /** Moves on to the next stage (the final question or the results). */
  onDone: () => void
  /** True when another stage follows this one, so the button says where it goes. */
  hasFinal?: boolean
}

function Scores({ game, lang }: { game: Game; lang: Lang }) {
  return (
    <div className="scores">
      {game.teams.map((tm, i) => (
        <div className={`team${tm.score < 0 ? ' neg' : ''}`} key={i} data-team={i}>
          <b>{tm.name}</b>
          <span>{num(tm.score, lang)}</span>
        </div>
      ))}
    </div>
  )
}

const pop = (team: number) =>
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-team="${team}"]`)
    el?.classList.add('pop')
    setTimeout(() => el?.classList.remove('pop'), 600)
    burstAt(el?.querySelector('span') ?? null, 18, 120)
  })

/** Sixty seconds of quick questions. The host marks whoever answers first, or skips. Nothing is taken away. */
export function Lightning({ t, lang, game, setGame, onDone, hasFinal }: Props) {
  const list = game.lightning ?? []
  const st = game.lightningState ?? { i: 0, revealed: false }
  const [now, setNow] = useState(Date.now())
  const running = !!st.startedAt && !st.done
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [running])
  const timeOut = running && now >= st.startedAt! + LIGHTNING_SECS * 1000
  useEffect(() => {
    if (timeOut) setGame((g) => ({ ...g, lightningState: { ...(g.lightningState ?? { i: 0, revealed: false }), done: true } }))
  }, [timeOut, setGame])

  const q = list[st.i]
  const text = q ? (lang === 'ar' && q.qAr ? q.qAr : q.q) : ''
  const ans = q ? (lang === 'ar' && q.aAr ? q.aAr : q.a) : ''

  const next = useCallback(
    (g: Game): Game => {
      const s = g.lightningState ?? { i: 0, revealed: false }
      const i = s.i + 1
      return { ...g, lightningState: { ...s, i, revealed: false, done: s.done || i >= list.length } }
    },
    [list.length],
  )
  const start = () => {
    sfx.lightning()
    setGame((g) => ({ ...g, lightningState: { i: 0, revealed: false, startedAt: Date.now() } }))
  }
  const right = useCallback(
    (team: number) => {
      if (!running || team >= game.teams.length) return
      sfx.right()
      pop(team)
      setGame((g) => next(score(g, team, LIGHTNING_VALUE)))
    },
    [running, game.teams.length, setGame, next],
  )
  const skip = useCallback(() => running && setGame(next), [running, setGame, next])
  const reveal = useCallback(() => {
    if (!running) return
    sfx.reveal()
    setGame((g) => ({ ...g, lightningState: { ...(g.lightningState ?? { i: 0, revealed: false }), revealed: true } }))
  }, [running, setGame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return
      const m = /^Digit([1-4])$/.exec(e.code)
      if (m) right(+m[1] - 1)
      else if (e.code === 'Space') {
        e.preventDefault()
        reveal()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 's') skip()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [running, right, reveal, skip])

  return (
    <main className="round stack" data-testid="lightning">
      <div className="round-head">
        <span className="label">⚡ {t.lightningTitle}</span>
        <h1 className="round-title">{t.lightningTitle}</h1>
        <p className="muted">{t.lightningHelp}</p>
      </div>
      <section className="stage round-stage">
        {!st.startedAt && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn big" onClick={start} data-testid="lightning-go" autoFocus>
              {t.lightningGo}
            </button>
            <button className="ghost" onClick={onDone} data-testid="lightning-skip">
              {t.skipRound}
            </button>
          </div>
        )}
        {running && q && (
          <div className="round-card" key={st.i}>
            <TimerBar clock={{ start: st.startedAt!, total: LIGHTNING_SECS }} total={LIGHTNING_SECS} lang={lang} timeUpText={t.timeUp} onTick={(n) => (n === 0 ? sfx.timeUp() : sfx.tick(n === 1))} big />
            <span className="label">
              {num(st.i + 1, lang)} {t.ofTotal} {num(list.length, lang)}
            </span>
            <p className="q" dir="auto" data-testid="lightning-q">
              {text}
            </p>
            <div className={`answer${st.revealed ? ' show' : HOST_EDITION ? ' peek' : ''}`} dir="auto" data-peek={t.hostOnly} data-testid="lightning-a">
              {ans}
            </div>
            <div className="row round-actions">
              {game.teams.map((tm, i) => (
                <button key={i} className="btn ok-btn" onClick={() => right(i)} data-lightning={i}>
                  ✓ {tm.name}
                </button>
              ))}
              <button className="btn alt" onClick={reveal} disabled={st.revealed}>
                {t.showAnswer}
              </button>
              <button className="btn alt" onClick={skip} data-testid="lightning-next">
                {t.skip} →
              </button>
            </div>
          </div>
        )}
        {st.done && (
          <div className="round-card round-over" role="status">
            <p className="round-msg" data-testid="lightning-over">
              {timeOut || (st.startedAt && Date.now() >= st.startedAt + LIGHTNING_SECS * 1000) ? t.lightningOver : t.lightningOut}
            </p>
            <button className="btn big" onClick={onDone} data-testid="lightning-done" autoFocus>
              {hasFinal ? t.toFinal : t.toResults}
            </button>
          </div>
        )}
        <Scores game={game} lang={lang} />
      </section>
    </main>
  )
}

/** One last question. Every team writes its answer in secret; the answers are shown together and marked. */
export function Final({ t, lang, game, setGame, onDone }: Props) {
  const f = game.final
  const st = game.finalState ?? { step: 'cat' as const, marks: game.teams.map(() => null) }
  const set = (patch: Partial<typeof st>) => setGame((g) => ({ ...g, finalState: { ...(g.finalState ?? st), ...patch } }))
  if (!f) return null
  const cat = lang === 'ar' && f.cat.nameAr ? f.cat.nameAr : f.cat.name

  const mark = (team: number, right: boolean) => {
    const prev = st.marks[team] ?? null
    if (prev === right) return
    const delta = (right ? FINAL_VALUE : 0) - (prev ? FINAL_VALUE : 0)
    if (right) {
      sfx.right()
      pop(team)
    } else sfx.wrong()
    setGame((g) => {
      const s = g.finalState ?? st
      const marks = g.teams.map((_, i) => (i === team ? right : s.marks[i] ?? null))
      return { ...(delta ? score(g, team, delta) : g), finalState: { ...s, marks } }
    })
  }

  return (
    <main className="round stack" data-testid="final">
      <div className="round-head">
        <span className="label">{t.finalTitle}</span>
        <h1 className="round-title">{t.finalTitle}</h1>
        <p className="muted">
          {num(FINAL_VALUE, lang)} {t.finalWorth}
        </p>
      </div>
      <section className="stage round-stage">
        <div className="round-card">
          {st.step === 'cat' && (
            <>
              <p className="round-msg">{t.finalIntro}</p>
              <p className="final-cat" data-testid="final-cat">
                <CatIcon id={f.cat.id} /> {cat}
              </p>
              <button
                className="btn big"
                onClick={() => {
                  sfx.final()
                  set({ step: 'q', startedAt: Date.now() })
                }}
                data-testid="final-show"
                autoFocus
              >
                {t.finalShowQ}
              </button>
            </>
          )}
          {st.step !== 'cat' && (
            <>
              <span className="label">
                <CatIcon id={f.cat.id} /> {cat}
              </span>
              <p className="q" dir="auto" data-testid="final-q">
                {lang === 'ar' && f.q.qAr ? f.q.qAr : f.q.q}
              </p>
            </>
          )}
          {st.step === 'q' && (
            <>
              <TimerBar clock={{ start: st.startedAt ?? Date.now(), total: FINAL_SECS }} total={FINAL_SECS} lang={lang} timeUpText={t.timeUp} onTick={(n) => (n === 0 ? sfx.timeUp() : sfx.tick(n === 1))} big />
              <p className="muted">{t.finalWrite}</p>
              {HOST_EDITION && (
                <div className="answer peek" dir="auto" data-peek={t.hostOnly}>
                  {lang === 'ar' && f.q.aAr ? f.q.aAr : f.q.a}
                </div>
              )}
              <button
                className="btn big"
                onClick={() => {
                  sfx.reveal()
                  set({ step: 'answer' })
                }}
                data-testid="final-reveal"
              >
                {t.finalReveal}
              </button>
            </>
          )}
          {st.step === 'answer' && (
            <>
              <div className="answer show" dir="auto" data-testid="final-a">
                {lang === 'ar' && f.q.aAr ? f.q.aAr : f.q.a}
              </div>
              <p className="muted">{t.finalMark}</p>
              <div className="judge">
                {game.teams.map((tm, i) => (
                  <div className={`t${st.marks[i] === true ? ' marked-ok' : st.marks[i] === false ? ' marked-no' : ''}`} key={i}>
                    <span>{tm.name}</span>
                    <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <button className="ok" aria-pressed={st.marks[i] === true} onClick={() => mark(i, true)} aria-label={`${tm.name} ${t.right}`} data-final={`${i}-ok`}>
                        ✓
                      </button>
                      <button className="no" aria-pressed={st.marks[i] === false} onClick={() => mark(i, false)} aria-label={`${tm.name} ${t.wrong}`} data-final={`${i}-no`}>
                        ✗
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn big" onClick={onDone} data-testid="final-done">
                {t.toResults}
              </button>
            </>
          )}
        </div>
        <Scores game={game} lang={lang} />
      </section>
    </main>
  )
}
