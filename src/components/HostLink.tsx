import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Lang } from '../lib/types'
import { useDialog } from './Legal'

/**
 * "Host version" button for the one-screen edition. Every click explains how the two versions differ,
 * then sends the person to the host version. Self-contained (its own English and Arabic text) so other
 * editions built from this code can reuse it as is.
 *
 * The address comes from VITE_HOST_URL, or "./host/" when the host build sits in a /host folder next to this one.
 */
export const HOST_URL: string = import.meta.env.VITE_HOST_URL || './host/'

const TEXT = {
  en: {
    button: 'Host version',
    title: 'One screen or two?',
    intro: 'You are using the regular version. The host version is the same game, set up for running it in front of a room.',
    regularHead: 'Regular version (this one)',
    regular: [
      'One screen. Everyone, the host included, looks at the same board.',
      'The answer appears on that screen when you reveal it.',
      'Best for a laptop or TV at home, a small group, or practice.',
    ],
    hostHead: 'Host version',
    host: [
      'Two screens. You run the game on your laptop and open a separate audience screen for the projector.',
      'The room sees the board, the clue and the scores. The answer shows only when you reveal it.',
      'Only you can peek at the answer on your laptop before deciding who got it right.',
      'Best for classes, competitions and events with a projector.',
    ],
    note: 'Your custom categories can move across with Export and Import in the category builder.',
    go: 'Open the host version',
    stay: 'Stay here',
  },
  ar: {
    button: 'نسخة المقدّم',
    title: 'شاشة واحدة أم شاشتان؟',
    intro: 'أنت تستخدم النسخة العادية. نسخة المقدّم هي اللعبة نفسها، مهيّأة لإدارتها أمام جمهور.',
    regularHead: 'النسخة العادية (هذه)',
    regular: [
      'شاشة واحدة: الجميع، ومنهم المقدّم، يرون اللوحة نفسها.',
      'تظهر الإجابة على تلك الشاشة عند كشفها.',
      'الأنسب للحاسوب أو التلفاز في البيت، أو لمجموعة صغيرة، أو للتدريب.',
    ],
    hostHead: 'نسخة المقدّم',
    host: [
      'شاشتان: تدير اللعبة من حاسوبك وتفتح شاشة جمهور منفصلة لجهاز العرض.',
      'يرى الحضور اللوحة والسؤال والنقاط، ولا تظهر الإجابة إلا عندما تكشفها.',
      'أنت وحدك تستطيع رؤية الإجابة على حاسوبك قبل أن تحكم.',
      'الأنسب للفصول والمسابقات والفعاليات التي فيها جهاز عرض.',
    ],
    note: 'يمكنك نقل فئاتك الخاصة عبر التصدير والاستيراد في منشئ الفئات.',
    go: 'افتح نسخة المقدّم',
    stay: 'ابقَ هنا',
  },
} as const

export function HostLink({ lang, href = HOST_URL }: { lang: Lang; href?: string }) {
  const [open, setOpen] = useState(false)
  const x = TEXT[lang]
  return (
    <>
      <button className="ghost" onClick={() => setOpen(true)} data-testid="host-link">
        {x.button}
      </button>
      {open && createPortal(<HostInfo lang={lang} href={href} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function HostInfo({ lang, href, onClose }: { lang: Lang; href: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  const x = TEXT[lang]
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel host-info" role="dialog" aria-modal="true" aria-labelledby="host-info-title" ref={ref} data-testid="host-info" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-head">
          <h1 id="host-info-title">{x.title}</h1>
        </div>
        <div className="legal-body">
          <p>{x.intro}</p>
          <div className="host-compare">
            <section>
              <h2>{x.regularHead}</h2>
              <ul>{x.regular.map((l) => <li key={l}>{l}</li>)}</ul>
            </section>
            <section className="is-host">
              <h2>{x.hostHead}</h2>
              <ul>{x.host.map((l) => <li key={l}>{l}</li>)}</ul>
            </section>
          </div>
          <p className="muted">{x.note}</p>
        </div>
        <div className="legal-actions">
          <button className="ghost" onClick={onClose} data-testid="host-info-stay">
            {x.stay}
          </button>
          <a className="btn" href={href} target="_blank" rel="noopener" onClick={onClose} data-autofocus data-testid="host-info-go">
            {x.go}
          </a>
        </div>
      </div>
    </div>
  )
}
