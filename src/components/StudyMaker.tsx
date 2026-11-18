import { useEffect, useRef, useState } from 'react'
import type { Category } from '../lib/types'
import { LEVEL_NAMES, VALUES } from '../lib/types'
import { LIMITS } from '../lib/game'
import { loadStudyDraft, saveStudyDraft, uid } from '../lib/store'
import {
  STUDY_LIMITS,
  draftFromFile,
  draftProblems,
  emptySub,
  exportStudySet,
  mergeOpened,
  newDraft,
  parseBulk,
  parseQuestionFile,
  studyFileName,
  type DraftQuestion,
  type OpenedFile,
  type StudyDraft,
} from '../lib/studyset'
import { burstAt } from '../lib/fx'

/** English only, by the owner's choice (no new Arabic text). */
const T = {
  title: 'Question files',
  intro: 'Instructors make a file of questions for their class. Students open it here and it becomes its own set of categories to play together.',
  tabMake: 'Make a file (instructors)',
  tabOpen: 'Open a file (students)',
  back: 'Back',
  fileTitle: 'File title',
  fileTitleHint: 'For example: Thermodynamics, chapters 1 to 3',
  by: 'Made by (optional)',
  byHint: 'For example: Dr. Name, ME 301',
  note: 'Note for students (optional)',
  subs: 'Subcategories',
  subsHelp: 'Each subcategory is one column on the board. A game needs at least one question at every level.',
  addSub: 'Add subcategory',
  subName: 'Subcategory name',
  removeSub: 'Remove subcategory',
  confirmRemove: 'Yes, remove it',
  cancel: 'Cancel',
  moveUp: 'Move up',
  level: 'Level',
  question: 'Question',
  answer: 'Answer',
  add: 'Add',
  save: 'Save',
  edit: 'Edit',
  remove: 'Remove',
  paste: 'Paste many at once',
  pasteHelp: 'One question per line: the question, then a bar |, then the answer. Rows copied from a spreadsheet (question and answer in two columns) work too.',
  pasteAdd: 'Add these',
  pasted: 'Added',
  skippedLines: 'Lines skipped (no | or too long):',
  download: 'Download the file',
  ready: 'Ready to download.',
  notReady: 'Before you can download:',
  more: 'more',
  newFile: 'Start a new file',
  confirmNew: 'Yes, start over',
  openToEdit: 'Open a file to edit',
  saved: 'Your work is saved in this browser as you type.',
  downloaded: 'File downloaded. Send it to your students.',
  tip: 'Tip: aim for 5 or more questions per level so each game feels different.',
  chooseFile: 'Choose the file from your instructor',
  openHelp: 'The file stays on this device. Opening a newer copy of the same file replaces the older one.',
  added: 'Added',
  updated: 'Updated',
  playNow: 'Set up a game',
  yourSets: 'Files you have opened',
  noSets: 'No files opened yet.',
  removeSet: 'Remove',
  badJson: 'That file is not a question file from this game.',
  tooBig: 'That file is too big to be a question file (over 20 MB).',
  categories: 'categories',
  q: 'questions',
}

interface Props {
  custom: Category[]
  setCustom: (c: Category[]) => void
  notify: (text: string) => void
  onBack: () => void
  onPlay: () => void
}

export default function StudyMaker({ custom, setCustom, notify, onBack, onPlay }: Props) {
  const [tab, setTab] = useState<'make' | 'open'>('make')
  return (
    <div className="builder-wrap" data-testid="study">
      <div className="builder-top">
        <button className="btn alt back-btn" onClick={onBack} data-testid="study-back">
          <span aria-hidden="true" className="back-arrow">
            ←
          </span>{' '}
          {T.back}
        </button>
        <h2>{T.title}</h2>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {T.intro}
      </p>
      <div className="study-tabs" role="tablist">
        <button role="tab" className="theme study-tab" aria-selected={tab === 'make'} aria-pressed={tab === 'make'} onClick={() => setTab('make')} data-testid="tab-make">
          ✎ {T.tabMake}
        </button>
        <button role="tab" className="theme study-tab" aria-selected={tab === 'open'} aria-pressed={tab === 'open'} onClick={() => setTab('open')} data-testid="tab-open">
          📂 {T.tabOpen}
        </button>
      </div>
      {tab === 'make' ? <Maker notify={notify} /> : <Opener custom={custom} setCustom={setCustom} notify={notify} onPlay={onPlay} />}
    </div>
  )
}

const readJson = async (file: File): Promise<unknown> => {
  if (file.size > LIMITS.fileBytes) throw new Error(T.tooBig)
  try {
    return JSON.parse(await file.text())
  } catch {
    throw new Error(T.badJson)
  }
}

