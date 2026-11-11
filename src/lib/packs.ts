import type { Category, CategorySummary, Question } from './types'

interface PackFile {
  id: string
  name: string
  nameAr?: string
  respect?: boolean
  levels: { q: string; a: string; qAr?: string; aAr?: string; kind?: 'H' | 'D' | 'F'; src?: string }[][]
}

const base = import.meta.env.BASE_URL

/** Turns a pack file into a category, giving each question a stable id. */
export function packToCategory(p: PackFile): Category {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    builtIn: true,
    ...(p.respect ? { respect: true } : {}),
    levels: p.levels.map((lvl, li) => lvl.map((x, qi): Question => ({ id: `${p.id}-${li}-${qi}`, ...x }))),
  }
}

export async function loadIndex(): Promise<CategorySummary[]> {
  const res = await fetch(`${base}packs/index.json`)
  if (!res.ok) throw new Error('Could not load the built-in categories')
  const list = (await res.json()) as Omit<CategorySummary, 'builtIn'>[]
  return list.map((c) => ({ ...c, builtIn: true }))
}

const cache = new Map<string, Promise<Category>>()
export function loadPack(id: string): Promise<Category> {
  if (!cache.has(id)) {
    cache.set(
      id,
      fetch(`${base}packs/${id}.json`).then(async (r) => {
        if (!r.ok) {
          cache.delete(id)
          throw new Error(`Could not load the category "${id}"`)
        }
        return packToCategory((await r.json()) as PackFile)
      }),
    )
  }
  return cache.get(id)!
}
