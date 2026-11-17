import type { Category } from './types'
import { VALUES } from './types'
import { LIMITS, parseImportedCategory } from './game'

/**
 * Study files: a set of questions an instructor makes for their students, split into subcategories.
 * Each subcategory becomes one playable category when a student opens the file, and they are shown
 * together under the set's title. A set keeps its id across edits, so opening a newer copy of the
 * same file replaces the older one instead of adding it twice.
 */
export const STUDY_FORMAT = 'get-grilled-study-set'
export const STUDY_LIMITS = { title: 60, by: 80, note: 400, subcategories: 12 }

export interface DraftQuestion {
  q: string
  a: string
}
export interface DraftSub {
  name: string
  /** Five lists, one per level (100 to 500) */
  levels: DraftQuestion[][]
}
export interface StudyDraft {
  id: string
  title: string
  by: string
  note: string
  subs: DraftSub[]
}

export const emptySub = (name = ''): DraftSub => ({ name, levels: [[], [], [], [], []] })
export const newDraft = (id: string): StudyDraft => ({ id, title: '', by: '', note: '', subs: [emptySub()] })

/** Everything that would stop the file from importing, in words an instructor can act on. Empty when the file is ready. */
export function draftProblems(d: StudyDraft): string[] {
  const out: string[] = []
  if (!d.title.trim()) out.push('Give the file a title.')
  if (d.subs.length === 0) out.push('Add at least one subcategory.')
  const names = new Set<string>()
  d.subs.forEach((s, si) => {
    const label = s.name.trim() || `Subcategory ${si + 1}`
    if (!s.name.trim()) out.push(`Subcategory ${si + 1} needs a name.`)
    else if (names.has(s.name.trim().toLowerCase())) out.push(`Two subcategories are called “${s.name.trim()}”.`)
    names.add(s.name.trim().toLowerCase())
    s.levels.forEach((l, li) => {
      if (l.length === 0) out.push(`${label}: add at least one ${VALUES[li]} question.`)
      l.forEach((x, qi) => {
        if (!x.q.trim() || !x.a.trim()) out.push(`${label}, ${VALUES[li]} question ${qi + 1}: needs both a question and an answer.`)
      })
    })
  })
  return out
}

