import { useEffect, useRef, useState } from 'react'
import type { Category, CategorySummary, Lang, Question } from '../lib/types'
import { LEVEL_NAMES, LEVEL_NAMES_AR, VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num, qCount } from "../lib/i18n"
import { LIMITS, exportCategory, parseImportedCategory } from '../lib/game'
import { loadPack } from '../lib/packs'
import { uid } from '../lib/store'
import { burstAt } from '../lib/fx'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  custom: Category[]
  setCustom: (c: Category[]) => void
  notify: (text: string) => void
  onBack: () => void
}

export default function Builder({ t, lang, index, custom, setCustom, notify, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(custom[0]?.id ?? null)
  const [builtIn, setBuiltIn] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportText, setExportText] = useState('')
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
  }

  const duplicate = (src: Category) => {
    const id = uid()
    const cat: Category = {
      id,
      name: `${src.name} (${lang === 'ar' ? 'نسخة' : 'copy'})`,
      nameAr: src.nameAr,
      builtIn: false,
      levels: src.levels.map((l, li) => l.map((q, qi) => ({ ...q, id: `${id}-${li}-${qi}` }))),
    }
    setCustom([...custom, cat])
    setSelected(cat.id)
  }

  const onImport = async (file: File) => {
    setError('')
    try {
      if (file.size > LIMITS.fileBytes) throw new Error('That file is too big to be a category (over 2 MB).')
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
    const text = JSON.stringify(exportCategory(cat), null, 2)
    setExportText(text)
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

  const total = (counts: number[]) => counts.reduce((a, b) => a + b, 0)

  return (
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
        <span className="label">{t.custom}</span>
        {custom.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t.emptyCustom}</p>}
        <div className="cat-list">
          {custom.map((c) => (
            <button key={c.id} className="cat-item" aria-current={selected === c.id} onClick={() => setSelected(c.id)}>
              <b>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</b>
              <small>
                {qCount(total(c.levels.map((l) => l.length)), lang)}
              </small>
            </button>
          ))}
        </div>
        <span className="label">{t.builtIn}</span>
        <div className="cat-list">
          {index?.map((c) => (
            <button key={c.id} className="cat-item" aria-current={selected === c.id} onClick={() => setSelected(c.id)}>
              <b>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</b>
              <small>
                {qCount(total(c.counts), lang)}
              </small>
            </button>
          ))}
        </div>
        <button className="btn alt" onClick={onBack} style={{ alignSelf: 'start' }}>
          {t.back}
        </button>
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
            readOnly={current.builtIn}
            onChange={update}
            onDuplicate={() => duplicate(current)}
            onExport={() => doExport(current)}
            confirmDelete={confirmDelete}
            onDelete={() => {
              if (!confirmDelete) return setConfirmDelete(true)
              setCustom(custom.filter((c) => c.id !== current.id))
              setSelected(null)
            }}
            onCancelDelete={() => setConfirmDelete(false)}
          />
        )}
        {exportText && <textarea className="input" readOnly rows={6} value={exportText} onFocus={(e) => e.target.select()} aria-label={t.export} />}
      </section>
    </main>
  )
}

interface EditorProps {
  t: Strings
  lang: Lang
  cat: Category
  readOnly: boolean
  onChange: (c: Category) => void
  onDuplicate: () => void
  onExport: () => void
  confirmDelete: boolean
  onDelete: () => void
  onCancelDelete: () => void
}

