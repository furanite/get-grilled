import { describe, expect, it } from 'vitest'
import { createGame, isPlayable } from '../src/lib/game'
import { cleanCategories } from '../src/lib/store'
import { cleanDraft, draftFromFile, draftProblems, emptySub, exportStudySet, mergeOpened, newDraft, parseBulk, parseQuestionFile, studyFileName, type StudyDraft } from '../src/lib/studyset'

let n = 0
const id = () => `t${n++}`
const filled = (name: string, per = 2) => ({ name, levels: [0, 1, 2, 3, 4].map((li) => Array.from({ length: per }, (_, i) => ({ q: `${name} q${li}-${i}`, a: `a${li}-${i}` }))) })
const draft = (): StudyDraft => ({ id: 'set-1', title: 'Thermo ch 1-3', by: 'Dr. X', note: 'Good luck', subs: [filled('Laws'), filled('Cycles', 3)] })

describe('question files from instructors', () => {
  it('a new draft lists what is missing, and a full one has no problems', () => {
    const p = draftProblems(newDraft('s1'))
    expect(p).toContain('Give the file a title.')
    expect(p).toContain('Subcategory 1 needs a name.')
    expect(p.filter((x) => x.includes('add at least one'))).toHaveLength(5)
    expect(draftProblems(draft())).toEqual([])
  })

  it('flags duplicate subcategory names and half-written questions', () => {
    const d = draft()
    d.subs[1].name = ' laws '
    d.subs[0].levels[2][0] = { q: 'only a question', a: ' ' }
    const p = draftProblems(d)
    expect(p.some((x) => x.startsWith('Two subcategories'))).toBe(true)
    expect(p.some((x) => x.includes('300 question 1'))).toBe(true)
  })

  it('the exported file opens as one playable category per subcategory, grouped by the file', () => {
    const file = JSON.parse(JSON.stringify(exportStudySet(draft())))
    expect(file.format).toBe('get-grilled-study-set')
    const opened = parseQuestionFile(file, id)
    expect(opened.set).toEqual({ id: 'set-1', title: 'Thermo ch 1-3', by: 'Dr. X', note: 'Good luck' })
    expect(opened.cats.map((c) => c.name)).toEqual(['Laws', 'Cycles'])
    expect(opened.cats.every((c) => c.set?.id === 'set-1' && !c.builtIn && isPlayable(c))).toBe(true)
    expect(opened.cats[1].levels[4]).toHaveLength(3)
    const { game } = createGame(opened.cats, ['A', 'B'], { timer: 0, deduct: false, golden: 0 }, {}, Math.random)
    expect(game.cats.map((c) => c.name)).toEqual(['Laws', 'Cycles'])
  })

  it('survives being saved and loaded with the other categories', () => {
    const opened = parseQuestionFile(exportStudySet(draft()), id)
    const back = cleanCategories(JSON.parse(JSON.stringify(opened.cats)))
    expect(back.map((c) => c.set)).toEqual([{ id: 'set-1', title: 'Thermo ch 1-3' }, { id: 'set-1', title: 'Thermo ch 1-3' }])
  })

  it('opening a newer copy replaces the older one and keeps the rest', () => {
    const mine = { id: 'own', name: 'Mine', builtIn: false, levels: [[], [], [], [], []] }
    const first = mergeOpened([mine], parseQuestionFile(exportStudySet(draft()), id))
    expect(first.next).toHaveLength(3)
    const d2 = draft()
    d2.subs.push(filled('Entropy'))
    const second = mergeOpened(first.next, parseQuestionFile(exportStudySet(d2), id))
    expect(second.replaced).toBe(2)
    expect(second.next.map((c) => c.name)).toEqual(['Mine', 'Laws', 'Cycles', 'Entropy'])
  })

  it('still opens a single exported category file', () => {
    const opened = parseQuestionFile({ format: 'get-grilled-category', version: 1, ...filled('Solo') }, id)
    expect(opened.set).toBeUndefined()
    expect(opened.cats[0].name).toBe('Solo')
    expect(mergeOpened([], opened).next).toHaveLength(1)
    expect(draftFromFile({ ...filled('Solo') }, id).subs[0].name).toBe('Solo')
  })

  it('refuses broken files with a message that names the subcategory', () => {
    const bad = exportStudySet(draft()) as ReturnType<typeof exportStudySet>
    bad.subcategories[1].levels[3] = []
    bad.subcategories[1].levels.pop()
    expect(() => parseQuestionFile(bad, id)).toThrow(/Subcategory 2 \(“Cycles”\): .*5 difficulty levels/)
    expect(() => parseQuestionFile({ format: 'get-grilled-study-set', version: 1, title: '', subcategories: [] }, id)).toThrow(/title/)
    expect(() => parseQuestionFile({ format: 'get-grilled-study-set', version: 2, title: 'x', subcategories: [] }, id)).toThrow(/newer version/)
    expect(() => parseQuestionFile({ format: 'get-grilled-study-set', version: 1, title: 'x', subcategories: Array(13).fill(filled('s')) }, id)).toThrow(/up to 12/)
    expect(() => parseQuestionFile(null, id)).toThrow()
  })

  it('ignores extra fields and an unsafe set id, and never keeps pictures from a study file', () => {
    const file = { ...exportStudySet(draft()), id: '../../evil<script>', extra: 1 }
    ;(file.subcategories[0].levels[0][0] as Record<string, unknown>).img = 'javascript:alert(1)'
    const opened = parseQuestionFile(file, id)
    expect(opened.set?.id).not.toContain('<')
    expect(opened.cats[0].levels[0][0]).not.toHaveProperty('img')
  })

  it('opens a file back into an editable draft', () => {
    const d = draftFromFile(exportStudySet(draft()), id)
    expect(d.id).toBe('set-1')
    expect(d.title).toBe('Thermo ch 1-3')
    expect(d.subs[1].levels[0]).toEqual([{ q: 'Cycles q0-0', a: 'a0-0' }, { q: 'Cycles q0-1', a: 'a0-1' }, { q: 'Cycles q0-2', a: 'a0-2' }])
  })

  it('pastes many questions: "question | answer" lines or spreadsheet rows', () => {
    const r = parseBulk('What is 2+2? | 4\n\nno separator here\nUnit of force\tNewton\nA | B | C\n | empty')
    expect(r.items).toEqual([
      { q: 'What is 2+2?', a: '4' },
      { q: 'Unit of force', a: 'Newton' },
      { q: 'A | B', a: 'C' },
    ])
    expect(r.skipped).toEqual([3, 6])
  })

  it('cleans a saved draft and makes safe file names', () => {
    expect(cleanDraft(null)).toBeNull()
    expect(cleanDraft({ id: 'bad id!', subs: [] })).toBeNull()
    const d = cleanDraft({ id: 's1', title: 5, subs: [{ name: 'A', levels: [[{ q: 'x', a: 'y' }, 3]] }, 'junk'] })
    expect(d).toEqual({ id: 's1', title: '', by: '', note: '', subs: [{ ...emptySub('A'), levels: [[{ q: 'x', a: 'y' }], [], [], [], []] }] })
    expect(studyFileName('Thermo: ch 1/3 ')).toBe('Thermo_ch_1_3.json')
    expect(studyFileName('  ')).toBe('questions.json')
  })
})
