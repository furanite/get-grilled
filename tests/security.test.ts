import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { META_CSP, SECURITY_HEADERS } from '../security-headers.mjs'

describe('security policy', () => {
  it('turns off camera and microphone, and allows location only for this site (Maghrib-timed themes)', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=(self)')
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()')
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('microphone=()')
  })
  it('the page carries the same CSP as a meta tag (GitHub Pages sends no headers), with no outside hosts', () => {
    expect(META_CSP).toContain("script-src 'self'")
    expect(META_CSP).toContain("connect-src 'self'")
    expect(META_CSP).not.toContain('frame-ancestors')
    expect(META_CSP).not.toMatch(/https?:/)
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')
    expect(html).toContain('http-equiv="Content-Security-Policy"')
    expect(html).toContain('<meta name="referrer" content="no-referrer" />')
  })
})