/** The file instructors download and students open. */
export function exportStudySet(d: StudyDraft) {
  return {
    format: STUDY_FORMAT,
    version: 1,
    id: d.id,
    title: d.title.trim(),
    ...(d.by.trim() ? { by: d.by.trim() } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
    subcategories: d.subs.map((s) => ({
      name: s.name.trim(),
      levels: s.levels.map((l) => l.map((x) => ({ q: x.q.trim(), a: x.a.trim() }))),
    })),
  }
}

export const studyFileName = (title: string) => `${title.trim().replace(/[^\w؀-ۿ-]+/g, '_').replace(/^_+|_+$/g, '') || 'questions'}.json`

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const SET_ID = /^[\w-]{1,40}$/

export interface OpenedFile {
  cats: Category[]
  /** Set when the file was a study file */
  set?: { id: string; title: string; by?: string; note?: string }
}

/**
 * Reads a file a person picked: a study file (many subcategories) or a single exported category.
 * Every question goes through the same checks as the category builder's import.
 */
export function parseQuestionFile(raw: unknown, newId: () => string): OpenedFile {
  if (!isObj(raw)) throw new Error('The file does not contain questions')
  if (raw.format !== STUDY_FORMAT) return { cats: [parseImportedCategory(raw, newId)] }
  if (raw.version !== 1) throw new Error('This study file was made by a newer version of Get Grilled. Reload the page and try again.')
  const title = str(raw.title, STUDY_LIMITS.title)
  if (!title) throw new Error('The study file needs a title')
  const id = typeof raw.id === 'string' && SET_ID.test(raw.id) ? raw.id : newId()
  if (!Array.isArray(raw.subcategories) || raw.subcategories.length === 0) throw new Error('The study file has no subcategories')
  if (raw.subcategories.length > STUDY_LIMITS.subcategories) throw new Error(`A study file can have up to ${STUDY_LIMITS.subcategories} subcategories`)
  const set = { id, title, ...(str(raw.by, STUDY_LIMITS.by) ? { by: str(raw.by, STUDY_LIMITS.by) } : {}), ...(str(raw.note, STUDY_LIMITS.note) ? { note: str(raw.note, STUDY_LIMITS.note) } : {}) }
  const cats = raw.subcategories.map((sub, i) => {
    if (!isObj(sub)) throw new Error(`Subcategory ${i + 1} is not readable`)
    try {
      // Only the name and the questions are read; anything else in the file is ignored.
      const cat = parseImportedCategory({ name: sub.name, levels: Array.isArray(sub.levels) ? sub.levels.map((l) => (Array.isArray(l) ? l.map((x) => (isObj(x) ? { q: x.q, a: x.a } : x)) : l)) : sub.levels }, newId)
      return { ...cat, set: { id, title } }
    } catch (e) {
      throw new Error(`Subcategory ${i + 1}${typeof sub.name === 'string' && sub.name.trim() ? ` (“${sub.name.trim()}”)` : ''}: ${(e as Error).message}`)
    }
  })
  return { cats, set }
}

/** Turns a file back into a draft, so an instructor can open last week's file and keep working on it. */
export function draftFromFile(raw: unknown, newId: () => string): StudyDraft {
  const opened = parseQuestionFile(raw, newId)
  const subs = opened.cats.map((c) => ({ name: c.name, levels: c.levels.map((l) => l.map((x) => ({ q: x.q, a: x.a }))) }))
  if (opened.set) return { id: opened.set.id, title: opened.set.title, by: opened.set.by ?? '', note: opened.set.note ?? '', subs }
  // A single category becomes a file with one subcategory.
  return { id: newId(), title: opened.cats[0].name, by: '', note: '', subs }
}

/** Puts newly opened categories in with the person's own: a newer copy of a study file replaces the older one. */
export function mergeOpened(custom: Category[], opened: OpenedFile): { next: Category[]; replaced: number } {
  if (!opened.set) return { next: [...custom, ...opened.cats], replaced: 0 }
  const setId = opened.set.id
  const kept = custom.filter((c) => c.set?.id !== setId)
  return { next: [...kept, ...opened.cats], replaced: custom.length - kept.length }
}

/**
 * Many questions pasted at once, one per line: "question | answer" (a tab works too, so rows
 * copied from a spreadsheet paste straight in). Lines without a separator are reported back.
 */
export function parseBulk(text: string): { items: DraftQuestion[]; skipped: number[] } {
  const items: DraftQuestion[] = []
  const skipped: number[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    const cut = line.includes('\t') ? line.indexOf('\t') : line.lastIndexOf('|')
    const q = cut > 0 ? line.slice(0, cut).trim() : ''
    const a = cut > 0 ? line.slice(cut + 1).trim() : ''
    if (!q || !a || q.length > LIMITS.clue || a.length > LIMITS.answer) skipped.push(i + 1)
    else items.push({ q, a })
  })
  return { items, skipped }
}

/** Keeps a saved draft only if it has the expected shape. */
export function cleanDraft(raw: unknown): StudyDraft | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !SET_ID.test(raw.id) || !Array.isArray(raw.subs)) return null
  const subs = raw.subs.filter(isObj).slice(0, STUDY_LIMITS.subcategories).map((s) => ({
    name: typeof s.name === 'string' ? s.name.slice(0, LIMITS.name) : '',
    levels: [0, 1, 2, 3, 4].map((li) => {
      const l = Array.isArray(s.levels) ? s.levels[li] : null
      return Array.isArray(l) ? l.filter(isObj).slice(0, LIMITS.perLevel).map((x) => ({ q: typeof x.q === 'string' ? x.q.slice(0, LIMITS.clue) : '', a: typeof x.a === 'string' ? x.a.slice(0, LIMITS.answer) : '' })) : []
    }),
  }))
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title.slice(0, STUDY_LIMITS.title) : '',
    by: typeof raw.by === 'string' ? raw.by.slice(0, STUDY_LIMITS.by) : '',
    note: typeof raw.note === 'string' ? raw.note.slice(0, STUDY_LIMITS.note) : '',
    subs,
  }
}
