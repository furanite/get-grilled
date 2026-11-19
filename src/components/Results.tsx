import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogSheet } from './Sheets'
import type { Game, Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { standings, tiedLeaders } from '../lib/game'
import { burst } from '../lib/fx'
import { sfx } from '../lib/sound'

interface Props {
  t: Strings
  lang: Lang
  game: Game
  onAgain: () => void
  onHome: () => void
  /** Starts the tie-breaker, when teams are level at the top */
  onTie?: () => void
  /** Records the winner in the competition bracket, when this game is a bracket game */
  onBracket?: () => void
}

export default function Results({ t, lang, game, onAgain, onHome, onTie, onBracket }: Props) {
  const rows = standings(game)
  const winners = rows.filter((r) => r.rank === 1)
  const tie = winners.length > 1
  const canTie = tie && !!onTie && tiedLeaders(game).length > 1 && !!game.tiebreak?.length
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    sfx.win()
    const ids = [0, 400, 900, 1500].map((d, i) => setTimeout(() => burst(innerWidth * (0.25 + 0.5 * (i % 2)), innerHeight * 0.3, 40, 260), d))
    return () => ids.forEach(clearTimeout)
  }, [])

  return (
    <main className="results">
      <span className="label">{t.results}</span>
      <h1 className="crown" data-testid="winner">
        {tie ? t.tie : `${winners[0].name} ${t.winner}`}
      </h1>
      <div className="podium">
        {rows.map((r, i) => (
          <div key={r.index} className={`place${r.rank === 1 ? ' first' : ''}`} style={{ ['--d' as string]: `${200 + i * 120}ms` }}>
            <b>
              {num(r.rank, lang)}. {r.name}
            </b>
            <span>{num(r.score, lang)}</span>
          </div>
        ))}
      </div>
      {canTie && (
        <div className="tie-offer" role="status">
          <p className="muted">{t.tb.playHelp}</p>
          <button className="btn big" onClick={onTie} data-testid="tie-start" autoFocus>
            {t.tb.play}
          </button>
        </div>
      )}
      {onBracket && !tie && (
        <button className="btn" onClick={onBracket} data-testid="bracket-record">
          {t.bracket.fromGame}
        </button>
      )}
      <div className="row">
        <button className="ghost" onClick={() => setShowLog(true)} data-testid="log-open">
          {t.log.open}
        </button>
      </div>
      {showLog && createPortal(<LogSheet t={t} lang={lang} game={game} onClose={() => setShowLog(false)} />, document.body)}
      <div className="row">
        <button className={canTie ? 'btn alt big' : 'btn big'} onClick={onAgain}>
          {t.playAgain}
        </button>
        <button className="btn alt big" onClick={onHome}>
          {t.home}
        </button>
      </div>
    </main>
  )
}
