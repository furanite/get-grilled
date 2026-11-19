import { useEffect, useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import type { Game, Lang, ThemeId } from '../lib/types'
import { APP_NAME, type AudView } from '../lib/edition'
import { STRINGS, num, type Strings } from '../lib/i18n'
import { clueChoices } from '../lib/choices'
import { type AudState, answerAudience, getHostLive, joinAudience, joinUrl, useAudienceFeed, useHostLive } from '../lib/live'
import { isLiveServer, useHostAudience } from './LiveHost'
import { setFavicon } from '../lib/favicon'
import { Mark } from './Brand'
import { setDocLang } from '../lib/lang'


/**
 * Host side, for one open clue: puts the question and four options on the phones once the question
 * shows, tells the phones the right option when the host reveals it, and gives the projector the
 * count (and, after the reveal, how the room answered).
 */
export function useAudienceRound({ game, c, l, intro, revealed, secs, lang }: { game: Game; c: number; l: number; intro: boolean; revealed: boolean; secs: number; lang: Lang }): AudView | null {
  const audience = useHostAudience()
  const { tally } = useHostLive()
  const on = isLiveServer() && audience.on
  const [id] = useState(() => `${game.clues[c]?.[l]?.id ?? 'clue'}@${Date.now().toString(36)}`)
  const [made, setMade] = useState<{ choices: string[]; correct: number } | null>(null)
  const sent = useRef(false)

  useEffect(() => {
    if (!on || intro || revealed || sent.current) return
    sent.current = true
    let gone = false
    void clueChoices(game, c, l, lang).then((m) => {
      if (gone || !m) return
      setMade({ choices: m.choices, correct: m.correct })
      getHostLive().audRound({ id, kind: 'clue', q: m.q, choices: m.choices, secs: secs > 0 ? secs + 1 : 600 })
    })
    return () => {
      gone = true
    }
    // The question goes to the phones once, when it shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, intro, revealed])

  useEffect(() => {
    if (on && revealed && made) getHostLive().audReveal(id, made.correct)
  }, [on, revealed, made, id])

  // When the card closes, answers stop (only if a question went to the phones at all).
  useEffect(
    () => () => {
      if (sent.current) getHostLive().audClose(id)
    },
    [id],
  )

  if (!on) return null
  const mine = tally.id === id
  return {
    total: mine ? tally.total : 0,
    ...(revealed && made ? { choices: made.choices, counts: mine ? tally.counts : made.choices.map(() => 0), correct: made.correct } : {}),
  }
}

/** On the projector's clue card: how many have answered, then how the room answered. */
export function AudResult({ t, lang, aud, big }: { t: Strings; lang: Lang; aud: AudView; big?: boolean }) {
  if (!aud.counts || !aud.choices) {
    if (!aud.total) return null
    return (
      <p className={`aud-count${big ? ' big' : ''}`} data-testid="aud-count">
        <span aria-hidden="true">📱</span> {num(aud.total, lang)} {t.aud.answersIn}
      </p>
    )
  }
  const total = aud.counts.reduce((a, b) => a + b, 0)
  const pct = (n: number) => (total ? Math.round((n * 100) / total) : 0)
  const order = aud.choices.map((c, i) => ({ c, i, n: aud.counts![i] ?? 0 })).sort((a, b) => b.n - a.n)
  return (
    <div className={`aud-result${big ? ' big' : ''}`} data-testid="aud-result">
      <p className="aud-result-head">
        {total ? (
          <>
            <b>{num(pct(aud.counts[aud.correct ?? -1] ?? 0), lang)}%</b> {t.aud.gotIt}
          </>
        ) : (
          t.aud.noAnswers
        )}
      </p>
      {total > 0 && (
        <ul className="aud-bars">
          {order.map(({ c, i, n }) => (
            <li key={i} className={i === aud.correct ? 'right' : ''} data-choice={i}>
              <span className="aud-bar" style={{ ['--p' as string]: `${pct(n)}%` }} />
              <span className="aud-bar-label" dir="auto">
                {c}
              </span>
              <span className="aud-bar-n">{num(pct(n), lang)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Qr({ text, label, testid }: { text: string; label: string; testid?: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [text])
  return <div className="live-qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} data-testid={testid} />
}

/** Wi-Fi network names and passwords need a few characters escaped inside a Wi-Fi QR code. */
const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')

/** On the projector: scan to join the Wi-Fi, then scan to play along. */
export function JoinCard({ t, lang, wifi, joined }: { t: Strings; lang: Lang; wifi: { ssid: string; pass: string } | null; joined: number }) {
  const url = joinUrl()
  return (
    <div className="join-card" data-testid="join-card">
      <h2>{t.aud.joinTitle}</h2>
      <div className="join-qrs">
        {wifi && (
          <figure>
            <Qr text={`WIFI:T:${wifi.pass ? 'WPA' : 'nopass'};S:${wifiEsc(wifi.ssid)};${wifi.pass ? `P:${wifiEsc(wifi.pass)};` : ''};`} label={t.aud.step1} testid="join-wifi-qr" />
            <figcaption>
              <b>1.</b> {t.aud.step1}
              <span className="muted">{wifi.ssid}</span>
            </figcaption>
          </figure>
        )}
        <figure>
          <Qr text={url} label={t.aud.step2} testid="join-qr" />
          <figcaption>
            <b>{wifi ? '2.' : ''}</b> {t.aud.step2}
            <span className="muted">{url.replace(/^https?:\/\//, '')}</span>
          </figcaption>
        </figure>
      </div>
      <p className="muted">
        {t.aud.noInternet} · {num(joined, lang)} {t.aud.joined}
      </p>
    </div>
  )
}

/** The page on an audience member's phone. */
export function AudiencePhone({ fallbackLang }: { fallbackLang: Lang }) {
  const [joined, setJoined] = useState<'joining' | 'ok' | 'closed' | 'full' | 'offline'>('joining')
  useEffect(() => {
    void joinAudience().then(setJoined)
  }, [])
  const feed = useAudienceFeed(joined === 'ok')
  const s = feed.state
  const lang: Lang = s?.lang ?? fallbackLang
  const theme: ThemeId = s?.theme ?? 'amethyst'
  const t = STRINGS[lang]

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    setDocLang(html, lang)
    document.body.classList.add('audience-body', 'phone-body')
    setFavicon(document, theme)
  }, [theme, lang])

  const shell = (body: React.ReactNode) => (
    <main className="phone" data-testid="phone">
      <header className="phone-head">
        <Mark theme={theme} className="phone-mark" />
        <span className="brand-word">{APP_NAME}</span>
        {s && (
          <span className="pill" data-testid="phone-score">
            {t.aud.score} {num(s.score, lang)}
          </span>
        )}
      </header>
      {body}
    </main>
  )

  if (joined === 'joining') return shell(<p className="phone-msg">{t.live.lost}</p>)
  if (joined !== 'ok') return shell(<p className="phone-msg" data-testid="phone-closed">{joined === 'full' ? t.aud.full : t.aud.closed}</p>)
  if (feed.status === 'out') return shell(<p className="phone-msg" data-testid="phone-closed">{t.aud.closed}</p>)
  if (!s) return shell(<p className="phone-msg">{t.live.lost}</p>)
  if (!s.on) return shell(<p className="phone-msg" data-testid="phone-closed">{t.aud.closed}</p>)
  return shell(
    <>
      {feed.status === 'lost' && <span className="pill bad">{t.live.lost}</span>}
      {s.round ? <PhoneRound t={t} lang={lang} round={s.round} key={s.round.id} /> : <p className="phone-msg" data-testid="phone-wait">{t.aud.wait}</p>}
    </>,
  )
}

function PhoneRound({ t, lang, round }: { t: Strings; lang: Lang; round: NonNullable<AudState['round']> }) {
  const [mine, setMine] = useState<number | null>(round.mine)
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((round.closesAt - Date.now()) / 1000)))
  useEffect(() => {
    if (round.mine !== null) setMine(round.mine)
  }, [round.mine])
  useEffect(() => {
    if (!round.open) return
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((round.closesAt - Date.now()) / 1000))), 250)
    return () => clearInterval(id)
  }, [round.open, round.closesAt])
  const open = round.open && left > 0
  const done = round.correct !== null
  const pick = (i: number) => {
    if (!open || mine !== null) return
    setMine(i)
    void answerAudience(round.id, i).then((r) => {
      if (r.data.mine !== undefined) setMine(r.data.mine)
      else if (!r.ok) setMine(null)
    })
  }
  return (
    <section className="phone-round" data-testid="phone-round" data-open={open || undefined} data-round={round.id}>
      {round.q && (
        <p className="phone-q" dir="auto" data-testid="phone-q">
          {round.q}
        </p>
      )}
      {open && <p className="phone-left">{num(left, lang)} s</p>}
      <div className="phone-choices">
        {round.choices.map((c, i) => (
          <button
            key={i}
            className={`phone-choice${mine === i ? ' mine' : ''}${done && i === round.correct ? ' right' : ''}${done && mine === i && i !== round.correct ? ' wrong' : ''}`}
            onClick={() => pick(i)}
            disabled={!open || mine !== null}
            data-choice={i}
            dir="auto"
          >
            {c}
            {round.counts && <span className="phone-n">{num(round.counts[i] ?? 0, lang)}</span>}
          </button>
        ))}
      </div>
      <p className="phone-msg" role="status" data-testid="phone-status">
        {done ? (mine === round.correct ? t.aud.right : mine === null ? t.aud.missed : t.aud.wrong) : mine !== null ? t.aud.locked : open ? t.aud.pick : t.aud.timeUp}
      </p>
    </section>
  )
}
