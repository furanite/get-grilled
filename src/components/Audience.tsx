import { useCallback, useEffect, useRef, useState } from 'react'
import Source from './Source'
import { createPortal } from 'react-dom'
import type { Game, Lang, Screen, ThemeId } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { FINAL_SECS, FINAL_VALUE, LIGHTNING_SECS, STREAK_AT, clueSeconds, isFinished, lastPlace, standings, tileKey } from '../lib/game'
import { ISLAMIC_SET, appName, type Live } from '../lib/edition'
import { setFavicon } from '../lib/favicon'
import { Ambient, CatIcon, Flourish, FlourishAbove, Mark } from './Brand'
import { diagramSrc } from '../lib/diagram'
import { GameClock, TimerBar } from './Timer'
import { qLen } from '../lib/qlen'

/**
 * Opens a second browser window that the host drags onto the projector.
 * The window is blank and same-origin, so React draws straight into it: no server and no messages.
 */
export function useAudienceWindow(title: string) {
  const [win, setWin] = useState<Window | null>(null)
  const [root, setRoot] = useState<HTMLElement | null>(null)

  const close = useCallback(() => {
    setWin((w) => {
      if (w && !w.closed) w.close()
      return null
    })
    setRoot(null)
  }, [])

  const open = useCallback((): boolean => {
    if (win && !win.closed) {
      win.focus()
      return true
    }
    let w: Window | null = null
    try {
      w = window.open('', 'gg-audience', 'popup,width=1280,height=720')
    } catch {
      w = null
    }
    if (!w) return false
    const d = w.document
    d.title = title
    d.head.querySelectorAll('[data-gg]').forEach((n) => n.remove())
    for (const el of document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')) {
      const copy = el.cloneNode(true) as HTMLElement
      if (copy instanceof HTMLLinkElement) copy.href = (el as HTMLLinkElement).href
      copy.dataset.gg = ''
      d.head.appendChild(copy)
    }
    const meta = d.createElement('meta')
    meta.name = 'viewport'
    meta.content = 'width=device-width, initial-scale=1'
    meta.dataset.gg = ''
    d.head.appendChild(meta)
    d.body.innerHTML = ''
    d.body.className = 'audience-body'
    const mount = d.createElement('div')
    mount.className = 'audience'
    d.body.appendChild(mount)
    setWin(w)
    setRoot(mount)
    return true
  }, [win, title])

  // Notice when the host closes the audience window by hand.
  useEffect(() => {
    if (!win) return
    const id = setInterval(() => {
      if (win.closed) {
        setWin(null)
        setRoot(null)
      }
    }, 800)
    const onUnload = () => window.setTimeout(() => win.closed && (setWin(null), setRoot(null)), 50)
    win.addEventListener('pagehide', onUnload)
    addEventListener('pagehide', () => !win.closed && win.close())
    return () => {
      clearInterval(id)
      win.removeEventListener('pagehide', onUnload)
    }
  }, [win])

  return { win, root, open, close, isOpen: !!win && !!root }
}

interface Props {
  win: Window
  root: HTMLElement
  t: Strings
  lang: Lang
  theme: ThemeId
  reduceFx: boolean
  screen: Screen
  game: Game | null
  live: Live | null
}

/** What the room sees: the board, the scores, and the clue. The answer appears only after the host reveals it. */
export function AudienceScreen({ win, root, t, lang, theme, reduceFx, screen, game, live }: Props) {
  const html = win.document.documentElement
  html.dataset.theme = theme
  setFavicon(win.document, theme)
  html.dataset.reduceFx = reduceFx ? 'on' : 'off'
  // The Islamic look and the Qur'an font (with every Uthmani mark) apply in the audience window too.
  if (ISLAMIC_SET) html.dataset.set = 'islamic'
  html.lang = lang
  html.dir = lang === 'ar' ? 'rtl' : 'ltr'

  return createPortal(<AudienceView t={t} lang={lang} theme={theme} screen={screen} game={game} live={live} win={win} />, root)
}

