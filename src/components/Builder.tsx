import { useEffect, useMemo, useRef, useState } from 'react'
import type { Category, CategorySummary, Lang, PackGroup, PoolEdit, Question } from '../lib/types'
import { LEVEL_NAMES, LEVEL_NAMES_AR, VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num, qCount } from '../lib/i18n'
import { LIMITS, applyPool, emptyPool, exportCategory, parseImportedCategory, poolCounts } from '../lib/game'
import { loadPack } from '../lib/packs'
import { uid } from '../lib/store'
import { burstAt } from '../lib/fx'
import { diagramSrc, fileToDiagram } from '../lib/diagram'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  custom: Category[]
  setCustom: (c: Category[]) => void
  pools: Record<string, PoolEdit>
  setPool: (id: string, edit: PoolEdit | null) => void
  notify: (text: string) => void
  onBack: () => void
}

type GroupId = 'custom' | PackGroup
const GROUPS: PackGroup[] = ['engineering', 'cces', 'general']

const newQid = (catId: string) => `${catId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export default function Builder({ t, lang, index, custom, setCustom, pools, setPool, notify, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(custom[0]?.id ?? null)
  const [builtIn, setBuiltIn] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportText, setExportText] = useState('')
  const [openGroups, setOpenGroups] = useState<GroupId[]>(() => {
    const g = index?.find((c) => c.id === selected)?.group
    return g ? ['custom', g] : ['custom']
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const current: Category | null = custom.find((c) => c.id === selected) ?? (builtIn?.id === selected ? builtIn : null)

  useEffect(() => {
    setConfirmDelete(false)
    setExportText('')
    if (!selected || custom.some((c) => c.id === selected)) return
    setLoading(true)
    loadPack(selected)
      .then(setBuiltIn)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selected, custom])

  const update = (cat: Category) => setCustom(custom.map((c) => (c.id === cat.id ? cat : c)))

  const create = () => {
    const cat: Category = { id: uid(), name: lang === 'ar' ? 'فئة جديدة' : 'New category', builtIn: false, levels: [[], [], [], [], []] }
    setCustom([...custom, cat])
    setSelected(cat.id)
    setOpenGroups((g) => (g.includes('custom') ? g : [...g, 'custom']))
  }

  const duplicate = (src: Category) => {
    const id = uid()
    const played = applyPool(src, pools[src.id])
    const cat: Category = {
      id,
      name: `${src.name} (${lang === 'ar' ? 'نسخة' : 'copy'})`,
      nameAr: src.nameAr,
      builtIn: false,
      levels: played.levels.map((l, li) => l.map((q, qi) => ({ ...q, id: `${id}-${li}-${qi}` }))),
    }
    setCustom([...custom, cat])
    setSelected(cat.id)
    setOpenGroups((g) => (g.includes('custom') ? g : [...g, 'custom']))
  }

  const onImport = async (file: File) => {
    setError('')
    try {
      if (file.size > LIMITS.fileBytes) throw new Error('That file is too big to be a category (over 20 MB).')
      const raw = JSON.parse(await file.text())
      const cat = parseImportedCategory(raw, uid)
      setCustom([...custom, cat])
      setSelected(cat.id)
      notify(`${t.imported}: ${cat.name}`)
    } catch (e) {
      setError(e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message)
    }
  }

  const doExport = (cat: Category) => {
    // A built-in category is exported as it is played, with the host's changes.
    const out = cat.builtIn ? applyPool(cat, pools[cat.id]) : cat
    const text = JSON.stringify(exportCategory(out), null, 2)
    setExportText(text.length > 200_000 ? '' : text)
    try {
      const blob = new Blob([text], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${cat.name.replace(/[^\w؀-ۿ-]+/g, '_')}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch {
      /* the text box below still lets people copy it */
    }
  }

  const sum = (counts: number[]) => counts.reduce((a, b) => a + b, 0)

  const item = (c: { id: string; name: string; nameAr?: string }, counts: number[]) => {
    const edit = pools[c.id]
    const inPlay = sum(poolCounts(counts, edit))
    return (
      <button key={c.id} className="cat-item" aria-current={selected === c.id} onClick={() => setSelected(c.id)} data-cat-item={c.id}>
        <b>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</b>
        <small>{edit ? `${num(inPlay, lang)} ${t.inPlay}` : qCount(sum(counts), lang)}</small>
      </button>
    )
  }

  const group = (id: GroupId, title: string, body: React.ReactNode, count: number) => (
    <details
      key={id}
      className="cat-group b-group"
      open={openGroups.includes(id)}
      onToggle={(e) => {
        const o = (e.currentTarget as HTMLDetailsElement).open
        setOpenGroups((g) => (o ? (g.includes(id) ? g : [...g, id]) : g.filter((x) => x !== id)))
      }}
      data-bgroup={id}
    >
      <summary className="group-title">
        <span>{title}</span>
        <span className="group-count">{num(count, lang)}</span>
      </summary>
      <div className="cat-list">{body}</div>
    </details>
  )

  const groupName = (g: PackGroup) => (g === 'engineering' ? t.groupEngineering : g === 'cces' ? t.groupCces : t.groupGeneral)

  return (
    <div className="builder-wrap">
      <div className="builder-top">
        <button className="btn alt back-btn" onClick={onBack} data-testid="builder-back">
          <span aria-hidden="true" className="back-arrow">
            {lang === 'ar' ? '→' : '←'}
          </span>{' '}
          {t.back}
        </button>
        <h2>{t.builderTitle}</h2>
      </div>
      <main className="builder">
        <aside className="panel stack">
          <div className="row">
            <button className="btn" onClick={create} data-testid="new-cat">
              + {t.newCategory}
            </button>
            <button className="btn alt" onClick={() => fileRef.current?.click()}>
              {t.import}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0]).finally(() => (e.target.value = ''))} data-testid="import" />
          </div>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          {group(
            'custom',
            t.custom,
            custom.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {t.emptyCustom}
              </p>
            ) : (
              custom.map((c) => item(c, c.levels.map((l) => l.length)))
            ),
            custom.length,
          )}
          {GROUPS.map((g) => {
            const list = (index ?? []).filter((c) => (c.group ?? 'general') === g)
            return list.length ? group(g, `${t.builtIn} · ${groupName(g)}`, list.map((c) => item(c, c.counts)), list.length) : null
          })}
        </aside>

        <section className="panel stack">
          {loading && <p className="muted">{t.loading}</p>}
          {!current && !loading && <p className="muted">{t.emptyCustom}</p>}
          {current && !loading && (
            <Editor
              key={current.id}
              t={t}
              lang={lang}
              cat={current}
              index={index}
              pool={pools[current.id]}
              onPool={(p) => setPool(current.id, p)}
              onChange={update}
              onDuplicate={() => duplicate(current)}
              onExport={() => doExport(current)}
              notify={notify}
              confirmDelete={confirmDelete}
              onDelete={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                setCustom(custom.filter((c) => c.id !== current.id))
                setPool(current.id, null)
                setSelected(null)
              }}
              onCancelDelete={() => setConfirmDelete(false)}
            />
          )}
          {exportText && <textarea className="input" readOnly rows={6} value={exportText} onFocus={(e) => e.target.select()} aria-label={t.export} />}
        </section>
      </main>
    </div>
  )
}

interface EditorProps {
  t: Strings
  lang: Lang
  cat: Category
  index: CategorySummary[] | null
  pool: PoolEdit | undefined
  onPool: (p: PoolEdit | null) => void
  onChange: (c: Category) => void
  onDuplicate: () => void
  onExport: () => void
  notify: (text: string) => void
  confirmDelete: boolean
  onDelete: () => void
  onCancelDelete: () => void
}

function Editor({ t, lang, cat, index, pool, onPool, onChange, onDuplicate, onExport, notify, confirmDelete, onDelete, onCancelDelete }: EditorProps) {
  const [level, setLevel] = useState(0)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [img, setImg] = useState<string | undefined>()
  const [imgError, setImgError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [openLevels, setOpenLevels] = useState<number[]>([0])
  const [confirmReset, setConfirmReset] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const levelNames = lang === 'ar' ? LEVEL_NAMES_AR : LEVEL_NAMES
  const builtIn = cat.builtIn
  const edit = pool ?? emptyPool()
  const LIMIT = 60

  /** Every question shown for a level, and whether the host may edit it. */
  const rows = (li: number): { x: Question; mine: boolean }[] =>
    builtIn ? [...edit.extra[li].map((x) => ({ x, mine: true })), ...cat.levels[li].map((x) => ({ x, mine: false }))] : cat.levels[li].map((x) => ({ x, mine: true }))

  const setPool = (next: PoolEdit) => onPool(next)
  const setLevels = (levels: Question[][]) => onChange({ ...cat, levels })

  /** Edits the host's own questions, wherever they are kept. */
  const mapMine = (li: number, f: (l: Question[]) => Question[]) => {
    if (builtIn) setPool({ ...edit, extra: edit.extra.map((l, i) => (i === li ? f(l) : l)) })
    else setLevels(cat.levels.map((l, i) => (i === li ? f(l) : l)))
  }

  const addMany = (li: number, qs: Question[]) => {
    mapMine(li, (l) => [...qs, ...l])
    setOpenLevels((o) => (o.includes(li) ? o : [...o, li]))
    requestAnimationFrame(() => burstAt(document.querySelector(`[data-level="${li}"] .count`), 16, 90))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const qq = q.trim(),
      aa = a.trim()
    if (!qq || !aa) return
    if (editing) {
      const li = rows(level).some((r) => r.x.id === editing) ? level : cat.levels.findIndex((l) => l.some((x) => x.id === editing))
      mapMine(li, (l) =>
        l.map((x) => {
          if (x.id !== editing) return x
          const n: Question = { ...x, q: qq, a: aa }
          if (img) n.img = img
          else delete n.img
          return n
        }),
      )
      setEditing(null)
    } else {
      const id = newQid(cat.id)
      const n: Question = { id, q: qq, a: aa }
      if (img) n.img = img
      addMany(level, [n])
      setFresh(id)
    }
    setQ('')
    setA('')
    setImg(undefined)
  }

  const startEdit = (x: Question, li: number) => {
    setEditing(x.id)
    setLevel(li)
    setQ(x.q)
    setA(x.a)
    setImg(x.img)
    setImgError('')
  }

  const cancelEdit = () => {
    setEditing(null)
    setQ('')
    setA('')
    setImg(undefined)
  }

  const takeImage = async (file: Blob) => {
    setImgError('')
    try {
      setImg(await fileToDiagram(file))
    } catch {
      setImgError(t.diagramBad)
    }
  }

  const removeQ = (li: number, id: string) => {
    const off = edit.off.map((l, i) => (i === li ? l.filter((x) => x !== id) : l))
    if (builtIn) setPool({ off, extra: edit.extra.map((l, i) => (i === li ? l.filter((y) => y.id !== id) : l)) })
    else {
      setLevels(cat.levels.map((l, i) => (i === li ? l.filter((y) => y.id !== id) : l)))
      if (pool) setPool({ ...edit, off })
    }
  }

  const toggle = (li: number, id: string, on: boolean) =>
    setPool({ ...edit, off: edit.off.map((l, i) => (i !== li ? l : on ? l.filter((x) => x !== id) : l.includes(id) ? l : [...l, id])) })
  const tickAll = (li: number, on: boolean) => setPool({ ...edit, off: edit.off.map((l, i) => (i !== li ? l : on ? [] : rows(li).map((r) => r.x.id))) })

  const needle = search.trim().toLowerCase()
  const changed = !!pool

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {builtIn ? (
          <h2>{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</h2>
        ) : (
          <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <input className="input" id="cat-name" value={cat.name} maxLength={40} aria-label={t.catName} onChange={(e) => onChange({ ...cat, name: e.target.value })} style={{ fontFamily: 'var(--fd)', fontSize: 22 }} />
            <input className="input" id="cat-name-ar" dir="rtl" lang="ar" value={cat.nameAr ?? ''} maxLength={40} placeholder={t.catNameAr} aria-label={t.catNameAr} onChange={(e) => onChange({ ...cat, nameAr: e.target.value || undefined })} />
          </div>
        )}
        <div className="row">
          {builtIn && (
            <button className="btn alt" onClick={onDuplicate} data-testid="duplicate">
              {t.duplicate}
            </button>
          )}
          <button className="btn alt" onClick={onExport} data-testid="export">
            {t.export}
          </button>
          {!builtIn &&
            (confirmDelete ? (
              <>
                <button className="btn bad" onClick={onDelete} data-testid="confirm-delete">
                  {t.confirmDelete}
                </button>
                <button className="btn alt" onClick={onCancelDelete}>
                  {t.cancel}
                </button>
              </>
            ) : (
              <button className="btn bad" onClick={onDelete} data-testid="delete">
                {t.delete}
              </button>
            ))}
        </div>
      </div>
      <p className="muted pool-help" style={{ margin: 0 }} data-testid="pool-help">
        {builtIn ? t.poolHelpBuiltIn : ''} {t.poolHelp}
      </p>

      <form className="addq" onSubmit={submit} data-testid="add-form">
        <select className="input" id="level" value={level} onChange={(e) => setLevel(+e.target.value)} aria-label="Difficulty" disabled={!!editing}>
          {VALUES.map((v, i) => (
            <option key={v} value={i}>
              {num(v, lang)} · {levelNames[i]}
            </option>
          ))}
        </select>
        <textarea
          className="input"
          id="new-q"
          rows={1}
          placeholder={t.clue}
          aria-label={t.clue}
          value={q}
          maxLength={LIMITS.clue}
          onChange={(e) => setQ(e.target.value)}
          onPaste={(e) => {
            const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'))
            if (file) {
              e.preventDefault()
              takeImage(file)
            }
          }}
          required
        />
        <input className="input wide" id="new-a" placeholder={t.answer} aria-label={t.answer} value={a} maxLength={LIMITS.answer} onChange={(e) => setA(e.target.value)} required />
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <button className="btn" type="submit">
            {editing ? t.save : t.add}
          </button>
          {editing && (
            <button className="btn alt" type="button" onClick={cancelEdit}>
              {t.cancel}
            </button>
          )}
        </div>
        <div className="diagram-row">
          <button className="mini" type="button" onClick={() => imgRef.current?.click()} data-testid="add-diagram" title={t.diagramHelp}>
            🖼 {img ? t.changeDiagram : t.addDiagram}
          </button>
          <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden data-testid="diagram-file" onChange={(e) => e.target.files?.[0] && takeImage(e.target.files[0]).finally(() => (e.target.value = ''))} />
          {img && (
            <>
              <img className="diagram-thumb" src={diagramSrc(img)} alt={t.diagramAlt} data-testid="diagram-preview" />
              <button className="mini" type="button" onClick={() => setImg(undefined)}>
                {t.removeDiagram}
              </button>
            </>
          )}
          {!img && <small className="muted">{t.diagramHelp}</small>}
          {imgError && (
            <small className="err" role="alert">
              {imgError}
            </small>
          )}
        </div>
      </form>

      <Borrow t={t} lang={lang} index={index} target={cat} level={level} setLevel={setLevel} existing={(li) => rows(li).map((r) => r.x)} onAdd={(li, qs) => {
        addMany(li, qs.map((x) => ({ ...x, id: newQid(cat.id) })))
        notify(`${t.borrowAdded}: ${qCount(qs.length, lang)}`)
      }} />

      <input className="input" id="search" type="search" placeholder={t.search} aria-label={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="levels">
        {VALUES.map((_, li) => {
          const all = rows(li)
          const off = new Set(edit.off[li])
          const inPlay = all.filter((r) => !off.has(r.x.id)).length
          const list = needle ? all.filter((r) => (r.x.q + ' ' + r.x.a).toLowerCase().includes(needle)) : all
          const isOpen = openLevels.includes(li) || !!needle
          return (
            <details
              key={li}
              className="level"
              open={isOpen}
              data-level={li}
              onToggle={(e) => {
                const o = (e.target as HTMLDetailsElement).open
                setOpenLevels((cur) => (o ? (cur.includes(li) ? cur : [...cur, li]) : cur.filter((x) => x !== li)))
              }}
            >
              <summary>
                <span className="val">{num(VALUES[li], lang)}</span>
                <span className="label">{levelNames[li]}</span>
                <span className={`count${all.length && !inPlay ? ' none' : ''}`}>
                  {off.size ? `${num(inPlay, lang)} / ${qCount(all.length, lang)} ${t.inPlay}` : qCount(all.length, lang)}
                </span>
              </summary>
              {isOpen && (
                <>
                  {all.length > 1 && (
                    <div className="level-tools">
                      <button className="mini" onClick={() => tickAll(li, true)} disabled={!off.size} data-testid={`tick-all-${li}`}>
                        {t.tickAll}
                      </button>
                      <button className="mini" onClick={() => tickAll(li, false)} disabled={inPlay === 0} data-testid={`untick-all-${li}`}>
                        {t.untickAll}
                      </button>
                      <small className="muted">{t.playTip}</small>
                    </div>
                  )}
                  <ul className="qlist">
                    {list.slice(0, LIMIT).map(({ x, mine }) => {
                      const on = !off.has(x.id)
                      return (
                        <li key={x.id} className={`qrow${x.id === fresh ? ' new' : ''}${on ? '' : ' off'}`}>
                          <input type="checkbox" className="pick" checked={on} onChange={(e) => toggle(li, x.id, e.target.checked)} aria-label={`${t.inPlay}: ${x.q}`} data-pick={x.id} />
                          <div style={{ minWidth: 0 }} dir="auto">
                            {builtIn && mine && <span className="pill yours">{t.yours}</span>} {x.q}
                            <em dir="auto">{x.a}</em>
                          </div>
                          <div className="ops">
                            {x.img && <img className="row-thumb" src={diagramSrc(x.img)} alt={t.diagramAlt} />}
                            {mine && (
                              <>
                                <button className="mini" onClick={() => startEdit(x, li)}>
                                  {t.edit}
                                </button>
                                <button className="mini" onClick={() => removeQ(li, x.id)} aria-label={`${t.delete}: ${x.q}`}>
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      )
                    })}
                    {list.length > LIMIT && (
                      <li className="muted" style={{ fontSize: 12 }}>
                        {t.showing} {num(LIMIT, lang)} {t.of} {num(list.length, lang)}
                      </li>
                    )}
                  </ul>
                </>
              )}
            </details>
          )
        })}
      </div>

      {changed && (
        <div className="row">
          {confirmReset ? (
            <>
              <button className="btn bad" onClick={() => (onPool(null), setConfirmReset(false))} data-testid="reset-pool-confirm">
                {t.resetPoolConfirm}
              </button>
              <button className="btn alt" onClick={() => setConfirmReset(false)}>
                {t.cancel}
              </button>
            </>
          ) : (
            <button className="mini" onClick={() => setConfirmReset(true)} data-testid="reset-pool">
              {t.resetPool}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface BorrowProps {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  target: Category
  level: number
  setLevel: (l: number) => void
  existing: (li: number) => Question[]
  onAdd: (li: number, qs: Question[]) => void
}

/** Copies chosen questions from a built-in category into the one being edited. */
function Borrow({ t, lang, index, target, level, setLevel, existing, onAdd }: BorrowProps) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [src, setSrc] = useState<Category | null>(null)
  const [ticked, setTicked] = useState<string[]>([])
  const [find, setFind] = useState('')
  const levelNames = lang === 'ar' ? LEVEL_NAMES_AR : LEVEL_NAMES

  useEffect(() => {
    setSrc(null)
    setTicked([])
    if (!source) return
    let live = true
    loadPack(source).then((c) => live && setSrc(c), () => {})
    return () => {
      live = false
    }
  }, [source])
  useEffect(() => setTicked([]), [level])

  const have = useMemo(() => new Set(existing(level).map((x) => x.q.trim().toLowerCase())), [existing, level])
  const needle = find.trim().toLowerCase()
  const list = (src?.levels[level] ?? []).filter((x) => !needle || (x.q + ' ' + x.a).toLowerCase().includes(needle))
  const sources = (index ?? []).filter((c) => c.id !== target.id)

  return (
    <details className="borrow" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} data-testid="borrow">
      <summary>{t.borrowTitle}</summary>
      {open && (
        <div className="stack" style={{ gap: 10, paddingTop: 10 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t.borrowHelp}
          </p>
          <div className="borrow-bar">
            <select className="input" value={source} onChange={(e) => setSource(e.target.value)} aria-label={t.borrowPick} data-testid="borrow-source">
              <option value="">{t.borrowPick}</option>
              {sources.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' && c.nameAr ? c.nameAr : c.name}
                </option>
              ))}
            </select>
            <select className="input" value={level} onChange={(e) => setLevel(+e.target.value)} aria-label="Difficulty" data-testid="borrow-level">
              {VALUES.map((v, i) => (
                <option key={v} value={i}>
                  {num(v, lang)} · {levelNames[i]}
                </option>
              ))}
            </select>
            <input className="input" type="search" placeholder={t.search} aria-label={t.search} value={find} onChange={(e) => setFind(e.target.value)} />
          </div>
          {source && !src && <p className="muted">{t.loading}</p>}
          {src && (
            <>
              <ul className="qlist borrow-list">
                {list.slice(0, 100).map((x) => {
                  const dup = have.has(x.q.trim().toLowerCase())
                  return (
                    <li key={x.id} className={`qrow${dup ? ' off' : ''}`}>
                      <input
                        type="checkbox"
                        className="pick"
                        checked={ticked.includes(x.id)}
                        disabled={dup}
                        onChange={(e) => setTicked((tk) => (e.target.checked ? [...tk, x.id] : tk.filter((id) => id !== x.id)))}
                        aria-label={x.q}
                        data-borrow={x.id}
                      />
                      <div style={{ minWidth: 0 }} dir="auto">
                        {x.q}
                        <em dir="auto">{x.a}</em>
                      </div>
                      <div className="ops">{dup && <small className="muted">{t.alreadyHere}</small>}</div>
                    </li>
                  )
                })}
              </ul>
              <div className="row">
                <button
                  className="btn"
                  disabled={!ticked.length}
                  data-testid="borrow-add"
                  onClick={() => {
                    onAdd(level, src.levels[level].filter((x) => ticked.includes(x.id)))
                    setTicked([])
                  }}
                >
                  {t.borrowAdd} ({num(ticked.length, lang)})
                </button>
                <button className="mini" onClick={() => setTicked(list.filter((x) => !have.has(x.q.trim().toLowerCase())).slice(0, 100).map((x) => x.id))}>
                  {t.tickAll}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </details>
  )
}
