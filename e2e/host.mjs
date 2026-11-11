// Browser checks for the host edition (two windows). Run: npm run e2e:host
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const PORT = 4181
const URL = `http://localhost:${PORT}/`
const SHOTS = process.env.SHOTS || 'e2e/shots'
mkdirSync(SHOTS, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-host', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const results = []
async function test(name, fn) {
  try { await fn(); results.push(true); console.log('PASS', name) } catch (e) { results.push(false); console.log('FAIL', name, '\n   ', String(e.message || e).split('\n')[0]) }
}
function assert(c, msg) { if (!c) throw new Error(msg) }

const browser = await chromium.launch()
async function hostPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(() => localStorage.setItem('gg.consent.v1', JSON.stringify({ version: '1.1', date: '2026-11-10T00:00:00Z' })))
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()))
  await page.goto(URL)
  return page
}
async function openAudience(page) {
  const [aud] = await Promise.all([page.context().waitForEvent('page'), page.getByTestId('audience-toggle').click()])
  aud.errors = []
  aud.on('pageerror', (e) => aud.errors.push(e.message))
  await aud.waitForSelector('[data-testid="audience"]')
  return aud
}
async function startGame(page, n = 6) {
  await page.getByRole('button', { name: /new game|لعبة جديدة/i }).click()
  await page.waitForSelector('.cat-pick')
  for (let i = 0; i < n; i++) await page.locator('.cat-pick:not([disabled])').nth(i).click()
  await page.getByTestId('start').click()
  await page.waitForSelector('.tile')
}

