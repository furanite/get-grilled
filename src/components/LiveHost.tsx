import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import qrcode from 'qrcode-generator'
import type { Game, Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { type Seat, endEvent, ensureSeats, getHostLive, hostLogin, hostLogout, reissueSeat, removeSeat, seatUrl, useHostLive } from '../lib/live'
import { type PublicView, publicView } from '../lib/views'
import { useDialog } from './Legal'
import { Mark } from './Brand'
import type { ThemeId } from '../lib/types'

/** Set once at start-up: whether a Get Grilled Live server is behind this page. */
let liveServer = false
export const setLiveServer = (on: boolean) => {
  liveServer = on
}
export const isLiveServer = () => liveServer

/** Whether the audience plays along (host side), without re-drawing on every vote. */
export function useHostAudience() {
  const h = getHostLive()
  return useSyncExternalStore(h.subscribe, () => h.audience, () => h.audience)
}

/** The PIN screen the host sees on the Pi before the game. */
export function HostLogin({ t, theme, pinSet, onIn }: { t: Strings; theme: ThemeId; pinSet: boolean; onIn: () => void }) {
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const r = await hostLogin(pin)
      if (r.ok) return onIn()
      if (r.status === 429 && r.data.retryIn) setMsg(`${t.live.locked} ${r.data.retryIn} ${t.live.seconds}`)
      else if (r.status === 503) setMsg(t.live.noPin)
      else setMsg(`${t.live.wrongPin}${r.data.triesLeft !== undefined ? ` ${r.data.triesLeft} ${t.live.triesLeft}` : ''}`)
      setPin('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="live-gate" data-testid="host-login">
      <Mark theme={theme} className="ts-mark" />
      <h1>{t.live.pinTitle}</h1>
      {pinSet ? (
        <form onSubmit={submit} className="live-pin">
          <p className="muted">{t.live.pinHelp}</p>
          <label className="label" htmlFor="host-pin">
            {t.live.pin}
          </label>
          <input id="host-pin" className="input" type="password" inputMode="numeric" autoComplete="current-password" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus data-testid="host-pin" />
          <button className="btn" type="submit" disabled={pin.length < 6 || busy} data-testid="host-signin">
            {t.live.signIn}
          </button>
          {msg && (
            <p className="live-msg" role="alert" data-testid="host-login-msg">
              {msg}
            </p>
          )}
        </form>
      ) : (
        <p className="live-msg">{t.live.noPin}</p>
      )}
    </main>
  )
}

/** Sends the room what it may see whenever the game changes. Answers never leave the host's screen early (see views.ts). */
export function usePublisher(v: PublicView, on: boolean) {
  const json = useMemo(() => (on ? JSON.stringify(publicView(v)) : ''), [on, v])
  useEffect(() => {
    if (!on) return
    getHostLive().start()
  }, [on])
  useEffect(() => {
    if (!on || !json) return
    getHostLive().publish(JSON.parse(json) as PublicView)
  }, [on, json])
}

function Qr({ text, label }: { text: string; label: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [text])
  // The SVG is made here from the link, not from anything a device sent.
  return <div className="live-qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} data-testid="live-qr" />
}

function SeatRow({ t, lang, seat }: { t: Strings; lang: Lang; seat: Seat }) {
  const [qr, setQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = seatUrl(seat)
  const title = seat.kind === 'screen' ? t.live.projector : seat.name || t.intro.team(num(seat.index + 1, lang))
  const state = !seat.link ? 'removed' : seat.claimed ? 'joined' : 'waiting'
  return (
    <li className={`live-seat ${state}${seat.online ? ' on' : ''}`} data-testid={`seat-${seat.kind}-${seat.index}`} data-state={state} data-online={seat.online || undefined}>
      <div className="live-seat-head">
        <span className={`buzz-led ${seat.online ? 'connected' : seat.claimed ? 'lost' : 'none'}`} aria-hidden="true" />
        <b>{title}</b>
        <span className="muted live-seat-state">
          {state === 'removed' ? t.live.removed : state === 'joined' ? `${t.live.joined}${seat.device ? ` · ${seat.device}` : ''} · ${seat.online ? t.live.online : t.live.offline}` : t.live.notJoined}
        </span>
      </div>
      <div className="row live-seat-actions">
        {url && state === 'waiting' && (
          <>
            <button className="ghost" onClick={() => setQr(!qr)} aria-expanded={qr} data-testid="seat-qr">
              {qr ? t.live.hideQr : t.live.showQr}
            </button>
            <button
              className="ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                })
              }}
            >
              {copied ? t.live.copied : t.live.copy}
            </button>
          </>
        )}
        <button className="ghost" onClick={() => void reissueSeat(seat.id)} data-testid="seat-reissue">
          {seat.link ? t.live.reissue : t.live.newLink}
        </button>
        {seat.link && (
          <button className="ghost bad-text" onClick={() => void removeSeat(seat.id)} data-testid="seat-remove">
            {t.live.remove}
          </button>
        )}
      </div>
      {qr && url && state === 'waiting' && (
        <div className="live-qr-box">
          <Qr text={url} label={title} />
          <code className="live-url" data-testid="seat-url">
            {url}
          </code>
        </div>
      )}
    </li>
  )
}

