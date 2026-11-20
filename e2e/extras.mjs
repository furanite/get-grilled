// End-to-end checks for the tie-breaker, game log, backup sheet, flagged questions, bracket, waiting screen,
// practice, display options, What's new and the offline copy. Run: npm run build && node e2e/extras.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PORT = 4185
const URL = `http://localhost:${PORT}/`
if (await fetch(URL).then(() => true, () => false)) throw new Error(`Port ${PORT} is already in use (an old preview server?). Stop it and run again.`)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const results = []
let browser
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return
  try {
    await fn()
    results.push({ name, ok: true })
    console.log('PASS', name)
  } catch (e) {
    results.push({ name, ok: false })
    console.log('FAIL', name, '\n   ', String(e.message || e).split('\n').slice(0, 3).join('\n    '))
  }
}
function assert(c, msg) {
  if (!c) throw new Error(msg)
}
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true, ...opts })
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('gg.consent.ilm.v1')) localStorage.setItem('gg.consent.ilm.v1', JSON.stringify({ version: '1.5', date: '2026-11-19T00:00:00Z' }))
    localStorage.setItem('gg.tipsSeen.ilm.v1', 'true')
    // Printing opens a window the test can't close; count the calls and keep what was on paper instead.
    window.__printed = []
    window.print = () => window.__printed.push(document.querySelector('.print-root')?.textContent ?? '')
  })
  const page = await ctx.newPage()
  await page.addLocatorHandler(page.getByTestId('intro-next'), async (b) => b.click(), { noWaitAfter: true })
  page.errors = []
  page.requests = []
  page.on('request', (r) => page.requests.push(r.url()))
  page.on('pageerror', (e) => page.errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()))
  return page
}
async function setupGame(page, cats = 2, teams) {
  await page.getByRole('button', { name: /new game/i }).click()
  await page.waitForSelector('.cat-pick')
  const picks = page.locator('.cat-pick:not([disabled])')
  for (let i = 0; i < cats; i++) await picks.nth(i).click()
  if (teams) for (let i = 0; i < teams.length; i++) await page.fill(`#team-${i}`, teams[i])
  const box = page.locator('#extras')
  if ((await box.count()) && (await box.isChecked())) await box.uncheck()
  await page.getByTestId('start').click()
  await page.waitForSelector('.tile')
}
async function openTile(page, key) {
  await page.click(`[data-tile="${key}"]`)
  await page.waitForSelector('.card.open')
  await page.waitForTimeout(700)
}
async function endGame(page) {
  await page.getByTestId('end').click()
  await page.getByTestId('end-confirm').click()
  await page.waitForSelector('.results')
}
const noErrors = (page) => assert(!page.errors.length, 'page errors: ' + page.errors.join(' | '))
const onlyLocal = (page) => {
  const out = page.requests.filter((u) => !u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:'))
  assert(!out.length, 'outside requests: ' + out.join(', '))
}

try {
  browser = await chromium.launch()

  await test('a tie at the top offers a sudden-death question; the first right answer wins it', async () => {
    const page = await newPage()
    await page.goto(URL)
    await setupGame(page, 2, ['Falcons', 'Hawks'])
    await endGame(page)
    assert((await page.getByTestId('winner').textContent()).includes('tie'), 'not a tie at 0-0')
    await page.getByTestId('tie-start').click()
    await page.waitForSelector('[data-testid="tiebreak"]')
    await page.getByTestId('tie-show').click()
    assert(await page.getByTestId('tie-q').textContent(), 'no tie-breaker question')
    await page.click('[data-tie="0-no"]')
    assert(await page.locator('[data-tie="0-ok"]').isDisabled(), 'a team that missed can still answer')
    await page.getByTestId('tie-next').click()
    await page.getByTestId('tie-show').click()
    await page.click('[data-tie="1-ok"]')
    assert((await page.getByTestId('tie-winner').textContent()).includes('Hawks'), 'wrong winner')
    await page.getByTestId('tie-done').click()
    assert((await page.getByTestId('winner').textContent()).includes('Hawks'), 'results do not show the tie-breaker winner')
    assert(!(await page.getByTestId('tie-start').count()), 'tie-breaker offered again')
    // a reload keeps the result
    await page.reload()
    await page.getByRole('button', { name: /resume/i }).click()
    noErrors(page)
    onlyLocal(page)
  })

  await test('the game log records answers, shows team stats, prints and downloads', async () => {
    const page = await newPage()
    await page.goto(URL)
    await setupGame(page, 2, ['Red', 'Blue'])
    await openTile(page, '0-0')
    const q = await page.getByTestId('question').textContent()
    await page.click('[data-judge="0-ok"]')
    await page.waitForTimeout(1200)
    await openTile(page, '1-1')
    await page.click('[data-judge="1-no"]')
    await page.getByTestId('nobody').click()
    await page.waitForTimeout(1000)
    await page.getByTestId('log-open').click()
    const rows = await page.locator('[data-testid="log-table"] tbody tr').count()
    assert(rows === 3, `expected 3 log lines (right, wrong, nobody), got ${rows}`)
    assert((await page.getByTestId('log-table').textContent()).includes(q.trim().slice(0, 20)), 'question missing from the log')
    const stats = await page.getByTestId('log-stats').textContent()
    assert(/Right\s*1/.test(stats), 'stats: ' + stats)
    await page.getByTestId('log-print').click()
    await page.waitForFunction(() => window.__printed.length === 1)
    const printed = await page.evaluate(() => window.__printed[0])
    assert(printed.includes('Game log') && printed.includes('Red'), 'printed log is empty')
    assert(!(await page.locator('.print-root').count()), 'print sheet left on the page')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('log-csv').click()])
    assert(/\.csv$/.test(dl.suggestedFilename()), 'not a csv: ' + dl.suggestedFilename())
    await page.getByTestId('log-close').click()
    noErrors(page)
  })

  await test('the backup sheet prints every clue and answer on the board', async () => {
    const page = await newPage()
    await page.goto(URL)
    await setupGame(page, 2)
    await page.getByTestId('backup-print').click()
    await page.waitForFunction(() => window.__printed.length === 1)
    const printed = await page.evaluate(() => window.__printed[0])
    const game = await page.evaluate(() => JSON.parse(localStorage.getItem('gg.game.ilm.v1')))
    for (const col of game.clues) for (const c of col) assert(printed.includes(c.a), 'answer missing from the backup sheet: ' + c.a)
    noErrors(page)
  })

  await test('a flagged question can be taken out of play from the title screen', async () => {
    const page = await newPage()
    await page.goto(URL)
    await setupGame(page, 1)
    await openTile(page, '0-2')
    await page.getByTestId('flag').click()
    assert((await page.getByTestId('flag').getAttribute('aria-pressed')) === 'true', 'flag did not stick')
    const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('gg.flags.ilm.v1')))
    assert(flags.length === 1 && flags[0].level === 2, 'flag not saved')
    await page.getByTestId('back').click()
    await page.click('.brand')
    await page.getByTestId('flags-open').click()
    await page.getByTestId('flag-out-0').click()
    const pools = await page.evaluate(() => JSON.parse(localStorage.getItem('gg.pools.ilm.v1')))
    assert(pools[flags[0].catId].off[2].includes(flags[0].id), 'question not taken out of play')
    noErrors(page)
  })

  await test('the bracket draws heats, starts a game with its teams, and records the winner', async () => {
    const page = await newPage()
    await page.goto(URL)
    await page.getByTestId('bracket-open').click()
    await page.fill('[data-testid="bracket-teams"]', 'Lions\nTigers\nBears\nWolves')
    await page.selectOption('[data-testid="bracket-per"]', '2')
    await page.getByTestId('bracket-draw').click()
    assert((await page.locator('.bracket-match').count()) === 2, 'expected two heats')
    await page.getByTestId('bracket-play-0-0').click()
    await page.waitForSelector('.cat-pick')
    const names = [await page.inputValue('#team-0'), await page.inputValue('#team-1')]
    await page.locator('.cat-pick:not([disabled])').first().click()
    const box = page.locator('#extras')
    if ((await box.count()) && (await box.isChecked())) await box.uncheck()
    await page.getByTestId('start').click()
    await page.waitForSelector('.tile')
    await openTile(page, '0-0')
    await page.click('[data-judge="1-ok"]')
    await page.waitForTimeout(1200)
    await endGame(page)
    await page.getByTestId('bracket-record').click()
    await page.waitForSelector('[data-testid="bracket"]')
    const won = await page.locator('.bracket-team.won').first().textContent()
    assert(won.includes(names[1]), `winner ${names[1]} not recorded (${won})`)
    // the other heat by hand, then the final appears
    await page.click('[data-winner="0-1-0"]')
    assert(await page.locator('.bracket-round').nth(1).count(), 'no final drawn')
    await page.click('[data-winner="1-0-0"]')
    assert(await page.getByTestId('bracket-champion').count(), 'no champion')
    // the women's division is separate
    await page.getByTestId('bracket-div-1').click()
    assert(await page.getByTestId('bracket-teams').count(), 'second division not empty')
    noErrors(page)
  })

  await test('the waiting screen shows the event name and a countdown', async () => {
    const page = await newPage()
    await page.goto(URL)
    await page.getByTestId('lobby-open').click()
    await page.fill('[data-testid="lobby-name"]', 'College of Engineering Cup')
    const later = new Date(Date.now() + 2 * 3600_000)
    await page.fill('[data-testid="lobby-start"]', `${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}`)
    await page.getByTestId('lobby-go').click()
    const view = page.locator('.lobby-full [data-testid="lobby-view"]')
    assert((await view.textContent()).includes('College of Engineering Cup'), 'name missing')
    assert(/\d:\d\d:\d\d/.test(await page.locator('.lobby-full [data-testid="lobby-count"]').textContent()), 'no countdown')
    await page.getByTestId('lobby-exit').click()
    noErrors(page)
  })

  await test('practice: questions one at a time, self-marked, with the missed ones to review', async () => {
    const page = await newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(URL)
    await page.getByTestId('practice-open').click()
    await page.locator('[data-practice-cat]').first().check()
    await page.getByTestId('practice-go').click()
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('practice-show').click()
      await page.getByTestId(i % 3 ? 'practice-got' : 'practice-missed').click()
    }
    assert((await page.getByTestId('practice-score').textContent()).includes('6'), 'score wrong')
    await page.getByTestId('practice-retry').click()
    assert(await page.getByTestId('practice-q').count(), 'retry did not start')
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    assert(!wide, 'practice scrolls sideways on a phone')
    noErrors(page)
  })

  await test('display options: larger text and colour-blind colours, remembered', async () => {
    const page = await newPage()
    await page.goto(URL)
    await page.getByTestId('view-open').click()
    await page.getByTestId('view-big').check()
    await page.getByTestId('view-cb').check()
    await page.getByTestId('view-done').click()
    assert((await page.evaluate(() => document.documentElement.dataset.big)) === 'on', 'big text not on')
    await page.reload()
    await page.waitForFunction(() => document.documentElement.dataset.cb === 'on', null, { timeout: 5000 }).catch(() => {})
    assert((await page.evaluate(() => document.documentElement.dataset.cb)) === 'on', 'colour-blind colours not remembered')
    noErrors(page)
  })

  await test('What’s new shows the version, and the page has a link preview', async () => {
    const page = await newPage()
    await page.goto(URL)
    await page.getByTestId('news-open').click()
    assert((await page.getByTestId('news-dialog').textContent()).includes(VERSION), 'no version')
    assert(await page.locator('meta[property="og:image"][content$="og.png"]').count(), 'no preview image')
    assert((await page.locator('meta[name="description"]').getAttribute('content')).length > 20, 'no description')
    const og = await fetch(URL + 'og.png')
    assert(og.ok, 'og.png missing')
  })

  await test('works offline once loaded', async () => {
    const page = await newPage()
    await page.goto(URL + '?sw=1')
    await page.waitForFunction(async () => (await navigator.serviceWorker.ready) && !!navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {})
    await page.waitForFunction(async () => {
      const keys = await caches.keys()
      for (const k of keys) if ((await (await caches.open(k)).keys()).length > 50) return true
      return false
    }, null, { timeout: 30000 })
    await page.reload()
    await page.context().setOffline(true)
    await page.reload()
    await page.waitForSelector('[data-testid="logo"]')
    await setupGame(page, 2)
    await openTile(page, '0-0')
    assert((await page.getByTestId('question').textContent()).length > 3, 'no question offline')
    await page.context().setOffline(false)
  })
} finally {
  await browser?.close()
  server.kill()
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
