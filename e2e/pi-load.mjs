// Test day for the Pi server: a room of simulated phones, the team tablets and the projector, all at
// once, with attacks running alongside. Each phone uses its own local address (127.0.0.x), as each
// phone on the Wi-Fi would. Run after `npm run build:pi`:
//   node e2e/pi-load.mjs            150 phones (PHONES=300 node e2e/pi-load.mjs for more)
// Prints a short report and writes it to e2e/shots/pi-load.json.
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const PORT = 4193
const PHONES = Number(process.env.PHONES || 150)
const ROUNDS = Number(process.env.ROUNDS || 10)
const TEAMS = 4
const PIN = '482916'
const state = mkdtempSync(join(tmpdir(), 'gg-load-'))
const srv = spawn(process.execPath, ['pi/server.mjs'], { env: { ...process.env, GG_PORT: String(PORT), GG_STATE: state, GG_PIN: PIN }, stdio: ['ignore', 'ignore', 'inherit'] })

const results = []
const report = { phones: PHONES, rounds: ROUNDS }
function check(name, ok, detail = '') {
  results.push(!!ok)
  console.log(ok ? 'PASS' : 'FAIL', name, detail ? `(${detail})` : '')
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : NaN
}

// ---------- a tiny HTTP client that can pick its local address ----------
const ipFor = (i) => `127.0.${Math.floor(i / 250) + 1}.${(i % 250) + 2}`
const agents = new Map()
const agentFor = (ip) => {
  if (!agents.has(ip)) agents.set(ip, new http.Agent({ keepAlive: true, localAddress: ip, maxSockets: 4 }))
  return agents.get(ip)
}
function request(method, path, { ip = '127.0.0.1', cookie, body, headers = {}, gzip = false } = {}) {
  return new Promise((resolve) => {
    const data = body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path,
        agent: agentFor(ip),
        headers: {
          Host: `127.0.0.1:${PORT}`,
          ...(method === 'POST' ? { 'X-GG': '1', 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${PORT}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(gzip ? { 'Accept-Encoding': 'gzip' } : {}),
          ...(data ? { 'Content-Length': data.length } : {}),
          ...headers,
        },
      },
      (res) => {
        const parts = []
        res.on('data', (c) => parts.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(parts)
          let json = null
          try {
            json = JSON.parse(buf.toString('utf8'))
          } catch {
            /* not JSON */
          }
          const set = res.headers['set-cookie']?.[0]?.split(';')[0]
          resolve({ status: res.statusCode, json, bytes: buf.length, headers: res.headers, cookie: set })
        })
      },
    )
    req.on('error', (e) => resolve({ status: 0, error: e.code || e.message }))
    if (data) req.write(data)
    req.end()
  })
}

/** An event stream: calls onEvent(name, data) for each event. */
function stream(path, { ip = '127.0.0.1', cookie, onEvent }) {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path, localAddress: ip, agent: false, headers: { Host: `127.0.0.1:${PORT}`, Accept: 'text/event-stream', ...(cookie ? { Cookie: cookie } : {}) } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return resolve({ status: res.statusCode, close: () => {} })
      }
      let buf = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        buf += chunk
        let i
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i)
          buf = buf.slice(i + 2)
          let ev = 'message'
          let data = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) ev = line.slice(7)
            else if (line.startsWith('data: ')) data += line.slice(6)
          }
          if (data) onEvent(ev, JSON.parse(data))
        }
      })
      resolve({ status: 200, close: () => req.destroy() })
    })
    req.on('error', (e) => resolve({ status: 0, error: e.code, close: () => {} }))
    req.end()
  })
}