/** The host's list of team tablets and the projector: who has joined, links and QR codes, reissue and remove. */
export function DevicesPanel({ t, lang, game, onClose }: { t: Strings; lang: Lang; game: Game | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  const { seats, tally } = useHostLive()
  const audience = useHostAudience()
  const [ending, setEnding] = useState(false)
  const names = game?.teams.map((tm) => tm.name)
  const key = names ? JSON.stringify(names) : ''
  useEffect(() => {
    void ensureSeats(names as string[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const sorted = [...seats].sort((a, b) => (a.kind === b.kind ? a.index - b.index : a.kind === 'team' ? -1 : 1))
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel live-panel" role="dialog" aria-modal="true" aria-labelledby="devices-title" ref={ref} data-testid="devices" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-head">
          <h1 id="devices-title">{t.live.devicesTitle}</h1>
        </div>
        <div className="legal-body">
          <p className="muted">
            {t.live.devicesHelp}{' '}
            <a href="buzzer-guide.html#pi" target="_blank" rel="noopener" data-testid="devices-guide">
              {t.buzz.guide}
            </a>
          </p>
          {!game && <p className="muted small">{t.live.noGame}</p>}
          <ul className="live-seats">
            {sorted.map((s) => (
              <SeatRow key={s.id + (s.link ?? '')} t={t} lang={lang} seat={s} />
            ))}
          </ul>
          <fieldset className="live-aud" data-testid="aud-settings">
            <legend className="label">{t.aud.section}</legend>
            <label className="check">
              <input type="checkbox" checked={audience.on} onChange={(e) => getHostLive().setAudience({ on: e.target.checked })} data-testid="aud-on" />
              <span>{t.aud.on}</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={audience.showJoin} disabled={!audience.on} onChange={(e) => getHostLive().setAudience({ showJoin: e.target.checked })} data-testid="aud-join" />
              <span>{t.aud.showJoin}</span>
            </label>
            <p className="muted small">
              {t.aud.help} {audience.on && <b data-testid="aud-joined">{num(tally.joined, lang)} {t.aud.joined}</b>}
            </p>
          </fieldset>
        </div>
        <div className="legal-actions">
          {ending ? (
            <span className="end-confirm" role="group">
              <span className="end-q">{t.live.endConfirm}</span>
              <button
                className="btn bad"
                onClick={() => {
                  void endEvent().then(() => ensureSeats(names as string[]))
                  setEnding(false)
                }}
                data-testid="end-event-yes"
              >
                {t.live.endYes}
              </button>
              <button className="ghost" onClick={() => setEnding(false)}>
                {t.cancel}
              </button>
            </span>
          ) : (
            <button className="ghost" onClick={() => setEnding(true)} data-testid="end-event">
              {t.live.endEvent}
            </button>
          )}
          <button className="btn" onClick={onClose} data-testid="devices-done">
            {t.buzz.done}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The Devices button in the host's top bar, with how many devices are on. */
export function DevicesButton({ t, lang, game }: { t: Strings; lang: Lang; game: Game | null }) {
  const [open, setOpen] = useState(false)
  const { seats, connected } = useHostLive()
  const on = seats.filter((s) => s.online).length
  return (
    <>
      <button className="ghost buzz-btn" onClick={() => setOpen(true)} data-testid="devices-open">
        <span className={`buzz-led ${connected ? 'connected' : 'lost'}`} aria-hidden="true" /> {t.live.devices}
        {seats.length > 0 && ` ${num(on, lang)}/${num(seats.length, lang)}`}
      </button>
      {open && createPortal(<DevicesPanel t={t} lang={lang} game={game} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

export function SignOut({ t }: { t: Strings }) {
  return (
    <button
      className="ghost"
      onClick={() => {
        getHostLive().stop()
        void hostLogout().then(() => location.reload())
      }}
      data-testid="host-signout"
    >
      {t.live.signOut}
    </button>
  )
}

/** On the final question, what each team typed on its tablet (host only). */
export function TypedFinalAnswers({ t, game, showText }: { t: Strings; game: Game; showText: boolean }) {
  const { msgs } = useHostLive()
  if (!liveServer) return null
  const got = msgs.filter((m) => m.type === 'final' && m.at >= (game.finalState?.startedAt ?? 0) - 1000)
  if (!showText)
    return (
      <p className="muted" data-testid="typed-count">
        {got.length}/{game.teams.length} {t.live.teamsSent}
      </p>
    )
  return (
    <div className="typed-answers" data-testid="typed-answers">
      <span className="label">{t.live.typedAnswers}</span>
      <ul>
        {game.teams.map((tm, i) => {
          const m = got.find((x) => x.team === i)
          return (
            <li key={i} data-typed={i}>
              <b>{tm.name}</b> <span dir="auto">{m ? m.text : <em className="muted">{t.live.noTyped}</em>}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
