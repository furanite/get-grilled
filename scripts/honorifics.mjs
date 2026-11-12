// Checks that every mention of a blessed religious figure carries the owner's honorifics (see questions/ISLAMIC-STYLE.md).
// Used by tests/honorifics.test.ts and runnable as: node scripts/honorifics.mjs  (lists problems).
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAW = 'ﷺ'
const AS = /\((عليه|عليها|عليهما|عليهم|عليهن) السلام\)|[\uFD47-\uFD49\uFD4D]/
const RA = /\(رِضْوَانُ اللَّهِ عَلَيْ(هِ|هَا|هِمَا|هِمْ|هِنَّ)\)|[\uFD41-\uFD45]/
const RH = /رحمة الله (عليه|عليها|عليهما|عليهم)|[\uFD40\uFD4F]/

export const PROPHETS = ['Adam', 'Idris', 'Nuh', 'Hud', 'Salih', 'Ibrahim', "Isma'il", 'Ishaq', "Ya'qub", 'Yusuf', 'Lut', "Shu'ayb", 'Ayyub', 'Dhul-Kifl', 'Musa', 'Harun', 'Dawud', 'Sulayman', 'Ilyas', "al-Yasa'", 'Yunus', 'Zakariyya', 'Yahya', "'Isa", 'al-Khidr', 'Khidr', 'Maryam', 'Hajar']
export const ANGELS = ['Jibril', "Mika'il", 'Israfil', "'Izra'il", 'Ridwan', 'Malik the angel']
// The four Khulafa' and the Blessed Family: "our master" / "our lady" before the name.
export const MASTERS = ['Abu Bakr', "'Umar ibn al-Khattab", "'Umar", "'Uthman ibn 'Affan", "'Uthman", "'Ali ibn Abi Talib", "'Ali", 'Fatimah', "al-Hasan ibn 'Ali", 'al-Hasan', 'al-Husayn', "Hamzah ibn 'Abd al-Muttalib", 'Khadijah', "'A'ishah", 'Hafsah', 'Umm Salamah', 'Sawdah', 'Maymunah', 'Safiyyah', 'Juwayriyah', 'Umm Habibah', 'Zaynab bint Jahsh', 'Ruqayyah', 'Umm Kulthum', "al-'Abbas"]
export const COMPANIONS = ['Bilal', 'Mariyah', "Ja'far ibn Abi Talib", 'Zayd ibn Harithah', 'Usamah', 'Abu Hurayrah', 'Anas ibn Malik', "Ibn 'Abbas", "'Abdullah ibn 'Abbas", "Ibn Mas'ud", "'Abdullah ibn Mas'ud", "Ibn 'Umar", "'Abdullah ibn 'Umar", "Mu'adh ibn Jabal", "Ubayy ibn Ka'b", 'Zayd ibn Thabit', 'Abu Dharr', 'Salman al-Farisi', "Abu 'Ubaydah", 'Khalid ibn al-Walid', "Sa'd ibn Abi Waqqas", "Sa'd ibn Mu'adh", 'Talhah', 'al-Zubayr', "'Abd al-Rahman ibn 'Awf", "Mus'ab", "'Ammar", 'Sumayyah', 'Abu Ayyub', "Asma' bint Abi Bakr", "Jabir ibn 'Abdullah", "Abu Sa'id al-Khudri", "Abu Musa al-Ash'ari", 'Hassan ibn Thabit', 'Hudhayfah', 'Abu Sufyan', "Mu'awiyah", "'Amr ibn al-'As", 'Wahshi', 'Nusaybah', "Umm 'Umarah", 'Suraqah', "Ka'b ibn Malik", 'Abu Talhah', 'Umm Sulaym', 'Tamim al-Dari', "Abu al-Darda'", "Abu Darda'", 'Abu Qatadah', "al-Bara' ibn 'Azib", "'Uqbah ibn 'Amir", 'Abu Umamah', "al-Nu'man ibn Bashir", "'Abdullah ibn al-Zubayr", "'Abdullah ibn 'Amr", 'Thawban', 'Abu Jandal', 'Abu Basir', 'Dihyah', 'Khubayb', 'al-Miqdad', 'Hanzalah', 'Umm Haram', 'Abu Dujanah', "Sa'd ibn 'Ubadah", "Sa'id ibn Zayd", 'al-Arqam', "'Uthman ibn Maz'un", 'Abu Lubabah', 'Umm Ayman', 'Anjashah', "'Abdullah ibn Rawahah", "'Abdullah ibn Mughaffal", "'Ubadah ibn al-Samit", "Abu Bakrah", "Wa'il ibn Hujr", 'Abu Mahdhurah', "'Abdullah ibn Unays", "Mu'adh", "'Abdullah ibn Zayd", 'Abu Hudhayfah', 'Salim mawla Abi Hudhayfah', 'Fatimah bint Qays', "Umm 'Atiyyah", "al-Rubayyi'"]
const EXTRA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'honorific-names.json'), 'utf8'))
PROPHETS.push(...EXTRA.prophets)
MASTERS.push(...EXTRA.masters)
COMPANIONS.push(...EXTRA.companions)
export const SCHOLARS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'honorific-scholars.json'), 'utf8'))

