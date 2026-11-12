import { useState } from 'react'
import { CatIcon } from './Brand'
import type { Category, CategorySummary, Game, Lang, PackGroup, PoolEdit } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num, qCount } from "../lib/i18n"
import { CLUE_SECS, GAME_MINUTES, applyPool, createGame, isPlayable, poolCounts } from '../lib/game'
import { sfx } from '../lib/sound'
import { loadPack } from '../lib/packs'
import { loadUsed, saveUsed } from '../lib/store'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  indexError: string
  custom: Category[]
  pools: Record<string, PoolEdit>
  onBack: () => void
  onStart: (g: Game) => void
}

const GROUP_ORDER: PackGroup[] = ['engineering', 'cces', 'general']

const DEFAULT_TEAMS = { en: ['Team 1', 'Team 2', 'Team 3'], ar: ['الفريق ١', 'الفريق ٢', 'الفريق ٣'] }

export default function Setup({ t, lang, index, indexError, custom, pools, onBack, onStart }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [closed, setClosed] = useState<PackGroup[]>([])
  const [teams, setTeams] = useState<string[]>(DEFAULT_TEAMS[lang])
  const [timer, setTimer] = useState(30)
  const [levelTimers, setLevelTimers] = useState<(number | null)[]>([null, null, null, null, null])
  const [gameMinutes, setGameMinutes] = useState(0)
  const [golden, setGolden] = useState(1)
  const [deduct, setDeduct] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    setError('')
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 6 ? p : [...p, id]))
  }

  const total = (c: { counts: number[] }) => c.counts.reduce((a, b) => a + b, 0)
  const customSummaries: CategorySummary[] = custom.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, builtIn: false, counts: c.levels.map((l) => l.length) }))

  const start = async () => {
    if (picked.length === 0) return setError(t.needCats)
    if (teams.some((n) => !n.trim())) return setError(t.needTeams)
    setBusy(true)
    try {
      const cats = (await Promise.all(picked.map((id) => custom.find((c) => c.id === id) ?? loadPack(id)))).map((c) => applyPool(c, pools[c.id]))
      const bad = cats.find((c) => !isPlayable(c))
      if (bad) throw new Error(`“${bad.name}” ${t.incomplete}`)
      const { game, used } = createGame(cats, teams, { timer, deduct, golden, levelTimers, gameMinutes }, loadUsed())
      saveUsed(used)
      sfx.start()
      onStart(game)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const card = (c: CategorySummary, i: number) => {
    const order = picked.indexOf(c.id)
    const counts = poolCounts(c.counts, pools[c.id])
    const playable = counts.length === 5 && counts.every((n) => n > 0)
    return (
      <button key={c.id} className="cat-pick" aria-pressed={order >= 0} disabled={!playable || (order < 0 && picked.length >= 6)} onClick={() => toggle(c.id)} style={{ ['--d' as string]: `${i * 40}ms` }} data-cat={c.id}>
        <CatIcon id={c.builtIn ? c.id : 'custom'} />
        <b>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</b>
        {c.nameAr && <small lang={lang === 'ar' ? 'en' : 'ar'}>{lang === 'ar' ? c.name : c.nameAr}</small>}
        <small>
          {playable ? qCount(total({ counts }), lang) : t.incomplete}
        </small>
        {order >= 0 && <span className="order">{num(order + 1, lang)}</span>}
      </button>
    )
  }

  return (
    <main className="setup">
      <section className="panel stack">
        <h2>{t.setupTitle}</h2>
        <span className="label">
          {t.pickCats} · {num(picked.length, lang)}/{num(6, lang)}
        </span>
        <span className="label">{t.builtIn}</span>
        {indexError && <p className="err">{indexError}</p>}
        {!index && !indexError && <p className="muted">{t.loading}</p>}
        {index &&
          (() => {
            const groupName = { engineering: t.groupEngineering, cces: t.groupCces, general: t.groupGeneral }
            let n = 0
            const sections = GROUP_ORDER.map((g) => [g, index.filter((c) => (c.group ?? 'general') === g)] as const).filter(([, list]) => list.length > 0)
            return sections.map(([g, list]) => (
              <details className="cat-group" key={g} data-group={g} open={!closed.includes(g)} onToggle={(e) => {
                const open = (e.currentTarget as HTMLDetailsElement).open
                setClosed((cur) => (open ? cur.filter((x) => x !== g) : cur.includes(g) ? cur : [...cur, g]))
              }}>
                <summary className="group-title">
                  <span>{groupName[g]}</span>
                  <span className="group-count">
                    {(() => {
                      const k = list.filter((c) => picked.includes(c.id)).length
                      return k > 0 ? `${num(k, lang)} ${t.groupPicked}` : num(list.length, lang)
                    })()}
                  </span>
                </summary>
                <div className="cat-grid">{list.map((c) => card(c, n++))}</div>
              </details>
            ))
          })()}
        {customSummaries.length > 0 && (
          <>
            <span className="label">{t.custom}</span>
            <div className="cat-grid">{customSummaries.map(card)}</div>
          </>
        )}
      </section>
      <section className="panel stack">
        <span className="label">{t.teams}</span>
        {teams.map((name, i) => (
          <div className="team-row" key={i}>
            <input className="input" id={`team-${i}`} value={name} maxLength={24} aria-label={`${t.teams} ${i + 1}`} onChange={(e) => setTeams(teams.map((n, j) => (j === i ? e.target.value : n)))} />
            {teams.length > 2 && (
              <button className="mini" onClick={() => setTeams(teams.filter((_, j) => j !== i))}>
                {t.remove}
              </button>
            )}
          </div>
        ))}
        {teams.length < 4 && (
          <button className="ghost" style={{ alignSelf: 'start' }} onClick={() => setTeams([...teams, `${lang === 'ar' ? 'الفريق' : 'Team'} ${num(teams.length + 1, lang)}`])}>
            + {t.addTeam}
          </button>
        )}
        <label className="field">
          <span className="label">{t.timer}</span>
          <select className="input" id="timer" value={timer} onChange={(e) => setTimer(+e.target.value)}>
            {[0, ...CLUE_SECS].map((s) => (
              <option key={s} value={s}>
                {s === 0 ? t.noTimer : num(s, lang)}
              </option>
            ))}
          </select>
        </label>
        <details className="level-times" open={levelTimers.some((x) => x !== null)} data-testid="level-times">
          <summary>{t.levelTimes}</summary>
          <p className="muted" style={{ margin: '6px 0 8px', fontSize: 13 }}>
            {t.levelTimesHelp}
          </p>
          <div className="level-times-grid">
            {VALUES.map((v, i) => (
              <label key={v} className="field">
                <span className="label">{num(v, lang)}</span>
                <select
                  className="input"
                  id={`level-timer-${i}`}
                  value={levelTimers[i] ?? ''}
                  onChange={(e) => setLevelTimers(levelTimers.map((x, j) => (j === i ? (e.target.value ? +e.target.value : null) : x)))}
                >
                  <option value="">{t.sameAsAbove}</option>
                  {CLUE_SECS.map((s) => (
                    <option key={s} value={s}>
                      {num(s, lang)} {t.secsShort}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </details>
        <label className="field">
          <span className="label">{t.gameLength}</span>
          <select className="input" id="game-minutes" value={gameMinutes} onChange={(e) => setGameMinutes(+e.target.value)}>
            {[0, ...GAME_MINUTES].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? t.noLimit : `${num(m, lang)} ${t.minutes}`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">{t.goldenTiles}</span>
          <select className="input" id="golden" value={golden} onChange={(e) => setGolden(+e.target.value)}>
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {num(n, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" id="deduct" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} />
          {t.deduct}
        </label>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <button className="btn big" onClick={start} disabled={busy} data-testid="start">
            {busy ? t.loading : t.start}
          </button>
          <button className="btn alt" onClick={onBack}>
            {t.back}
          </button>
        </div>
      </section>
    </main>
  )
}
