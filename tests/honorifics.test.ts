import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The owner's rule: every mention of a blessed religious figure carries its honorific.
// The Prophet: "our Beloved and our master, the Prophet Muhammad ﷺ" (Arabic: حبيبنا وسيدنا النبي محمد ﷺ).
// The owner asked for the signs, in English and Arabic alike (shown by the bundled honorifics font):
// other prophets ﵇ (plural ﵈), a single Companion ﵁ / ﵂, righteous scholars and poets ﵀ (plural ﵏).
// Several Companions together get "رضوان الله عليهم" written out, never the plural sign ﵃.
const dir = join(__dirname, '..', 'questions')
const lines = (sub: string) =>
  readdirSync(join(dir, sub))
    .filter((f) => f.endsWith('.txt'))
    .flatMap((f) => readFileSync(join(dir, sub, f), 'utf8').split('\n').map((text, i) => ({ at: `${sub}${f}:${i + 1}`, text })))
const en = lines('')
const ar = existsSync(join(dir, 'ar')) ? lines('ar/') : []

const COMPANIONS_EN = ['Abu Bakr', 'Umar ibn al-Khattab', 'Uthman ibn Affan', 'Ali ibn Abi Talib', 'Muawiya', 'Khalid ibn al-Walid', 'Amr ibn al-As', 'Salman al-Farisi', "Ka'b ibn Zuhayr", 'Hassan ibn Thabit']
const COMPANIONS_AR = ['أبو بكر الصديق', 'أبي بكر', 'عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب', 'معاوية بن أبي سفيان', 'خالد بن الوليد', 'عمرو بن العاص', 'سلمان الفارسي', 'كعب بن زهير', 'حسان بن ثابت']
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('honorifics for blessed religious figures', () => {
  it('the Prophet is always "our Beloved and our master, the Prophet Muhammad ﷺ" in English', () => {
    for (const { at, text } of en) {
      if (!/\bProphet\b/.test(text) || /"The Prophet"/.test(text)) continue
      const others = text.replace(/[Oo]ur Beloved and our master, the Prophet Muhammad ﷺ/g, '')
      // Any other "Prophet" must name another prophet followed by the sign ﵇ (or ﵈)
      for (const m of others.matchAll(/\bProphet\b/g)) {
        const after = others.slice((m.index ?? 0) + m[0].length)
        expect(/^ [A-Z'][\w'-]*(?: (?:ibn|bin) [A-Z][\w'-]*)? [﵇﵈]/.test(after), `${at}: ${after.slice(0, 30)}`).toBe(true)
      }
    }
  })
  it('the Prophet is always "حبيبنا وسيدنا النبي محمد ﷺ" in Arabic', () => {
    for (const { at, text } of ar) {
      for (const m of text.matchAll(/ﷺ/g)) {
        const before = text.slice(0, m.index)
        expect(/(حبيبنا وسيدنا النبي محمد|رسول الله) $/.test(before), at).toBe(true)
      }
      const rest = text.replace(/حبيبنا وسيدنا النبي محمد ﷺ/g, '').replace(/"النبي"/g, '')
      for (const m of rest.matchAll(/(^|[\s(])النبي(?=[\s.،]|$)/g)) {
        const after = rest.slice((m.index ?? 0) + m[0].length)
        expect(/^ (سليمان|شعيب) [﵇﵈]/.test(after), at).toBe(true)
      }
    }
  })
  it('a Companion carries ﵁ / ﵂, and several together carry رضوان الله عليهم', () => {
    for (const { at, text } of en) for (const n of COMPANIONS_EN) for (const m of text.matchAll(new RegExp(esc(n) + "[\\w' -]*", 'g'))) {
      if (n === 'Abu Bakr' && (!/^Abu Bakr( al-Siddiq)?\b/.test(m[0]) || /^Abu Bakr (ibn|bin|al-(?!Siddiq))/.test(m[0]))) continue
      const near = text.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 3)
      const group = /^[\w' -]*(?:,|\band\b)[\w' ,-]*رضوان الله عليهم/.test(text.slice(m.index ?? 0))
      expect(/[﵁﵂]/.test(near) || group, `${at}: ${n}`).toBe(true)
    }
    for (const { at, text } of ar) for (const n of COMPANIONS_AR) for (const m of text.matchAll(new RegExp(esc(n), 'g'))) {
      expect(/^ [﵁﵂]/.test(text.slice((m.index ?? 0) + n.length)) || /رضوان الله عليهم/.test(text), `${at}: ${n}`).toBe(true)
    }
  })
  it('never uses the plural Companion sign ﵃', () => {
    for (const { at, text } of [...en, ...ar]) expect(text.includes('﵃'), at).toBe(false)
  })
  it('Umar ibn Abd al-Aziz carries ﵀', () => {
    for (const { at, text } of en) if (text.includes('Umar ibn Abd al-Aziz')) expect(text, at).toContain('Umar ibn Abd al-Aziz ﵀')
    for (const { at, text } of ar) if (text.includes('عمر بن عبد العزيز')) expect(text, at).toContain('عمر بن عبد العزيز ﵀')
  })
  it('no honorific is written out in words (the signs are used instead), except رضوان الله عليهم for several Companions', () => {
    for (const { at, text } of [...en, ...ar]) {
      const rest = text.replace(/رضوان الله عليهم/g, '')
      expect(/may Allah (be pleased|have mercy)|peace be upon (him|them)\b(?! you)|رضي الله عن|رضوان الله|رحمه(م)? الله|عليه(م)? السلام|صلى الله عليه/.test(rest), at).toBe(false)
    }
  })
})