try {
  await test('host edition has its own title and an Open audience screen button', async () => {
    const page = await hostPage()
    assert((await page.title()) === 'Get Grilled Host', 'title: ' + (await page.title()))
    assert((await page.getByTestId('audience-toggle').textContent()) === 'Open audience screen', 'button text')
    await page.context().close()
  })

  await test('the audience window waits, then shows the board and scores when the game starts', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    assert((await aud.textContent('[data-testid="audience"]')).includes('The game will start soon'), 'waiting text')
    assert((await aud.locator('[data-mark] svg').count()) === 1, 'title screen mark')
    await aud.setViewportSize({ width: 1280, height: 720 })
    await aud.waitForTimeout(2500)
    await aud.screenshot({ path: `${SHOTS}/host-audience-title.png` })
    assert((await page.getByTestId('audience-toggle').textContent()) === 'Close audience screen', 'toggle text')
    await startGame(page)
    await aud.waitForSelector('[data-aud-tile="5-4"]')
    assert((await aud.locator('[data-aud-tile]').count()) === 30, 'tiles')
    assert((await aud.locator('[data-aud-team]').count()) === 3, 'teams')
    assert((await aud.locator('button').count()) <= 1, 'audience screen should have no game controls')
    const fontOk = await aud.evaluate(() => getComputedStyle(document.querySelector('.tile')).borderRadius !== '0px')
    assert(fontOk, 'styles not copied into the audience window')
    await aud.screenshot({ path: `${SHOTS}/host-audience-board.png` })
    await page.context().close()
  })

  await test('the room sees the question but not the answer until the host reveals it', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    await startGame(page)
    await page.click('[data-tile="2-3"]')
    await page.waitForSelector('.card.open')
    await aud.waitForSelector('[data-testid="audience-clue"]')
    const hostQ = await page.textContent('[data-testid="question"]')
    const audQ = await aud.textContent('[data-testid="audience-question"]')
    assert(hostQ === audQ, 'question differs')
    const answer = await page.textContent('[data-testid="answer"]')
    assert(await page.locator('.answer.peek').isVisible(), 'host cannot see the answer early')
    assert(!(await aud.textContent('[data-testid="audience-clue"]')).includes(answer), 'answer leaked to the audience')
    assert((await aud.locator('[data-testid="audience-answer"]').count()) === 0, 'answer element on audience')
    await aud.waitForTimeout(900)
    await aud.screenshot({ path: `${SHOTS}/host-audience-clue.png` })
    await page.screenshot({ path: `${SHOTS}/host-host-clue.png` })
    await page.getByTestId('reveal').click()
    await aud.waitForSelector('[data-testid="audience-answer"]')
    assert((await aud.textContent('[data-testid="audience-answer"]')) === answer, 'answer differs')
    await page.click('[data-judge="1-ok"]')
    await aud.waitForSelector('[data-testid="audience-clue"]', { state: 'detached' })
    await aud.waitForSelector('[data-aud-tile="2-3"][data-used]')
    const score = await aud.textContent('[data-aud-team="1"] span')
    assert(score === '400' || score === '800', 'score on audience: ' + score)
    assert(page.errors.length === 0 && aud.errors.length === 0, 'errors: ' + [...page.errors, ...aud.errors].join(' | '))
    await page.context().close()
  })

  await test('closing a clue without answering hides it on the audience screen too', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    await startGame(page)
    await page.click('[data-tile="0-0"]')
    await aud.waitForSelector('[data-testid="audience-clue"]')
    await page.getByTestId('back').click()
    await aud.waitForSelector('[data-testid="audience-clue"]', { state: 'detached' })
    assert((await aud.locator('[data-aud-tile="0-0"][data-used]').count()) === 0, 'tile marked used')
    await page.context().close()
  })

  await test('theme and Arabic follow the host, and results show on the audience screen', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    await page.click('[data-theme-id="neon"]')
    await aud.waitForFunction(() => document.documentElement.dataset.theme === 'neon', null, { timeout: 4000 })
    await aud.waitForFunction(() => decodeURIComponent(document.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href') ?? '').includes('gg-neon'), null, { timeout: 4000 })
    await page.getByRole('button', { name: 'العربية' }).click()
    await aud.waitForFunction(() => document.documentElement.dir === 'rtl')
    await startGame(page)
    await page.click('[data-tile="3-0"]')
    await aud.waitForSelector('[data-testid="audience-question"]')
    const q = await aud.textContent('[data-testid="audience-question"]')
    assert(/[؀-ۿ]/.test(q), 'question not Arabic: ' + q)
    await page.getByTestId('back').click()
    await page.getByTestId('end').click()
    await aud.waitForSelector('[data-testid="audience-winner"]')
    await aud.screenshot({ path: `${SHOTS}/host-audience-results.png` })
    await page.context().close()
  })

  await test('a one-category game does not stretch one tile across the projector', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    await aud.setViewportSize({ width: 1920, height: 1080 })
    await startGame(page, 1)
    await aud.waitForSelector('[data-aud-tile="0-4"]')
    const w = await aud.locator('[data-aud-tile]').first().evaluate((e) => e.getBoundingClientRect().width)
    assert(w <= 0.35 * 1920, 'tile is ' + w + 'px wide')
    await aud.screenshot({ path: `${SHOTS}/host-audience-one-cat.png` })
    await page.context().close()
  })

  await test('the button resets when the audience window is closed by hand, and can reopen it', async () => {
    const page = await hostPage()
    const aud = await openAudience(page)
    await aud.close()
    await page.waitForFunction(() => document.querySelector('[data-testid="audience-toggle"]').textContent === 'Open audience screen', null, { timeout: 4000 })
    const again = await openAudience(page)
    assert(await again.locator('[data-testid="audience"]').count() === 1, 'reopen failed')
    await page.getByTestId('audience-toggle').click()
    await page.waitForTimeout(300)
    assert(again.isClosed(), 'Close button did not close the window')
    await page.context().close()
  })

  await test('a blocked pop-up shows a clear message instead of failing', async () => {
    const page = await hostPage()
    await page.evaluate(() => { window.open = () => null })
    await page.getByTestId('audience-toggle').click()
    await page.waitForSelector('.toast')
    assert((await page.textContent('.toast')).includes('blocked'), 'no message')
    await page.context().close()
  })
} finally {
  await browser.close()
  server.kill()
}
const passed = results.filter(Boolean).length
console.log(`\n${passed}/${results.length} host-edition tests passed`)
process.exit(passed === results.length ? 0 : 1)