function Editor({ t, lang, cat, readOnly, onChange, onDuplicate, onExport, confirmDelete, onDelete, onCancelDelete }: EditorProps) {
  const [level, setLevel] = useState(0)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [openLevels, setOpenLevels] = useState<number[]>([0])
  const levelNames = lang === 'ar' ? LEVEL_NAMES_AR : LEVEL_NAMES
  const LIMIT = 60

  const setLevels = (levels: Question[][]) => onChange({ ...cat, levels })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const qq = q.trim(), aa = a.trim()
    if (!qq || !aa) return
    if (editing) {
      setLevels(cat.levels.map((l) => l.map((x) => (x.id === editing ? { ...x, q: qq, a: aa } : x))))
      setEditing(null)
    } else {
      const id = `${cat.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
      setLevels(cat.levels.map((l, i) => (i === level ? [{ id, q: qq, a: aa }, ...l] : l)))
      setFresh(id)
      setOpenLevels((o) => (o.includes(level) ? o : [...o, level]))
      requestAnimationFrame(() => burstAt(document.querySelector(`[data-level="${level}"] .count`), 16, 90))
    }
    setQ('')
    setA('')
  }

  const startEdit = (x: Question, li: number) => {
    setEditing(x.id)
    setLevel(li)
    setQ(x.q)
    setA(x.a)
  }

  const needle = search.trim().toLowerCase()

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {readOnly ? (
          <h2>{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</h2>
        ) : (
          <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <input className="input" id="cat-name" value={cat.name} maxLength={40} aria-label={t.catName} onChange={(e) => onChange({ ...cat, name: e.target.value })} style={{ fontFamily: 'var(--fd)', fontSize: 22 }} />
            <input className="input" id="cat-name-ar" dir="rtl" lang="ar" value={cat.nameAr ?? ''} maxLength={40} placeholder={t.catNameAr} aria-label={t.catNameAr} onChange={(e) => onChange({ ...cat, nameAr: e.target.value || undefined })} />
          </div>
        )}
        <div className="row">
          {readOnly && (
            <button className="btn" onClick={onDuplicate} data-testid="duplicate">
              {t.duplicate}
            </button>
          )}
          <button className="btn alt" onClick={onExport} data-testid="export">
            {t.export}
          </button>
          {!readOnly &&
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
      {readOnly && <p className="muted" style={{ margin: 0 }}>{t.readOnly}</p>}

      {!readOnly && (
        <form className="addq" onSubmit={submit} data-testid="add-form">
          <select className="input" id="level" value={level} onChange={(e) => setLevel(+e.target.value)} aria-label="Difficulty" disabled={!!editing}>
            {VALUES.map((v, i) => (
              <option key={v} value={i}>
                {num(v, lang)} · {levelNames[i]}
              </option>
            ))}
          </select>
          <textarea className="input" id="new-q" rows={1} placeholder={t.clue} aria-label={t.clue} value={q} maxLength={LIMITS.clue} onChange={(e) => setQ(e.target.value)} required />
          <input className="input wide" id="new-a" placeholder={t.answer} aria-label={t.answer} value={a} maxLength={LIMITS.answer} onChange={(e) => setA(e.target.value)} required />
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn" type="submit">
              {editing ? t.save : t.add}
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
                {t.cancel}
              </button>
            )}
          </div>
        </form>
      )}

      <input className="input" id="search" type="search" placeholder={t.search} aria-label={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="levels">
        {cat.levels.map((pool, li) => {
          const list = needle ? pool.filter((x) => (x.q + ' ' + x.a).toLowerCase().includes(needle)) : pool
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
                <span className="count">
                  {qCount(pool.length, lang)}
                </span>
              </summary>
              {isOpen && (
                <ul className="qlist">
                  {list.slice(0, LIMIT).map((x) => (
                    <li key={x.id} className={`qrow${x.id === fresh ? ' new' : ''}`}>
                      <div style={{ minWidth: 0 }} dir="auto">
                        {x.q}
                        <em dir="auto">{x.a}</em>
                      </div>
                      {!readOnly && (
                        <div className="ops">
                          <button className="mini" onClick={() => startEdit(x, li)}>
                            {t.edit}
                          </button>
                          <button className="mini" onClick={() => setLevels(cat.levels.map((l, i) => (i === li ? l.filter((y) => y.id !== x.id) : l)))} aria-label={`${t.delete}: ${x.q}`}>
                            ✕
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {list.length > LIMIT && (
                    <li className="muted" style={{ fontSize: 12 }}>
                      {t.showing} {num(LIMIT, lang)} {t.of} {num(list.length, lang)}
                    </li>
                  )}
                </ul>
              )}
            </details>
          )
        })}
      </div>
    </div>
  )
}
