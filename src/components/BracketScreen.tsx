import { useState } from 'react'
import type { Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { type Bracket, type Division, MAX_BRACKET_TEAMS, champion, drawHeats, roundName, setWinner } from '../lib/bracket'

const names = (t: Strings) => ({ heats: t.bracket.roundNames[0], semi: t.bracket.roundNames[2], final: t.bracket.roundNames[3], round: t.roundWord })

/** The bracket as the room sees it: every round side by side, winners marked, and the champion when there is one. */
export function BracketBoard({ t, lang, d, big }: { t: Strings; lang: Lang; d: Division; big?: boolean }) {
  const champ = champion(d)
  return (
    <div className={`bracket${big ? ' big' : ''}`} data-testid={big ? 'audience-bracket' : 'bracket-board'}>
      <h2 className="bracket-div">{d.name}</h2>
      {champ && (
        <p className="bracket-champ" data-testid="bracket-champion">
          <span className="label">{t.bracket.champion}</span> <b>{champ}</b>
        </p>
      )}
      <div className="bracket-rounds" style={{ ['--rounds' as string]: d.rounds.length }}>
        {d.rounds.map((r, ri) => (
          <section className="bracket-round" key={ri}>
            <h3 className="label">{roundName(names(t), d, ri)}</h3>
            {r.matches.map((m, mi) => (
              <div className={`bracket-match${m.winner !== undefined ? ' decided' : ''}`} key={mi}>
                <span className="bracket-game">
                  {t.bracket.heat} {num(mi + 1, lang)}
                </span>
                {m.teams.map((tm, ti) => (
                  <span key={ti} className={`bracket-team${m.winner === ti ? ' won' : m.winner !== undefined ? ' out' : ''}`}>
                    {tm}
                    {m.teams.length === 1 && <em> {t.bracket.bye}</em>}
                  </span>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

interface Props {
  t: Strings
  lang: Lang
  bracket: Bracket
  setBracket: (b: Bracket) => void
  onBack: () => void
  /** Sets up a game with these teams (the bracket remembers which game it is) */
  onPlay: (teams: string[]) => void
}

/** The host's bracket: teams per division, the draw, recording winners, and starting each game. */
export default function BracketScreen({ t, lang, bracket, setBracket, onBack, onPlay }: Props) {
  const d = bracket.divisions[bracket.at]
  const [text, setText] = useState(() => d.teams.join('\n'))
  const [confirm, setConfirm] = useState(false)
  const setDiv = (nd: Division) => setBracket({ ...bracket, divisions: bracket.divisions.map((x, i) => (i === bracket.at ? nd : x)) })
  const teamsFromText = (s: string) =>
    s
      .split('\n')
      .map((x) => x.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, MAX_BRACKET_TEAMS)
  const pickDiv = (i: number) => {
    setBracket({ ...bracket, at: i })
    setText(bracket.divisions[i].teams.join('\n'))
    setConfirm(false)
  }
  const list = teamsFromText(text)

  return (
    <main className="stack bracket-screen" data-testid="bracket">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="ghost" onClick={onBack}>
          ← {t.back}
        </button>
        <h1 className="h-title">{t.bracket.title}</h1>
        <span />
      </div>
      <p className="muted">{t.bracket.help}</p>
      <div className="row" role="tablist" aria-label={t.bracket.division}>
        {bracket.divisions.map((x, i) => (
          <button key={i} role="tab" aria-selected={i === bracket.at} className={i === bracket.at ? 'btn' : 'ghost'} onClick={() => pickDiv(i)} data-testid={`bracket-div-${i}`}>
            {x.name}
          </button>
        ))}
      </div>

      {!d.rounds.length ? (
        <section className="panel bracket-setup">
          <label className="label" htmlFor="bracket-teams">
            {t.bracket.teamName} ({num(list.length, lang)})
          </label>
          <textarea
            id="bracket-teams"
            className="input"
            rows={8}
            value={text}
            dir="auto"
            placeholder={'Team 1\nTeam 2\nTeam 3'}
            onChange={(e) => {
              setText(e.target.value)
              setDiv({ ...d, teams: teamsFromText(e.target.value) })
            }}
            data-testid="bracket-teams"
          />
          <label className="row">
            <span className="label">{t.bracket.perGame}</span>
            <select className="input" value={d.per} onChange={(e) => setDiv({ ...d, per: +e.target.value })} data-testid="bracket-per">
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {num(n, lang)}
                </option>
              ))}
            </select>
          </label>
          {list.length < 2 && <p className="muted">{t.bracket.needTeams}</p>}
          <button className="btn big" disabled={list.length < 2} onClick={() => setDiv(drawHeats({ ...d, teams: list }))} data-testid="bracket-draw">
            {t.bracket.make}
          </button>
        </section>
      ) : (
        <>
          <BracketBoard t={t} lang={lang} d={d} />
          <section className="bracket-edit">
            {d.rounds.map((r, ri) => (
              <div key={ri} className="bracket-edit-round">
                <h3 className="label">{roundName(names(t), d, ri)}</h3>
                {r.matches.map((m, mi) =>
                  m.teams.length < 2 ? null : (
                    <div className="panel bracket-edit-match" key={mi} data-match={`${ri}-${mi}`}>
                      <span className="muted">
                        {t.bracket.heat} {num(mi + 1, lang)} · {t.bracket.pickWinner}
                      </span>
                      <div className="row">
                        {m.teams.map((tm, ti) => (
                          <button
                            key={ti}
                            className={m.winner === ti ? 'btn' : 'ghost'}
                            aria-pressed={m.winner === ti}
                            onClick={() => setDiv(setWinner(d, ri, mi, m.winner === ti ? undefined : ti))}
                            data-winner={`${ri}-${mi}-${ti}`}
                          >
                            {m.winner === ti ? '🏆 ' : ''}
                            {tm}
                          </button>
                        ))}
                        {m.winner === undefined && (
                          <button
                            className="btn alt"
                            onClick={() => {
                              setBracket({ ...bracket, live: { d: bracket.at, r: ri, m: mi } })
                              onPlay(m.teams)
                            }}
                            data-testid={`bracket-play-${ri}-${mi}`}
                          >
                            ▶ {t.bracket.play}
                          </button>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ))}
          </section>
          <div className="row">
            {confirm ? (
              <span className="end-confirm" role="group">
                <span className="end-q">{t.bracket.redoConfirm}</span>
                <button
                  className="btn bad"
                  onClick={() => {
                    setDiv({ ...d, rounds: [] })
                    setConfirm(false)
                  }}
                  data-testid="bracket-redo-yes"
                >
                  {t.bracket.redo}
                </button>
                <button className="ghost" onClick={() => setConfirm(false)}>
                  {t.cancel}
                </button>
              </span>
            ) : (
              <button className="ghost" onClick={() => setConfirm(true)} data-testid="bracket-redo">
                {t.bracket.redo}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  )
}
