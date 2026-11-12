import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The Qur'anic text must never be changed: every clue and answer must be whole words of the ayah, in order.
const dir = join(__dirname, '..', 'questions')
const ref: Record<string, string> = JSON.parse(readFileSync(join(dir, 'quran-ref.json'), 'utf8')).ayat
const lines = readFileSync(join(dir, 'isl-ayah.txt'), 'utf8').split('\n').filter((l) => l.includes(' :: '))

describe('Complete the Ayah', () => {
  it('has questions', () => expect(lines.length).toBeGreaterThan(75))
  for (const line of lines) {
    it(line.slice(-14), () => {
      const m = /^(… )?(.+) … :: (.+) \((\d+:\d+)\) \|\| H: Qur'an (\d+:\d+)$/.exec(line)
      expect(m, line).not.toBeNull()
      const [, , clue, ans, r, src] = m!
      expect(src).toBe(r)
      const ayah = ref[r]
      expect(ayah, r).toBeTruthy()
      // Clue then answer are one unbroken run of the ayah's own words
      const run = `${clue} ${ans}`
      expect(` ${ayah} `.includes(` ${run} `), `${r}: ${run}`).toBe(true)
    })
  }
})
