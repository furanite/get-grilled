// Screenshots of every theme: home, board, clue (revealed). Run after `npm run build`: node e2e/theme-shots.mjs [outdir] [theme,...]
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const PORT = 4183, URL = `http://localhost:${PORT}/`
const OUT = process.argv[2] || 'e2e/shots/themes'
const ONLY = process.argv[3] ? process.argv[3].split(',') : ['amethyst', 'emerald', 'neon', 'onyx', 'rivals', 'ember', 'heritage']
const SCALE = Number(process.env.SCALE || 1)
mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch()
try {
  for (const id of ONLY) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: SCALE })
    await ctx.addInitScript((id) => {
      localStorage.setItem('gg.consent.v1', JSON.stringify({ version: '1.1', date: '2026-11-10T00:00:00Z' }))
      if (!localStorage.getItem('gg.settings.v1')) localStorage.setItem('gg.settings.v1', JSON.stringify({ theme: id, lang: 'en', sound: false }))
    }, id)
    const page = await ctx.newPage()
    const errs = []; page.on('pageerror', (e) => errs.push(e.message))
    await page.clock.install({ time: new Date('2026-11-13T10:00:00Z') })
    await page.goto(URL)
    await page.waitForSelector('.logo-title')
    await page.clock.runFor(3000)
    await page.screenshot({ path: `${OUT}/${id}-1-home.png` })
    await page.getByRole('button', { name: /new game/i }).click()
    await page.waitForSelector('.cat-pick')
    const picks = page.locator('.cat-pick:not([disabled])')
    for (let i = 0; i < 6; i++) await picks.nth(i).click()
    await page.clock.runFor(1500)
    await page.screenshot({ path: `${OUT}/${id}-2-setup.png` })
    await page.getByTestId('start').click()
    await page.waitForSelector('.tile')
    await page.clock.runFor(3000)
    await page.click('[data-tile="0-0"]'); await page.clock.runFor(1500)
    await page.getByTestId('reveal').click(); await page.clock.runFor(800)
    const right = page.locator('[data-testid="clue"] button', { hasText: /right|correct|✓/i }).first()
    if (await right.count()) await right.click(); else await page.getByTestId('back').click()
    await page.clock.runFor(2000)
    await page.screenshot({ path: `${OUT}/${id}-3-board.png` })
    await page.click('[data-tile="2-3"]'); await page.clock.runFor(1500); await page.waitForTimeout(1200)
    await page.screenshot({ path: `${OUT}/${id}-4-clue.png` })
    await page.getByTestId('reveal').click(); await page.clock.runFor(1500); await page.waitForTimeout(1200)
    await page.screenshot({ path: `${OUT}/${id}-5-answer.png` })
    for (const j of ['0-ok']) { const b = page.locator(`[data-judge="${j}"]`); if (await b.count()) await b.click() }
    await page.clock.runFor(2500); await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/${id}-6-scores.png`, fullPage: true })
    await page.getByTestId('end').click(); await page.getByTestId('end-confirm').click()
    await page.clock.runFor(3000); await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${id}-7-results.png` })
    if (errs.length) console.log(id, 'errors', errs)
    console.log('done', id)
    await ctx.close()
  }
} finally { await browser.close(); server.kill() }
