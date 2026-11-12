import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The owner's rule: every mention of a blessed religious figure carries its honorific.
// The Prophet: "our Beloved and our master, the Prophet Muhammad ﷺ" (Arabic: حبيبنا وسيدنا النبي محمد ﷺ).
// The owner asked for the signs, in English and Arabic alike (shown by the bundled honorifics font):
// other prophets ﵇ (plural ﵈), Companions ﵁ / ﵂ (plural ﵃), righteous scholars and rulers ﵀ (plural ﵏).
const dir = join(__dirname, '..', 'questions')
const lines = (sub: string) =>
  readdirSync(join(dir, sub))
    .filter((f) => f.endsWith('.txt'))
    .flatMap((f) => readFileSync(join(dir, sub, f), 'utf8').split('\n').map((text, i) => ({ at: `${sub}${f}:${i + 1}`, text })))
// The Islamic and Kids collections follow their own style (our Beloved Prophet ﷺ, our master ...): tests/honorifics.test.ts.
const en = lines('').filter(({ at }) => !/^(isl|kids)-/.test(at))
const enAll = lines('')
const ar = existsSync(join(dir, 'ar')) ? lines('ar/') : []

const COMPANIONS_EN = ['Abu Bakr', 'Umar ibn al-Khattab', 'Uthman ibn Affan', 'Ali ibn Abi Talib', 'Muawiya', 'Khalid ibn al-Walid', 'Amr ibn al-As', 'Salman al-Farisi', "Ka'b ibn Zuhayr", 'Hassan ibn Thabit']
const COMPANIONS_AR = ['أبو بكر الصديق', 'أبي بكر', 'عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب', 'معاوية بن أبي سفيان', 'خالد بن الوليد', 'عمرو بن العاص', 'سلمان الفارسي', 'كعب بن زهير', 'حسان بن ثابت']
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('honorifics for blessed religious figures', () => {
  it('the Prophet is always "our Beloved and our master, the Prophet Muhammad ﷺ" in English', () => {
    for (const { at, text } of en) {
      if (!/\bProphet\b/.test(text) || /"The Prophet"/.test(text)) continue
      const others = text.replace(/our Beloved and our master, the Prophet Muhammad ﷺ/g, '')
      // Any other "Prophet" must name another prophet with "peace be upon him"
      if (/\bProphet\b/.test(others)) expect(/Prophet (Sulayman|Shu'ayb) [﵇﵈]/.test(others), at).toBe(true)
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
  it('Companions carry ﵁ / ﵂ / ﵃', () => {
    for (const { at, text } of en) for (const n of COMPANIONS_EN) for (const m of text.matchAll(new RegExp(esc(n) + "[\\w' -]*", 'g'))) {
      if (n === 'Abu Bakr' && !/^Abu Bakr( al-Siddiq)?\b/.test(m[0])) continue
      expect(/[﵁﵂﵃]/.test(text.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 3)), `${at}: ${n}`).toBe(true)
    }
    for (const { at, text } of ar) for (const n of COMPANIONS_AR) for (const m of text.matchAll(new RegExp(esc(n), 'g'))) {
      expect(/^ [﵁﵂﵃]/.test(text.slice((m.index ?? 0) + n.length)), `${at}: ${n}`).toBe(true)
    }
  })
  it('Umar ibn Abd al-Aziz carries ﵀', () => {
    for (const { at, text } of en) if (text.includes('Umar ibn Abd al-Aziz')) expect(text, at).toContain('Umar ibn Abd al-Aziz ﵀')
    for (const { at, text } of ar) if (text.includes('عمر بن عبد العزيز')) expect(text, at).toContain('عمر بن عبد العزيز ﵀')
  })
  it('no honorific is written out in words (the signs are used instead)', () => {
    for (const { at, text } of [...enAll, ...ar]) expect(/may Allah (be pleased|have mercy)|peace be upon (him|them)\b(?! you)|رضي الله عن|رضوان الله|رحمه(م)? الله|عليه(م)? السلام|صلى الله عليه/.test(text), at).toBe(false)
  })
})
