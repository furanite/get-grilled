import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../lib/types'

/**
 * Scholar review: lets 'ulama check every line of the Islamic and Kids collections for correctness
 * and adab. Verdicts stay in this browser until the reviewer downloads them as a file and sends it
 * to the app owner, who puts it in the repository's reviews/ folder. Any line flagged there is held
 * out of the game until it is fixed. No account and no server are needed.
 */

type Mark = 'ok' | 'issue'
interface Verdict { correct?: Mark; adab?: Mark; note?: string; fix?: string; at?: string }
interface Saved { reviewer: string; verdicts: Record<string, Verdict> }
interface PastReview { reviewer: string; date: string; correct?: Mark; adab?: Mark; note?: string; fix?: string }
interface Item { id: string; level: string; q: string; a: string; kind?: string; src?: string; held?: 'unchecked' | 'flagged'; reviews?: PastReview[] }
interface PackReview { id: string; name: string; group: string; items: Item[] }
interface IndexRow { id: string; name: string; group: string; total: number }

const KEY = 'gg.review.v1'
const base = import.meta.env.BASE_URL

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object' && s.verdicts) return { reviewer: String(s.reviewer ?? ''), verdicts: s.verdicts }
  } catch { /* nothing saved yet */ }
  return { reviewer: '', verdicts: {} }
}
function save(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full or blocked: the download still works */ }
}

const TEXT = {
  en: {
    title: 'Scholar review',
    intro: "For 'ulama and qualified teachers: check each question and its answer for correctness (creed, fiqh, hadith grading, facts and sources) and for adab (respect for Allah, the Blessed Prophets (عليهم السلام), our Beloved Prophet ﷺ, the Companions (رِضْوَانُ اللَّهِ عَلَيْهِم) and the scholars).",
    how: 'Your answers are kept in this browser only. When you finish, download your review and send the file to the app owner. Any line you flag is taken out of the game until it is corrected.',
    public: 'Please note: once the owner adds your file, the name and title you enter here, your verdicts and your notes are shown on this public review page next to each question. Use only the name you are happy to have shown, and do not put anyone\'s personal details in your notes.',
    name: 'Your name and title',
    namePh: 'e.g. Shaykh Ahmad, teacher of fiqh',
    category: 'Category',
    show: 'Show',
    all: 'All', todo: 'Not yet reviewed', mine: 'Flagged by me', held: 'Held back (to verify)',
    level: 'Level',
    answer: 'Answer',
    source: 'Source',
    kinds: { H: 'Historical / sourced', D: 'Dramatised', F: 'Fictional or illustrative' } as Record<string, string>,
    heldU: 'Held back: the compiler was not sure of this. Please verify.',
    heldF: 'Held back: flagged by a reviewer.',
    correctness: 'Correctness', adab: 'Adab',
    ok: 'Correct', okA: 'Proper', issue: 'Problem',
    note: 'What is wrong, and the evidence or reference',
    fix: 'Suggested correction (optional)',
    others: 'Earlier reviews',
    progress: (d: number, n: number) => `${d} of ${n} reviewed in this category`,
    total: (d: number) => `${d} reviewed in total`,
    download: 'Download my review',
    importF: 'Load a review file',
    needName: 'Please enter your name first, so the owner knows who reviewed.',
    back: 'Back',
    loading: 'Loading…',
    none: 'Nothing to show with this filter.',
    clear: 'Clear',
    imported: (n: number) => `Loaded ${n} verdicts.`,
    bad: 'That file is not a review file.',
    big: 'That file is too big to be a review file (over 2 MB).',
  },
  ar: {
    title: 'مراجعة العلماء',
    intro: 'للعلماء والمدرّسين المؤهلين: راجعوا كل سؤال وجوابه من حيث الصحة (العقيدة والفقه ودرجة الحديث والوقائع والمصادر) ومن حيث الأدب (مع الله تعالى، والأنبياء الكرام عليهم السلام، وحبيبنا المصطفى ﷺ، والصحابة رِضْوَانُ اللَّهِ عَلَيْهِم، والعلماء).',
    how: 'تُحفظ إجاباتك في هذا المتصفح فقط. عند الانتهاء نزّل ملف المراجعة وأرسله إلى صاحب التطبيق. كل سطر تعلّم عليه يُرفع من اللعبة حتى يُصحَّح.',
    public: 'تنبيه: بعد أن يضيف صاحب التطبيق ملفك، يظهر الاسم واللقب اللذان تكتبهما هنا، مع أحكامك وملاحظاتك، في صفحة المراجعة العامة بجانب كل سؤال. اكتب الاسم الذي ترضى بظهوره فقط، ولا تضع بيانات شخصية لأحد في ملاحظاتك.',
    name: 'اسمك ولقبك',
    namePh: 'مثال: الشيخ أحمد، مدرّس الفقه',
    category: 'الفئة',
    show: 'عرض',
    all: 'الكل', todo: 'لم يُراجع بعد', mine: 'ما علّمتُ عليه', held: 'المعلّقة (للتحقق)',
    level: 'المستوى',
    answer: 'الجواب',
    source: 'المصدر',
    kinds: { H: 'تاريخي / موثّق', D: 'مُمَثَّل', F: 'خيالي أو توضيحي' } as Record<string, string>,
    heldU: 'معلّق: لم يتأكد المُعِدّ منه. يُرجى التحقق.',
    heldF: 'معلّق: علّم عليه أحد المراجعين.',
    correctness: 'الصحة', adab: 'الأدب',
    ok: 'صحيح', okA: 'لائق', issue: 'فيه إشكال',
    note: 'ما الخطأ، مع الدليل أو المرجع',
    fix: 'التصحيح المقترح (اختياري)',
    others: 'مراجعات سابقة',
    progress: (d: number, n: number) => `روجع ${d} من ${n} في هذه الفئة`,
    total: (d: number) => `روجع ${d} إجمالًا`,
    download: 'تنزيل مراجعتي',
    importF: 'تحميل ملف مراجعة',
    needName: 'يُرجى كتابة اسمك أولًا ليعرف صاحب التطبيق من راجع.',
    back: 'رجوع',
    loading: 'جارٍ التحميل…',
    none: 'لا شيء يطابق هذا العرض.',
    clear: 'مسح',
    imported: (n: number) => `حُمّلت ${n} مراجعة.`,
    bad: 'هذا ليس ملف مراجعة.',
    big: 'هذا الملف أكبر من أن يكون ملف مراجعة (أكثر من ٢ ميغابايت).',
  },
}

