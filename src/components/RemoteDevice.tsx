import { useEffect, useLayoutEffect, useState } from 'react'
import type { Lang, ThemeId } from '../lib/types'
import { STRINGS, num } from '../lib/i18n'
import { claim, deviceLink, sendFromTeam, useDeviceFeed } from '../lib/live'
import { isFinished, turnTeam } from '../lib/game'
import { setFavicon } from '../lib/favicon'
import { AudienceView } from './Audience'
import { JoinCard } from './LiveAudience'
import { Mark } from './Brand'
import { setDocLang } from '../lib/lang'

type Step = 'claiming' | 'feed' | 'taken' | 'invalid'

/**
 * A team tablet or the projector on the Pi's network. It claims its seat from the link once
 * (the key then leaves the address bar), and from then on shows what the host sends.
 */
export default function RemoteDevice({ fallbackLang }: { fallbackLang: Lang }) {
  const [step, setStep] = useState<Step>(() => (deviceLink()?.token ? 'claiming' : 'feed'))

  useEffect(() => {
    const link = deviceLink()
    if (!link?.token) return
    void claim(link.token).then((r) => {
      // Take the key out of the address bar so it can't be read off the screen or shared from history.
      history.replaceState(null, '', location.pathname + '?device=1')
      if (r.ok) setStep('feed')
      else setStep(r.reason === 'taken' ? 'taken' : 'invalid')
    })
  }, [])

  const feed = useDeviceFeed(step === 'feed')
  const view = feed.view
  const lang: Lang = view?.lang ?? fallbackLang
  const theme: ThemeId = view?.theme ?? 'amethyst'
  const t = STRINGS[lang]

  useLayoutEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    html.dataset.reduceFx = view?.reduceFx ? 'on' : 'off'
    html.dataset.big = view?.display?.big ? 'on' : 'off'
    html.dataset.cb = view?.display?.cb ? 'on' : 'off'
    setDocLang(html, lang)
    document.body.classList.add('audience-body')
    setFavicon(document, theme)
  }, [theme, lang, view?.reduceFx, view?.display?.big, view?.display?.cb])

  const message = (text: string, sub?: string, testid = 'device-msg') => (
    <main className="live-gate" data-testid={testid}>
      <Mark theme={theme} className="ts-mark" />
      <h1>{text}</h1>
      {sub && <p className="muted">{sub}</p>}
    </main>
  )

  if (step === 'claiming') return message(t.live.lost)
  if (step === 'taken') return message(t.live.taken, undefined, 'device-taken')
  if (step === 'invalid') return message(t.live.invalid, undefined, 'device-invalid')
  if (feed.status === 'revoked') return message(t.live.revoked, t.live.landingHelp, 'device-revoked')
  if (feed.status === 'none')
    return (
      <main className="live-gate" data-testid="device-landing">
        <Mark theme={theme} className="ts-mark" />
        <h1>{t.live.landing}</h1>
        <p className="muted">{t.live.landingHelp}</p>
        <a className="ghost live-host-link" href="host/">
          {t.live.hostLink}
        </a>
      </main>
    )
  if (!view || !feed.seat) return message(t.live.lost)

  const seat = feed.seat
  const game = view.game
  const team = seat.kind === 'team' ? seat.index : null
  const myTurn = team !== null && game && view.screen === 'game' && !view.live && !isFinished(game) && turnTeam(game) === team
  const finalQ = team !== null && game?.final && view.screen === 'final' && game.finalState?.step === 'q'

  return (
    <div className={`audience remote ${seat.kind}`} data-testid={`device-${seat.kind}`}>
      {team !== null && game && (
        <header className={`remote-bar${myTurn ? ' turn' : ''}`} data-testid="team-bar">
          <span className="label">{t.live.yourTeam}</span>
          <b data-testid="team-name">{game.teams[team]?.name ?? seat.name}</b>
          <span className="remote-score">{num(game.teams[team]?.score ?? 0, lang)}</span>
          {myTurn && (
            <span className="pill" data-testid="your-pick">
              {t.live.yourPick}
            </span>
          )}
          {feed.status === 'lost' && <span className="pill bad">{t.live.lost}</span>}
        </header>
      )}
      {team === null && feed.status === 'lost' && <span className="pill bad remote-lost">{t.live.lost}</span>}
      <AudienceView t={t} lang={lang} theme={theme} screen={view.screen} game={game} live={view.live} vote={view.vote} win={window} noHelp={team !== null} lobby={view.lobby} bracket={view.bracket} />
      {finalQ && <FinalAnswerBox t={t} key={game!.finalState?.startedAt ?? 0} />}
      {seat.kind === 'screen' && view.audience?.showJoin && (
        <div className="join-overlay">
          <JoinCard t={t} lang={lang} wifi={feed.join?.wifi ?? null} joined={feed.join?.joined ?? 0} />
        </div>
      )}
    </div>
  )
}

function FinalAnswerBox({ t }: { t: (typeof STRINGS)['en'] }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <form
      className="remote-final"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        void sendFromTeam('final', text).then((r) => setSent(r.ok))
      }}
      data-testid="final-type"
    >
      <label className="label" htmlFor="final-answer">
        {t.live.finalType}
      </label>
      <div className="row">
        <input
          id="final-answer"
          className="input"
          maxLength={200}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSent(false)
          }}
          autoComplete="off"
          dir="auto"
          data-testid="final-input"
        />
        <button className="btn" type="submit" disabled={!text.trim()} data-testid="final-send">
          {t.live.finalSend}
        </button>
      </div>
      {sent && (
        <p className="muted small" role="status" data-testid="final-sent">
          {t.live.finalSent}
        </p>
      )}
    </form>
  )
}
