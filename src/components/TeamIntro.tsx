import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Game, Lang, Team, ThemeId } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { INTRO_MS } from '../lib/game'

/** Red vs Blue: teams take red and blue in turn. */
const RIVAL = ['#ff3d5a', '#5a7bff']
const W = 1280
const H = 720

/** A small seeded random, so the host and projector draw the same sparkles. */
function seeded(seed: number) {
  let s = seed * 9301 + 49297
  return (a: number, b: number) => {
    s = (s * 9301 + 49297) % 233280
    return a + (s / 233280) * (b - a)
  }
}

/** The theme's background effect: curtains, lamps, circuit traces, embers, bulbs, the red/blue slam or the Heritage arch. */
function Effects({ theme, seed, lineup }: { theme: ThemeId; seed: number; lineup?: boolean }) {
  const r = seeded(seed + 1)
  const st = (o: Record<string, string | number>) => o as CSSProperties
  if (lineup) {
    if (theme === 'heritage') return <><div className="ti-geo" /><div className="ti-sadu" /></>
    if (theme === 'onyx') return <div className="ti-rays" />
    if (theme === 'emerald') return <div className="ti-palms" />
    if (theme === 'neon') return <><div className="ti-grid" /><div className="ti-scan" /></>
    if (theme !== 'ember') return null
  }
  switch (theme) {
    case 'amethyst':
      return (
        <>
          <div className="ti-halo" />
          {Array.from({ length: 22 }, (_, k) => (
            <i key={k} className="ti-glint" style={st({ left: `${r(4, 96)}%`, top: `${r(8, 92)}%`, animationDelay: `${r(1.2, 4).toFixed(2)}s`, scale: r(0.5, 1.3).toFixed(2) })} />
          ))}
          <div className="ti-curtain ti-l" />
          <div className="ti-curtain ti-r" />
          <div className="ti-valance" />
        </>
      )
    case 'emerald':
      return (
        <>
          <div className="ti-bigstar" />
          <div className="ti-palms" />
          {Array.from({ length: 9 }, (_, k) => (
            <i key={k} className="ti-lamp" style={st({ left: `${6 + k * 11}%`, height: `${60 + (k % 3) * 34}px`, animationDelay: `${(0.5 + k * 0.18).toFixed(2)}s` })} />
          ))}
        </>
      )
    case 'neon':
      return (
        <>
          <div className="ti-grid" />
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {[150, 240, 480, 570].map((y, k) => {
              const c = k % 2 ? '#ff3fd8' : '#2ef2ff'
              const d = 0.2 + k * 0.15
              const dy = k < 2 ? 40 : -40
              return (
                <g key={k} color={c}>
                  <path d={`M0 ${y} H${180 + k * 30} l40 ${dy} H${330 + k * 20}`} stroke={c} style={{ animationDelay: `${d}s` }} />
                  <circle cx={330 + k * 20} cy={y + dy} r="6" fill={c} style={{ animationDelay: `${d + 1.2}s` }} />
                  <path d={`M${W} ${y} H${1100 - k * 30} l-40 ${dy} H${950 - k * 20}`} stroke={c} style={{ animationDelay: `${d}s` }} />
                  <circle cx={950 - k * 20} cy={y + dy} r="6" fill={c} style={{ animationDelay: `${d + 1.2}s` }} />
                </g>
              )
            })}
          </svg>
          <div className="ti-scan" />
        </>
      )
    case 'ember':
      return (
        <>
          <div className="ti-heat" />
          <div className="ti-grill" />
          {Array.from({ length: 34 }, (_, k) => (
            <i key={k} className="ti-spark" style={st({ left: `${r(2, 98)}%`, '--dx': `${r(-80, 80).toFixed(0)}px`, animationDuration: `${r(4, 8).toFixed(2)}s`, animationDelay: `${r(0, 6).toFixed(2)}s`, scale: r(0.5, 1.4).toFixed(2) })} />
          ))}
        </>
      )
    case 'onyx': {
      const bulbs: ReactNode[] = []
      const n = 26
      for (let k = 0; k < n; k++) {
        const x = 40 + k * (1200 / (n - 1)) - 6
        bulbs.push(<i key={`t${k}`} className="ti-bulb" style={{ left: x, top: 16, animationDelay: `${(k * 0.09).toFixed(2)}s` }} />)
        bulbs.push(<i key={`b${k}`} className="ti-bulb" style={{ left: x, top: 692, animationDelay: `${((n - k) * 0.09).toFixed(2)}s` }} />)
      }
      for (let k = 1; k < 14; k++) {
        const y = 16 + k * (676 / 14)
        bulbs.push(<i key={`l${k}`} className="ti-bulb" style={{ left: 16, top: y, animationDelay: `${((n + 14 - k) * 0.09).toFixed(2)}s` }} />)
        bulbs.push(<i key={`r${k}`} className="ti-bulb" style={{ left: 1252, top: y, animationDelay: `${((n + k) * 0.09).toFixed(2)}s` }} />)
      }
      return (
        <>
          <div className="ti-rays" />
          <div className="ti-frame" />
          {bulbs}
        </>
      )
    }
    case 'rivals':
      return (
        <>
          <div className="ti-half ti-a" />
          <div className="ti-half ti-b" />
          <div className="ti-tc" />
          <div className="ti-slash" />
        </>
      )
    case 'heritage':
      return (
        <>
          <div className="ti-geo" />
          <svg className="ti-arch" viewBox="0 0 1000 640" aria-hidden="true">
            <path d="M8 640 V300 Q8 70 500 8 Q992 70 992 300 V640" />
            <path className="ti-inner" d="M40 640 V310 Q40 100 500 42 Q960 100 960 310 V640" />
          </svg>
          <div className="ti-doors">
            <div className="ti-door ti-l" />
            <div className="ti-door ti-r" />
          </div>
          <div className="ti-sadu" />
        </>
      )
  }
}

