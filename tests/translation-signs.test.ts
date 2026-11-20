import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error plain JS build script
import { mergeArabic, parsePack } from '../scripts/build-packs.mjs'

// The owner's ruling (2026-11-20): angels, like the Prophets, carry ﵇ / ﵉ / ﵈ in every language, and the Islamic
// site writes رحمة الله عليه out for scholars and rulers (never the ﵀ sign). A translation must not drop a sign the English has.
const dir = join(__dirname, '..', 'questions')
const files = readdirSync(dir).filter((f) => /^(isl|kids)-.*\.txt$/.test(f))
const weight = (s: string) => [...s].reduce((n, ch) => n + (ch === '﵇' || ch === '﵍' ? 1 : ch === '﵉' || ch === '﵈' ? 2 : 0), 0)

// Lines whose translation names each figure on its own (so one plural sign becomes several singular ones) are fine;
// these are the few where the translation words the line so there is no separate word to carry the sign.
const ALLOWED = new Set([
  'isl-akhirah|Our Beloved Master ﷺ said every Prophet ﵈ has one of these',
  'isl-nasheed|Muhsin Kakorvi',
  'kids-seerah|Our Beloved Prophet ﷺ met our master Yusuf ﵇ in this heaven',
  'kids-pillars|The angel ﵇ who looks after the mountains; the angel ﵇',
  // The angels are named inside a quoted ayah, which is never changed
  'isl-tafsir|"Al-ruh" in "The angels ﵈ and the Ruh descend"',
])

describe('translated lines keep the honorific signs', () => {
  for (const f of files) {
    const id = f.replace(/\.txt$/, '')
    for (const [lang, keys] of [['ar', ['qAr', 'aAr']], ['ur', ['qUr', 'aUr']]] as const) {
      const p = join(dir, lang, f)
      if (!existsSync(p)) continue
      it(`${lang}/${f}`, () => {
        const parsed = parsePack(readFileSync(join(dir, f), 'utf8'), f)
        const { levels, errors } = mergeArabic(parsed.levels, readFileSync(p, 'utf8'), `${lang}/${f}`, [...keys])
        expect(errors).toEqual([])
        const bad: string[] = []
        for (const lvl of levels) {
          for (const x of lvl as Record<string, string>[]) {
            const en = `${x.q} :: ${x.a}`
            const tr = `${x[keys[0]]} :: ${x[keys[1]]}`
            if ([...ALLOWED].some((k) => k === `${id}|${x.q.slice(0, k.length - id.length - 1)}`)) continue
            if (weight(tr) < weight(en)) bad.push(`${en}\n   ${tr}`)
            if (tr.includes('﵀')) bad.push(`﵀ sign (write رحمة الله عليه): ${tr}`)
          }
        }
        expect(bad).toEqual([])
      })
    }
  }
})
