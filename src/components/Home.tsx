import { useEffect, useState } from 'react'
import type { Lang, ThemeId } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { THEMES, formatCountdown, heritageOpen, msUntilHeritage } from '../lib/themes'
import { burstAt } from '../lib/fx'
import { Ambient, Flourish, FlourishAbove, Mark } from './Brand'
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
}

export default function Home({ t, lang, theme, setTheme, hasGame, onNew, onResume, onBuilder }: Props) {
  // The Islamic site shows its Arabic name on the back of the logo instead of the Get Grilled tagline.
  const tagline = HAS_AR_NAME ? APP_NAME_AR : t.tagline
  const [flipped, setFlipped] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const open = heritageOpen()

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
        </div>
      </section>

      <section className="panel stack">
        <span className="label">{t.theme}</span>
        <div className="themes">
          {THEMES.map((th) => {
            const locked = th.id === 'heritage' && !open
            return (
              <button key={th.id} className="theme" aria-pressed={theme === th.id} disabled={locked} onClick={(e) => setTheme(th.id, e)} data-theme-id={th.id}>
                <span className="sw" style={{ background: th.swatch }} />
                <span style={{ minWidth: 0 }}>
                  <b>{lang === 'ar' ? th.nameAr : th.name}</b>
                  <small>{th.blurb}</small>
                  {locked && (
                    <span className="lock" style={{ display: 'block' }}>
                      🔒 {t.lockedUntil} {formatCountdown(msUntilHeritage(), lang)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