const ARABIC = /[\p{Script=Arabic}\p{Script=Hebrew}]/u

/** The team name, letter by letter. Arabic is joined-up writing, so it goes word by word instead. */
function Letters({ text }: { text: string }) {
  if (ARABIC.test(text)) {
    return (
      <>
        {text.split(/\s+/).map((w, i) => (
          <span key={i}>
            {i > 0 && <span className="ti-sp" />}
            <span className="ti-ch" style={{ ['--i' as string]: i * 3 }}>{w}</span>
          </span>
        ))}
      </>
    )
  }
  let i = 0
  return <>{[...text].map((c, k) => (c === ' ' ? <span key={k} className="ti-sp" /> : <span key={k} className="ti-ch" style={{ ['--i' as string]: i++ }}>{c}</span>))}</>
}

const FLOURISH = (
  <svg className="ti-flourish" viewBox="0 0 420 24" aria-hidden="true">
    <path d="M10 12 H180 M240 12 H410" />
    <path d="M180 12 q15 -10 30 0 q15 10 30 0" />
    <circle cx="210" cy="12" r="4" />
  </svg>
)

/** Shrinks long team names so they always fit on one line. */
const nameScale = (name: string) => Math.min(1, 15 / Math.max(1, [...name].length))

function teamStyle(theme: ThemeId, i: number): CSSProperties {
  return theme === 'rivals' ? ({ '--tc': RIVAL[i % 2], '--from': i % 2 ? '80px' : '-80px' } as CSSProperties) : {}
}

