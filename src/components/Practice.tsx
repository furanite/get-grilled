import { useEffect, useMemo, useState } from 'react'
import type { Category, CategorySummary, Lang, PoolEdit, Question } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { applyPool } from '../lib/game'
import { loadPack } from '../lib/packs'
import { diagramSrc } from '../lib/diagram'
import { speakClue, stopSpeaking } from '../lib/voice'
import { qOf, aOf, nameOf } from '../lib/lang'

interface Props {
  t: Strings
  lang: Lang
  index: CategorySummary[] | null
  custom: Category[]
  pools: Record<string, PoolEdit>
  onBack: () => void
}

interface Card {
  q: Question
  cat: string
  level: number
}

const COUNTS = [10, 20, 30]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** One person on their own: pick categories and levels, see a question, show the answer, and say whether you got it. */
export default function Practice({ t, lang, index, custom, pools, onBack }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [levels, setLevels] = useState<number[]>([0, 1, 2, 3, 4])
  const [count, setCount] = useState(10)
  const [find, setFind] = useState('')
  const [deck, setDeck] = useState<Card[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(false)
  const [marks, setMarks] = useState<boolean[]>([])

  const all = useMemo(() => {
    const mine = custom.map((c) => ({ id: c.id, name: c.set ? `${c.set.title} · ${c.name}` : c.name, nameAr: c.nameAr }))
    const built = (index ?? []).map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr }))
    return [...mine, ...built.sort((a, b) => a.name.localeCompare(b.name))]
  }, [index, custom])
  const label = (c: { name: string; nameAr?: string }) => (nameOf(c, lang))
  const shownCats = find.trim() ? all.filter((c) => (c.name + ' ' + (c.nameAr ?? '')).toLowerCase().includes(find.trim().toLowerCase())) : all

  const start = async (from?: Card[]) => {
    setError('')
    if (from) {
      setDeck(shuffle(from))
    } else {
      setBusy(true)
      try {
        const cats = (await Promise.all(picked.map((id) => custom.find((c) => c.id === id) ?? loadPack(id)))).map((c) => applyPool(c, pools[c.id]))
        const cards: Card[] = []
        for (const c of cats) for (const l of levels) for (const q of c.levels[l] ?? []) cards.push({ q, cat: label(c), level: l })
        if (!cards.length) {
          setError(t.practice.none)
          return
        }
        setDeck(shuffle(cards).slice(0, count))
      } catch (e) {
        setError((e as Error).message)
        return
      } finally {
        setBusy(false)
      }
    }
    setI(0)
    setShown(false)
    setMarks([])
  }

  const card = deck?.[i]
  const qText = card ? (qOf(card.q, lang)) : ''
  const versions = card ? [card.q.q, card.q.qAr, card.q.qUr] : []
  const allText = versions.join('\n')
  useEffect(() => {
    if (!qText) return
    speakClue(qText, lang, allText.split('\n'))
    return () => stopSpeaking()
  }, [qText, lang, allText])

  const mark = (got: boolean) => {
    setMarks((m) => [...m, got])
    setShown(false)
    setI((n) => n + 1)
  }

  useEffect(() => {
    if (!deck || i >= deck.length) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        setShown(true)
      } else if (shown && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'y')) mark(true)
      else if (shown && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'n')) mark(false)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const head = (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <button className="ghost" onClick={deck ? () => setDeck(null) : onBack} data-testid="practice-back">
        ← {t.back}
      </button>
      <h1>{t.practice.title}</h1>
      <span />
    </div>
  )

  if (deck && i >= deck.length) {
    const got = marks.filter(Boolean).length
    const missed = deck.filter((_, k) => !marks[k])
    return (
      <main className="stack practice" data-testid="practice">
        {head}
        <section className="panel practice-done">
          <h2>{t.practice.done}</h2>
          <p className="practice-score" data-testid="practice-score">
            {t.practice.scored} <b>{num(got, lang)}</b> {t.practice.of} {num(deck.length, lang)}
          </p>
          {missed.length > 0 && (
            <>
              <h3 className="label">{t.practice.review}</h3>
              <ol className="practice-review">
                {missed.map((c, k) => (
                  <li key={k}>
                    <span dir="auto">{qOf(c.q, lang)}</span>
                    <br />
                    <i dir="auto">→ {aOf(c.q, lang)}</i>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="row">
            {missed.length > 0 && (
              <button className="btn" onClick={() => start(missed)} data-testid="practice-retry">
                {t.practice.retry}
              </button>
            )}
            <button className="btn alt" onClick={() => setDeck(null)}>
              {t.practice.again}
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (deck && card) {
    const a = aOf(card.q, lang)
    return (
      <main className="stack practice" data-testid="practice">
        {head}
        <section className="panel practice-card" key={i}>
          <span className="label">
            {num(i + 1, lang)} {t.ofTotal} {num(deck.length, lang)} · {card.cat} · {num(VALUES[card.level], lang)}
          </span>
          <p className="q" dir="auto" data-testid="practice-q">
            {qText}
          </p>
          {card.q.img && (
            <div className="q-fig">
              <img className={`q-img${card.q.credit ? ' photo' : ''}`} src={diagramSrc(card.q.img)} alt={t.diagramAlt} />
              {card.q.credit && <p className="q-credit">{card.q.credit}</p>}
            </div>
          )}
          {shown ? (
            <>
              <div className="answer show" dir="auto" data-testid="practice-a">
                {a}
              </div>
              <div className="row">
                <button className="btn ok-btn" onClick={() => mark(true)} data-testid="practice-got" autoFocus>
                  ✓ {t.practice.gotIt}
                </button>
                <button className="btn alt" onClick={() => mark(false)} data-testid="practice-missed">
                  ✗ {t.practice.missed}
                </button>
              </div>
            </>
          ) : (
            <button className="btn big" onClick={() => setShown(true)} data-testid="practice-show" autoFocus>
              {t.practice.show}
            </button>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="stack practice" data-testid="practice">
      {head}
      <p className="muted">{t.practice.help}</p>
      <section className="panel practice-setup">
        <div className="field">
          <span className="label">
            {t.practice.pick} ({num(picked.length, lang)})
          </span>
          <input className="input" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="🔍" aria-label={t.practice.pick} dir="auto" />
          {!index && <p className="muted">{t.practice.loading}</p>}
          <div className="practice-cats">
            {shownCats.map((c) => (
              <label className="check" key={c.id}>
                <input type="checkbox" checked={picked.includes(c.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))} data-practice-cat={c.id} />
                <span dir="auto">{label(c)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">{t.practice.levels}</span>
          <div className="row">
            {VALUES.map((v, l) => (
              <label className="check" key={l}>
                <input type="checkbox" checked={levels.includes(l)} onChange={(e) => setLevels((p) => (e.target.checked ? [...p, l].sort() : p.filter((x) => x !== l)))} />
                {num(v, lang)}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">{t.practice.count}</span>
          <div className="seg">
            {COUNTS.map((n) => (
              <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n)} aria-pressed={count === n}>
                {num(n, lang)}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="err">{error}</p>}
        <button className="btn big" disabled={!picked.length || !levels.length || busy} onClick={() => start()} data-testid="practice-go">
          {busy ? t.practice.loading : t.practice.go}
        </button>
      </section>
    </main>
  )
}
