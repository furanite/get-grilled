import { useEffect } from 'react'
import type { Game, Lang, TourStep } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { standings } from '../lib/game'
import { sfx } from '../lib/sound'

/** The name of a tournament round, such as "Double-points board" or "Picture round". */
export function roundTitle(t: Strings, r: TourStep) {
  return r.kind === 'mode' && r.mode ? t.modeNames[r.mode] : r.kind === 'mode' ? t.modeOpt : t.roundKinds[r.kind]
}

/** One line on what happens in a round. */
export function roundHelp(t: Strings, r: TourStep) {
  return r.kind === 'mode' && r.mode ? t.modeHelps[r.mode] : r.kind === 'mode' ? '' : t.roundHelps[r.kind]
}

/**
 * The title card between tournament rounds: which round is next, what happens in it,
 * the rounds before and after it, and the scores so far. Shared by the host screen and the audience window.
 */
export function RoundCard({ t, lang, game, big }: { t: Strings; lang: Lang; game: Game; big?: boolean }) {
  const tour = game.tournament
  if (!tour) return null
  const r = tour.rounds[tour.at]
  const rows = standings(game)
  const anyPoints = game.teams.some((tm) => tm.score !== 0)
  return (
    <div className={`round-card${big ? ' big' : ''}`} data-testid={big ? 'audience-round' : 'round-card'} data-kind={r.kind} key={tour.at}>
      <span className="label round-count">
        {t.roundWord} {num(tour.at + 1, lang)} {t.ofTotal} {num(tour.rounds.length, lang)}
      </span>
      <h1 className="round-title" data-testid="round-title">
        {roundTitle(t, r)}
      </h1>
      <p className="round-help">{roundHelp(t, r)}</p>
      <ol className="round-line" aria-label={t.tourPlan}>
        {tour.rounds.map((x, i) => (
          <li key={i} className={i < tour.at ? 'done' : i === tour.at ? 'now' : ''} aria-current={i === tour.at ? 'step' : undefined}>
            <span className="dot">{i < tour.at ? '✓' : num(i + 1, lang)}</span>
            <span className="name">{roundTitle(t, x)}</span>
          </li>
        ))}
      </ol>
      {anyPoints && (
        <div className="round-standings">
          <span className="label">{t.standingsLabel}</span>
          <div className="scores">
            {rows.map((s) => (
              <div className={`team${s.score < 0 ? ' neg' : ''}${s.rank === 1 ? ' lead' : ''}`} key={s.index}>
                <b>
                  {num(s.rank, lang)}. {s.name}
                </b>
                <span>{num(s.score, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** The host's round title card, with the button that starts the round. */
export function RoundIntro({ t, lang, game, onGo }: { t: Strings; lang: Lang; game: Game; onGo: () => void }) {
  useEffect(() => {
    sfx.start()
  }, [game.tournament?.at])
  return (
    <main className="round-intro">
      <RoundCard t={t} lang={lang} game={game} />
      <button className="btn big" onClick={onGo} data-testid="round-start" autoFocus>
        {t.roundStart}
      </button>
    </main>
  )
}