/** CPU seconds and memory of the server process, from /proc. */
function usage() {
  const st = readFileSync(`/proc/${srv.pid}/stat`, 'utf8').split(') ')[1].split(' ')
  const tick = 100
  const cpu = (Number(st[11]) + Number(st[12])) / tick
  const rss = Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${srv.pid}/status`, 'utf8'))[1]) / 1024
  return { cpu, rssMB: Math.round(rss) }
}

// ---------- the test day ----------
for (let i = 0; i < 50; i++) {
  await sleep(100)
  if ((await request('GET', '/api/hello')).status === 200) break
}
const startUse = usage()

// Host signs in and listens.
const login = await request('POST', '/api/host/login', { body: { pin: PIN } })
const host = login.cookie
check('host signs in', login.status === 200 && host)
let tally = null
let hostEvents = 0
await stream('/api/host/events', { cookie: host, onEvent: (ev, d) => {
  hostEvents++
  if (ev === 'tally') tally = d
} })

// Seats: four team tablets and the projector, each from its own address.
const ensure = await request('POST', '/api/host/seat', { cookie: host, body: { action: 'ensure', teams: ['A', 'B', 'C', 'D'] } })
const links = Object.entries(ensure.json.links)
const seatViews = new Map()
for (const [n, [, token]] of links.entries()) {
  const ip = `127.0.9.${n + 2}`
  const c = await request('POST', '/api/claim', { ip, body: { token } })
  await stream('/api/dev/events', { ip, cookie: c.cookie, onEvent: (ev, d) => ev === 'view' && seatViews.set(ip, { at: Date.now(), d }) })
}
check('four tablets and the projector join', seatViews.size === TEAMS + 1, `${seatViews.size} seats online`)

// The audience is let in and the room loads the page at once.
await request('POST', '/api/host/audience', { cookie: host, body: { on: true } })
let t0 = Date.now()
const assets = [...readFileSync('site/index.html', 'utf8').matchAll(/(?:src|href)="(?:\.\/|\/)?(assets\/[^"]+)"/g)].map((m) => '/' + m[1])
const loads = await Promise.all(
  Array.from({ length: PHONES }, async (_, i) => {
    const t = Date.now()
    const pages = await Promise.all(['/?a=1', ...assets].map((p) => request('GET', p, { ip: ipFor(i), gzip: true })))
    return { ok: pages.every((p) => p.status === 200), ms: Date.now() - t, bytes: pages.reduce((a, p) => a + p.bytes, 0) }
  }),
)
report.pageLoad = { allMs: Date.now() - t0, p95Ms: pct(loads.map((l) => l.ms), 95), kBPerPhone: Math.round(loads[0].bytes / 1024) }
check(`${PHONES} phones load the page at the same moment`, loads.every((l) => l.ok), `all in ${report.pageLoad.allMs} ms, ${report.pageLoad.kBPerPhone} kB each gzipped`)

// Every phone joins and opens its live feed.
const phones = []
t0 = Date.now()
await Promise.all(
  Array.from({ length: PHONES }, async (_, i) => {
    const ip = ipFor(i)
    const j = await request('POST', '/api/aud/join', { ip })
    const p = { i, ip, cookie: j.cookie, last: null, got: new Map(), score: 0 }
    const s = await stream('/api/aud/events', { ip, cookie: j.cookie, onEvent: (ev, d) => {
      if (ev !== 'state') return
      p.last = d
      p.score = d.score
      if (d.round) {
        const key = `${d.round.id}:${d.round.correct === null ? 'q' : 'a'}`
        if (!p.got.has(key)) p.got.set(key, Date.now())
      }
    } })
    p.feed = s.status
    phones.push(p)
  }),
)
report.joinMs = Date.now() - t0
check(`${PHONES} phones join and stay connected`, phones.every((p) => p.cookie && p.feed === 200), `${report.joinMs} ms`)
await sleep(400)
check('the host sees how many joined', tally?.joined === PHONES, `host counts ${tally?.joined}`)

// Rounds: question out, everyone answers within a few seconds, then the reveal.
const qLat = []
const aLat = []
const answerMs = []
let tallyOk = 0
let expectedScores = new Map(phones.map((p) => [p.i, 0]))
for (let r = 0; r < ROUNDS; r++) {
  const id = `clue${r}@load`
  const choices = ['Alpha', 'Bravo', 'Charlie', 'Delta']
  const sentAt = Date.now()
  await request('POST', '/api/host/audience', { cookie: host, body: { round: { id, kind: 'clue', q: `Question ${r}?`, choices, secs: 20 } } })
  // Teams' screens keep getting the host's view while this happens.
  void request('POST', '/api/host/publish', { cookie: host, body: { view: { screen: 'game', round: r, pad: 'x'.repeat(20000) } } })
  await Promise.all(
    phones.map(async (p) => {
      for (let k = 0; k < 100 && !p.got.has(`${id}:q`); k++) await sleep(20)
      qLat.push((p.got.get(`${id}:q`) ?? Infinity) - sentAt)
      await sleep(Math.random() * 3000)
      const pick = (p.i + r) % 4
      const t = Date.now()
      const a = await request('POST', '/api/aud/answer', { ip: p.ip, cookie: p.cookie, body: { id, choice: pick } })
      answerMs.push(a.status === 200 ? Date.now() - t : Infinity)
      p.pick = pick
    }),
  )
  await sleep(400)
  if (tally?.id === id && tally.total === PHONES && tally.counts.reduce((a, b) => a + b, 0) === PHONES) tallyOk++
  const correct = r % 4
  const revealAt = Date.now()
  await request('POST', '/api/host/audience', { cookie: host, body: { reveal: { id, correct } } })
  for (const p of phones) if (p.pick === correct) expectedScores.set(p.i, expectedScores.get(p.i) + 1)
  await Promise.all(
    phones.map(async (p) => {
      for (let k = 0; k < 100 && !p.got.has(`${id}:a`); k++) await sleep(20)
      aLat.push((p.got.get(`${id}:a`) ?? Infinity) - revealAt)
    }),
  )
}
report.questionToPhonesMs = { p50: pct(qLat, 50), p95: pct(qLat, 95), max: Math.max(...qLat) }
report.revealToPhonesMs = { p50: pct(aLat, 50), p95: pct(aLat, 95), max: Math.max(...aLat) }
report.answerReplyMs = { p50: pct(answerMs, 50), p95: pct(answerMs, 95), max: Math.max(...answerMs) }
check(`every question reached every phone (${ROUNDS} rounds)`, qLat.every(Number.isFinite), `median ${report.questionToPhonesMs.p50} ms, slowest ${report.questionToPhonesMs.max} ms`)
check('every answer was taken', answerMs.every(Number.isFinite), `median ${report.answerReplyMs.p50} ms, slowest ${report.answerReplyMs.max} ms`)
check('the host’s count matched every round', tallyOk === ROUNDS, `${tallyOk}/${ROUNDS}`)
check('every reveal reached every phone', aLat.every(Number.isFinite), `median ${report.revealToPhonesMs.p50} ms, slowest ${report.revealToPhonesMs.max} ms`)
const last = phones[0].last
check('phones see the room’s answers after the reveal', last?.round?.counts?.reduce((a, b) => a + b, 0) === PHONES)
check('every phone’s score is right', phones.every((p) => p.score === expectedScores.get(p.i)))
check('team tablets and the projector stayed in step', [...seatViews.values()].every((v) => v.d.view?.round === ROUNDS - 1))

// ---------- attacks while the room is full ----------
const someone = phones[1]
const id2 = 'attack@load'
await request('POST', '/api/host/audience', { cookie: host, body: { round: { id: id2, kind: 'clue', q: 'Q?', choices: ['a', 'b', 'c', 'd'], secs: 30 } } })
await sleep(200)
check('a phone never sees the right answer before the reveal', someone.last?.round?.id === id2 && someone.last.round.correct === null && someone.last.round.counts === null)
const first = await request('POST', '/api/aud/answer', { ip: someone.ip, cookie: someone.cookie, body: { id: id2, choice: 1 } })
const again = await request('POST', '/api/aud/answer', { ip: someone.ip, cookie: someone.cookie, body: { id: id2, choice: 2 } })
check('a phone can’t answer twice', first.status === 200 && again.status === 409 && again.json?.error === 'already')
const wrongRound = await request('POST', '/api/aud/answer', { ip: phones[2].ip, cookie: phones[2].cookie, body: { id: 'clue0@load', choice: 0 } })
check('a phone can’t answer an old question', wrongRound.status === 409)
const badChoice = await request('POST', '/api/aud/answer', { ip: phones[3].ip, cookie: phones[3].cookie, body: { id: id2, choice: 9 } })
check('a made-up option is refused', badChoice.status === 400)
const noCookie = await request('POST', '/api/aud/answer', { ip: '127.0.8.2', body: { id: id2, choice: 0 } })
const fakeCookie = await request('POST', '/api/aud/answer', { ip: '127.0.8.2', cookie: 'gg_aud=' + 'A'.repeat(32), body: { id: id2, choice: 0 } })
check('answers without a real joined phone are refused', noCookie.status === 401 && fakeCookie.status === 401)
const flood = await Promise.all(Array.from({ length: 30 }, () => request('POST', '/api/aud/answer', { ip: phones[4].ip, cookie: phones[4].cookie, body: { id: id2, choice: 0 } })))
check('one phone flooding answers is slowed down', flood.filter((f) => f.status === 429).length >= 20, `${flood.filter((f) => f.status === 429).length}/30 refused`)
const asHost = await Promise.all(
  [
    ['POST', '/api/host/audience', { reveal: { id: id2, correct: 0 } }],
    ['POST', '/api/host/publish', { view: { screen: 'game' } }],
    ['POST', '/api/host/seat', { action: 'ensure', teams: ['x'] }],
    ['POST', '/api/host/reset', {}],
    ['GET', '/api/host/seats'],
  ].map(([m, p, b]) => request(m, p, { ip: someone.ip, cookie: someone.cookie, body: b })),
)
check('a phone can’t use any host action', asHost.every((r) => r.status === 401), asHost.map((r) => r.status).join(','))
const crossSite = await request('POST', '/api/aud/join', { ip: '127.0.8.3', headers: { Origin: 'http://evil.example' } })
const noHeader = await request('POST', '/api/aud/join', { ip: '127.0.8.3', headers: { 'X-GG': '' } })
const rebind = await request('GET', '/api/hello', { ip: '127.0.8.3', headers: { Host: 'evil.example' } })
check('cross-site posts, missing header and other host names are refused', crossSite.status === 403 && noHeader.status === 403 && rebind.status === 421)
const big = await request('POST', '/api/aud/answer', { ip: phones[5].ip, cookie: phones[5].cookie, body: { id: id2, choice: 0, pad: 'x'.repeat(100_000) } })
check('an oversized request is cut off', big.status === 413 || big.status === 0, String(big.status || big.error))
const extra = []
for (let k = 0; k < 14; k++) extra.push(await stream('/api/aud/events', { ip: phones[6].ip, cookie: phones[6].cookie, onEvent: () => {} }))
check('one address can’t open endless live feeds', extra.filter((s) => s.status === 429).length >= 2, `${extra.filter((s) => s.status === 200).length + 1} open, then refused`)
for (const s of extra) s.close()

// Slow-loris: 300 connections that send half a request and wait. Phones must still get through.
const lorises = []
for (let k = 0; k < 300; k++) {
  const sock = net.connect({ host: '127.0.0.1', port: PORT, localAddress: `127.0.7.${(k % 250) + 2}` })
  sock.on('error', () => {})
  sock.on('close', () => (sock.gone = true))
  sock.resume()
  sock.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nX-Slow: `)
  lorises.push(sock)
}
await sleep(500)
t0 = Date.now()
const during = await Promise.all(phones.slice(0, 50).map((p) => request('GET', '/api/hello', { ip: p.ip })))
const duringMs = Date.now() - t0
check('phones still get through during a slow-connection attack', during.every((r) => r.status === 200), `50 requests in ${duringMs} ms`)
await sleep(11_000)
const closed = lorises.filter((s) => s.gone).length
check('half-sent requests are dropped after 10 s', closed === lorises.length, `${closed}/300 closed`)
for (const s of lorises) s.destroy()

// The room is full at 600: the next phone is turned away, nothing breaks.
const more = Math.max(0, 600 - PHONES)
const joins = await Promise.all(Array.from({ length: more + 1 }, (_, k) => request('POST', '/api/aud/join', { ip: ipFor(PHONES + k) })))
check('phone 601 is told the room is full', joins.slice(0, more).every((j) => j.status === 200) && joins[more].status === 503 && joins[more].json?.error === 'full')

const endUse = usage()
report.server = { cpuSeconds: +(endUse.cpu - startUse.cpu).toFixed(2), memoryMB: endUse.rssMB }
check('server memory stays small', endUse.rssMB < 300, `${endUse.rssMB} MB`)
check('the server is still answering', (await request('GET', '/api/hello')).status === 200)

srv.kill()
rmSync(state, { recursive: true, force: true })
mkdirSync('e2e/shots', { recursive: true })
writeFileSync('e2e/shots/pi-load.json', JSON.stringify(report, null, 1))
console.log('\nReport:', JSON.stringify(report, null, 1))
const ok = results.filter(Boolean).length
console.log(`\n${ok}/${results.length} test-day checks passed`)
process.exit(ok === results.length ? 0 : 1)
