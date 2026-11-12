import { catIconSvg as islamicIconSvg } from '../src/lib/islamic'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catIconSvg, hasCatIcon } from '../src/lib/caticons'

const dir = join(__dirname, '..', 'questions')
const packIds = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .map((f) => /^id:\s*(\S+)/m.exec(readFileSync(join(dir, f), 'utf8'))?.[1])
  .filter((id): id is string => !!id)

describe('category icons', () => {
  it('has a drawing for every built-in category', () => {
    expect(packIds.length).toBeGreaterThan(20)
    // Islamic and Kids categories use their own line icons (src/lib/islamic.ts).
    for (const id of packIds) expect(hasCatIcon(id) || !!islamicIconSvg(id), id).toBe(true)
  })

  it('covers the new engineering categories', () => {
    for (const id of ['fluids', 'materials', 'dynamics', 'power', 'civil', 'engmath']) expect(hasCatIcon(id), id).toBe(true)
  })

  it('gives categories people make the fallback drawing', () => {
    expect(hasCatIcon('c-abc123')).toBe(false)
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) expect(hasCatIcon(id), id).toBe(false)
    expect(catIconSvg('constructor')).not.toContain('[object')
    const strip = (s: string) => s.replace(/ci\d+/g, '')
    expect(strip(catIconSvg('c-abc123'))).toBe(strip(catIconSvg('custom')))
  })

  it('uses a fresh gradient id each time and never echoes the id it was given', () => {
    const a = catIconSvg('<script>')
    const b = catIconSvg('<script>')
    expect(a).not.toContain('<script>')
    expect(a.match(/id="(ci\d+)"/)?.[1]).not.toBe(b.match(/id="(ci\d+)"/)?.[1])
    expect(a.startsWith('<svg')).toBe(true)
  })
})
