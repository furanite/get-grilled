import type { Lang } from '../lib/types'
import { URDU } from '../lib/edition'

const LABEL: Record<Lang, string> = { en: 'English', ar: 'العربية', ur: 'اردو' }

/** Buttons for the other languages: English and Arabic, plus Urdu on Munaafasatul Ilm. */
export function LangSwitch({ lang, setLang, testid }: { lang: Lang; setLang: (l: Lang) => void; testid?: string }) {
  const others = (URDU ? (['en', 'ar', 'ur'] as const) : (['en', 'ar'] as const)).filter((l) => l !== lang)
  return (
    <>
      {others.map((l, i) => (
        <button key={l} className="ghost lang-btn" onClick={() => setLang(l)} lang={l} data-lang={l} data-testid={i === 0 ? testid : undefined}>
          {LABEL[l]}
        </button>
      ))}
    </>
  )
}