function AudienceView({ t, lang, theme, screen, game, live, win }: { t: Strings; lang: Lang; theme: ThemeId; screen: Screen; game: Game | null; live: Live | null; win: Window }) {
  const [helpShown, setHelpShown] = useState(true)
  const helpTimer = useRef<number>()
  useEffect(() => {
    helpTimer.current = win.setTimeout(() => setHelpShown(false), 12000)
    return () => win.clearTimeout(helpTimer.current)
  }, [win])

  const fullscreen = () => {
    win.document.documentElement.requestFullscreen?.().catch(() => {})
    setHelpShown(false)
  }

  const help = helpShown && (
    <div className="aud-help" data-testid="audience-help">
      <span>{t.audienceHelp}</span>
      <button className="btn alt" onClick={fullscreen}>
        {t.audienceFull}
      </button>
    </div>
  )

  if (screen === 'results' && game) {
    const rows = standings(game)
    const winners = rows.filter((r) => r.rank === 1)
    return (
      <main className="aud-main" data-testid="audience">
        {help}
        <span className="label">{t.results}</span>
        <h1 className="crown aud-crown" data-testid="audience-winner">
          {winners.length > 1 ? t.tie : `${winners[0].name} ${t.winner}`}
        </h1>
        <div className="scores aud-scores">
          {rows.map((r, i) => (
            <div className="team" key={i}>
              <b>{r.name}</b>
              <span>{num(r.score, lang)}</span>
            </div>
          ))}
        </div>
      </main>
    )
  }

  const teamChips = (g: Game, behind: number[] = []) => (
    <div className="scores">
      {g.teams.map((tm, i) => {
        const run = g.streaks?.[i] ?? 0
        return (
          <div className={`team${tm.score < 0 ? ' neg' : ''}${run >= STREAK_AT ? ' fire' : ''}${behind.includes(i) ? ' behind' : ''}`} key={i} data-aud-team={i}>
            <b>{tm.name}</b>
            <span>{num(tm.score, lang)}</span>
            {run >= STREAK_AT && (
              <em className="fire-badge">
                <span aria-hidden="true">🔥</span> {t.onFire} ×{num(run, lang)}
              </em>
            )}
          </div>
        )
      })}
    </div>
  )

  if (screen === 'lightning' && game) {
    const st = game.lightningState
    const q = st && game.lightning?.[st.i]
    return (
      <main className="aud-main round" data-testid="audience-lightning">
        {help}
        <h1 className="round-title">⚡ {t.lightningTitle}</h1>
        <section className="stage round-stage">
          {st?.startedAt && !st.done && q ? (
            <div className="round-card" key={st.i}>
              <TimerBar clock={{ start: st.startedAt, total: LIGHTNING_SECS }} total={LIGHTNING_SECS} lang={lang} timeUpText={t.timeUp} big />
              <p className="q" dir="auto" data-len={qLen(lang === 'ar' && q.qAr ? q.qAr : q.q)} data-testid="audience-lightning-q">
                {lang === 'ar' && q.qAr ? q.qAr : q.q}
              </p>
              {st.revealed ? (
                <div className="answer show" dir="auto">
                  {lang === 'ar' && q.aAr ? q.aAr : q.a}
                </div>
              ) : (
                <div className="answer aud-hidden" aria-hidden="true" />
              )}
            </div>
          ) : (
            <p className="round-msg">{st?.done ? t.lightningOver : t.lightningHelp}</p>
          )}
          {teamChips(game)}
        </section>
      </main>
    )
  }

  if (screen === 'final' && game?.final) {
    const st = game.finalState ?? { step: 'cat', marks: [] }
    const f = game.final
    const cat = lang === 'ar' && f.cat.nameAr ? f.cat.nameAr : f.cat.name
    return (
      <main className="aud-main round" data-testid="audience-final">
        {help}
        <h1 className="round-title">{t.finalTitle}</h1>
        <p className="muted">
          {num(FINAL_VALUE, lang)} {t.finalWorth}
        </p>
        <section className="stage round-stage">
          <div className="round-card">
            {st.step === 'cat' ? (
              <>
                <p className="round-msg">{t.finalIntro}</p>
                <p className="final-cat">
                  <CatIcon id={f.cat.id} /> {cat}
                </p>
              </>
            ) : (
              <>
                <span className="label">
                  <CatIcon id={f.cat.id} /> {cat}
                </span>
                <p className="q" dir="auto" data-len={qLen(lang === 'ar' && f.q.qAr ? f.q.qAr : f.q.q)} data-testid="audience-final-q">
                  {lang === 'ar' && f.q.qAr ? f.q.qAr : f.q.q}
                </p>
              </>
            )}
            {st.step === 'q' && (
              <>
                <TimerBar clock={{ start: st.startedAt ?? Date.now(), total: FINAL_SECS }} total={FINAL_SECS} lang={lang} timeUpText={t.timeUp} big />
                <p className="muted">{t.finalWrite}</p>
              </>
            )}
            {st.step === 'answer' && (
              <div className="answer show" dir="auto" data-testid="audience-final-a">
                {lang === 'ar' && f.q.aAr ? f.q.aAr : f.q.a}
              </div>
            )}
          </div>
          {teamChips(game)}
        </section>
      </main>
    )
  }

  if (screen !== 'game' || !game) {
    return (
      <main className="aud-main aud-wait" data-testid="audience" key={theme}>
        <Ambient theme={theme} />
        {help}
        <div className="title-screen">
          <Mark theme={theme} className="ts-mark" />
          <FlourishAbove theme={theme} />
          <h1 className="aud-title">{appName(lang)}</h1>
          <Flourish theme={theme} />
          <p className="aud-tagline">{t.audienceWaiting}</p>
        </div>
      </main>
    )
  }

  const clue = live ? game.clues[live.c]?.[live.l] : null
  const behind = game.settings.comeback && game.used.length > 0 && !isFinished(game) && !live ? lastPlace(game) : []
  const cat = live ? game.cats[live.c] : null
  return (
    <main className="aud-main" data-testid="audience">
      {help}
      <section className="stage aud-stage">
        <div className="sadu-band" aria-hidden="true" />
        {game.endsAt && (
          <div className="aud-clock">
            <GameClock endsAt={game.endsAt} lang={lang} leftText={t.gameLeft} overText={t.gameOver} />
          </div>
        )}
        <div className="board" style={{ gridTemplateColumns: `repeat(${game.cats.length},minmax(0,var(--colmax)))`, ['--cols' as string]: game.cats.length, minWidth: 0 }}>
          {game.cats.map((c, i) => {
            const [main, sub] = lang === 'ar' && c.nameAr ? [c.nameAr, c.name] : [c.name, c.nameAr]
            return (
              <div className="cat" key={'h' + i}>
                <CatIcon id={c.id} />
                <span className="main" style={{ ['--w' as string]: Math.max(...main.split(/\s+/).map((w) => w.length)) }}>
                  {main}
                </span>
                {sub && <span className="sub">{sub}</span>}
              </div>
            )
          })}
          {VALUES.map((v, l) =>
            game.cats.map((_, i) => {
              const used = game.used.includes(tileKey(i, l))
              const active = live && live.c === i && live.l === l
              return (
                <div key={tileKey(i, l)} className={`tile${used ? ' used static' : ''}${active ? ' aud-active' : ''}`} data-aud-tile={tileKey(i, l)} data-used={used || undefined}>
                  <span className="med" />
                  <span className="v">{num(v, lang)}</span>
                </div>
              )
            }),
          )}
        </div>
        {teamChips(game, behind)}
        {behind.length > 0 && (
          <p className="comeback" data-testid="audience-comeback">
            <span className="pill">{t.comebackLabel}</span> {behind.map((i) => game.teams[i].name).join(' · ')} {t.picksNext}
          </p>
        )}
      </section>
      {clue && cat && (
        <div className="aud-clue" data-testid="audience-clue" key={tileKey(live!.c, live!.l)}>
          <div className={`aud-card${clue.golden ? ' golden' : ''}${cat.respect ? ' calm' : ''}`}>
            <div className="meta">
              <span className="meta-cat"><CatIcon id={cat.id} />{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</span>
              <span className="row">
                {clue.golden && <span className="pill g">{t.golden}</span>}
                {clue.special === 'steal' && <span className="pill steal">{t.steal}</span>}
                {clue.special === 'crowd' && <span className="pill crowd">{t.crowd}</span>}
                <span className="pill">{num(clue.value, lang)}</span>
              </span>
            </div>
            {clue.special && <p className={`special-note ${clue.special}`}>{clue.special === 'steal' ? t.stealHelp : t.crowdHelp}</p>}
            <p className="q" dir="auto" data-len={qLen(lang === 'ar' && clue.qAr ? clue.qAr : clue.q)} data-testid="audience-question">
              {lang === 'ar' && clue.qAr ? clue.qAr : clue.q}
            </p>
            {clue.img && (
            <div className="q-fig">
              <img className="q-img" src={diagramSrc(clue.img)} alt={t.diagramAlt} data-testid="audience-img" />
            </div>
          )}
            {live!.revealed ? (
              <div className="answer show" dir="auto" data-len={(lang === 'ar' && clue.aAr ? clue.aAr : clue.a).length > 60 ? 'l' : undefined} data-testid="audience-answer">
                {lang === 'ar' && clue.aAr ? clue.aAr : clue.a}
                <Source t={t} q={clue} />
              </div>
            ) : (
              <div className="answer aud-hidden" aria-hidden="true" />
            )}
            {clueSeconds(game.settings, live!.l, clue) > 0 && <TimerBar clock={live!.clock ?? null} total={clueSeconds(game.settings, live!.l, clue)} lang={lang} timeUpText={t.timeUp} big />}
          </div>
        </div>
      )}
    </main>
  )
}
