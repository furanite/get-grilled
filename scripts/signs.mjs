// The question files spell honorifics out in words (so the checker in honorifics.mjs can read them);
// the packs show them as the Unicode honorific signs, which the app draws with Scheherazade New (src/index.css, 'GG Salawat').
export const PROPHET_SIGNS = [
  ['(عليه السلام)', '﵇'], // ﵇
  ['(عليها السلام)', '﵍'], // ﵍
  ['(عليهم السلام)', '﵈'], // ﵈
  ['(عليهما السلام)', '﵉'], // ﵉
]
// Unicode has no sign for رضوان الله عليه; these are the رضي الله عنه signs.
export const COMPANION_SIGNS = [
  ['(رِضْوَانُ اللَّهِ عَلَيْهِ)', '﵁'], // ﵁
  ['(رِضْوَانُ اللَّهِ عَلَيْهَا)', '﵂'], // ﵂
  ['(رِضْوَانُ اللَّهِ عَلَيْهِمْ)', '﵃'], // ﵃
  ['(رِضْوَانُ اللَّهِ عَلَيْهِمَا)', '﵄'], // ﵄
  ['(رِضْوَانُ اللَّهِ عَلَيْهِنَّ)', '﵅'], // ﵅
]
export const USE_COMPANION_SIGNS = false

export function toSigns(s) {
  for (const [w, sign] of [...PROPHET_SIGNS, ...(USE_COMPANION_SIGNS ? COMPANION_SIGNS : [])]) s = s.split(w).join(sign)
  return s
}
