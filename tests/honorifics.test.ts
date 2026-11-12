import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error plain JS module
import { checkFiles, checkText } from '../scripts/honorifics.mjs'
// @ts-expect-error plain JS module
import { toSigns } from '../scripts/signs.mjs'

describe('honorifics (the owner\'s rule for every blessed religious figure)', () => {
  it('every Islamic and Kids clue, answer and category name carries them', () => {
    expect(checkFiles('questions')).toEqual([])
  })

  it('the Islamic themed nights carry them', () => {
    const nights = readFileSync('questions/nights-islamic.json', 'utf8')
    const bad: string[] = []
    JSON.parse(nights, (_k, v) => {
      if (typeof v === 'string') bad.push(...checkText(v).map((p: string) => `${p} | ${v}`))
      return v
    })
    expect(bad).toEqual([])
  })

  it('Blessed Mawlid Night comes first among the Islamic themed nights and shows the ﷺ sign (owner, 2026-11-12)', () => {
    const nights = JSON.parse(readFileSync('questions/nights-islamic.json', 'utf8'))
    expect(nights[0].id).toBe('mawlid-night')
    expect(nights[0].sign).toBe('\uFDFA')
  })

  it('flags each kind of missing honorific', () => {
    expect(checkText('The Prophet said this.')).not.toEqual([])
    expect(checkText('The Prophet ﷺ said this.')).toEqual(['"our Beloved" missing before "Prophet"'])
    expect(checkText('Our Beloved Prophet ﷺ said this.')).toEqual([])
    expect(checkText('Musa (عليه السلام) spoke with Allah.')).toEqual(['"our master" missing before Musa'])
    expect(checkText('Our master Musa spoke with Allah.')).not.toEqual([])
    expect(checkText('Our master Musa (عليه السلام) spoke with Allah.')).toEqual([])
    expect(checkText('Our master Musa ﵇ spoke with Allah.')).toEqual([])
    expect(checkText("'Umar (رِضْوَانُ اللَّهِ عَلَيْهِ) said this.")).not.toEqual([])
    expect(checkText("Our master 'Umar (رِضْوَانُ اللَّهِ عَلَيْهِ) said this.")).toEqual([])
    expect(checkText('Bilal gave the adhan.')).not.toEqual([])
    expect(checkText('Imam al-Nawawi wrote it.')).not.toEqual([])
    expect(checkText('Imam al-Nawawi رحمة الله عليه wrote it.')).toEqual([])
    expect(checkText('The Companions gave.')).not.toEqual([])
    expect(checkText('The Companions (رِضْوَانُ اللَّهِ عَلَيْهِمْ) gave.')).toEqual([])
    expect(checkText('The Blessed Prophets are named.')).not.toEqual([])
    expect(checkText('The angels wrote it.')).not.toEqual([])
  })

  it('does not treat other people or words as blessed figures', () => {
    expect(checkText('Mansa Musa made Hajj.')).toEqual([])
    expect(checkText('The six throat letters: hamzah and ha.')).toEqual([])
    expect(checkText('Surah Muhammad is the 47th surah.')).toEqual([])
    expect(checkText('Every son of Adam makes mistakes.')).toEqual([])
    expect(checkText("The tafsir by Isma'il Haqqi رحمة الله عليه.")).toEqual([])
  })

  it('packs show the honorific signs', () => {
    expect(toSigns('Our master Musa (عليه السلام)')).toBe('Our master Musa ﵇')
    expect(toSigns('The Blessed Prophets (عليهم السلام)')).toBe('The Blessed Prophets ﵈')
  })
})