function Intro({ team, i, n, theme, t, lang }: { team: Team; i: number; n: number; theme: ThemeId; t: Strings; lang: Lang }) {
  const members = team.members ?? []
  return (
    <div className="ti-scene ti-intro" style={teamStyle(theme, i)} data-testid="teams-team">
      <div className="ti-fx">
        <Effects theme={theme} seed={i} />
      </div>
      <div className="ti-in">
        <div className="ti-eyebrow">{t.intro.teamOf(num(i + 1, lang), num(n, lang))}</div>
        <h1 className="ti-tname" style={{ ['--nk' as string]: nameScale(team.name) }} aria-label={team.name}>
          <Letters text={team.name} />
        </h1>
        {FLOURISH}
        {members.length > 0 && (
          <ul className="ti-members">
            {members.map((m, k) => (
              <li key={k} style={{ ['--i' as string]: k }} className={k === team.captain ? 'ti-cap' : undefined} data-cap={t.intro.captain}>
                {m.name}
                {m.role && <small className="ti-role">{m.role}</small>}
              </li>
            ))}
          </ul>
        )}
        {team.fact && (
          <div className="ti-fact">
            <b>{t.intro.funFact}</b>
            <p>{team.fact}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Lineup({ game, theme, t, lang, host, onStart }: { game: Game; theme: ThemeId; t: Strings; lang: Lang; host: boolean; onStart?: () => void }) {
  return (
    <div className="ti-scene ti-lineup" data-testid="teams-lineup">
      <div className="ti-fx">
        <Effects theme={theme} seed={99} lineup />
      </div>
      <div className="ti-in">
        <h2 className="ti-lh">{t.intro.meet}</h2>
        <div className="ti-cards" style={{ ['--n' as string]: game.teams.length }}>
          {game.teams.map((team, i) => (
            <article key={i} className="ti-tcard" style={{ ['--i' as string]: i, ...teamStyle(theme, i) }}>
              <span className="ti-num">{t.intro.team(num(i + 1, lang))}</span>
              <h3>{team.name}</h3>
              {(team.members?.length ?? 0) > 0 && (
                <ul>
                  {team.members!.map((m, k) => (
                    <li key={k} className={k === team.captain ? 'ti-cap' : undefined}>
                      <span>
                        {m.name}
                        {k === team.captain && <span aria-label={t.intro.captain}> ★</span>}
                      </span>
                      {m.role && <small className="ti-role">{m.role}</small>}
                    </li>
                  ))}
                </ul>
              )}
              {team.fact && (
                <p>
                  <b>{t.intro.funFact}</b>
                  {team.fact}
                </p>
              )}
            </article>
          ))}
        </div>
        {host ? (
          <div className="ti-start-row">
            <button className="ti-start" onClick={onStart} data-testid="teams-start">
              {t.start}
            </button>
            <small>{t.intro.hostOnly}</small>
          </div>
        ) : (
          <div className="ti-ready">{t.intro.begins}</div>
        )}
      </div>
    </div>
  )
}

interface Props {
  game: Game
  theme: ThemeId
  t: Strings
  lang: Lang
  /** The host's own screen: it gets the Next, Skip and Start game buttons. The projector does not. */
  host: boolean
  /** Fill the whole window (the projector) instead of a 16:9 box in the page */
  full?: boolean
  onNext?: () => void
  onSkip?: () => void
  onAuto?: (auto: boolean) => void
  onStart?: () => void
}

/** The team introductions and the Meet the teams screen, on a 1280x720 stage scaled to fit. */
export default function TeamIntro({ game, theme, t, lang, host, full, onNext, onSkip, onAuto, onStart }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ s: 1, x: 0, y: 0 })
  const intro = game.intro ?? { i: game.teams.length, auto: false }
  const n = game.teams.length
  const onTeam = intro.i < n

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const view = el.ownerDocument.defaultView ?? window
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const s = Math.min(w / W, h / H)
      setFit({ s, x: (w - W * s) / 2, y: (h - H * s) / 2 })
    }
    measure()
    const ro = new view.ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [full])

  // Restart the animations whenever the step or theme changes.
  const key = useMemo(() => `${theme}-${intro.i}`, [theme, intro.i])

  return (
    <div className={`ti-wrap${full ? ' full' : ''}`} ref={wrap} data-testid="teams-intro">
      <div className="ti-stage" style={{ transform: `translate(${fit.x}px,${fit.y}px) scale(${fit.s})` }} key={key}>
        {onTeam ? (
          <Intro team={game.teams[intro.i]} i={intro.i} n={n} theme={theme} t={t} lang={lang} />
        ) : (
          <Lineup game={game} theme={theme} t={t} lang={lang} host={host} onStart={onStart} />
        )}
        {host && onTeam && (
          <>
            <div className="ti-hostbar">
              <button className="ti-hostbtn" aria-pressed={intro.auto} onClick={() => onAuto?.(!intro.auto)} data-testid="teams-auto">
                {intro.auto ? '⏵ ' : '⏸ '}
                {t.intro.auto}
              </button>
              <span className="ti-hostbtns">
                <button className="ti-hostbtn" onClick={onSkip} data-testid="teams-skip">
                  {t.intro.skip}
                </button>
                <button className="ti-hostbtn ti-go" onClick={onNext} data-testid="teams-next">
                  {intro.i < n - 1 ? t.intro.next : t.intro.showAll} {lang === 'ar' ? '◂' : '▸'}
                </button>
              </span>
            </div>
            {intro.auto && <div className="ti-progress" style={{ ['--dur' as string]: `${INTRO_MS}ms` }} />}
          </>
        )}
      </div>
    </div>
  )
}
