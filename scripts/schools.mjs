// Which schools of fiqh a ruling clue speaks for, as letters: h Hanafi, m Maliki, s Shafi'i, b Hanbali.
// '' means the clue is general (all schools agree, or it is not a school ruling), so it is shown under every school.
// Only fiqh files are tagged; biographies and book questions stay general.
export const MADHHAB_FILES = new Set(['kids-wudu-salah', 'kids-calendar'])
export const isMadhhabFile = (id, group) => group === 'fiqh' || MADHHAB_FILES.has(id)

export function schoolsOf(q) {
  const t = q
  if (/four schools|all four|most scholars|the majority|by the majority/i.test(t)) return ''
  if (/\b(book|text|wrote|written|commentary|gloss|poem|scholar|author|compiled|dictated|teacher|student of|work|collection|books|code|jurist|imam of|earned his living|partner|chapter|founder)\b/i.test(t) && !/^(In|By) /.test(t)) return ''
  const has = { h: /Hanafi|Abu Hanifah|Abu Yusuf|two students|Imam Muhammad\b|Muhammad's view|view of Muhammad/.test(t), m: /Maliki/.test(t), s: /Shafi'i/.test(t), b: /Hanbali/.test(t) }
  const not = /\b(not in|except in|other than) the (Hanafi|Maliki|Shafi'i|Hanbali) school/.exec(t)
  if (not) { const k = { Hanafi: 'h', Maliki: 'm', "Shafi'i": 's', Hanbali: 'b' }[not[2]]; return 'hmsb'.replace(k, '') }
  return 'hmsb'.split('').filter((k) => has[k]).join('')
}
