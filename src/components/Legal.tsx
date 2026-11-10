import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Lang } from '../lib/types'
import { CONSENT_TEXT, LEGAL, PRIVACY, TERMS, type LegalDoc } from '../lib/legal'
import { saveConsent } from '../lib/store'

type View = 'summary' | 'terms' | 'privacy'

const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps keyboard focus inside the dialog and stops Esc from reaching the page. */
function useDialog(ref: React.RefObject<HTMLDivElement>, onEsc?: () => void) {
  const escRef = useRef(onEsc)
  escRef.current = onEsc
  useLayoutEffect(() => {
    const app = document.querySelector<HTMLElement>('.app')
    app?.setAttribute('inert', '')
    app?.setAttribute('aria-hidden', 'true')
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current
      if (!root) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        escRef.current?.()
        return
      }
      if (e.key !== 'Tab') {
        // Keys typed while the dialog is open never reach the game's shortcuts.
        if (!root.contains(e.target as Node)) e.stopImmediatePropagation()
        return
      }
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!items.length) return e.preventDefault()
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (!root.contains(active)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      app?.removeAttribute('inert')
      app?.removeAttribute('aria-hidden')
      prev?.focus?.()
    }
  }, [ref])
}

function DocView({ doc, lang }: { doc: LegalDoc; lang: Lang }) {
  const c = CONSENT_TEXT[lang]
  return (
    <div className="legal-doc" data-testid="legal-doc">
      <h2>{doc.title}</h2>
      <p className="muted">{doc.meta}</p>
      {doc.clauses.map((cl) => (
        <section key={cl.title}>
          <p>
            <b>{cl.title}</b> {cl.body.join(' ')}
          </p>
          {cl.list && (
            <ul>
              {cl.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
          {cl.after?.map((a) => <p key={a}>{a}</p>)}
        </section>
      ))}
      <p className="muted">{c.arabicPrevails}</p>
    </div>
  )
}

interface ConsentProps {
  lang: Lang
  setLang: (l: Lang) => void
  reduceFx: boolean
  setReduceFx: (on: boolean) => void
  onAccept: () => void
}

/** The first-visit window. Play is blocked until the player ticks the box and presses Accept. */
export function ConsentDialog({ lang, setLang, reduceFx, setReduceFx, onAccept }: ConsentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>('summary')
  const [agree, setAgree] = useState(false)
  const [declined, setDeclined] = useState(false)
  const c = CONSENT_TEXT[lang]
  useDialog(ref)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    ref.current?.querySelector('.legal-body')?.scrollTo?.(0, 0)
  }, [view])

  return (
    <div className="legal-backdrop">
      <div className="legal-panel" role="dialog" aria-modal="true" aria-labelledby="consent-title" ref={ref} data-testid="consent" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-head">
          <h1 id="consent-title">{view === 'summary' ? c.title : view === 'terms' ? TERMS[lang].title : PRIVACY[lang].title}</h1>
          <button className="ghost" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} lang={lang === 'en' ? 'ar' : 'en'} data-testid="consent-lang">
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
        <div className="legal-body">
          {view === 'summary' ? (
            <>
              <p>{c.intro}</p>
              <ul>
                {c.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="legal-warn" data-testid="photo-warning">
                <p>
                  <b>{c.warnTitle}</b> {c.warn}
                </p>
                <label className="check">
                  <input type="checkbox" checked={reduceFx} onChange={(e) => setReduceFx(e.target.checked)} data-testid="consent-reduce" />
                  <span>{c.reduceNow}</span>
                </label>
              </div>
              <label className="check agree">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked)
                    if (e.target.checked) setDeclined(false)
                  }}
                  data-testid="consent-agree"
                  data-autofocus
                />
                <span>
                  {c.agreeA}
                  <button type="button" className="linkish" onClick={() => setView('terms')} data-testid="open-terms">
                    {c.terms}
                  </button>
                  {c.and}
                  <button type="button" className="linkish" onClick={() => setView('privacy')} data-testid="open-privacy">
                    {c.privacy}
                  </button>
                  {c.agreeB}
                </span>
              </label>
              {declined && (
                <p className="legal-declined" role="alert" data-testid="declined">
                  {c.declined}
                </p>
              )}
            </>
          ) : (
            <DocView doc={view === 'terms' ? TERMS[lang] : PRIVACY[lang]} lang={lang} />
          )}
        </div>
        <div className="legal-actions">
          {view === 'summary' ? (
            <>
              <button className="btn alt" onClick={() => setDeclined(true)} data-testid="consent-decline">
                {c.decline}
              </button>
              <button
                className="btn"
                disabled={!agree}
                data-testid="consent-accept"
                onClick={() => {
                  saveConsent({ version: LEGAL.termsVersion, date: new Date().toISOString() })
                  onAccept()
                }}
              >
                {c.accept}
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setView('summary')} data-testid="legal-back" data-autofocus>
              {c.backToSummary}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Terms or Privacy opened later from the footer. This one can be closed. */
export function LegalViewer({ which, lang, onClose }: { which: 'terms' | 'privacy'; lang: Lang; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const c = CONSENT_TEXT[lang]
  useDialog(ref, onClose)
  const doc = which === 'terms' ? TERMS[lang] : PRIVACY[lang]
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel" role="dialog" aria-modal="true" aria-label={doc.title} ref={ref} data-testid="legal-viewer" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-body">
          <DocView doc={doc} lang={lang} />
        </div>
        <div className="legal-actions">
          <button className="btn" onClick={onClose} data-autofocus data-testid="legal-close">
            {c.close}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Footer({ lang, onOpen }: { lang: Lang; onOpen: (w: 'terms' | 'privacy') => void }) {
  const c = CONSENT_TEXT[lang]
  return (
    <footer className="site-footer" data-testid="footer">
      <span>
        © {LEGAL.year} {lang === 'ar' ? LEGAL.ownerAr : LEGAL.owner}
      </span>
      <span className="row" style={{ gap: 14 }}>
        <button className="linkish" onClick={() => onOpen('terms')} data-testid="footer-terms">
          {c.terms}
        </button>
        <button className="linkish" onClick={() => onOpen('privacy')} data-testid="footer-privacy">
          {c.privacy}
        </button>
      </span>
    </footer>
  )
}
