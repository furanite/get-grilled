import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Lang, Team } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { type Place, type Press, MAX_BUTTONS, answering, buzzOrder } from '../lib/buzz'
import { getBox, serialSupported, setBuzzSettings, useBoxEvents, useBoxState, useBuzzSettings } from '../lib/buzzer'
import { sfx } from '../lib/sound'
import { useDialog } from './Legal'

/** What the clue card and the big screen show about the buzzers. */
export interface BuzzView {
  /** Buzzers are live and taking presses */
  open: boolean
  order: Place[]
  /** Teams marked wrong on this clue (crossed out in the order) */
  wrong: number[]
}

/**
 * The buzzers for one clue. While the question is on show they are ready (a press is early);
 * the host opens them, or they open by themselves if the host chose that. They go quiet when
 * the answer is shown or the card closes.
 */
export function useBuzzRound({ live, wrong, teams }: { live: boolean; wrong: number[]; teams: number }) {
  const box = useBoxState()
  const settings = useBuzzSettings()
  const ready = box.status === 'connected'
  const [isOpen, setIsOpen] = useState(false)
  const [presses, setPresses] = useState<Press[]>([])
  const [early, setEarly] = useState<{ team: number; id: number } | null>(null)
  const openRef = useRef(false)

  const openBuzzers = useCallback(() => {
    if (!ready || !live) return
    setPresses([])
    openRef.current = true
    setIsOpen(true)
    getBox().setMode('open')
  }, [ready, live])

  // Ready while the question shows; quiet otherwise.
  useEffect(() => {
    if (!ready) return
    const b = getBox()
    if (live) {
      b.setMode('ready')
      b.light([])
      if (settings.autoOpen) openBuzzers()
    } else {
      openRef.current = false
      setIsOpen(false)
      b.setMode('idle')
    }
    // Only when the question shows or goes, or the box comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, ready])

  useEffect(
    () => () => {
      const b = getBox()
      b.setMode('idle')
      b.light([])
    },
    [],
  )

  const teamOf = (button: number) => {
    const i = settings.map.indexOf(button)
    return i >= 0 && i < teams ? i : -1
  }

  useBoxEvents((e) => {
    if (e.kind === 'press' && openRef.current) {
      if (teamOf(e.button) < 0) return
      setPresses((p) => {
        if (p.some((q) => q.button === e.button)) return p
        if (!p.length) sfx.buzz(teamOf(e.button))
        return [...p, { button: e.button, us: e.us }]
      })
    } else if (e.kind === 'early' && live && !openRef.current) {
      const team = teamOf(e.button)
      if (team >= 0) setEarly({ team, id: Date.now() })
    } else if (e.kind === 'reset' && live) openBuzzers()
  })

  const order = buzzOrder(presses, settings.map.slice(0, teams), settings.tieMs)
  const now = answering(order, wrong)
  const nowKey = now.join(',')

  // Light the button of whoever answers now; when they are marked wrong, the next team lights up.
  useEffect(() => {
    if (!ready || !order.length) return
    getBox().light(now.map((team) => settings.map[team]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowKey, ready, order.length])

  useEffect(() => {
    if (!early) return
    const id = setTimeout(() => setEarly(null), 1200)
    return () => clearTimeout(id)
  }, [early])

  return { ready, isOpen, order, answering: now, early, open: openBuzzers }
}

const ordinal = (n: number, lang: Lang) => {
  if (lang === 'ar') return num(n, lang)
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

/** The buzz order: 1st Falcons, 2nd Engineers +0.084 s, with ties marked and wrong answers crossed out. */
export function BuzzOrder({ t, lang, view, teams, big }: { t: Strings; lang: Lang; view: BuzzView; teams: Team[]; big?: boolean }) {
  if (!view.order.length) {
    if (!view.open) return null
    return (
      <p className={`buzz-status${big ? ' big' : ''}`} role="status" data-testid={big ? 'audience-buzz-waiting' : 'buzz-waiting'}>
        <span className="buzz-dot" aria-hidden="true" /> {t.buzz.waiting}
      </p>
    )
  }
  const now = answering(view.order, view.wrong)
  return (
    <ol className={`buzz-order${big ? ' big' : ''}`} aria-label={t.buzz.order} data-testid={big ? 'audience-buzz-order' : 'buzz-order'}>
      {view.order.map((p) => {
        const out = view.wrong.includes(p.team)
        return (
          <li key={p.team} className={`${out ? 'out' : ''}${now.includes(p.team) ? ' now' : ''}${p.tie ? ' tie' : ''}`} data-buzz-team={p.team} data-rank={p.rank}>
            <span className="buzz-rank">{ordinal(p.rank, lang)}</span>
            <b>{teams[p.team]?.name}</b>
            {p.gap > 0 && <span className="buzz-gap">+{num(Number(p.gap.toFixed(3)), lang)} s</span>}
            {p.tie && <span className="pill buzz-tie">{t.buzz.tied}</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** Chrome or Edge on a page that isn't a secure context (the Pi over http): Web Serial is there but switched off. */
const insecureChrome = () => typeof window !== 'undefined' && !window.isSecureContext && /Chrome\//.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent)

/** The Buzzers button in the top bar: shows whether the box is connected and opens the settings. */
export function BuzzButton({ t, lang, teams }: { t: Strings; lang: Lang; teams: Team[] }) {
  const box = useBoxState()
  const [open, setOpen] = useState(false)
  // Over plain http (the Pi) Chrome hides the serial port; keep the button so the host learns how to allow it.
  const blocked = !serialSupported() && !box.sim && insecureChrome()
  if (!serialSupported() && !box.sim && !blocked) return null
  return (
    <>
      <button className="ghost buzz-btn" onClick={() => setOpen(true)} data-testid="buzz-open" data-status={box.status}>
        <span className={`buzz-led ${box.status}`} aria-hidden="true" /> {t.buzz.button}
      </button>
      {open && createPortal(<BuzzPanel t={t} lang={lang} teams={teams} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

/** Connect the box, test each team's button, and set which button belongs to which team. */
export function BuzzPanel({ t, lang, teams, onClose }: { t: Strings; lang: Lang; teams: Team[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  const box = useBoxState()
  const settings = useBuzzSettings()
  const [hit, setHit] = useState<Record<number, number>>({})
  const names = teams.length ? teams.map((tm) => tm.name) : [1, 2, 3, 4].map((i) => t.intro.team(num(i, lang)))
  const count = Math.max(1, Math.min(4, names.length))
  const buttons = Math.max(box.buttons || MAX_BUTTONS, count)

  useEffect(() => {
    getBox().setMode('idle')
  }, [])
  // Clear the "pressed" marks a moment after each test press.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => tick((n) => n + 1), 1600)
    return () => clearTimeout(id)
  }, [hit])
  useBoxEvents((e) => {
    if (e.kind !== 'test') return
    setHit((h) => ({ ...h, [e.button]: Date.now() }))
    getBox().light([e.button])
    const team = settings.map.indexOf(e.button)
    if (team >= 0 && team < count) sfx.buzz(team)
  })

  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel buzz-panel" role="dialog" aria-modal="true" aria-labelledby="buzz-title" ref={ref} data-testid="buzz-panel" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-head">
          <h1 id="buzz-title">{t.buzz.title}</h1>
        </div>
        <div className="legal-body">
          <p className="muted">{serialSupported() || box.sim ? t.buzz.help : insecureChrome() ? t.buzz.insecure : t.buzz.unsupported}</p>
          <div className="row buzz-conn">
            <span className={`pill buzz-state ${box.status}`} data-testid="buzz-status">
              <span className={`buzz-led ${box.status}`} aria-hidden="true" /> {box.sim ? t.buzz.sim : t.buzz.status[box.status]}
              {box.status === 'connected' && box.buttons > 0 && ` · ${num(box.buttons, lang)} ${t.buzz.buttons}`}
            </span>
            {!box.sim && serialSupported() && (box.status === 'connected' ? (
              <button className="ghost" onClick={() => void getBox().disconnect()}>
                {t.buzz.disconnect}
              </button>
            ) : (
              <button className="btn" onClick={() => void getBox().connect()} data-testid="buzz-connect" data-autofocus>
                {t.buzz.connect}
              </button>
            ))}
          </div>
          {box.status === 'connected' && <p className="muted">{t.buzz.test}</p>}
          <ul className="buzz-map">
            {names.slice(0, count).map((name, team) => {
              const b = settings.map[team]
              const lit = hit[b] && Date.now() - hit[b] < 1500
              return (
                <li key={team} className={lit ? 'hit' : ''} data-testid={`buzz-map-${team}`}>
                  <b>{name}</b>
                  <label>
                    <span className="label">{t.buzz.buttonFor}</span>
                    <select
                      className="input"
                      value={b}
                      onChange={(e) => {
                        const map = [...settings.map]
                        const to = Number(e.target.value)
                        // Swap with the team that had this button, so no two teams share one.
                        const other = map.indexOf(to)
                        if (other >= 0) map[other] = map[team]
                        map[team] = to
                        setBuzzSettings({ ...settings, map })
                      }}
                    >
                      {Array.from({ length: buttons }, (_, i) => (
                        <option key={i} value={i}>
                          {num(i + 1, lang)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="buzz-hit" aria-live="polite">{lit ? t.buzz.pressed : ''}</span>
                </li>
              )
            })}
          </ul>
          <label className="check">
            <input type="checkbox" checked={settings.autoOpen} onChange={(e) => setBuzzSettings({ ...settings, autoOpen: e.target.checked })} data-testid="buzz-auto" />
            <span>{t.buzz.auto}</span>
          </label>
          <p className="muted small">{t.buzz.autoHelp}</p>
          <label className="buzz-tie-set">
            <span className="label">{t.buzz.tie}</span>
            <input className="input" type="number" min={0} max={50} step={1} value={settings.tieMs} onChange={(e) => setBuzzSettings({ ...settings, tieMs: Number(e.target.value) })} data-testid="buzz-tie" />
          </label>
          <p className="muted small">{t.buzz.tieHelp}</p>
        </div>
        <div className="legal-actions">
          <button type="button" className="ghost" disabled={box.status !== 'connected'} onClick={() => getBox().light(Array.from({ length: buttons }, (_, i) => i))}>
            {t.buzz.lights}
          </button>
          <button type="button" className="btn" onClick={onClose} data-testid="buzz-done">
            {t.buzz.done}
          </button>
        </div>
      </div>
    </div>
  )
}
