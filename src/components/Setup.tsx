import { useEffect, useState } from 'react'
import { CatIcon } from './Brand'
import { catIconSvg as islamicIconSvg } from '../lib/islamic'
import { ISLAMIC_SET } from '../lib/edition'
import type { Category, CategorySummary, Game, Lang, Madhhab, PackGroup, PoolEdit } from '../lib/types'
import { nightIconId } from '../lib/caticons'
import type { RoundMode, TourStep } from '../lib/types'
import { ROUND_MODES, VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num, qCount } from "../lib/i18n"
import { applyPool, boardRounds, cleanPlan, CLUE_SECS, createGame, createTournament, FACT_MAX, filterMadhhab, GAME_MINUTES, isPlayable, MAX_MEMBERS, MEMBER_MAX, MODE_COUNT, poolCounts, ROLE_MAX, splitCategories, TOUR_MAX_CATS, TOUR_MAX_ROUNDS, TOUR_PLANS, withIntro, type TeamDetails } from '../lib/game'
import { Vote, type VoteCat, type VoteState } from './Vote'
import { roundTitle } from './Tournament'
import { sfx } from '../lib/sound'
import { loadNights, loadPack, type Night } from '../lib/packs'
import { loadMadhhab, loadUsed, saveMadhhab, saveUsed } from '../lib/store'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  indexError: string
  custom: Category[]
  pools: Record<string, PoolEdit>
  onBack: () => void
  onStart: (g: Game) => void
  /** The category vote as it goes, for the audience window (null when there is none) */
  onVote?: (v: VoteState | null) => void
}

type CollectionId = 'university' | 'islamic' | 'kids'
const COLLECTIONS: { id: CollectionId; groups: PackGroup[] }[] = [
  { id: 'university', groups: ['engineering', 'cces', 'general'] },
  { id: 'islamic', groups: ['quran', 'hadith', 'aqidah', 'fiqh', 'prophets', 'arabic', 'tazkiyah', 'islamichistory', 'nasheed'] },
  { id: 'kids', groups: ['kids'] },
]
const collectionOf = (g: PackGroup) => COLLECTIONS.find((c) => c.groups.includes(g))?.id ?? 'university'
/** Most categories a vote's shortlist may hold. */
const VOTE_MAX = 18

/** A plan's special rounds, swapped for ones the categories can fill (or dropped when none can). */
function fitPlan(plan: TourStep[], offered: RoundMode[]): TourStep[] {
  const taken = new Set<RoundMode>()
  const out: TourStep[] = []
  for (const r of plan) {
    if (r.kind !== 'mode') {
      out.push(r)
      continue
    }
    const m = r.mode && offered.includes(r.mode) && !taken.has(r.mode) ? r.mode : offered.find((x) => !taken.has(x))
    if (!m) continue
    taken.add(m)
    out.push({ kind: 'mode', mode: m })
  }
  return out
}

/** A round as one select value: "board", "double", "lightning", "final" or "mode:picture" and so on. */
const stepKey = (r: TourStep) => (r.kind === 'mode' ? `mode:${r.mode}` : r.kind)
const keyStep = (k: string): TourStep => (k.startsWith('mode:') ? { kind: 'mode', mode: k.slice(5) as RoundMode } : { kind: k as TourStep['kind'] })

const DEFAULT_TEAMS = { en: ['Team 1', 'Team 2', 'Team 3'], ar: ['الفريق ١', 'الفريق ٢', 'الفريق ٣'] }


const blankDetails = (): TeamDetails => ({ members: Array.from({ length: 4 }, () => ({ name: '', role: '' })), captain: null, fact: '' })
const noop = () => {}

const NIGHTS_OPEN_KEY = 'gg.nightsOpen.v1'
/** A themed night's icon: its honorific sign (Blessed Mawlid Night shows ﷺ), the Islamic line icon (isl-night-<id> in
 * src/lib/islamic.ts) on the Islamic site, or the Get Grilled drawing (night-<id> in src/lib/caticons.ts). */
function NightIcon({ n }: { n: Night }) {
  if (n.sign)
    return (
      <span className="night-sign" aria-hidden="true">
        {n.sign}
      </span>
    )
  const isl = `isl-night-${n.id}`
  return <CatIcon id={ISLAMIC_SET && islamicIconSvg(isl) ? isl : nightIconId(n.id)} />
}

