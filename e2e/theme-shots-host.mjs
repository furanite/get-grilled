// Projector screenshots for every theme (host edition). Run after `npx vite build --mode host --outDir dist-host`: node e2e/theme-shots-host.mjs [outdir] [themes]
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const PORT = 4184, URL = `http://localhost:${PORT}/`
const OUT = process.argv[2] || 'e2e/shots/themes'
const ONLY = process.argv[3] ? process.argv[3].split(',') : ['amethyst', 'emerald', 'neon', 'onyx', 'rivals', 'ember', 'heritage']
mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-host', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch()
try {
  for (const id of ONLY) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.addInitScript((id) => {
      localStorage.setItem('gg.consent.v1', JSON.stringify({ version: '1.1', date: '2026-11-10T00:00:00Z' }))
      if (!localStorage.getItem('gg.settings.v1')) localStorage.setItem('gg.settings.v1', JSON.stringify({ theme: id, lang: 'en', sound: false }))
    }, id)
    const page = await ctx.newPage()
    if (id === 'heritage') await page.clock.install({ time: new Date('2026-11-13T10:00:00Z') })
    await page.goto(URL)
    const [aud] = await Promise.all([ctx.waitForEvent('page'), page.getByTestId('audience-toggle').click()])
    await aud.waitForSelector('[data-testid="audience"]')
    await aud.setViewportSize({ width: 1600, height: 900 })
    await aud.addStyleTag({ content: '.aud-help{display:none!important}' })
    await aud.waitForTimeout(2500)
    await aud.screenshot({ path: `${OUT}/${id}-p1-title.png` })
    await page.getByRole('button', { name: /new game/i }).click()
    await page.waitForSelector('.cat-pick')
    for (let i = 0; i < 6; i++) await page.locator('.cat-pick:not([disabled])').nth(i).click()
    await page.getByTestId('start').click()
    await page.waitForSelector('.tile')
    await page.click('[data-tile="1-0"]'); await page.waitForTimeout(1200)
    await page.locator('[data-judge="1-ok"]').click(); await page.waitForTimeout(1500)
    await aud.waitForTimeout(2500)
    await aud.screenshot({ path: `${OUT}/${id}-p2-board.png` })
    await page.click('[data-tile="3-2"]'); await page.waitForTimeout(1200)
    await page.getByTestId('reveal').click(); await aud.waitForTimeout(2000)
    await aud.screenshot({ path: `${OUT}/${id}-p3-clue.png` })
    console.log('done', id)
    await ctx.close()
  }
} finally { await browser.close(); server.kill() }