const countAll = (d: { levels: unknown[][] }) => d.levels.reduce((n, l) => n + l.length, 0)

function Maker({ notify }: { notify: (text: string) => void }) {
  const [draft, setDraftState] = useState<StudyDraft>(() => loadStudyDraft() ?? newDraft(uid('s')))
  const [sel, setSel] = useState(0)
  const [level, setLevel] = useState(0)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [editing, setEditing] = useState<{ li: number; qi: number } | null>(null)
  const [bulk, setBulk] = useState('')
  const [skipped, setSkipped] = useState<number[]>([])
  const [confirm, setConfirm] = useState<'new' | 'remove' | null>(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const openRef = useRef<HTMLInputElement>(null)
  const qRef = useRef<HTMLTextAreaElement>(null)

  const setDraft = (d: StudyDraft) => {
    setDraftState(d)
    if (!saveStudyDraft(d)) setError('This browser would not save your work. Download the file before closing the page.')
  }
  const sub = draft.subs[sel] ?? draft.subs[0]
  const setSub = (f: (s: StudyDraft['subs'][number]) => StudyDraft['subs'][number]) => setDraft({ ...draft, subs: draft.subs.map((s, i) => (i === sel ? f(s) : s)) })
  const setLevelList = (li: number, f: (l: DraftQuestion[]) => DraftQuestion[]) => setSub((s) => ({ ...s, levels: s.levels.map((l, i) => (i === li ? f(l) : l)) }))

  useEffect(() => {
    setEditing(null)
    setConfirm((c) => (c === 'remove' ? null : c))
  }, [sel])

  const problems = draftProblems(draft)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const qq = q.trim(),
      aa = a.trim()
    if (!qq || !aa || !sub) return
    if (editing) {
      setLevelList(editing.li, (l) => l.map((x, i) => (i === editing.qi ? { q: qq, a: aa } : x)))
      setEditing(null)
    } else {
      setLevelList(level, (l) => [...l, { q: qq, a: aa }])
      requestAnimationFrame(() => burstAt(document.querySelector(`[data-slevel="${level}"] .count`), 12, 80))
    }
    setQ('')
    setA('')
    qRef.current?.focus()
  }

  const addSub = () => {
    if (draft.subs.length >= STUDY_LIMITS.subcategories) return
    setDraft({ ...draft, subs: [...draft.subs, emptySub()] })
    setSel(draft.subs.length)
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    const subs = [...draft.subs]
    ;[subs[i - 1], subs[i]] = [subs[i], subs[i - 1]]
    setDraft({ ...draft, subs })
    setSel(i - 1)
  }

  const download = (e: React.MouseEvent) => {
    if (problems.length) return
    const text = JSON.stringify(exportStudySet(draft), null, 2)
    try {
      const blob = new Blob([text], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = studyFileName(draft.title)
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      burstAt(e.currentTarget, 24, 160)
      notify(T.downloaded)
    } catch {
      setError('This browser blocked the download.')
    }
  }

  const openToEdit = async (file: File) => {
    setError('')
    try {
      const d = draftFromFile(await readJson(file), () => uid('s'))
      setDraft(d)
      setSel(0)
      setConfirm(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const doBulk = () => {
    const { items, skipped: bad } = parseBulk(bulk)
    setSkipped(bad)
    if (!items.length) return
    setLevelList(level, (l) => [...l, ...items].slice(0, LIMITS.perLevel))
    setBulk('')
    notify(`${T.pasted}: ${items.length} ${T.q}`)
  }

  return (
    <main className="builder">
      <aside className="panel stack">
        <label className="field">
          <span className="label">{T.fileTitle}</span>
          <input className="input" id="study-title" value={draft.title} maxLength={STUDY_LIMITS.title} placeholder={T.fileTitleHint} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">{T.by}</span>
          <input className="input" id="study-by" value={draft.by} maxLength={STUDY_LIMITS.by} placeholder={T.byHint} onChange={(e) => setDraft({ ...draft, by: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">{T.note}</span>
          <textarea className="input" id="study-note" rows={2} value={draft.note} maxLength={STUDY_LIMITS.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>

        <span className="label">{T.subs}</span>
        <div className="cat-list" data-testid="subs">
          {draft.subs.map((s, i) => (
            <button key={i} className="cat-item" aria-current={i === sel} onClick={() => setSel(i)} data-sub={i}>
              <b>{s.name.trim() || `Subcategory ${i + 1}`}</b>
              <small>
                {countAll(s)} {T.q}
                {s.levels.some((l) => l.length === 0) ? ' ⚠' : ''}
              </small>
            </button>
          ))}
        </div>
        <button className="ghost" style={{ alignSelf: 'start' }} onClick={addSub} disabled={draft.subs.length >= STUDY_LIMITS.subcategories} data-testid="add-sub">
          + {T.addSub}
        </button>
        <small className="muted">{T.subsHelp}</small>

        <div className={`study-check${problems.length ? '' : ' ok'}`} data-testid="study-check" role="status">
          {problems.length === 0 ? (
            <b>✓ {T.ready}</b>
          ) : (
            <>
              <b>{T.notReady}</b>
              <ul>
                {(showAll ? problems : problems.slice(0, 4)).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {problems.length > 4 && !showAll && (
                <button className="mini" onClick={() => setShowAll(true)}>
                  +{problems.length - 4} {T.more}
                </button>
              )}
            </>
          )}
        </div>
        <button className="btn big" onClick={download} disabled={problems.length > 0} data-testid="study-download">
          ⬇ {T.download}
        </button>
        <small className="muted">{T.saved}</small>
        <div className="row">
          <button className="mini" onClick={() => openRef.current?.click()} data-testid="study-open-edit">
            {T.openToEdit}
          </button>
          <input ref={openRef} type="file" accept="application/json,.json" hidden data-testid="study-open-edit-file" onChange={(e) => e.target.files?.[0] && openToEdit(e.target.files[0]).finally(() => (e.target.value = ''))} />
          {confirm === 'new' ? (
            <>
              <button
                className="mini bad"
                onClick={() => {
                  setDraft(newDraft(uid('s')))
                  setSel(0)
                  setConfirm(null)
                }}
                data-testid="study-confirm-new"
              >
                {T.confirmNew}
              </button>
              <button className="mini" onClick={() => setConfirm(null)}>
                {T.cancel}
              </button>
            </>
          ) : (
            <button className="mini" onClick={() => setConfirm('new')} data-testid="study-new">
              {T.newFile}
            </button>
          )}
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </aside>

      {sub && (
        <section className="panel stack" key={sel}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <input
              className="input"
              id="sub-name"
              value={sub.name}
              maxLength={LIMITS.name}
              placeholder={T.subName}
              aria-label={T.subName}
              onChange={(e) => setSub((s) => ({ ...s, name: e.target.value }))}
              style={{ fontFamily: 'var(--fd)', fontSize: 22, flex: 1, minWidth: 0 }}
            />
            <div className="row">
              {sel > 0 && (
                <button className="mini" onClick={() => moveUp(sel)}>
                  ↑ {T.moveUp}
                </button>
              )}
              {draft.subs.length > 1 &&
                (confirm === 'remove' ? (
                  <>
                    <button
                      className="btn bad"
                      onClick={() => {
                        setDraft({ ...draft, subs: draft.subs.filter((_, i) => i !== sel) })
                        setSel(Math.max(0, sel - 1))
                        setConfirm(null)
                      }}
                      data-testid="confirm-remove-sub"
                    >
                      {T.confirmRemove}
                    </button>
                    <button className="btn alt" onClick={() => setConfirm(null)}>
                      {T.cancel}
                    </button>
                  </>
                ) : (
                  <button className="btn bad" onClick={() => setConfirm('remove')} data-testid="remove-sub">
                    {T.removeSub}
                  </button>
                ))}
            </div>
          </div>

          <form className="addq" onSubmit={submit} data-testid="study-add">
            <select className="input" id="study-level" value={editing ? editing.li : level} onChange={(e) => setLevel(+e.target.value)} aria-label={T.level} disabled={!!editing}>
              {VALUES.map((v, i) => (
                <option key={v} value={i}>
                  {v} · {LEVEL_NAMES[i]}
                </option>
              ))}
            </select>
            <textarea ref={qRef} className="input" id="study-q" rows={1} placeholder={T.question} aria-label={T.question} value={q} maxLength={LIMITS.clue} onChange={(e) => setQ(e.target.value)} required />
            <input className="input wide" id="study-a" placeholder={T.answer} aria-label={T.answer} value={a} maxLength={LIMITS.answer} onChange={(e) => setA(e.target.value)} required />
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="btn" type="submit">
                {editing ? T.save : T.add}
              </button>
              {editing && (
                <button
                  className="btn alt"
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setQ('')
                    setA('')
                  }}
                >
                  {T.cancel}
                </button>
              )}
            </div>
          </form>

          <details className="level-times" data-testid="study-paste">
            <summary>{T.paste}</summary>
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <small className="muted">{T.pasteHelp}</small>
              <textarea className="input" id="study-bulk" rows={5} value={bulk} placeholder={'What is the unit of force? | Newton\nWho wrote the laws of motion? | Isaac Newton'} onChange={(e) => setBulk(e.target.value)} aria-label={T.paste} />
              <div className="row">
                <select className="input" value={level} onChange={(e) => setLevel(+e.target.value)} aria-label={T.level} style={{ width: 'auto' }}>
                  {VALUES.map((v, i) => (
                    <option key={v} value={i}>
                      {v} · {LEVEL_NAMES[i]}
                    </option>
                  ))}
                </select>
                <button className="btn alt" onClick={doBulk} disabled={!bulk.trim()} data-testid="study-bulk-add">
                  {T.pasteAdd}
                </button>
              </div>
              {skipped.length > 0 && (
                <small className="err">
                  {T.skippedLines} {skipped.slice(0, 20).join(', ')}
                  {skipped.length > 20 ? ' …' : ''}
                </small>
              )}
            </div>
          </details>

          <small className="muted">{T.tip}</small>

          <div className="levels">
            {VALUES.map((v, li) => (
              <details key={li} className="level" open data-slevel={li}>
                <summary>
                  <span className="val">{v}</span>
                  <span className="label">{LEVEL_NAMES[li]}</span>
                  <span className={`count${sub.levels[li].length ? '' : ' none'}`}>
                    {sub.levels[li].length} {T.q}
                  </span>
                </summary>
                {sub.levels[li].length > 0 && (
                  <ul className="qlist">
                    {sub.levels[li].map((x, qi) => (
                      <li key={qi} className="qrow">
                        <div style={{ minWidth: 0 }} dir="auto">
                          {x.q}
                          <em dir="auto">{x.a}</em>
                        </div>
                        <div className="ops">
                          <button
                            className="mini"
                            onClick={() => {
                              setEditing({ li, qi })
                              setLevel(li)
                              setQ(x.q)
                              setA(x.a)
                              qRef.current?.focus()
                            }}
                          >
                            {T.edit}
                          </button>
                          <button
                            className="mini"
                            onClick={() => {
                              if (editing) setEditing(null)
                              setLevelList(li, (l) => l.filter((_, i) => i !== qi))
                            }}
                            aria-label={`${T.remove}: ${x.q}`}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function Opener({ custom, setCustom, notify, onPlay }: { custom: Category[]; setCustom: (c: Category[]) => void; notify: (text: string) => void; onPlay: () => void }) {
  const [error, setError] = useState('')
  const [last, setLast] = useState<(OpenedFile & { replaced: number }) | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const open = async (file: File) => {
    setError('')
    try {
      const opened = parseQuestionFile(await readJson(file), () => uid())
      const { next, replaced } = mergeOpened(custom, opened)
      setCustom(next)
      setLast({ ...opened, replaced })
      notify(`${replaced ? T.updated : T.added}: ${opened.set?.title ?? opened.cats[0].name}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // The study files already on this device, by the title they came with.
  const sets = new Map<string, { title: string; cats: Category[] }>()
  for (const c of custom) {
    if (!c.set) continue
    const s = sets.get(c.set.id) ?? { title: c.set.title, cats: [] }
    s.cats.push(c)
    sets.set(c.set.id, s)
  }

  return (
    <main className="stack">
      <section className="panel stack" style={{ alignItems: 'start' }}>
        <button className="btn big" onClick={() => fileRef.current?.click()} data-testid="study-open">
          📂 {T.chooseFile}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="study-open-file" onChange={(e) => e.target.files?.[0] && open(e.target.files[0]).finally(() => (e.target.value = ''))} />
        <small className="muted">{T.openHelp}</small>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        {last && (
          <div className="study-check ok" data-testid="study-opened" style={{ alignSelf: 'stretch' }}>
            <b>
              ✓ {last.replaced ? T.updated : T.added}: {last.set?.title ?? last.cats[0].name}
            </b>
            {last.set?.by && <div className="muted">{last.set.by}</div>}
            {last.set?.note && <p style={{ margin: '6px 0' }}>{last.set.note}</p>}
            <ul>
              {last.cats.map((c) => (
                <li key={c.id}>
                  {c.name} · {countAll(c)} {T.q}
                </li>
              ))}
            </ul>
            <button className="btn" onClick={onPlay} data-testid="study-play">
              {T.playNow}
            </button>
          </div>
        )}
      </section>
      <section className="panel stack">
        <span className="label">{T.yourSets}</span>
        {sets.size === 0 && <p className="muted" style={{ margin: 0 }}>{T.noSets}</p>}
        <div className="cat-list">
          {[...sets.entries()].map(([id, s]) => (
            <div key={id} className="cat-item" data-set={id}>
              <b>{s.title}</b>
              <span className="row" style={{ gap: 8 }}>
                <small>
                  {s.cats.length} {T.categories}
                </small>
                <button className="mini" onClick={() => setCustom(custom.filter((c) => c.set?.id !== id))} aria-label={`${T.removeSet}: ${s.title}`}>
                  {T.removeSet}
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