export default function Setup({ t, lang, index, indexError, custom, pools, onBack, onStart, onVote }: Props) {
  const [tour, setTour] = useState(false)
  const [planKey, setPlanKey] = useState<'short' | 'full' | 'custom'>('full')
  const [customPlan, setCustomPlan] = useState<TourStep[] | null>(null)
  const [vote, setVote] = useState(false)
  const [voting, setVoting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [closed, setClosed] = useState<PackGroup[]>([])
  const [coll, setColl] = useState<CollectionId>('university')
  const [teams, setTeams] = useState<string[]>(DEFAULT_TEAMS[lang])
  const [introOn, setIntroOn] = useState(false)
  const [details, setDetails] = useState<TeamDetails[]>(() => DEFAULT_TEAMS[lang].map(blankDetails))
  const editDetails = (i: number, f: (d: TeamDetails) => TeamDetails) => setDetails((all) => all.map((d, j) => (j === i ? f(d) : d)))
  const [timer, setTimer] = useState(30)
  const [levelTimers, setLevelTimers] = useState<(number | null)[]>([null, null, null, null, null])
  const [gameMinutes, setGameMinutes] = useState(0)
  const [golden, setGolden] = useState(1)
  const [deduct, setDeduct] = useState(true)
  const [madhhab, setMadhhab] = useState<Madhhab>(loadMadhhab)
  const [extras, setExtras] = useState(true)
  const [steal, setSteal] = useState(1)
  const [crowd, setCrowd] = useState(1)
  const [streak, setStreak] = useState(true)
  const [comeback, setComeback] = useState(true)
  const [lightning, setLightning] = useState(true)
  const [final, setFinal] = useState(true)
  const [mode, setMode] = useState<RoundMode | ''>('')
  const [nights, setNights] = useState<Night[]>([])
  const [night, setNight] = useState<string | null>(null)
  const [nightNote, setNightNote] = useState('')
  // The themed nights list folds away; whether it is open is remembered on this device.
  const [nightsOpen, setNightsOpen] = useState(() => {
    try { return localStorage.getItem(NIGHTS_OPEN_KEY) === '1' } catch { return false }
  })
  const toggleNights = (open: boolean) => {
    setNightsOpen(open)
    try { localStorage.setItem(NIGHTS_OPEN_KEY, open ? '1' : '0') } catch { /* private mode */ }
  }
  const chosenNight = nights.find((n) => n.id === night)
  useEffect(() => {
    loadNights().then(setNights)
  }, [])

  const applyNight = (n: Night) => {
    setError('')
    setNight(n.id)
    const have = new Set([...(index ?? []).map((c) => c.id)])
    const cats = n.cats.filter((id) => have.has(id)).slice(0, 6)
    setPicked(cats)
    setNightNote(cats.length < n.cats.length ? t.nightMissing : '')
    const names = lang === 'ar' && n.teamsAr ? n.teamsAr : n.teams
    if (names) {
      setTeams(names.slice(0, 4))
      setDetails((all) => names.slice(0, 4).map((_, i) => all[i] ?? blankDetails()))
    }
    // A school night (Hanafi Night and so on) sets the school of fiqh its rulings follow.
    if (n.madhhab) {
      setMadhhab(n.madhhab)
      saveMadhhab(n.madhhab)
    }
    const x = n.extras ?? {}
    setExtras(true)
    if (x.golden !== undefined) setGolden(x.golden)
    setSteal(x.steal ?? 1)
    setCrowd(x.crowd ?? 1)
    setStreak(x.streak ?? true)
    setComeback(x.comeback ?? true)
    setLightning(x.lightning ?? true)
    setFinal(x.final ?? true)
  }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    setError('')
    setNight(null)
    setNightNote('')
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= limit ? p : [...p, id]))
  }

  const total = (c: { counts: number[] }) => c.counts.reduce((a, b) => a + b, 0)
  const customSummaries: CategorySummary[] = custom.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, builtIn: false, counts: c.levels.map((l) => l.length) }))
  const ownSummaries = customSummaries.filter((_, i) => !custom[i].set)
  // Categories from an instructor's question file sit together under the file's title, at the top so students find them.
  const studySets = [...new Map(custom.filter((c) => c.set).map((c) => [c.set!.id, c.set!.title])).entries()]

  // The school-of-fiqh choice only shows when a picked category has rulings that differ between schools.
  const usesMadhhab = picked.some((id) => index?.find((c) => c.id === id)?.group === 'fiqh' || id === 'kids-wudu-salah' || id === 'kids-calendar')

  const start = async () => {
    if (teams.some((n) => !n.trim())) return setError(t.needTeams)
    if (vote) {
      const need = teams.length + 2
      if (picked.length < need) return setError(`${t.voteNeed} ${num(need, lang)}`)
      setError('')
      return setVoting(true)
    }
    if (picked.length === 0) return setError(t.needCats)
    await build(picked)
  }

  const build = async (ids: string[]) => {
    setBusy(true)
    setError('')
    try {
      const cats = (await Promise.all(ids.map((id) => custom.find((c) => c.id === id) ?? loadPack(id)))).map((c) => filterMadhhab(applyPool(c, pools[c.id]), madhhab))
      const bad = cats.find((c) => !isPlayable(c))
      if (bad) throw new Error(`“${bad.name}” ${t.incomplete}`)
      const tiles = { timer, deduct, golden, levelTimers, gameMinutes, ...(extras ? { steal, crowd, streak, comeback } : {}) }
      let made: ReturnType<typeof createGame>
      if (tour) {
        const modes = plan.flatMap((r) => (r.kind === 'mode' && r.mode ? [r.mode] : []))
        const more = (await Promise.all(modes.map((m) => borrowFor(m, cats)))).flat().filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)
        made = createTournament(splitCategories(cats, boardRounds(plan)), teams, tiles, plan, loadUsed(), Math.random, more)
      } else {
        const fun = extras ? { lightning, final, ...(mode ? { mode } : {}) } : {}
        // A special round borrows from other built-in categories when the picked ones have too few of its items.
        const more = extras && mode ? await borrowFor(mode, cats) : []
        made = createGame(cats, teams, { ...tiles, ...fun }, loadUsed(), Math.random, more)
        sfx.start()
      }
      const { game, used } = made
      if (night) game.night = night
      saveUsed(used)
      onStart(introOn ? withIntro(game, details) : game)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /** How many items of a special round the picked categories have, from the index alone. */
  const have = (m: RoundMode, ids: string[]) =>
    ids.reduce((n, id) => {
      const c = index?.find((x) => x.id === id)
      const k = custom.find((x) => x.id === id)
      if (m === 'picture') return n + (c?.pics ?? k?.levels.flat().filter((q) => q.img).length ?? 0)
      return n + (c?.modes?.[m] ?? 0)
    }, 0)
  const borrowFor = async (m: RoundMode, cats: Category[]) => {
    if (have(m, cats.map((c) => c.id)) >= MODE_COUNT) return []
    const ids = (index ?? []).filter((c) => !cats.some((x) => x.id === c.id) && (m === 'picture' ? (c.pics ?? 0) > 0 : (c.modes?.[m] ?? 0) > 0)).map((c) => c.id)
    const pickIds = ids.sort(() => Math.random() - 0.5).slice(0, 4)
    return Promise.all(pickIds.map((id) => loadPack(id))).catch(() => [])
  }
  const offered = ROUND_MODES.filter((m) => (index ?? []).some((c) => (m === 'picture' ? (c.pics ?? 0) > 0 : (c.modes?.[m] ?? 0) > 0)))
  const borrowing = !!mode && picked.length > 0 && have(mode, picked) < MODE_COUNT
  const plan = cleanPlan(planKey === 'custom' && customPlan ? customPlan : fitPlan(TOUR_PLANS[planKey === 'custom' ? 'full' : planKey], offered))
  const limit = vote ? VOTE_MAX : tour ? Math.min(TOUR_MAX_CATS, boardRounds(plan) * 6) : 6
  const setPlan = (p: TourStep[]) => {
    setPlanKey('custom')
    setCustomPlan(p)
  }
  const roundChoices = ['board', 'double', ...offered.map((m) => `mode:${m}`), 'lightning', 'final']
  // Fewer picks allowed now (a smaller plan, or the vote or tournament turned off): drop the extra ones.
  useEffect(() => {
    setPicked((p) => (p.length > limit ? p.slice(0, limit) : p))
  }, [limit])

  if (voting) {
    const all: VoteCat[] = [...(index ?? []), ...customSummaries].filter((c) => picked.includes(c.id)).map(({ id, name, nameAr, builtIn }) => ({ id, name, nameAr, builtIn }))
    const shortlist = picked.map((id) => all.find((c) => c.id === id)).filter((c): c is VoteCat => !!c)
    return (
      <Vote
        t={t}
        lang={lang}
        cats={shortlist}
        teams={teams.map((n) => n.trim())}
        busy={busy}
        error={error}
        onChange={onVote ?? noop}
        onDone={build}
        onBack={() => {
          setError('')
          setVoting(false)
        }}
      />
    )
  }

  const card = (c: CategorySummary, i: number) => {
    const order = picked.indexOf(c.id)
    const counts = poolCounts(c.counts, pools[c.id])
    const playable = counts.length === 5 && counts.every((n) => n > 0)
    return (
      <button key={c.id} className="cat-pick" aria-pressed={order >= 0} disabled={!playable || (order < 0 && picked.length >= limit)} onClick={() => toggle(c.id)} style={{ ['--d' as string]: `${i * 40}ms` }} data-cat={c.id}>
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
          {vote ? t.pickShortlist : tour ? t.pickCatsTour : t.pickCats} · {num(picked.length, lang)}/{num(limit, lang)}
        </span>
        {studySets.map(([id, title]) => (
          <div key={id} className="stack" style={{ gap: 8 }} data-set={id}>
            <span className="label">📚 {title}</span>
            <div className="cat-grid">{customSummaries.filter((_, i) => custom[i].set?.id === id).map(card)}</div>
          </div>
        ))}
        {nights.length > 0 && index && (
          <details className="nights" data-testid="nights" open={nightsOpen} onToggle={(e) => toggleNights((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="nights-tile">
              {chosenNight ? <NightIcon n={chosenNight} /> : <CatIcon id={ISLAMIC_SET ? 'isl-nights' : 'nights'} />}
              <b>{t.nights}</b>
              <small>
                {chosenNight ? (lang === 'ar' && chosenNight.nameAr ? chosenNight.nameAr : chosenNight.name) : `${num(nights.length, lang)} ${t.nightsCount}`}
              </small>
            </summary>
            <p className="muted nights-help">{t.nightsHelp}</p>
            <div className="night-grid">
              {nights.map((n) => (
                <button key={n.id} className="night" aria-pressed={night === n.id} onClick={() => applyNight(n)} data-night={n.id}>
                  <NightIcon n={n} />
                  <b dir="auto">{lang === 'ar' && n.nameAr ? n.nameAr : n.name}</b>
                  <small dir="auto">{lang === 'ar' && n.aboutAr ? n.aboutAr : n.about}</small>
                </button>
              ))}
            </div>
            {nightNote && <p className="muted">{nightNote}</p>}
          </details>
        )}
        <span className="label">{t.builtIn}</span>
        {indexError && <p className="err">{indexError}</p>}
        {!index && !indexError && <p className="muted">{t.loading}</p>}
        {index &&
          (() => {
            const groupName: Record<PackGroup, string> = {
              engineering: t.groupEngineering, cces: t.groupCces, general: t.groupGeneral,
              quran: t.groupQuran, hadith: t.groupHadith, aqidah: t.groupAqidah, fiqh: t.groupFiqh, prophets: t.groupProphets,
              arabic: t.groupArabic, tazkiyah: t.groupTazkiyah, islamichistory: t.groupIslamicHistory, nasheed: t.groupNasheed, kids: t.groupKids,
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
        {ownSummaries.length > 0 && (
          <>
            <span className="label">{t.custom}</span>
            <div className="cat-grid">{ownSummaries.map(card)}</div>
          </>
        )}
      </section>
      <section className="panel stack">
        <span className="label">{t.teams}</span>
        {teams.map((name, i) => (
          <div className="team-row" key={i}>
            <input className="input" id={`team-${i}`} value={name} maxLength={24} aria-label={`${t.teams} ${i + 1}`} onChange={(e) => setTeams(teams.map((n, j) => (j === i ? e.target.value : n)))} />
            {teams.length > 2 && (
              <button className="mini" onClick={() => {
                setTeams(teams.filter((_, j) => j !== i))
                setDetails(details.filter((_, j) => j !== i))
              }}>
                {t.remove}
              </button>
            )}
          </div>
        ))}
        {teams.length < 4 && (
          <button className="ghost" style={{ alignSelf: 'start' }} onClick={() => {
            setTeams([...teams, `${lang === 'ar' ? 'الفريق' : 'Team'} ${num(teams.length + 1, lang)}`])
            setDetails([...details, blankDetails()])
          }}>
            + {t.addTeam}
          </button>
        )}
        <fieldset className="extras intro-setup" data-testid="teams-setup">
          <legend>
            <label className="check">
              <input type="checkbox" id="intro-on" checked={introOn} onChange={(e) => setIntroOn(e.target.checked)} />
              {t.intro.option}
            </label>
          </legend>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t.intro.help}
          </p>
          {introOn &&
            teams.map((name, i) => {
              const d = details[i] ?? blankDetails()
              return (
                <details className="intro-team" key={i} open={i === 0} data-team={i}>
                  <summary>{name.trim() || t.intro.team(num(i + 1, lang))}</summary>
                  <span className="label">{t.intro.members}</span>
                  {d.members.map((m, k) => (
                    <div className="member-row" key={k}>
                      <input className="input" id={`member-${i}-${k}`} value={m.name} maxLength={MEMBER_MAX} placeholder={`${t.intro.member} ${num(k + 1, lang)}`} aria-label={`${t.intro.member} ${k + 1}`} onChange={(e) => editDetails(i, (x) => ({ ...x, members: x.members.map((y, j) => (j === k ? { ...y, name: e.target.value } : y)) }))} />
                      <input className="input" id={`role-${i}-${k}`} value={m.role} maxLength={ROLE_MAX} placeholder={t.intro.role} aria-label={t.intro.role} onChange={(e) => editDetails(i, (x) => ({ ...x, members: x.members.map((y, j) => (j === k ? { ...y, role: e.target.value } : y)) }))} />
                      <label className="check cap-pick">
                        <input type="radio" name={`captain-${i}`} id={`captain-${i}-${k}`} checked={d.captain === k} onChange={() => editDetails(i, (x) => ({ ...x, captain: k }))} />
                        {t.intro.captain}
                      </label>
                    </div>
                  ))}
                  {d.members.length < MAX_MEMBERS && (
                    <button className="mini" style={{ alignSelf: 'start' }} onClick={() => editDetails(i, (x) => ({ ...x, members: [...x.members, { name: '', role: '' }] }))}>
                      + {t.intro.addMember}
                    </button>
                  )}
                  <label className="field">
                    <span className="label">
                      {t.intro.fact} · {num(d.fact.length, lang)}/{num(FACT_MAX, lang)}
                    </span>
                    <textarea className="input" id={`fact-${i}`} rows={2} value={d.fact} maxLength={FACT_MAX} onChange={(e) => editDetails(i, (x) => ({ ...x, fact: e.target.value }))} />
                  </label>
                </details>
              )
            })}
        </fieldset>
        <label className="check">
          <input type="checkbox" id="vote" checked={vote} onChange={(e) => setVote(e.target.checked)} />
          {t.voteOpt}
        </label>
        <fieldset className="extras tour" data-testid="tour">
          <legend className="label">{t.gameType}</legend>
          <div className="seg" role="radiogroup" aria-label={t.gameType}>
            <button role="radio" aria-checked={!tour} className={!tour ? 'on' : ''} onClick={() => setTour(false)} data-testid="type-single">
              {t.singleGame}
            </button>
            <button role="radio" aria-checked={tour} className={tour ? 'on' : ''} onClick={() => setTour(true)} data-testid="type-tour">
              {t.tournament}
            </button>
          </div>
          {tour && (
            <>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {t.tournamentHelp}
              </p>
              <label className="field">
                <span className="label">{t.tourPlan}</span>
                <select
                  className="input"
                  id="tour-plan"
                  value={planKey}
                  onChange={(e) => {
                    const k = e.target.value as typeof planKey
                    if (k === 'custom') setPlan(plan)
                    else setPlanKey(k)
                  }}
                >
                  <option value="short">{t.planShort}</option>
                  <option value="full">{t.planFull}</option>
                  <option value="custom">{t.planCustom}</option>
                </select>
              </label>
              <ol className="plan" data-testid="plan">
                {plan.map((r, i) => (
                  <li key={i} data-round={i}>
                    <span className="plan-n">{num(i + 1, lang)}</span>
                    <select className="input" aria-label={`${t.roundWord} ${i + 1}`} value={stepKey(r)} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? keyStep(e.target.value) : x)))} data-plan-pick={i}>
                      {roundChoices.map((k) => (
                        <option key={k} value={k}>
                          {roundTitle(t, keyStep(k))}
                        </option>
                      ))}
                    </select>
                    <button className="mini" aria-label={t.moveUp} title={t.moveUp} disabled={i === 0} onClick={() => setPlan(plan.map((x, j) => (j === i - 1 ? plan[i] : j === i ? plan[i - 1] : x)))}>
                      ↑
                    </button>
                    <button className="mini" aria-label={t.moveDown} title={t.moveDown} disabled={i === plan.length - 1} onClick={() => setPlan(plan.map((x, j) => (j === i + 1 ? plan[i] : j === i ? plan[i + 1] : x)))}>
                      ↓
                    </button>
                    <button className="mini" aria-label={t.remove} title={t.remove} disabled={plan.length <= 1} onClick={() => setPlan(plan.filter((_, j) => j !== i))} data-plan-remove={i}>
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
              {plan.length < TOUR_MAX_ROUNDS && (
                <button className="ghost" style={{ alignSelf: 'start' }} onClick={() => setPlan([...plan.filter((r) => r.kind !== 'final'), { kind: 'board' }, ...plan.filter((r) => r.kind === 'final')])} data-testid="plan-add">
                  + {t.addRound}
                </button>
              )}
              <small className="muted">{picked.length > 6 ? t.tourSplitNote : t.tourCatsNote}</small>
            </>
          )}
        </fieldset>
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
        {usesMadhhab && (
          <label className="field">
            <span className="label">{t.madhhab}</span>
            <select
              className="input"
              id="madhhab"
              value={madhhab}
              onChange={(e) => {
                const m = e.target.value as Madhhab
                setMadhhab(m)
                saveMadhhab(m)
              }}
            >
              <option value="">{t.madhhabAll}</option>
              {(['h', 'm', 's', 'b'] as const).map((k, i) => (
                <option key={k} value={k}>
                  {t.madhhabNames[i]}
                </option>
              ))}
            </select>
            <span className="hint">{t.madhhabHint}</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" id="deduct" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} />
          {t.deduct}
        </label>
        <fieldset className="extras" data-testid="extras">
          <legend>
            <label className="check">
              <input type="checkbox" id="extras" checked={extras} onChange={(e) => setExtras(e.target.checked)} />
              {t.funExtras}
            </label>
          </legend>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t.funExtrasHelp}
          </p>
          {extras && (
            <>
              <div className="extras-row">
                <label className="field">
                  <span className="label">{t.stealTiles}</span>
                  <select className="input" id="steal" value={steal} onChange={(e) => setSteal(+e.target.value)}>
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {num(n, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">{t.crowdTiles}</span>
                  <select className="input" id="crowd" value={crowd} onChange={(e) => setCrowd(+e.target.value)}>
                    {[0, 1, 2].map((n) => (
                      <option key={n} value={n}>
                        {num(n, lang)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="check">
                <input type="checkbox" id="streak" checked={streak} onChange={(e) => setStreak(e.target.checked)} />
                {t.streakOpt}
              </label>
              <label className="check">
                <input type="checkbox" id="comeback" checked={comeback} onChange={(e) => setComeback(e.target.checked)} />
                {t.comebackOpt}
              </label>
              {!tour && (<>
              <label className="check">
                <input type="checkbox" id="lightning" checked={lightning} onChange={(e) => setLightning(e.target.checked)} />
                {t.lightningOpt}
              </label>
              <label className="check">
                <input type="checkbox" id="final" checked={final} onChange={(e) => setFinal(e.target.checked)} />
                {t.finalOpt}
              </label>
              {offered.length > 0 && (
                <label className="field">
                  <span className="label">{t.modeOpt}</span>
                  <select className="input" id="mode" value={mode} onChange={(e) => setMode(e.target.value as RoundMode | '')} data-testid="mode-pick">
                    <option value="">{t.modeNone}</option>
                    {offered.map((m) => (
                      <option key={m} value={m}>
                        {t.modeNames[m]}
                      </option>
                    ))}
                  </select>
                  {borrowing && <small className="muted" data-testid="mode-borrow">{t.modeBorrowed}</small>}
                </label>
              )}
              </>)}
            </>
          )}
        </fieldset>
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
