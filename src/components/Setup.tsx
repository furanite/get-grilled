import { useState } from 'react'
import type { Category, CategorySummary, Game, Lang, PackGroup } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num, qCount } from "../lib/i18n"
import { createGame, isPlayable } from '../lib/game'
import { loadPack } from '../lib/packs'
import { loadUsed, saveUsed } from '../lib/store'
import { CatIcon } from './Brand'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  indexError: string
  custom: Category[]
  onBack: () => void
  onStart: (g: Game) => void
}

type CollectionId = 'university' | 'islamic' | 'kids'
const COLLECTIONS: { id: CollectionId; groups: PackGroup[] }[] = [
  { id: 'university', groups: ['engineering', 'cces', 'general'] },
  { id: 'islamic', groups: ['quran', 'hadith', 'aqidah', 'fiqh', 'prophets', 'arabic', 'tazkiyah', 'islamichistory'] },
  { id: 'kids', groups: ['kids'] },
]
const collectionOf = (g: PackGroup) => COLLECTIONS.find((c) => c.groups.includes(g))?.id ?? 'university'

const DEFAULT_TEAMS = { en: ['Team 1', 'Team 2', 'Team 3'], ar: ['الفريق ١', 'الفريق ٢', 'الفريق ٣'] }

export default function Setup({ t, lang, index, indexError, custom, onBack, onStart }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [closed, setClosed] = useState<PackGroup[]>([])
  const [coll, setColl] = useState<CollectionId>('university')
  const [teams, setTeams] = useState<string[]>(DEFAULT_TEAMS[lang])
  const [timer, setTimer] = useState(30)
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
      const cats = await Promise.all(picked.map((id) => custom.find((c) => c.id === id) ?? loadPack(id)))
      const bad = cats.find((c) => !isPlayable(c))
      if (bad) throw new Error(`“${bad.name}” ${t.incomplete}`)
      const { game, used } = createGame(cats, teams, { timer, deduct, golden }, loadUsed())
      saveUsed(used)
      onStart(game)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const card = (c: CategorySummary, i: number) => {
    const order = picked.indexOf(c.id)
    const playable = c.counts.length === 5 && c.counts.every((n) => n > 0)
    return (
      <button key={c.id} className="cat-pick" aria-pressed={order >= 0} disabled={!playable || (order < 0 && picked.length >= 6)} onClick={() => toggle(c.id)} style={{ ['--d' as string]: `${i * 40}ms` }} data-cat={c.id}>
        <CatIcon id={c.id} />
        <b>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</b>
        {c.nameAr && <small lang={lang === 'ar' ? 'en' : 'ar'}>{lang === 'ar' ? c.name : c.nameAr}</small>}
        <small>
          {playable ? qCount(total(c), lang) : t.incomplete}
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
            const groupName: Record<PackGroup, string> = {
              engineering: t.groupEngineering, cces: t.groupCces, general: t.groupGeneral,
              quran: t.groupQuran, hadith: t.groupHadith, aqidah: t.groupAqidah, fiqh: t.groupFiqh, prophets: t.groupProphets,
              arabic: t.groupArabic, tazkiyah: t.groupTazkiyah, islamichistory: t.groupIslamicHistory, kids: t.groupKids,
            }
            const collName: Record<CollectionId, string> = { university: t.collUniversity, islamic: t.collIslamic, kids: t.collKids }
            const groupOf = (c: CategorySummary): PackGroup => c.group ?? 'general'
            const present = COLLECTIONS.filter((col) => index.some((c) => col.groups.includes(groupOf(c))))
            const active = present.some((col) => col.id === coll) ? coll : (present[0]?.id ?? 'university')
            let n = 0
            const groups = COLLECTIONS.find((col) => col.id === active)!.groups
            const sections = groups.map((g) => [g, index.filter((c) => groupOf(c) === g)] as const).filter(([, list]) => list.length > 0)
            const tabs = present.length > 1 && (
              <div className="coll-tabs" role="group" aria-label={t.collections}>
                {present.map((col) => {
                  const k = index.filter((c) => picked.includes(c.id) && collectionOf(groupOf(c)) === col.id).length
                  return (
                    <button key={col.id} aria-pressed={col.id === active} data-coll={col.id} onClick={() => setColl(col.id)}>
                      {collName[col.id]}
                      {k > 0 && <span className="n">{num(k, lang)}</span>}
                    </button>
                  )
                })}
              </div>
            )
            return [tabs, ...sections.map(([g, list]) => (
              <details className="cat-group" key={g} data-group={g} open={!closed.includes(g)} onToggle={(e) => {
                const open = (e.currentTarget as HTMLDetailsElement).open
                setClosed((cur) => (open ? cur.filter((x) => x !== g) : cur.includes(g) ? cur : [...cur, g]))
              }}>
                <summary className="group-title">
                  <span>
                    <CatIcon id={g} className="cat-icon group-icon" />
                    {groupName[g]}
                  </span>
                  <span className="group-count">
                    {(() => {
                      const k = list.filter((c) => picked.includes(c.id)).length
                      return k > 0 ? `${num(k, lang)} ${t.groupPicked}` : num(list.length, lang)
                    })()}
                  </span>
                </summary>
                <div className="cat-grid">{list.map((c) => card(c, n++))}</div>
              </details>
            ))]
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
            {[0, 15, 20, 30, 45, 60].map((s) => (
              <option key={s} value={s}>
                {s === 0 ? (lang === 'ar' ? 'بدون مؤقت' : 'No timer') : num(s, lang)}
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
