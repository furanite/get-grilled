import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error plain JS build script
import { parsePack, mergeArabic, GROUPS, RESPECT_GROUPS } from '../scripts/build-packs.mjs'

const dir = join(__dirname, '..', 'questions')

describe('question file parser', () => {
  it('reads a valid file', () => {
    const r = parsePack('id: t\nname: T\nnameAr: ت\ngroup: cces\n## 100\nA? :: a\n## 200\nB? :: b\n## 300\nC? :: c\n## 400\nD? :: d\n## 500\nE? :: e\n')
    expect(r.errors).toEqual([])
    expect(r.meta).toEqual({ id: 't', name: 'T', nameAr: 'ت', group: 'cces' })
    expect(r.levels.map((l: unknown[]) => l.length)).toEqual([1, 1, 1, 1, 1])
  })
  it('reports every kind of problem', () => {
    const r = parsePack('name: T\nbefore :: x\n## 100\nno separator\na :: \nx :: y :: z\nSame clue! :: 1\nsame clue :: 2\n## 600\n', 'f')
    const all = r.errors.join('\n')
    expect(all).toMatch(/invalid "id:"/)
    expect(all).toMatch(/before any "## level"/)
    expect(all).toMatch(/exactly one " :: "/)
    expect(all).toMatch(/empty clue or answer/)
    expect(all).toMatch(/duplicate clue/)
    expect(all).toMatch(/unknown level "600"/)
    expect(all).toMatch(/level 200 has 0 questions/)
    expect(all).toMatch(/"group:" must be one of/)
  })
})

describe('source tags', () => {
  const head = 'id: t\nname: T\ngroup: fiqh\n'
  const rest = '## 200\nB :: b || F\n## 300\nC :: c || D: retold\n## 400\nD :: d || H: Sahih Muslim\n## 500\nE :: e || H: Qur\'an 2:255\n'
  it('reads H, D and F tags and holds back "?" lines for checking', () => {
    const r = parsePack(head + '## 100\nA :: a || H: Sahih al-Bukhari\nUnsure :: x || H?: Tarikh al-Tabari\n' + rest)
    expect(r.errors).toEqual([])
    expect(r.levels[0]).toEqual([{ q: 'A', a: 'a', kind: 'H', src: 'Sahih al-Bukhari' }])
    expect(r.levels[1][0]).toEqual({ q: 'B', a: 'b', kind: 'F' })
    expect(r.levels[2][0]).toEqual({ q: 'C', a: 'c', kind: 'D', src: 'retold' })
    expect(r.unchecked).toEqual([{ level: '100', at: 'pack:6', q: 'Unsure', a: 'x', kind: 'H', src: 'Tarikh al-Tabari' }])
  })
  it('needs a tag in religious groups, and a source for H', () => {
    const r = parsePack(head + '## 100\nA :: a\nB2 :: b || H\nC2 :: c || X: y\n' + rest)
    const all = r.errors.join('\n')
    expect(all).toMatch(/needs a source tag/)
    expect(all).toMatch(/needs a source after "H:"/)
    expect(all).toMatch(/must look like/)
  })
  it('tags stay optional elsewhere', () => {
    expect(parsePack(head.replace('fiqh', 'general') + '## 100\nA :: a\n' + rest).errors).toEqual([])
  })
})

describe('answers that contain "::"', () => {
  it('only a standalone " :: " separates clue and answer, so IPv6 addresses work', () => {
    const r = parsePack('id: t\nname: T\ngroup: cces\n## 100\nLoopback? :: ::1\n## 200\nPrefix? :: fe80::/10\n## 300\nC? :: c\n## 400\nD? :: d\n## 500\nE? :: 2001:db8::1\n')
    expect(r.errors).toEqual([])
    expect(r.levels[0][0]).toEqual({ q: 'Loopback?', a: '::1' })
    expect(r.levels[4][0].a).toBe('2001:db8::1')
  })
})

