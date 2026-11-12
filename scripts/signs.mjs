// The question files spell honorifics out in words (so the checker in honorifics.mjs can read them);
// the packs show them as the Unicode honorific signs, which the app draws with Scheherazade New (src/index.css, 'GG Salawat').
export const PROPHET_SIGNS = [
  ['(عليه السلام)', '﵇'], // ﵇
  ['(عليها السلام)', '﵍'], // ﵍
  ['(عليهم السلام)', '﵈'], // ﵈
  ['(عليهما السلام)', '﵉'], // ﵉
]
// One Companion: the sign (Unicode has no رضوان sign, so these are the رضي الله عنه / عنها signs, as the owner asked).
// Several Companions keep (رِضْوَانُ اللَّهِ عَلَيْهِمْ) / (عَلَيْهِمَا) / (عَلَيْهِنَّ) written out.
export const COMPANION_SIGNS = [
  ['(رِضْوَانُ اللَّهِ عَلَيْهِ)', '\uFD41'], // ﵁
  ['(رِضْوَانُ اللَّهِ عَلَيْهَا)', '\uFD42'], // ﵂
]

// Arabic written inside English text: kept on one line (no-break spaces) and isolated (U+2068 … U+2069),
// so the brackets and words stay in order when the line wraps.
const WRITTEN = /\((رِضْوَانُ اللَّهِ عَلَيْ(?:هِمْ|هِمَا|هِنَّ)|عليهن السلام)\)|رحمة الله (?:عليه|عليها|عليهما|عليهم)/g
const keep = (m) => '\u2068' + m.replace(/ /g, '\u00A0') + '\u2069'

export function toSigns(s) {
  for (const [w, sign] of [...PROPHET_SIGNS, ...COMPANION_SIGNS]) s = s.split(w).join(sign)
  return s.replace(/\u2068|\u2069/g, '').replace(WRITTEN, keep)
}
