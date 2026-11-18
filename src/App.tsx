import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Category, CategorySummary, Game, Lang, PoolEdit, Screen, ThemeId } from './lib/types'
import { hasConsent, loadCustom, loadGame, loadPools, loadSettings, saveCustom, saveGame, savePools, saveSettings, saveTipsSeen, tipsSeen } from './lib/store'
import { INTRO_MS, enterRound, finishIntro, isEmptyPool, nextRound, nextStage } from './lib/game'
import { setSoundEnabled, sfx, unlockAudio } from './lib/sound'
import { CONSENT_TEXT, LEGAL } from './lib/legal'
import { ConsentDialog, Footer, LegalViewer } from './components/Legal'
import { RulesDialog, TipsDialog } from './components/Guide'
import Review from './components/Review'
import { DEFAULT_THEME, THEMES, themeOpen } from './lib/themes'
import { loadIndex } from './lib/packs'
import { reducedMotion, startBackground } from './lib/fx'
import { STRINGS } from './lib/i18n'
import Home from './components/Home'
import Setup from './components/Setup'
import Board from './components/Board'
import TeamIntro from './components/TeamIntro'
import Results from './components/Results'
import { Final, Lightning, ModeRound } from './components/Rounds'
import Builder from './components/Builder'
import { RoundIntro } from './components/Tournament'
import type { VoteState } from './components/Vote'
import StudyMaker from './components/StudyMaker'
import { AudienceScreen, useAudienceWindow } from './components/Audience'
import { APP_NAME, HOST_EDITION, appName, type Live } from './lib/edition'
import { setFavicon } from './lib/favicon'
import { Mark } from './components/Brand'
import { HostLink } from './components/HostLink'
import { BuzzButton } from './components/Buzzers'
import { DevicesButton, SignOut, isLiveServer, useHostAudience, usePublisher } from './components/LiveHost'

