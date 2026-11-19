import { useCallback, useEffect } from 'react'
import type { Game, Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { TIE_VALUE, missTie, nextTie, winTie } from '../lib/game'
import { HOST_EDITION } from '../lib/edition'
import { CatIcon } from './Brand'
import { sfx } from '../lib/sound'
import { burstAt } from '../lib/fx'

interface Props {
  t: Strings
  lang: Lang
  game: Game
  setGame: (u: Game | ((g: Game) => Game)) => void
  onDone: () => void
}

const names = (game: Game, teams: number[]) => teams.map((i) => game.teams[i]?.name ?? '').join(' · ')

/**
 * Sudden death for a tie at the top: one question at a time, only the tied teams answer, and the first
 * right answer wins TIE_VALUE points. A wrong answer costs nothing; when every tied team misses, the next question comes.
 */
export function TieBreak({ t, lang, game, setGame, onDone }: Props) {
  const st = game.tieState
  const list = game.tiebreak ?? []
  const item = st ? list[st.i] : undefined
  const winner = st?.winner
  const allMissed = !!st && st.teams.every((i) => st.wrong.includes(i))
  const lastOne = !!st && st.i + 1 >= list.length

  const show = useCallback(() => {
    if (!st || st.shown) return
    sfx.final()
    setGame((g) => (g.tieState ? { ...g, tieState: { ...g.tieState, shown: true } } : g))
  }, [st, setGame])
  const reveal = useCallback(() => {
    if (!st?.shown || st.revealed) return
    sfx.reveal()
    setGame((g) => (g.tieState ? { ...g, tieState: { ...g.tieState, revealed: true } } : g))
  }, [st, setGame])
  const judge = useCallback(
    (team: number, right: boolean) => {
      if (!st?.shown || winner !== undefined || !st.teams.includes(team) || st.wrong.includes(team)) return
      if (right) {
        sfx.right()
        setTimeout(() => sfx.applause(), 250)
        requestAnimationFrame(() => burstAt(document.querySelector(`[data-tie-team="${team}"]`), 30, 160))
        setGame((g) => winTie(g, team))
      } else {
        sfx.wrong()
        setGame((g) => missTie(g, team))
      }
    },
    [st, winner, setGame],
  )
  const next = useCallback(() => setGame((g) => nextTie(g)), [setGame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!st) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!st.shown) show()
        else reveal()
        return
      }
      const m = /^Digit([1-4])$/.exec(e.code)
      if (m) judge(+m[1] - 1, !e.shiftKey)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [st, show, reveal, judge])

  if (!st || !item) {
    return (
      <main className="round stack" data-testid="tiebreak">
        <button className="btn big" onClick={onDone}>
          {t.toResults}
        </button>
      </main>
    )
  }
  const cat = lang === 'ar' && item.cat.nameAr ? item.cat.nameAr : item.cat.name
  const q = lang === 'ar' && item.q.qAr ? item.q.qAr : item.q.q
  const a = lang === 'ar' && item.q.aAr ? item.q.aAr : item.q.a

  return (
    <main className="round stack" data-testid="tiebreak">
      <div className="round-head">
        <span className="label">{t.tb.label}</span>
        <h1 className="round-title">{t.tb.title}</h1>
        <p className="muted">
          {names(game, st.teams)} · {t.tb.help} (+{num(TIE_VALUE, lang)})
        </p>
      </div>
      <section className="stage round-stage">
        <div className="round-card" key={st.i}>
          <span className="label">
            {t.tb.question} {num(st.i + 1, lang)} · <CatIcon id={item.cat.id} /> {cat}
          </span>
          {!st.shown ? (
            <>
              <p className="round-msg">{t.tb.ready}</p>
              <button className="btn big" onClick={show} data-testid="tie-show" autoFocus>
                {t.finalShowQ}
              </button>
            </>
          ) : (
            <>
              <p className="q" dir="auto" data-testid="tie-q">
                {q}
              </p>
              <div className={`answer${st.revealed ? ' show' : HOST_EDITION ? ' peek' : ''}`} dir="auto" data-peek={t.hostOnly} data-testid="tie-a">
                {a}
              </div>
              {winner === undefined && (
                <div className="judge">
                  {st.teams.map((i) => (
                    <div className={`t${st.wrong.includes(i) ? ' marked-no' : ''}`} key={i} data-tie-team={i}>
                      <span>{game.teams[i].name}</span>
                      <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <button className="ok" onClick={() => judge(i, true)} disabled={st.wrong.includes(i)} aria-label={`${game.teams[i].name} ${t.right}`} data-tie={`${i}-ok`}>
                          ✓
                        </button>
                        <button className="no" onClick={() => judge(i, false)} disabled={st.wrong.includes(i)} aria-label={`${game.teams[i].name} ${t.wrong}`} data-tie={`${i}-no`}>
                          ✗
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {winner !== undefined ? (
                <div className="round-over" role="status">
                  <p className="round-msg" data-testid="tie-winner">
                    {game.teams[winner].name} {t.tb.won}
                  </p>
                  <button className="btn big" onClick={onDone} data-testid="tie-done" autoFocus>
                    {t.toResults}
                  </button>
                </div>
              ) : (
                <div className="row round-actions">
                  <button className="btn alt" onClick={reveal} disabled={st.revealed}>
                    {t.showAnswer}
                  </button>
                  {lastOne ? (
                    (allMissed || st.revealed) && (
                      <>
                        <span className="muted" data-testid="tie-out">
                          {t.tb.out}
                        </span>
                        <button className="btn" onClick={onDone} data-testid="tie-done">
                          {t.toResults}
                        </button>
                      </>
                    )
                  ) : (
                    <button className={allMissed ? 'btn' : 'btn alt'} onClick={next} data-testid="tie-next" autoFocus={allMissed}>
                      {t.tb.next} →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

/** What the room sees during the tie-breaker. The question shows once the host shows it; the answer once it is revealed or won. */
export function TieBreakView({ t, lang, game }: { t: Strings; lang: Lang; game: Game }) {
  const st = game.tieState
  const item = st ? game.tiebreak?.[st.i] : undefined
  if (!st || !item) return null
  const cat = lang === 'ar' && item.cat.nameAr ? item.cat.nameAr : item.cat.name
  return (
    <main className="aud-main round" data-testid="audience-tiebreak">
      <h1 className="round-title">{t.tb.title}</h1>
      <p className="muted">{names(game, st.teams)}</p>
      <section className="stage round-stage">
        <div className="round-card" key={st.i}>
          <span className="label">
            <CatIcon id={item.cat.id} /> {cat}
          </span>
          {st.shown && item.q.q ? (
            <p className="q" dir="auto" data-testid="audience-tie-q">
              {lang === 'ar' && item.q.qAr ? item.q.qAr : item.q.q}
            </p>
          ) : (
            <p className="round-msg">{t.tb.help}</p>
          )}
          {st.revealed && item.q.a ? (
            <div className="answer show" dir="auto" data-testid="audience-tie-a">
              {lang === 'ar' && item.q.aAr ? item.q.aAr : item.q.a}
            </div>
          ) : (
            <div className="answer aud-hidden" aria-hidden="true" />
          )}
          {st.winner !== undefined && (
            <p className="round-msg" data-testid="audience-tie-winner">
              {game.teams[st.winner]?.name} {t.tb.won}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