// Book titles and phrases where a name is not a mention of the person.
const BOOKPRE = /(Usul|Suhuf|Dar|Sahih|Sunan|Musnad|Muwatta'|Alfiyyat|Alfiyyah|Sharh|Tafsir|Sirat|Jami'|Mukhtasar|Risalat|Tabaqat|Muqaddimah|Tarikh|Matn|Hashiyat|Mustadrak|Shama'il|Tahdhib|Dala'il|Surah|Surat|Maqam|Masjid|Bab|Jabal|Bi'r|Well of|Mosque of|Station of|madhhab of|school of|Ghazwat|Battle of|Day of)\s+(Abi\s+|Ibn\s+|al-|Imam\s+|the\s+)?$/i
const NOT_PERSON_AFTER = /^(\s+(order|tariqah|Order)\b|\s+\(Osman\)|\s+\(fit|'s (Mosque|well|station|madhhab|school|book|Sahih|Muwatta'|Musnad|Sunan|Jami')|\s+(Mosque|school|madhhab|reading|recitation|recited))/

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Spans of text in quotation marks: quotations of the Qur'an or hadith are never changed. */
function quoted(text) {
  const spans = []
  const re = /"[^"]*"|“[^”]*”|«[^»]*»/g
  let m
  while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length])
  return spans
}
const inSpan = (spans, i) => spans.find(([a, b]) => i > a && i < b)

/** The rest of the phrase after a name, up to the end of the clause. */
const clause = (text, i) => {
  const rest = text.slice(i, i + 90)
  const stop = rest.search(/[.?!;:|]|\s(who|which|that|was|is|were|are|had|has|said|says|asked|told|gave|went|did|when|whose|whom|he|she|they)\s/i)
  return stop === -1 ? rest : rest.slice(0, stop)
}

const KINDS = () => [['prophet', PROPHETS], ['angel', ANGELS], ['master', MASTERS], ['companion', COMPANIONS], ['scholar', SCHOLARS]]
/** Every named mention, longest name first, so "Abu Musa al-Ash'ari" is one Companion and not the scholar al-Ash'ari. */
let MENTION_RE = null
let KIND_OF = null
function allMentions(text) {
  if (!MENTION_RE) {
    KIND_OF = new Map()
    for (const [kind, names] of KINDS()) for (const nm of names) if (!KIND_OF.has(nm)) KIND_OF.set(nm, kind)
    const all = [...KIND_OF.keys()].sort((a, b) => b.length - a.length)
    MENTION_RE = new RegExp(`(?<![\\p{L}'-])(?:${all.map(esc).join('|')})(?![\\p{L}-])`, 'gu')
  }
  const hits = []
  MENTION_RE.lastIndex = 0
  let m
  while ((m = MENTION_RE.exec(text))) hits.push({ s: m.index, e: m.index + m[0].length, nm: m[0], kind: KIND_OF.get(m[0]) })
  return hits
}