export default function App() {
  const initial = useMemo(loadSettings, [])
  const [theme, setThemeState] = useState<ThemeId>(!themeOpen(initial.theme) || !THEMES.some((th) => th.id === initial.theme) ? DEFAULT_THEME : initial.theme)
  const [lang, setLang] = useState<Lang>(initial.lang)
  const [reduceFx, setReduceFx] = useState<boolean>(!!initial.reduceFx)
  const [sound, setSound] = useState<boolean>(initial.sound)
  const [pools, setPoolsState] = useState<Record<string, PoolEdit>>(loadPools)
  const [consented, setConsented] = useState(() => hasConsent(LEGAL.termsVersion))
  // Study tips show once to first-time visitors, after the Terms; the Rules button opens the rules.
  const [guide, setGuide] = useState<'tips' | 'rules' | null>(() => (tipsSeen() ? null : 'tips'))
  const closeGuide = () => {
    if (guide === 'tips') saveTipsSeen()
    setGuide(null)
  }
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null)
  // #review opens the Scholar review page directly (a link the owner can send to scholars).
  const [screen, setScreen] = useState<Screen>(() => (location.hash === '#review' ? 'review' : 'home'))
  const [custom, setCustomState] = useState<Category[]>(loadCustom)
  const [index, setIndex] = useState<CategorySummary[] | null>(null)
  const [indexError, setIndexError] = useState('')
  const [game, setGameState] = useState<Game | null>(loadGame)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [vote, setVote] = useState<VoteState | null>(null)
  const audience = useAudienceWindow(APP_NAME)
  const themeRef = useRef(theme)
  const t = STRINGS[lang]
  const liveHost = HOST_EDITION && isLiveServer()
  // On the Pi: send the projector and team tablets what the room may see.
  const crowd = useHostAudience()
  usePublisher({ screen, game, live: screen === 'game' ? live : null, vote: screen === 'setup' ? vote : null, theme, lang, reduceFx, audience: crowd }, liveHost)
  const inGame = screen === 'intro' || screen === 'game' || screen === 'mode' || screen === 'lightning' || screen === 'final' || screen === 'round'

  useEffect(() => {
    loadIndex().then(setIndex).catch((e: Error) => setIndexError(e.message))
  }, [])

  useEffect(() => {
    themeRef.current = theme
    document.documentElement.dataset.theme = theme
    setFavicon(document, theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
    saveSettings({ theme, lang, reduceFx, sound })
  }, [theme, lang, reduceFx, sound])

  useEffect(() => setSoundEnabled(sound), [sound])
  // Browsers allow sound only after the person interacts with the page.
  useEffect(() => {
    const go = () => unlockAudio()
    addEventListener('pointerdown', go, true)
    addEventListener('keydown', go, true)
    return () => {
      removeEventListener('pointerdown', go, true)
      removeEventListener('keydown', go, true)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  // Leave the Heritage theme when Friday afternoon ends, but never in the middle of a game.
  useEffect(() => {
    const id = setInterval(() => {
      if (!themeOpen(themeRef.current) && !inGame) setThemeState(DEFAULT_THEME)
    }, 30_000)
    return () => clearInterval(id)
  }, [screen])

  // Reduce effects: CSS stops animations, and the background is drawn once and left still.
  useLayoutEffect(() => {
    document.documentElement.dataset.reduceFx = reduceFx ? 'on' : 'off'
  }, [reduceFx])

  useEffect(() => {
    const canvas = document.getElementById('bg') as HTMLCanvasElement | null
    if (!canvas) return
    return startBackground(canvas, () => themeRef.current)
  }, [reduceFx])

  /** After the board, the special round, the lightning round, then the final question, then the results (each only if the game has it). */
  const goNext = (after: 'board' | 'mode' | 'lightning' | 'final') => {
    // A tournament goes round by round, with a title card before each one.
    if (game?.tournament) {
      const k = nextRound(game)
      if (k === null) return setScreen('results')
      setGame((g) => enterRound(g, k))
      return setScreen('round')
    }
    const nx = game ? nextStage(game, after) : null
    if (nx) {
      setGame((g) => ({ ...g, stage: nx }))
      setScreen(nx === 'mode' ? 'mode' : nx === 'lightning' ? 'lightning' : 'final')
    } else setScreen('results')
  }
  const stageScreen = (g: Game): Screen => (g.intro ? 'intro' : g.tournament?.intro ? 'round' : g.stage === 'mode' ? 'mode' : g.stage === 'lightning' ? 'lightning' : g.stage === 'final' ? 'final' : 'game')

  const notify = useCallback((text: string) => setToast({ text, id: Date.now() }), [])

  const setTheme = (next: ThemeId, e?: { clientX: number; clientY: number }) => {
    if (next === theme) return
    if (!themeOpen(next)) return
    if (reducedMotion()) return setThemeState(next)
    const x = e?.clientX ?? innerWidth / 2
    const y = e?.clientY ?? innerHeight / 2
    const w = document.createElement('div')
    w.className = 'wipe'
    document.documentElement.dataset.theme = next
    const cs = getComputedStyle(document.documentElement)
    w.style.background = `radial-gradient(circle at ${x}px ${y}px,${cs.getPropertyValue('--accent')} 0,${cs.getPropertyValue('--bg2')} 18%,${cs.getPropertyValue('--bg')} 60%)`
    document.documentElement.dataset.theme = theme
    document.body.appendChild(w)
    const grow = w.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150vmax at ${x}px ${y}px)` }], { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' })
    grow.onfinish = () => {
      setThemeState(next)
      const fade = w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' })
      fade.onfinish = () => w.remove()
    }
  }

  const setCustom = (cats: Category[]) => {
    setCustomState(cats)
    if (!saveCustom(cats)) notify(t.storageFull)
  }

  const setPool = (id: string, edit: PoolEdit | null) => {
    setPoolsState((prev) => {
      const next = { ...prev }
      if (!edit || isEmptyPool(edit)) delete next[id]
      else next[id] = edit
      if (!savePools(next)) notify(t.storageFull)
      return next
    })
  }

  const setGame = useCallback((u: Game | null | ((g: Game) => Game)) => {
    setGameState((prev) => {
      const next = typeof u === 'function' ? (prev ? u(prev) : prev) : u
      saveGame(next)
      return next
    })
  }, [])

  return (
    <>
      <canvas id="bg" aria-hidden="true" />
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <button className="brand" onClick={() => setScreen('home')} aria-label={t.home}>
              <Mark theme={theme} className="brand-mark" />
              <span className="brand-word">{appName(lang)}</span>
            </button>
            <div className="row">
              {screen === 'home' && (
                <button className="btn" onClick={() => setGuide('rules')} data-testid="rules-btn">
                  Rules
                </button>
              )}
              {HOST_EDITION && (
                <button
                  className={audience.isOpen ? 'ghost' : 'btn'}
                  data-testid="audience-toggle"
                  aria-pressed={audience.isOpen}
                  onClick={() => {
                    if (audience.isOpen) audience.close()
                    else if (!audience.open()) notify(t.audienceBlocked)
                  }}
                >
                  {audience.isOpen ? t.audienceClose : t.audienceOpen}
                </button>
              )}
              {!HOST_EDITION && <HostLink lang={lang} />}
              <BuzzButton t={t} lang={lang} teams={game?.teams ?? []} />
              {liveHost && <DevicesButton t={t} lang={lang} game={game} />}
              {liveHost && <SignOut t={t} />}
              {inGame && (
                <button
                  className="ghost"
                  onClick={() => {
                    document.documentElement.requestFullscreen?.().catch(() => {})
                  }}
                >
                  {t.fullscreen}
                </button>
              )}
              <button className="ghost sound-btn" aria-pressed={!sound} aria-label={sound ? t.soundOn : t.soundOff} title={sound ? t.soundOn : t.soundOff} onClick={() => setSound(!sound)} data-testid="sound">
                <span aria-hidden="true">{sound ? '🔊' : '🔇'}</span>
              </button>
              <button className="ghost" aria-pressed={reduceFx} onClick={() => setReduceFx(!reduceFx)} data-testid="reduce-fx">
                {CONSENT_TEXT[lang].reduceFx}
              </button>
              <button className="ghost" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} lang={lang === 'en' ? 'ar' : 'en'}>
                {t.language}
              </button>
            </div>
          </header>

          {screen === 'home' && (
            <Home t={t} lang={lang} theme={theme} setTheme={setTheme} hasGame={!!game} onNew={() => setScreen('setup')} onResume={() => game && setScreen(stageScreen(game))} onBuilder={() => setScreen('builder')} onStudy={() => setScreen('study')} onReview={() => setScreen('review')} />
          )}
          {screen === 'setup' && (
            <Setup
              t={t}
              lang={lang}
              index={index}
              indexError={indexError}
              custom={custom}
              pools={pools}
              onBack={() => setScreen('home')}
              onVote={setVote}
              onStart={(g) => {
                setGame(g)
                setScreen(g.intro ? 'intro' : g.tournament ? 'round' : 'game')
              }}
            />
          )}
          {screen === 'intro' && game?.intro && (
            <IntroScreen game={game} setGame={setGame} theme={theme} t={t} lang={lang} onStart={() => {
              setGame((g) => finishIntro(g))
              setScreen(game.tournament ? 'round' : 'game')
            }} />
          )}
          {screen === 'game' && game && (
            <Board
              t={t}
              lang={lang}
              game={game}
              setGame={setGame}
              onEnd={() => goNext('board')}
              onLive={HOST_EDITION ? setLive : undefined}
            />
          )}
          {screen === 'round' && game?.tournament && (
            <RoundIntro
              t={t}
              lang={lang}
              game={game}
              onGo={() => {
                const g = { ...game, tournament: { ...game.tournament!, intro: false } }
                setGame(g)
                setScreen(stageScreen(g))
              }}
            />
          )}
          {screen === 'mode' && game && <ModeRound t={t} lang={lang} game={game} setGame={setGame} onDone={() => goNext('mode')} hasFinal={game.tournament ? nextRound(game) !== null : !!nextStage(game, 'mode')} />}
          {screen === 'lightning' && game && <Lightning t={t} lang={lang} game={game} setGame={setGame} onDone={() => goNext('lightning')} hasFinal={game.tournament ? nextRound(game) !== null : !!nextStage(game, 'lightning')} />}
          {screen === 'final' && game && <Final t={t} lang={lang} game={game} setGame={setGame} onDone={() => goNext('final')} />}
          {screen === 'results' && game && (
            <Results
              t={t}
              lang={lang}
              game={game}
              onAgain={() => {
                setGame(null)
                setScreen('setup')
              }}
              onHome={() => {
                setGame(null)
                setScreen('home')
              }}
            />
          )}
          {screen === 'review' && <Review lang={lang} notify={notify} onBack={() => setScreen('home')} />}
          {screen === 'builder' && <Builder t={t} lang={lang} index={index} custom={custom} setCustom={setCustom} pools={pools} setPool={setPool} notify={notify} onBack={() => setScreen('home')} />}
          {screen === 'study' && <StudyMaker custom={custom} setCustom={setCustom} notify={notify} onBack={() => setScreen('home')} onPlay={() => setScreen('setup')} />}
          <Footer lang={lang} onOpen={setLegalView} />
        </div>
      </div>
      {!consented && <ConsentDialog lang={lang} setLang={setLang} reduceFx={reduceFx} setReduceFx={setReduceFx} onAccept={() => setConsented(true)} />}
      {consented && !legalView && screen === 'home' && guide === 'tips' && (
        <TipsDialog
          onClose={closeGuide}
          onOpenFiles={() => {
            closeGuide()
            setScreen('study')
          }}
        />
      )}
      {consented && !legalView && guide === 'rules' && <RulesDialog onClose={closeGuide} onTips={() => setGuide('tips')} />}
      {consented && legalView && <LegalViewer which={legalView} lang={lang} onClose={() => setLegalView(null)} />}
      {HOST_EDITION && audience.win && audience.root && (
        <AudienceScreen win={audience.win} root={audience.root} t={t} lang={lang} theme={theme} reduceFx={reduceFx} screen={screen} game={game} live={screen === 'game' ? live : null} vote={screen === 'setup' ? vote : null} />
      )}
      {toast && (
        <div className="toast" key={toast.id} role="status" onAnimationEnd={() => setToast(null)}>
          {toast.text}
        </div>
      )}
    </>
  )
}

/** The host's introductions screen: moves to the next team by itself unless the host pauses it. */
function IntroScreen({ game, setGame, theme, t, lang, onStart }: { game: Game; setGame: (u: (g: Game) => Game) => void; theme: ThemeId; t: (typeof STRINGS)['en']; lang: Lang; onStart: () => void }) {
  const intro = game.intro!
  const n = game.teams.length
  const step = (i: number) => setGame((g) => (g.intro ? { ...g, intro: { ...g.intro, i: Math.min(i, n) } } : g))
  useEffect(() => {
    if (!intro.auto || intro.i >= n) return
    const id = setTimeout(() => step(intro.i + 1), INTRO_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro.i, intro.auto, n])
  // Each team's introduction gets its daff cue as it appears.
  useEffect(() => {
    if (intro.i < n) sfx.teamIntro(intro.i, game.teams[intro.i]?.members?.length ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro.i, n])
  return (
    <main className="intro-screen">
      <TeamIntro
        game={game}
        theme={theme}
        t={t}
        lang={lang}
        host
        onNext={() => step(intro.i + 1)}
        onSkip={() => step(n)}
        onAuto={(auto) => setGame((g) => (g.intro ? { ...g, intro: { ...g.intro, auto } } : g))}
        onStart={onStart}
      />
      {intro.i >= n && (
        <button className="ghost" style={{ alignSelf: 'center' }} onClick={() => step(0)} data-testid="teams-replay">
          {t.intro.replay}
        </button>
      )}
    </main>
  )
}