const reviewed = (v?: Verdict) => !!v && (v.correct !== undefined || v.adab !== undefined)
const hasIssue = (v?: Verdict) => !!v && (v.correct === 'issue' || v.adab === 'issue')

export default function Review({ lang, notify, onBack }: { lang: Lang; notify: (s: string) => void; onBack: () => void }) {
  const t = TEXT[lang]
  const [saved, setSaved] = useState<Saved>(load)
  const [index, setIndex] = useState<IndexRow[] | null>(null)
  const [packId, setPackId] = useState('')
  const [pack, setPack] = useState<PackReview | null>(null)
  const [filter, setFilter] = useState<'all' | 'todo' | 'mine' | 'held'>('all')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => save(saved), [saved])
  useEffect(() => {
    fetch(`${base}review/index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: IndexRow[]) => { setIndex(rows); setPackId((p) => p || rows[0]?.id || '') })
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    if (!packId) return
    setPack(null)
    fetch(`${base}review/${packId}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setPack)
      .catch((e: Error) => setError(e.message))
  }, [packId])

  const set = (id: string, patch: Partial<Verdict>) =>
    setSaved((s) => {
      const v = { ...s.verdicts[id], ...patch, at: new Date().toISOString() }
      const verdicts = { ...s.verdicts, [id]: v }
      if (!reviewed(v) && !v.note && !v.fix) delete verdicts[id]
      return { ...s, verdicts }
    })

  const items = useMemo(() => {
    const all = pack?.items ?? []
    if (filter === 'todo') return all.filter((x) => !reviewed(saved.verdicts[x.id]))
    if (filter === 'mine') return all.filter((x) => hasIssue(saved.verdicts[x.id]))
    if (filter === 'held') return all.filter((x) => x.held)
    return all
  }, [pack, filter, saved.verdicts])

  const doneHere = (pack?.items ?? []).filter((x) => reviewed(saved.verdicts[x.id])).length
  const doneAll = Object.values(saved.verdicts).filter(reviewed).length

  const download = () => {
    if (!saved.reviewer.trim()) { notify(t.needName); return }
    const data = { app: 'Munaafasatul Ilm scholar review', reviewer: saved.reviewer.trim(), date: new Date().toISOString(), verdicts: saved.verdicts }
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `review-${saved.reviewer.trim().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'scholar'}-${data.date.slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importFile = async (f: File) => {
    if (f.size > 2_000_000) { notify(t.big); return }
    try {
      const data = JSON.parse(await f.text())
      if (!data || typeof data.verdicts !== 'object') throw new Error('bad')
      const verdicts: Record<string, Verdict> = {}
      for (const [id, v] of Object.entries(data.verdicts as Record<string, Verdict>)) {
        if (!/^[0-9a-f]{8}$/.test(id) || !v || typeof v !== 'object') continue
        const m = (x: unknown) => (x === 'ok' || x === 'issue' ? x : undefined)
        verdicts[id] = { correct: m(v.correct), adab: m(v.adab), note: v.note ? String(v.note).slice(0, 1000) : undefined, fix: v.fix ? String(v.fix).slice(0, 400) : undefined, at: v.at ? String(v.at).slice(0, 40) : undefined }
      }
      setSaved((s) => ({ reviewer: s.reviewer || String(data.reviewer ?? '').slice(0, 80), verdicts: { ...s.verdicts, ...verdicts } }))
      notify(t.imported(Object.keys(verdicts).length))
    } catch {
      notify(t.bad)
    }
  }

  return (
    <main className="review stack" dir={lang === 'ar' ? 'rtl' : 'ltr'} data-testid="review">
      <section className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 className="review-title">{t.title}</h1>
          <button className="ghost" onClick={onBack}>{t.back}</button>
        </div>
        <p>{t.intro}</p>
        <p className="muted">{t.how}</p>
        <p className="muted" data-testid="review-public">{t.public}</p>
        <label className="review-field">
          <span className="label">{t.name}</span>
          <input className="input" value={saved.reviewer} maxLength={80} placeholder={t.namePh} onChange={(e) => setSaved((s) => ({ ...s, reviewer: e.target.value }))} data-testid="review-name" />
        </label>
        <div className="row review-actions">
          <button className="btn" onClick={download} data-testid="review-download">{t.download}</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>{t.importF}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = '' }} />
          <span className="muted">{t.total(doneAll)}</span>
        </div>
      </section>

      <section className="panel stack">
        {error && <p className="error">{error}</p>}
        {!index && !error && <p>{t.loading}</p>}
        {index && (
          <div className="row review-filters">
            <label className="review-field">
              <span className="label">{t.category}</span>
              <select className="input" value={packId} onChange={(e) => setPackId(e.target.value)} data-testid="review-pack">
                {index.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.total})</option>)}
              </select>
            </label>
            <label className="review-field">
              <span className="label">{t.show}</span>
              <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} data-testid="review-filter">
                <option value="all">{t.all}</option>
                <option value="todo">{t.todo}</option>
                <option value="mine">{t.mine}</option>
                <option value="held">{t.held}</option>
              </select>
            </label>
            {pack && <span className="muted">{t.progress(doneHere, pack.items.length)}</span>}
          </div>
        )}
        {index && !pack && !error && <p>{t.loading}</p>}
        {pack && items.length === 0 && <p className="muted">{t.none}</p>}
        <ol className="review-list">
          {items.map((x) => {
            const v = saved.verdicts[x.id] ?? {}
            const pick = (field: 'correct' | 'adab', m: Mark) => set(x.id, { [field]: v[field] === m ? undefined : m })
            return (
              <li key={x.id} className={`review-item${hasIssue(v) ? ' flag' : reviewed(v) ? ' done' : ''}`} data-testid="review-item" data-qid={x.id}>
                <div className="review-meta">
                  <span className="pill">{t.level} {x.level}</span>
                  {x.kind && <span className="pill">{t.kinds[x.kind] ?? x.kind}</span>}
                  <span className="qid" dir="ltr">#{x.id}</span>
                </div>
                {x.held && <p className="review-held">{x.held === 'unchecked' ? t.heldU : t.heldF}</p>}
                <p className="review-q" dir="auto" lang="en">{x.q}</p>
                <p className="review-a" dir="auto" lang="en"><b>{t.answer}:</b> {x.a}</p>
                {x.src && <p className="review-src" dir="auto" lang="en"><b>{t.source}:</b> {x.src}</p>}
                {x.reviews && x.reviews.length > 0 && (
                  <details className="review-past">
                    <summary>{t.others} ({x.reviews.length})</summary>
                    <ul>{x.reviews.map((r, i) => <li key={i}><b>{r.reviewer}</b>: {t.correctness} {r.correct ?? '-'}, {t.adab} {r.adab ?? '-'}{r.note ? `. ${r.note}` : ''}{r.fix ? ` → ${r.fix}` : ''}</li>)}</ul>
                  </details>
                )}
                <div className="review-checks">
                  <div role="group" aria-label={t.correctness}>
                    <span className="label">{t.correctness}</span>
                    <button className={v.correct === 'ok' ? 'btn' : 'ghost'} aria-pressed={v.correct === 'ok'} onClick={() => pick('correct', 'ok')} data-testid="correct-ok">✓ {t.ok}</button>
                    <button className={v.correct === 'issue' ? 'btn warn' : 'ghost'} aria-pressed={v.correct === 'issue'} onClick={() => pick('correct', 'issue')} data-testid="correct-issue">! {t.issue}</button>
                  </div>
                  <div role="group" aria-label={t.adab}>
                    <span className="label">{t.adab}</span>
                    <button className={v.adab === 'ok' ? 'btn' : 'ghost'} aria-pressed={v.adab === 'ok'} onClick={() => pick('adab', 'ok')} data-testid="adab-ok">✓ {t.okA}</button>
                    <button className={v.adab === 'issue' ? 'btn warn' : 'ghost'} aria-pressed={v.adab === 'issue'} onClick={() => pick('adab', 'issue')} data-testid="adab-issue">! {t.issue}</button>
                  </div>
                </div>
                {(hasIssue(v) || v.note || v.fix) && (
                  <div className="review-notes">
                    <textarea className="input" rows={2} maxLength={1000} placeholder={t.note} value={v.note ?? ''} onChange={(e) => set(x.id, { note: e.target.value || undefined })} data-testid="review-note" />
                    <input className="input" maxLength={400} placeholder={t.fix} value={v.fix ?? ''} onChange={(e) => set(x.id, { fix: e.target.value || undefined })} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
