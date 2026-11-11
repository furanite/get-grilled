import { useEffect, useState } from 'react'
import type { Lang, ThemeId } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { THEMES, formatCountdown, msUntilOpen, themeOpen } from '../lib/themes'
import { burstAt } from '../lib/fx'
import { Ambient, Flourish, FlourishAbove, Mark } from './Brand'
import { clearPlace, currentPlace, requestExactPlace } from '../lib/place'
import { APP_NAME, APP_NAME_AR, HAS_AR_NAME, ISLAMIC_SET, appName } from '../lib/edition'

interface Props {
  t: Strings
  lang: Lang
  theme: ThemeId
  setTheme: (id: ThemeId, e?: { clientX: number; clientY: number }) => void
  hasGame: boolean
  onNew: () => void
  onResume: () => void
  onBuilder: () => void
  onReview: () => void
}

export default function Home({ t, lang, theme, setTheme, hasGame, onNew, onResume, onBuilder, onReview }: Props) {
  // The Islamic site shows its Arabic name on the back of the logo instead of the Get Grilled tagline.
  const tagline = HAS_AR_NAME ? APP_NAME_AR : t.tagline
  const [flipped, setFlipped] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="stack" style={{ gap: 28 }}>
      <section className="hero">
        {(ISLAMIC_SET || theme === 'heritage' || theme === 'ember') && <Ambient theme={theme} />}
        <Mark theme={theme} className="hero-mark" key={'m' + theme} />
        <button
          className={`logo-card${flipped ? ' flipped' : ''}`}
          onClick={(e) => {
            setFlipped((f) => !f)
            if (!flipped) burstAt(e.currentTarget, 30, 220)
          }}
          aria-label={flipped ? appName(lang) : tagline}
          data-testid="logo"
        >
          <span className="logo-inner">
            <span className="logo-face">
              <FlourishAbove theme={theme} />
              <span className="logo-title" style={{ ['--ns' as string]: Math.min(1, 11 / APP_NAME.length) }}>{APP_NAME}</span>
              <Flourish theme={theme} />
            </span>
            <span className="logo-face back">
              <span className="logo-answer" dir="auto">{tagline}</span>
            </span>
          </span>
        </button>
        {!HAS_AR_NAME && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t.tapLogo}
          </p>
        )}
        <div className="home-actions">
          <button className="btn big" onClick={onNew}>
            {t.newGame}
          </button>
          {hasGame && (
            <button className="btn alt big" onClick={onResume}>
              {t.resume}
            </button>
          )}
          <button className="btn alt big" onClick={onBuilder}>
            {t.builder}
          </button>
          {ISLAMIC_SET && (
            <button className="btn alt big" onClick={onReview} data-testid="open-review">
              {t.review}
            </button>
          )}
        </div>
      </section>

      <section className="panel stack">
        <span className="label">{t.theme}</span>
        <div className="themes">
          {THEMES.map((th) => {
            const locked = !themeOpen(th.id)
            return (
              <button key={th.id} className="theme" aria-pressed={theme === th.id} disabled={locked} onClick={(e) => setTheme(th.id, e)} data-theme-id={th.id}>
                <span className="sw" style={{ background: th.swatch }} />
                <span style={{ minWidth: 0 }}>
                  <b>{lang === 'ar' ? th.nameAr : th.name}</b>
                  <small>{th.blurb}</small>
                  {locked && (
                    <span className="lock" style={{ display: 'block' }}>
                      🔒 {th.id === 'jumuah' ? t.lockedJumuah : th.id === 'mawlid' ? t.lockedMawlid : t.lockedUntil} {formatCountdown(msUntilOpen(th.id), lang)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        {THEMES.some((th) => th.id === 'jumuah' || th.id === 'mawlid') && <MaghribPlace t={t} onChange={() => tick((n) => n + 1)} />}
      </section>
    </main>
  )
}

/** Says where Maghrib is reckoned from, and lets the player share an exact location (kept only on this device). */
function MaghribPlace({ t, onChange }: { t: Strings; onChange: () => void }) {
  const place = currentPlace()
  const [note, setNote] = useState('')
  const where = place.exact ? t.maghribExact : place.label === 'your time zone' ? t.maghribZone : `${place.label} (${t.maghribZone})`
  return (
    <p className="maghrib-place" data-testid="maghrib-place">
      {t.maghribFor} <b>{where}</b>.{' '}
      {place.exact ? (
        <button type="button" className="linkish" onClick={() => { clearPlace(); setNote(''); onChange() }}>{t.useZone}</button>
      ) : (
        <button type="button" className="linkish" data-testid="use-location" onClick={async () => { const ok = await requestExactPlace(); setNote(ok ? '' : t.locationFailed); onChange() }}>{t.useLocation}</button>
      )}
      {note && <span className="maghrib-note"> {note}</span>}
    </p>
  )
}
