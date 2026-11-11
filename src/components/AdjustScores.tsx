import { useRef, useState } from 'react'
import type { Game, Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { MAX_ADJUST } from '../lib/game'
import { useDialog } from './Legal'

export interface Adjustment {
  team: number
  delta: number
}

interface Props {
  t: Strings
  lang: Lang
  game: Game
  /** Changes made while the game has been open, newest last. */
  log: Adjustment[]
  onAdjust: (team: number, delta: number) => void
  onUndo: () => void
  onClose: () => void
}

const QUICK = [100, 200, 300, 400, 500]

/** Host's hand correction of team scores: pick an amount, then add it to or take it from a team. */
export default function AdjustScores({ t, lang, game, log, onAdjust, onUndo, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  const [amount, setAmount] = useState('100')
  const value = Math.round(Number(amount))
  const valid = Number.isFinite(value) && value > 0 && value <= MAX_ADJUST
  const signed = (d: number) => (d > 0 ? '+' : '−') + num(Math.abs(d), lang)

  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel adjust-panel" role="dialog" aria-modal="true" aria-labelledby="adjust-title" ref={ref} data-testid="adjust" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-head">
          <h1 id="adjust-title">{t.adjust}</h1>
        </div>
        <div className="legal-body">
          <p className="muted">{t.adjustHelp}</p>
          <div className="adjust-amount">
            <label htmlFor="adjust-amount" className="label">
              {t.adjustAmount}
            </label>
            <input
              id="adjust-amount"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_ADJUST}
              step={50}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-autofocus
              data-testid="adjust-amount"
            />
            <div className="adjust-quick">
              {QUICK.map((v) => (
                <button key={v} type="button" className={`chip${value === v ? ' on' : ''}`} onClick={() => setAmount(String(v))} aria-pressed={value === v}>
                  {num(v, lang)}
                </button>
              ))}
            </div>
          </div>
          <ul className="adjust-teams">
            {game.teams.map((tm, i) => (
              <li key={i} data-adjust-team={i}>
                <b>{tm.name}</b>
                <span className={`adjust-score${tm.score < 0 ? ' neg' : ''}`}>{num(tm.score, lang)}</span>
                <button type="button" className="btn bad" disabled={!valid} onClick={() => onAdjust(i, -value)} aria-label={`${t.adjustTake} ${valid ? value : ''} · ${tm.name}`} data-testid={`adjust-minus-${i}`}>
                  − {valid ? num(value, lang) : ''}
                </button>
                <button type="button" className="btn" disabled={!valid} onClick={() => onAdjust(i, value)} aria-label={`${t.adjustAdd} ${valid ? value : ''} · ${tm.name}`} data-testid={`adjust-plus-${i}`}>
                  + {valid ? num(value, lang) : ''}
                </button>
              </li>
            ))}
          </ul>
          <h2 className="label adjust-log-head">{t.adjustLog}</h2>
          {log.length === 0 ? (
            <p className="muted">{t.adjustNone}</p>
          ) : (
            <ul className="adjust-log" data-testid="adjust-log">
              {log
                .map((a, i) => (
                  <li key={i}>
                    {game.teams[a.team]?.name} <b className={a.delta < 0 ? 'neg' : ''}>{signed(a.delta)}</b>
                  </li>
                ))
                .reverse()}
            </ul>
          )}
        </div>
        <div className="legal-actions">
          <button type="button" className="ghost" onClick={onUndo} disabled={log.length === 0} data-testid="adjust-undo">
            {t.undo}
          </button>
          <button type="button" className="btn" onClick={onClose} data-testid="adjust-done">
            {t.done}
          </button>
        </div>
      </div>
    </div>
  )
}