/** Problems in one piece of text (a clue, an answer or a UI string). */
/** Problems in one piece of text (a clue, an answer or a UI string). */
export function checkText(text) {
  return findProblems(text).map((p) => p.msg)
}

const LADIES = ['Maryam', 'Hajar', 'Fatimah', 'Khadijah', "'A'ishah", 'Hafsah', 'Umm Salamah', 'Sawdah', 'Maymunah', 'Safiyyah', 'Juwayriyah', 'Umm Habibah', 'Zaynab bint Jahsh', 'Ruqayyah', 'Umm Kulthum', 'Mariyah', 'Sumayyah', "Asma' bint Abi Bakr", 'Nusaybah', "Umm 'Umarah", 'Umm Sulaym', 'Umm Haram', 'Umm Ayman', 'Fatimah bint Qays', "Umm 'Atiyyah", "al-Rubayyi'"]

/** The sentence around position i. */
function sentenceAt(text, i) {
  const a = Math.max(text.lastIndexOf('. ', i), text.lastIndexOf('? ', i), text.lastIndexOf('; ', i))
  const rest = text.slice(i).search(/[.?!;|](\s|$)/)
  return text.slice(a + 1, rest === -1 ? text.length : i + rest)
}
const isLady = (nm) => LADIES.includes(nm) || /\sbint\s|^Umm\s|^(Halimah|Zaynab|Khawlah|Asma'|al-Shifa'|al-Shayma'|Furay'ah|Halah|Khansa'|Barirah|Hawwa'|Asiyah|Nusaybah|Sawdah|Safiyyah|Maymunah|Juwayriyah|Hafsah|Khadijah|Fatimah|Mariyah|Umamah|Sumayyah)(?![\p{L}])/u.test(nm)
const PLURAL = /[\uFD43-\uFD45\uFD48\uFD49]|\((عليهم|عليهما|عليهن) السلام\)|\(رِضْوَانُ اللَّهِ عَلَيْ(هِمَا|هِمْ|هِم|هِنَّ)\)|رحمة الله (عليهما|عليهم)/

