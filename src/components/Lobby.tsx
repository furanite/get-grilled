import { useEffect, useState } from 'react'
import type { Lang, ThemeId } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { LOGO_MAX_BYTES, type LobbyInfo } from '../lib/store'
import { HOST_EDITION } from '../lib/edition'
import { Ambient, Flourish, FlourishAbove, Mark } from './Brand'

/** Seconds until "HH:MM" today, or null when no time is set or it has passed. */
function secsUntil(start: string, now: number): number | null {
  const m = /^(\d\d):(\d\d)$/.exec(start)
  if (!m) return null
  const d = new Date(now)
  d.setHours(+m[1], +m[2], 0, 0)
  const s = Math.round((d.getTime() - now) / 1000)
  return s > 0 ? s : null
}

const two = (n: number) => String(n).padStart(2, '0')

/** The waiting screen the room sees before the game: logos, the event name, a countdown and the rules one at a time. */
export function LobbyView({ t, lang, theme, info, win = window }: { t: Strings; lang: Lang; theme: ThemeId; info: LobbyInfo; win?: Window }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = win.setInterval(() => setNow(Date.now()), 1000)
    return () => win.clearInterval(id)
  }, [win])
  const left = secsUntil(info.start, now)
  const rules = t.lobby.rules
  const rule = rules[Math.floor(now / 8000) % rules.length]
  const h = left !== null ? Math.floor(left / 3600) : 0
  const mm = left !== null ? Math.floor((left % 3600) / 60) : 0
  const ss = left !== null ? left % 60 : 0
  const count = left === null ? null : (h ? `${h}:${two(mm)}:${two(ss)}` : `${two(mm)}:${two(ss)}`).replace(/\d/g, (c) => num(+c, lang))
  return (
    <main className="aud-main aud-wait lobby" data-testid="lobby-view" key={theme}>
      <Ambient theme={theme} />
      <div className="title-screen lobby-in">
        {info.logos.length > 0 ? (
          <div className="lobby-logos">
            {info.logos.map((src, i) => (
              <img key={i} src={src} alt="" />
            ))}
          </div>
        ) : (
          <Mark theme={theme} className="ts-mark" />
        )}
        <FlourishAbove theme={theme} />
        <h1 className="aud-title lobby-name" dir="auto">
          {info.name || t.lobby.welcome}
        </h1>
        {info.sub && (
          <p className="aud-tagline" dir="auto">
            {info.sub}
          </p>
        )}
        <Flourish theme={theme} />
        <p className="lobby-count" role="timer" data-testid="lobby-count">
          {count ? (
            <>
              <span className="label">{t.lobby.startsIn}</span> <b>{count}</b>
            </>
          ) : (
            <b>{t.lobby.soon}</b>
          )}
        </p>
        {info.rules && (
          <p className="lobby-rule" key={rule} dir="auto">
            {rule}
          </p>
        )}
      </div>
    </main>
  )
}

interface Props {
  t: Strings
  lang: Lang
  theme: ThemeId
  info: LobbyInfo
  setInfo: (l: LobbyInfo) => void
  onBack: () => void
  notify: (s: string) => void
}

/** The host sets up the waiting screen. In the host edition the big screen shows it while this screen is open. */
export default function LobbyScreen({ t, lang, theme, info, setInfo, onBack, notify }: Props) {
  const [full, setFull] = useState(false)
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [full])

  const addLogo = (file: File | undefined) => {
    if (!file) return
    if (file.size > LOGO_MAX_BYTES || !/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) return notify(t.lobby.logoTooBig)
    const r = new FileReader()
    r.onload = () => typeof r.result === 'string' && setInfo({ ...info, logos: [...info.logos, r.result].slice(0, 4) })
    r.readAsDataURL(file)
  }

  if (full)
    return (
      <div className="lobby-full" onDoubleClick={() => setFull(false)}>
        <LobbyView t={t} lang={lang} theme={theme} info={info} />
        <button className="ghost lobby-exit" onClick={() => setFull(false)} data-testid="lobby-exit">
          {t.lobby.exit}
        </button>
      </div>
    )

  return (
    <main className="stack lobby-screen" data-testid="lobby">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="ghost" onClick={onBack}>
          ← {t.back}
        </button>
        <h1>{t.lobby.title}</h1>
        <span />
      </div>
      <p className="muted">{t.lobby.help}</p>
      <section className="panel lobby-form">
        <label className="field">
          <span className="label">{t.lobby.name}</span>
          <input className="input" maxLength={80} value={info.name} dir="auto" onChange={(e) => setInfo({ ...info, name: e.target.value })} data-testid="lobby-name" />
        </label>
        <label className="field">
          <span className="label">{t.lobby.sub}</span>
          <input className="input" maxLength={120} value={info.sub} dir="auto" onChange={(e) => setInfo({ ...info, sub: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">{t.lobby.start}</span>
          <input className="input" type="time" value={info.start} onChange={(e) => setInfo({ ...info, start: e.target.value })} data-testid="lobby-start" style={{ maxWidth: 180 }} />
        </label>
        <div className="field">
          <span className="label">{t.lobby.logos}</span>
          <div className="row lobby-logo-row">
            {info.logos.map((src, i) => (
              <span className="lobby-logo-edit" key={i}>
                <img src={src} alt="" />
                <button className="ghost" onClick={() => setInfo({ ...info, logos: info.logos.filter((_, k) => k !== i) })} aria-label={t.remove}>
                  ×
                </button>
              </span>
            ))}
            {info.logos.length < 4 && (
              <label className="ghost lobby-add">
                + {t.lobby.addLogo}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={(e) => (addLogo(e.target.files?.[0]), (e.target.value = ''))} />
              </label>
            )}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={info.rules} onChange={(e) => setInfo({ ...info, rules: e.target.checked })} />
          {t.lobby.showRules}
        </label>
        {!HOST_EDITION && (
          <button
            className="btn big"
            onClick={() => {
              setFull(true)
              document.documentElement.requestFullscreen?.().catch(() => {})
            }}
            data-testid="lobby-go"
          >
            {t.lobby.go}
          </button>
        )}
      </section>
      <div className="lobby-preview" aria-hidden="true">
        <LobbyView t={t} lang={lang} theme={theme} info={info} />
      </div>
    </main>
  )
}
