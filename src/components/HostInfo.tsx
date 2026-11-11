import { useRef } from 'react'
import type { Lang } from '../lib/types'
import { appName } from '../lib/edition'
import { useDialog } from './Legal'

/** Where the host edition lives: the /host/ folder next to this app. */
export const HOST_URL = `${import.meta.env.BASE_URL}host/`

const TEXT = {
  en: {
    button: 'Host version',
    title: 'Go to the host version?',
    intro: (n: string) => `${n} comes in two versions. You are using the standard version.`,
    thisTitle: 'Standard version (this one)',
    thisPoints: [
      'One screen for everyone: the board, clues and answers all show on the same screen.',
      'Answers stay hidden until you press "Reveal answer".',
      'Best for playing together around one laptop, tablet or phone.',
    ],
    hostTitle: 'Host version',
    hostPoints: [
      'Made for a laptop connected to a projector or a TV.',
      'Opens a second "audience" window that you drag to the projector. The audience sees the board, the clue and, when you show it, the answer.',
      'Your laptop screen shows you the answer early, so you can judge quickly, and you run scoring from there.',
      'Needs a computer with a second screen, and pop-ups allowed for this site.',
    ],
    go: 'Open the host version',
    stay: 'Stay here',
    note: 'The host version opens in a new tab, so this game stays open.',
  },
  ar: {
    button: 'نسخة المقدّم',
    title: 'الانتقال إلى نسخة المقدّم؟',
    intro: (n: string) => `لـ${n} نسختان، وأنت الآن تستخدم النسخة العادية.`,
    thisTitle: 'النسخة العادية (هذه)',
    thisPoints: [
      'شاشة واحدة للجميع: اللوحة والأسئلة والإجابات تظهر على الشاشة نفسها.',
      'تبقى الإجابة مخفية حتى تضغط «أظهر الإجابة».',
      'مناسبة للعب معًا حول حاسوب أو جهاز لوحي أو هاتف واحد.',
    ],
    hostTitle: 'نسخة المقدّم',
    hostPoints: [
      'مصممة لحاسوب موصول بجهاز عرض أو شاشة تلفاز.',
      'تفتح نافذة ثانية للجمهور تسحبها إلى جهاز العرض، فيرى الجمهور اللوحة والسؤال، والإجابة حين تظهرها.',
      'تُظهر لك شاشة حاسوبك الإجابة مسبقًا لتحكم بسرعة، ومنها تدير النقاط.',
      'تحتاج حاسوبًا بشاشة ثانية، مع السماح بالنوافذ المنبثقة لهذا الموقع.',
    ],
    go: 'افتح نسخة المقدّم',
    stay: 'ابقَ هنا',
    note: 'تُفتح نسخة المقدّم في علامة تبويب جديدة، فتبقى هذه اللعبة مفتوحة.',
  },
}

export const hostButtonLabel = (lang: Lang) => TEXT[lang].button

/** Shown every time the standard version's "Host version" button is pressed: explains the difference, then opens /host/. */
export function HostInfo({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const t = TEXT[lang]
  useDialog(ref, onClose)
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel host-info" role="dialog" aria-modal="true" aria-labelledby="host-info-title" ref={ref} data-testid="host-info" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="legal-body">
          <h2 id="host-info-title">{t.title}</h2>
          <p>{t.intro(appName(lang))}</p>
          <h3>{t.thisTitle}</h3>
          <ul>{t.thisPoints.map((p) => <li key={p}>{p}</li>)}</ul>
          <h3>{t.hostTitle}</h3>
          <ul>{t.hostPoints.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="muted">{t.note}</p>
        </div>
        <div className="legal-actions">
          <button className="ghost" onClick={onClose} data-testid="host-info-stay">{t.stay}</button>
          <a className="btn" href={HOST_URL} target="_blank" rel="noopener" onClick={onClose} data-autofocus data-testid="host-info-go">{t.go}</a>
        </div>
      </div>
    </div>
  )
}