/** Problems with where a fix would go: { msg, at, ins }. */
export function findProblems(text) {
  const out = []
  const bad = (msg, at, ins) => out.push({ msg, at, ins })
  // Where an honorific goes after a name: after "'s" if possessive, after "ibn Maryam".
  const endOf = (e) => {
    const t = text.slice(e)
    const mm = /^(\s+ibn Maryam)?('s)?/.exec(t)
    return e + mm[0].length
  }
  const sentenceStart = (s) => s === 0 || /[.?!:]\s+$|^\s*$/.test(text.slice(Math.max(0, s - 3), s))
  const cap = (s, w) => (sentenceStart(s) ? w[0].toUpperCase() + w.slice(1) : w)
  const q = quoted(text)
  const before = (s, n = 40) => text.slice(Math.max(0, s - n), s)
  const fullSentence = (i) => sentenceAt(text, i)
  const partOfOtherName = (s) => /(ibn|bint|Abu|Abi|Umm|Ibn|bin)\s+$/.test(before(s, 6))
  const notPerson = (h) => inSpan(q, h.s) || BOOKPRE.test(before(h.s, 24)) || NOT_PERSON_AFTER.test(text.slice(h.e, h.e + 30))

  // Our Beloved Prophet ﷺ, and generic "this Prophet" (عليه السلام)
  const pre = /(?<![\p{L}'-])(Prophet|Messenger|Master|Muhammad|Rasulullah|Ahmad)(?![\p{L}-])/gu
  let m
  while ((m = pre.exec(text))) {
    const s = m.index
    const e = s + m[0].length
    const word = m[1]
    const after = text.slice(e, e + 30)
    const b = before(s, 30)
    if (/^s\b|^s'/.test(after)) continue // plurals are checked below
    if (BOOKPRE.test(before(s, 24))) continue // Surah Muhammad, Muwatta' Muhammad
    if (word === 'Prophet' && /^\s*(\p{Lu}|'\p{L})/u.test(after) && !/^\s*Muhammad/.test(after)) continue // "Prophet Musa": checked with the name
    if (word === 'Prophet' && /not a\s+$/.test(b)) continue // "not a Prophet"
    if (word === 'Master' && !/Beloved\s+$/.test(b) && !/^\s*(ﷺ|Muhammad)/.test(after)) continue // "our Master Ibrahim"
    if (word === 'Messenger' && !/(the|our|Beloved|Allah's|His)\s+$/.test(b)) continue
    if (word === 'Messenger' && /^\s*(angel|s)/.test(after)) continue
    if ((word === 'Muhammad' || word === 'Ahmad') && (/^\s+(ibn|al-|\p{Lu})/u.test(after) || partOfOtherName(s) || /(Imam|Sultan|Shaykh|Mawlana|Mulla|Mir|Shah)\s+$/.test(b))) continue
    if (word === 'Ahmad' && !/^\s*ﷺ/.test(after)) continue
    if (word === 'Muhammad' && /^\s*رحمة الله/.test(after)) continue // Imam Muhammad al-Shaybani
    if (word === 'Muhammad' && /Al\s+$/.test(b)) continue // "Al Muhammad", the Family
    const span = inSpan(q, s)
    if (span) {
      if (!/^\s*ﷺ/.test(text.slice(span[1], span[1] + 6)) && !text.slice(span[0], span[1]).includes(SAW) && !text.slice(0, span[0]).includes(SAW)) bad(`ﷺ missing after "${word}"`, null, null)
      continue
    }
    if (/^(\s+Muhammad)?('s)?\s*ﷺ/.test(after)) {
      if (!/(Beloved|His|your|One's|one's|Sayyiduna|our master|Our master)\s+$/.test(b) && !/Beloved/.test(b) && !/Beloved/.test(text.slice(s, e + 2))) bad(`"our Beloved" missing before "${word}"`, null, null)
      continue
    }
    // Another Prophet, not named here: "the Blessed Prophet (عليه السلام) who ..."
    if (word === 'Prophet' && AS.test(clause(text, e))) {
      if (!/(Blessed|every|each)\s+$/.test(b)) bad('"Blessed" missing before "Prophet (عليه السلام)"', s, 'Blessed ')
      continue
    }
    bad(`ﷺ (or عليه السلام for another Prophet) missing after "${word}"`, null, 'generic')
  }

  // Groups: the Prophets, the Companions, the angels ...
  const groups = [
    [/(?<![\p{L}'-])(Prophets|Messengers)(?![\p{L}])/gu, AS, '(عليهم السلام)'],
    [/(?<![\p{L}'-])(angels|Angels)(?![\p{L}])/gu, AS, '(عليهم السلام)'],
    [/(?<![\p{L}'-])(Companions|Sahabah|Mothers of the Believers|Ahl al-Bayt|Blessed Family)(?![\p{L}])/gu, RA, '(رِضْوَانُ اللَّهِ عَلَيْهِمْ)'],
    [/(?<![\p{L}'-])(Successors|Tabi'in|four Imams|four imams)(?![\p{L}])/gu, RH, 'رحمة الله عليهم'],
  ]
  for (const [re, ok, form] of groups) {
    re.lastIndex = 0
    while ((m = re.exec(text))) {
      if (inSpan(q, m.index)) continue
      if (/(Day|Station|Wall|Mosque|Garden) of the\s+$/.test(before(m.index, 24))) continue
      if (!ok.test(clause(text, m.index + m[0].length))) bad(`${form} missing after "${m[1]}"`, endOf(m.index + m[0].length), ' ' + form)
    }
  }

  for (const h of allMentions(text)) {
    if (notPerson(h)) continue
    const tail = text.slice(h.e, h.e + 40)
    const cl = clause(text, h.e)
    // Part of a longer name that is not on our lists: Mansa Musa, Najm al-Din 'Umar al-Nasafi, Fatimah al-Fihriyyah, Isma'il Haqqi.
    if (h.kind !== 'scholar') {
      if (/(al-[\p{L}'’]+|Mansa|Sultan|Shah|Mulla|Qadi|Khan|Pasha|Beg)\s+$/u.test(before(h.s, 25))) continue
      if (/^\s+(al-|ibn\s|bint\s|bin\s|\p{Lu}\p{Ll})/u.test(tail) && !/^\s+(ibn Maryam|ibn 'Imran|al-Khalil|al-Siddiq|al-Faruq|al-Zahra'|al-Murtada|al-Kubra|Dhu)/.test(tail)) continue
      if (/\(\s*$/.test(before(h.s, 3)) && /^\s*\)/.test(tail)) continue // "(Hud)": a surah
      if (h.nm === "Ya'qub" && /reader|qira'at|transmitter/i.test(text)) continue
    }
    // A list that shares one honorific: "Hud, Salih and Shu'ayb (عليهم السلام)"
    if ((/^('s)?(\s*,|\s+and\s|\s+&\s|\s+to\s)/.test(tail) || /(,|\band|\bto)\s+$/.test(before(h.s, 6))) && PLURAL.test(fullSentence(h.s))) continue
    if (h.kind === 'prophet') {
      if (partOfOtherName(h.s)) continue
      if (/^\s+(ibn|bin)\s+(?!Maryam)/.test(tail) || /^\s+al-/.test(tail)) continue // Ibrahim al-Laqqani, Yahya ibn Yahya
      if (h.nm === 'Adam' && /(sons?|children|Banu|Bani|daughters?) of\s+$|Bani\s+$|Banu\s+$/.test(before(h.s, 20))) continue
      if (/(Hijr|Maqam)\s+$/.test(before(h.s, 6))) continue
      if (h.nm === 'Salih' && /^\s*\(fit|^\s+hadith/.test(tail)) continue
      if (h.nm === 'Harun' && /^\s+al-Rashid/.test(tail)) continue
      if (h.nm === 'Sulayman' && /^\s+(the Magnificent|I\b|al-Qanuni)/.test(tail)) continue
      if (!AS.test(cl)) bad(`(عليه السلام) missing after ${h.nm}`, endOf(h.e), isLady(h.nm) ? ' (عليها السلام)' : ' (عليه السلام)')
      else if (!/(Blessed Prophets?|Blessed Messengers?|our masters?|Suhuf|our lady|Sayyidun?a|Sayyidatuna|Prophets?|Messengers?)\s+(\p{L}+\s+)?$/iu.test(before(h.s, 30)) && !/(and|,|&)\s+$/.test(before(h.s, 6))) bad(`"our master" missing before ${h.nm}`, h.s, cap(h.s, isLady(h.nm) ? 'our lady ' : 'our master '))
    } else if (h.kind === 'angel') {
      if (!AS.test(cl)) bad(`(عليه السلام) missing after ${h.nm}`, endOf(h.e), ' (عليه السلام)')
    } else if (h.kind === 'master') {
      if (partOfOtherName(h.s)) continue
      if (h.nm === "'Umar" && /^\s+ibn\s+(?!al-Khattab)/.test(tail)) continue
      if (h.nm === "'Uthman" && /^\s+ibn\s+(?!'Affan)/.test(tail)) continue
      if (h.nm === "'Ali" && /^\s+(ibn\s+(?!Abi Talib)|al-)/.test(tail)) continue
      if (h.nm === 'al-Hasan' && /^\s+al-Basri/.test(tail)) continue
      if (h.nm === 'Hamzah' && /^\s+al-Zayyat/.test(tail)) continue
      if (!RA.test(cl) && !AS.test(cl)) bad(`(رِضْوَانُ اللَّهِ عَلَيْهِ) missing after ${h.nm}`, endOf(h.e), isLady(h.nm) ? ' (رِضْوَانُ اللَّهِ عَلَيْهَا)' : ' (رِضْوَانُ اللَّهِ عَلَيْهِ)')
      else if (!/(our master|our lady|our masters|Sayyidun?a|Sayyidatuna|Mothers? of the Believers)\s+(\p{L}+\s+)?$/iu.test(before(h.s, 40)) && !/(and|,|&)\s+$/.test(before(h.s, 6))) bad(`"our master" or "our lady" missing before ${h.nm}`, h.s, cap(h.s, isLady(h.nm) ? 'our lady ' : 'our master '))
    } else if (h.kind === 'companion') {
      if (partOfOtherName(h.s)) continue
      if (!RA.test(cl)) bad(`(رِضْوَانُ اللَّهِ عَلَيْهِ) missing after ${h.nm}`, endOf(h.e), isLady(h.nm) ? ' (رِضْوَانُ اللَّهِ عَلَيْهَا)' : ' (رِضْوَانُ اللَّهِ عَلَيْهِ)')
    } else {
      if (partOfOtherName(h.s) && !/^Ibn\b/.test(h.nm)) continue
      if (/^\s+(of|from)\s/.test(tail) && /(reading|recitation|riwayah|qira'ah)\s+$/i.test(before(h.s, 30))) continue
      if (!RH.test(cl)) bad(`رحمة الله عليه missing after ${h.nm}`, endOf(h.e), ' رحمة الله عليه')
    }
  }
  return out
}

/** Insert the missing honorifics that have one clear place. "generic" Prophet mentions need the answer to tell which Prophet. */
export function fixText(text, answer = '') {
  for (let round = 0; round < 20; round++) {
    const ps = findProblems(text).filter((p) => p.ins)
    if (!ps.length) break
    // Apply the right-most fix first so earlier positions stay valid; one fix per position.
    const seen = new Set()
    for (const p of ps.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))) {
      if (p.ins === 'generic') {
        const mm = /(?<![\p{L}'-])Prophet(?![\p{L}-])(?!('s)?\s*ﷺ)(?!\s*\(عليه)/u.exec(text)
        if (!mm) continue
        const ours = /ﷺ|Muhammad/.test(answer)
        const at = mm.index
        const e = at + mm[0].length
        text = ours ? text.slice(0, e) + ' ﷺ' + text.slice(e) : text.slice(0, at) + (/Blessed\s+$/.test(text.slice(0, at)) ? '' : 'Blessed ') + 'Prophet (عليه السلام)' + text.slice(e)
        break
      }
      if (seen.has(p.at)) continue
      seen.add(p.at)
      text = text.slice(0, p.at) + p.ins + text.slice(p.at)
    }
  }
  return text
}

/** Every clue and answer in the Islamic and Kids question files. */
export function checkFiles(dir) {
  const problems = []
  for (const f of readdirSync(dir).filter((n) => /^(isl|kids)-.*\.txt$/.test(n) && n !== 'isl-ayah.txt').sort()) {
    readFileSync(join(dir, f), 'utf8').split('\n').forEach((line, i) => {
      const nm = /^name:\s*(.+)$/.exec(line)
      if (nm) for (const p of checkText(nm[1])) problems.push(`${f}:${i + 1} name: ${p} | ${nm[1]}`)
      if (!line.includes(' :: ') || line.startsWith('#')) return
      const [qa] = line.split(' || ')
      const [q, a] = qa.split(' :: ')
      for (const [part, text] of [['clue', q], ['answer', a]]) for (const p of checkText(text)) problems.push(`${f}:${i + 1} ${part}: ${p} | ${text.slice(0, 140)}`)
    })
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = checkFiles(join(dirname(fileURLToPath(import.meta.url)), '..', 'questions'))
  console.log(p.join('\n'))
  console.log(`\n${p.length} problem(s)`)
}