describe('Arabic question files', () => {
  const en = parsePack('id: t\nname: T\ngroup: general\n## 100\nOne :: 1938\nTwo :: b\n## 200\nB :: b\n## 300\nC :: c\n## 400\nD :: d\n## 500\nE :: e\n').levels
  it('pairs each Arabic line with its English question', () => {
    const r = mergeArabic(en, '## 100\nواحد :: ١٩٣٨\nاثنان :: ب\n## 200\nب :: ب\n## 300\nج :: ج\n## 400\nد :: د\n## 500\nه :: ه\n')
    expect(r.errors).toEqual([])
    expect(r.levels[0][0]).toEqual({ q: 'One', a: '1938', qAr: 'واحد', aAr: '١٩٣٨' })
    expect(r.levels[0][1].aAr).toBe('ب')
  })
  it('catches missing lines and lines out of step', () => {
    const short = mergeArabic(en, '## 100\nواحد :: 1938\n## 200\nب :: ب\n## 300\nج :: ج\n## 400\nد :: د\n## 500\nه :: ه\n')
    expect(short.errors.join()).toMatch(/level 100 has 1 Arabic lines but 2/)
    const swapped = mergeArabic(en, '## 100\nاثنان :: ب\nواحد :: 1938\n## 200\nب :: ب\n## 300\nج :: ج\n## 400\nد :: د\n## 500\nه :: ه\n')
    expect(swapped.errors.join()).toMatch(/out of step/)
    expect(mergeArabic(en, 'بلا عنوان :: x\n').errors.join()).toMatch(/before any/)
  })
})

describe('built-in question files', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.txt'))
  it('exist', () => expect(files.length).toBeGreaterThanOrEqual(6))
  // CCES categories are English-only by the owner's choice; the others must have Arabic.
  const groupOf = (f: string) => /^group:\s*(\S+)/m.exec(readFileSync(join(dir, f), 'utf8'))?.[1]
  // CCES, Islamic and kids categories are English-only by the owner's choice; the others must have Arabic.
  it('every group has categories and the original files have Arabic', () => {
    const groups = files.map(groupOf)
    for (const g of GROUPS) expect(groups, g).toContain(g)
    files.forEach((f, i) => { if (groups[i] !== 'cces' && !RESPECT_GROUPS.includes(groups[i])) expect(existsSync(join(dir, 'ar', f)), f).toBe(true) })
  })
  for (const f of files) {
    it(`${f} has no problems`, () => {
      const r = parsePack(readFileSync(join(dir, f), 'utf8'), f)
      expect(r.errors).toEqual([])
      // University packs hold 100 per level; the religious packs are smaller, checked pools.
      if (RESPECT_GROUPS.includes(groupOf(f))) r.levels.forEach((l: unknown[]) => expect(l.length).toBeGreaterThanOrEqual(15))
      else expect(r.levels.map((l: unknown[]) => l.length)).toEqual([100, 100, 100, 100, 100])
      const arPath = join(dir, 'ar', f)
      if (existsSync(arPath)) expect(mergeArabic(r.levels, readFileSync(arPath, 'utf8'), f).errors).toEqual([])
    })
  }
})

describe('scholar reviews', () => {
  it('gives each question a stable id that changes when the text changes', async () => {
    const { questionId } = await import('../scripts/build-packs.mjs')
    expect(questionId('p', 'Q', 'A')).toMatch(/^[0-9a-f]{8}$/)
    expect(questionId('p', 'Q', 'A')).toBe(questionId('p', 'Q', 'A'))
    expect(questionId('p', 'Q', 'A')).not.toBe(questionId('p', 'Q', 'B'))
  })
  it('reads review files and lists flagged lines first', async () => {
    const { loadReviews, reviewStatusMarkdown } = await import('../scripts/build-packs.mjs')
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'rev-'))
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ reviewer: 'Shaykh A', date: '2026-11-11', verdicts: { aaaaaaaa: { correct: 'issue', adab: 'ok', note: 'weak hadith' }, bbbbbbbb: { correct: 'ok', adab: 'ok' } } }))
    const r = loadReviews(dir)
    expect(r.get('aaaaaaaa')[0]).toMatchObject({ reviewer: 'Shaykh A', correct: 'issue', note: 'weak hadith' })
    const md = reviewStatusMarkdown([
      { pack: 'P', file: 'p.txt', level: '100', q: 'Q1', a: 'A1', id: 'aaaaaaaa', rs: r.get('aaaaaaaa') },
      { pack: 'P', file: 'p.txt', level: '100', q: 'Q2', a: 'A2', id: 'bbbbbbbb', rs: r.get('bbbbbbbb') },
    ])
    expect(md).toContain('Flagged: 1. Approved: 1.')
    expect(md.indexOf('weak hadith')).toBeLessThan(md.indexOf('## Approved'))
  })
})
