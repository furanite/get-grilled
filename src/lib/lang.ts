import type { Lang } from './types'

/** Arabic and Urdu read right to left. */
export const isRtl = (l: Lang) => l !== 'en'
export const dirOf = (l: Lang): 'rtl' | 'ltr' => (isRtl(l) ? 'rtl' : 'ltr')
/** Dates and times: Arabic and Urdu wording with the digits players already use. */
export const localeOf = (l: Lang) => (l === 'ar' ? 'ar-SA-u-nu-latn' : l === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB')

type Texts = { q: string; a: string; qAr?: string; aAr?: string; qUr?: string; aUr?: string }
type Names = { name: string; nameAr?: string; nameUr?: string }

/** A clue in the chosen language, or the English when it has not been translated yet. */
export const qOf = (x: Texts, l: Lang) => (l === 'ar' && x.qAr) || (l === 'ur' && x.qUr) || x.q
export const aOf = (x: Texts, l: Lang) => (l === 'ar' && x.aAr) || (l === 'ur' && x.aUr) || x.a
export const nameOf = (c: Names, l: Lang) => (l === 'ar' && c.nameAr) || (l === 'ur' && c.nameUr) || c.name
/** A category's name in the chosen language, with its name in the other language beneath it. */
export const namePair = (c: Names, l: Lang): [string, string | undefined] =>
  l === 'ar' && c.nameAr ? [c.nameAr, c.name] : l === 'ur' && c.nameUr ? [c.nameUr, c.name] : [c.name, c.nameAr]

import nastaliq from '@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2?url'

/**
 * Urdu is written in Nastaliq. Every theme's font list starts with 'GG Honorifics', so while Urdu is on, a
 * Nastaliq face is added to that family for Arabic-script letters (the honorific signs keep their own face).
 * It has the same descriptors as the honorifics face (no weight), because the browser only mixes faces of one
 * family by letter range when their weight and style match. Switching back to English or Arabic takes it away
 * again, so Arabic keeps its Naskh fonts.
 */
const RANGE = 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FD3F,U+FD50-FDF9,U+FDFB-FDFF,U+FE70-FEFF'
const URDU_FACES = `@font-face{font-family:'GG Honorifics';src:url('${nastaliq}') format('woff2');font-display:swap;unicode-range:${RANGE}}`

/** Sets a page's language, direction and, for Urdu, the Nastaliq letters. */
export function setDocLang(html: HTMLElement, l: Lang) {
  html.lang = l
  html.dir = dirOf(l)
  const doc = html.ownerDocument
  let style = doc.getElementById('gg-urdu-font')
  if (l === 'ur' && !style) {
    style = doc.createElement('style')
    style.id = 'gg-urdu-font'
    style.textContent = URDU_FACES
    doc.head.appendChild(style)
  } else if (l !== 'ur' && style) style.remove()
}
