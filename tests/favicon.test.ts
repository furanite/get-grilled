import { describe, it, expect } from 'vitest'
import { ICONS, faviconSvg } from '../src/lib/favicon'

describe('tab icon', () => {
  it('has a distinct icon for every theme', () => {
    const svgs = Object.keys(ICONS).map((t) => faviconSvg(t as keyof typeof ICONS))
    expect(svgs.length).toBe(7)
    expect(new Set(svgs).size).toBe(7)
    for (const s of svgs) expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
  })
})
