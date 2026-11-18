#!/usr/bin/env node
// Munaafasatul Ilm Live: the Raspberry Pi server.
//
// Serves the built game (dist/) on the game's own Wi-Fi and keeps every screen in the room in step.
// The host's browser stays the game's brain: it sends the server a copy of what the room may see
// (questions blanked until shown, answers blanked until revealed, see src/lib/views.ts), and the
// server passes that copy on to the projector and the team tablets. Teams' typed answers go back to
// the host only.
//
// Uses only Node's own modules, so there is nothing to download and nothing third-party to trust.
//
//   node pi/server.mjs --set-pin       choose the host PIN (asked twice, stored as a salted hash)
//   node pi/server.mjs                 start (port 80, or GG_PORT)
//
// Settings (environment): GG_PORT, GG_DIST (built game, default ../site from npm run build:pi), GG_STATE (folder for the
// PIN and the saved links, default ../pi-state), GG_HOSTS (extra host names allowed, comma-separated),
// GG_PIN (a PIN for tests only; never set it on the Pi).

import http from 'node:http'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, statSync, createReadStream, realpathSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { gzipSync } from 'node:zlib'
import { SECURITY_HEADERS } from '../security-headers.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.GG_PORT || 80)
const DIST = resolve(process.env.GG_DIST || join(HERE, '..', 'site'))
const STATE_DIR = resolve(process.env.GG_STATE || join(HERE, '..', 'pi-state'))
const CONFIG = join(STATE_DIR, 'config.json')
const SAVED = join(STATE_DIR, 'seats.json')
const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(join(DIST, 'version.json'), 'utf8')).version || 'dev'
  } catch {
    return 'dev'
  }
})()

// Limits
const MAX_BODY_HOST = 6 * 1024 * 1024 // a game with picture questions can be a few MB
const MAX_BODY_OTHER = 4 * 1024
const MAX_STREAMS = 800
const MAX_STREAMS_PER_IP = 12
const MAX_TEAMS = 8
const MAX_AUDIENCE = 600
const MAX_CHOICES = 6
// The game's Wi-Fi, shown as a QR code on the projector so phones can join (it is meant to be public in the room).
const WIFI = process.env.GG_WIFI_SSID ? { ssid: String(process.env.GG_WIFI_SSID).slice(0, 32), pass: String(process.env.GG_WIFI_PASS || '').slice(0, 63) } : null
const LOGIN_TRIES = 5 // wrong PINs from one device before that device must wait
const LOGIN_LOCK_MS = 5 * 60_000
// Wrong PINs from all devices together, per 10 minutes, before sign-in waits for everyone. Set high, so
// one person in the audience can't lock the host out, but guessing a 6-digit PIN stays hopeless.
const LOGIN_ROOM_TRIES = 60

// ---------- small helpers ----------
const token = (n = 24) => randomBytes(n).toString('base64url')
const sha = (s) => createHash('sha256').update(String(s)).digest('hex')
const now = () => Date.now()
const log = (...a) => console.log(new Date().toISOString(), ...a)

function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

function cookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}
const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; SameSite=Strict${maxAge !== undefined ? `; Max-Age=${maxAge}` : ''}`

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', ...headers })
  res.end(data)
}

function readBody(req, limit) {
  return new Promise((ok, fail) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        // Stop keeping it; the reply says 413 and then closes the connection.
        chunks.length = 0
        if (!req.tooBig) fail(Object.assign(new Error('too big'), { status: 413 }))
        req.tooBig = true
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        fail(Object.assign(new Error('bad json'), { status: 400 }))
      }
    })
    req.on('error', fail)
  })
}

const ipOf = (req) => req.socket.remoteAddress || '?'

// A simple per-key rate limit: at most n events per window.
const buckets = new Map()
function allowed(key, n, windowMs) {
  const t = now()
  const b = buckets.get(key)
  if (!b || t - b.start > windowMs) {
    buckets.set(key, { start: t, count: 1 })
    return true
  }
  b.count++
  return b.count <= n
}
setInterval(() => {
  const t = now()
  for (const [k, b] of buckets) if (t - b.start > 120_000) buckets.delete(k)
}, 60_000).unref()

// ---------- PIN ----------
function hashPin(pin, salt) {
  return scryptSync(String(pin), salt, 32).toString('hex')
}
function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG, 'utf8'))
  } catch {
    return null
  }
}
function saveJson(file, value) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(value), { mode: 0o600 })
  renameSync(tmp, file)
}
const validPin = (p) => typeof p === 'string' && /^\d{6,12}$/.test(p)

async function setPinInteractive() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise((r) => rl.question(q, r))
  const a = (await ask('New host PIN (6 to 12 digits): ')).trim()
  const b = (await ask('Type it again: ')).trim()
  rl.close()
  if (!validPin(a)) throw new Error('The PIN must be 6 to 12 digits.')
  if (a !== b) throw new Error('The two PINs differ.')
  const salt = token(16)
  saveJson(CONFIG, { pinSalt: salt, pinHash: hashPin(a, salt) })
  console.log('PIN saved.')
}

let config = loadConfig()
if (process.env.GG_PIN) {
  if (!validPin(process.env.GG_PIN)) throw new Error('GG_PIN must be 6 to 12 digits')
  const salt = token(16)
  config = { pinSalt: salt, pinHash: hashPin(process.env.GG_PIN, salt) }
}

// ---------- state ----------
/** Host sessions: cookie value hash -> expiry. Only one at a time: a new login ends the old one. */
let hostSession = null // { hash, expires }
const loginByIp = new Map() // ip -> { fails, lockedUntil }
const loginRoom = { fails: 0, start: 0, lockedUntil: 0 }

/** Seats: one per team (and one or more projector screens). Each has a link that one device can claim. */
let seats = []
let view = null // the latest public view from the host
let viewJson = 'null'

try {
  const saved = JSON.parse(readFileSync(SAVED, 'utf8'))
  if (Array.isArray(saved.seats)) seats = saved.seats.filter((s) => s && typeof s.id === 'string')
} catch {
  /* first start */
}
let saveTimer = null
function saveSeats() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      saveJson(SAVED, { seats: seats.map(({ id, kind, index, name, token, tokenHash, device, claimedAt, deviceLabel }) => ({ id, kind, index, name, token, tokenHash, device, claimedAt, deviceLabel })) })
    } catch (e) {
      log('could not save seats', e.message)
    }
  }, 200)
}

/** Live event streams: { res, role: 'host'|'seat', seatId?, ip } */
const streams = new Set()

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
}

function seatPublic(s) {
  const online = [...streams].some((x) => x.seatId === s.id)
  // Only the host ever receives this list, so it carries the link for the host to show as a QR code.
  return { id: s.id, kind: s.kind, index: s.index, name: s.name, link: s.token || null, claimed: !!s.device, claimedAt: s.claimedAt || null, online, lastSeen: s.lastSeen || null, device: s.deviceLabel || null }
}
function toHost(event, data) {
  for (const s of streams) if (s.role === 'host') sse(s.res, event, data)
}
const seatsChanged = () => toHost('seats', seats.map(seatPublic))

function kickSeat(id, reason) {
  for (const s of [...streams]) {
    if (s.seatId === id) {
      sse(s.res, 'revoked', { reason })
      s.res.end()
      streams.delete(s)
    }
  }
}

function seatView(seat) {
  const extra = seat.kind === 'screen' ? `,"join":${JSON.stringify({ wifi: WIFI, audience: audience.on, joined: audienceCount() })}` : ''
  return `{"seat":${JSON.stringify({ kind: seat.kind, index: seat.index, name: seat.name })},"view":${viewJson}${extra}}`
}

// ---------- audience phones ----------
/**
 * Phones join anonymously (a random cookie, no names). A round is one multiple-choice question
 * (a clue, or the category vote). Each phone gets one answer per round; the round closes when its
 * time runs out or the host reveals the answer. Phones never learn the right choice before that.
 */
const audience = { on: false, members: new Map() } // cookie hash -> { score }
let audRound = null // { id, kind, q, choices, closesAt, correct, counts, answers: Map }
const audienceCount = () => [...streams].filter((s) => s.role === 'aud').length

function audState(member, memberHash) {
  const r = audRound
  return {
    theme: view?.theme ?? 'amethyst',
    lang: view?.lang ?? 'en',
    on: audience.on,
    score: member?.score ?? 0,
    round: r
      ? {
          id: r.id,
          kind: r.kind,
          q: r.q,
          choices: r.choices,
          open: roundOpen(r),
          closesAt: r.closesAt,
          correct: r.correct,
          mine: memberHash ? (r.answers.get(memberHash) ?? null) : null,
          counts: r.correct !== null || r.kind === 'vote' && !roundOpen(r) ? r.counts : null,
        }
      : null,
  }
}
const roundOpen = (r) => !!r && r.correct === null && !r.closed && now() < r.closesAt

function toAudience() {
  for (const s of streams) if (s.role === 'aud') sse(s.res, 'state', audState(audience.members.get(s.audHash), s.audHash))
}
let tallyTimer = null
function tallyToHost() {
  if (tallyTimer) return
  tallyTimer = setTimeout(() => {
    tallyTimer = null
    const r = audRound
    toHost('tally', { id: r?.id ?? null, counts: r?.counts ?? [], total: r ? r.answers.size : 0, joined: audienceCount() })
  }, 250)
}
let closeTimer = null
function scheduleClose() {
  clearTimeout(closeTimer)
  if (!audRound || audRound.correct !== null) return
  closeTimer = setTimeout(() => {
    toAudience()
    tallyToHost()
  }, Math.max(0, audRound.closesAt - now() + 50))
}
const cleanText = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)

function deviceLabel(req) {
  const ua = String(req.headers['user-agent'] || '')
  const kind = /iPad|Tablet/i.test(ua) ? 'Tablet' : /iPhone|Android.*Mobile|Mobile/i.test(ua) ? 'Phone' : 'Computer'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${kind}, ${browser}`
}

// ---------- request checks ----------
const extraHosts = (process.env.GG_HOSTS || 'ilm.local,ilm.lan').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
/** Only answer to the Pi's own address or names, so a web page elsewhere can't use DNS tricks to reach it. */
function hostOk(req) {
  const h = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '')
  return h === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || /^\[[0-9a-f:]+\]$/.test(h) || extraHosts.includes(h)
}
/** A POST from a page on another site is refused. */
function originOk(req) {
  const o = req.headers.origin
  if (!o) return true
  try {
    return new URL(o).host.toLowerCase() === String(req.headers.host || '').toLowerCase()
  } catch {
    return false
  }
}

function isHost(req) {
  const c = cookies(req).gg_host
  return !!(c && hostSession && hostSession.expires > now() && safeEqual(sha(c), hostSession.hash))
}
function seatOf(req) {
  const c = cookies(req).gg_dev
  if (!c) return null
  const h = sha(c)
  return seats.find((s) => s.device && safeEqual(s.device, h)) || null
}

// ---------- API ----------
async function api(req, res, path) {
  const ip = ipOf(req)
  if (req.method === 'POST') {
    if (!originOk(req)) return send(res, 403, { error: 'origin' })
    if (req.headers['x-gg'] !== '1') return send(res, 403, { error: 'header' })
  }

  if (path === '/api/hello' && req.method === 'GET') return send(res, 200, { gg: 1, live: true, version: VERSION, pinSet: !!config, audience: audience.on })

  // ----- host -----
  if (path === '/api/host/login' && req.method === 'POST') {
    if (!allowed('login:' + ip, 10, 60_000)) return send(res, 429, { error: 'slow down' })
    if (!config) return send(res, 503, { error: 'no pin', help: 'On the Pi, run: ilm pin' })
    // Locks are per device (address), so a phone in the audience typing wrong PINs locks only itself out.
    const mine = loginByIp.get(ip) ?? { fails: 0, lockedUntil: 0 }
    const until = Math.max(mine.lockedUntil, loginRoom.lockedUntil)
    if (until > now()) return send(res, 429, { error: 'locked', retryIn: Math.ceil((until - now()) / 1000) })
    const body = await readBody(req, MAX_BODY_OTHER)
    const pin = String(body.pin ?? '')
    const good = validPin(pin) && safeEqual(hashPin(pin, config.pinSalt), config.pinHash)
    if (!good) {
      mine.fails++
      if (mine.fails >= LOGIN_TRIES) {
        mine.lockedUntil = now() + LOGIN_LOCK_MS
        mine.fails = 0
        log('host PIN locked for', ip, 'after failed tries')
      }
      if (loginByIp.size > 5000) loginByIp.clear()
      loginByIp.set(ip, mine)
      if (now() - loginRoom.start > 10 * 60_000) Object.assign(loginRoom, { fails: 0, start: now() })
      if (++loginRoom.fails >= LOGIN_ROOM_TRIES) {
        loginRoom.lockedUntil = now() + LOGIN_LOCK_MS
        Object.assign(loginRoom, { fails: 0, start: now() })
        log('host PIN locked for everyone: too many wrong tries from many devices')
      }
      return send(res, 401, { error: 'wrong pin', triesLeft: LOGIN_TRIES - mine.fails })
    }
    loginByIp.delete(ip)
    const c = token(32)
    // A new host login ends the old one, so a stolen session cannot outlive the host signing in again.
    for (const s of [...streams]) if (s.role === 'host') (s.res.end(), streams.delete(s))
    hostSession = { hash: sha(c), expires: now() + 12 * 3600_000 }
    log('host signed in from', ip)
    return send(res, 200, { ok: true }, { 'Set-Cookie': setCookie('gg_host', c, 12 * 3600) })
  }
  if (path === '/api/host/me' && req.method === 'GET') return send(res, 200, { host: isHost(req), pinSet: !!config })

  if (path.startsWith('/api/host/')) {
    if (!isHost(req)) return send(res, 401, { error: 'host only' })

    if (path === '/api/host/logout' && req.method === 'POST') {
      hostSession = null
      for (const s of [...streams]) if (s.role === 'host') (s.res.end(), streams.delete(s))
      return send(res, 200, { ok: true }, { 'Set-Cookie': setCookie('gg_host', '', 0) })
    }

    if (path === '/api/host/events' && req.method === 'GET') return openStream(req, res, { role: 'host', ip }, () => sse(res, 'seats', seats.map(seatPublic)))

    if (path === '/api/host/publish' && req.method === 'POST') {
      const body = await readBody(req, MAX_BODY_HOST)
      if (!body || typeof body.view !== 'object') return send(res, 400, { error: 'view' })
      view = body.view
      viewJson = JSON.stringify(view)
      // Keep team names on the seats up to date for the host's list.
      const names = Array.isArray(view?.game?.teams) ? view.game.teams.map((t) => String(t?.name ?? '').slice(0, 40)) : null
      if (names) for (const s of seats) if (s.kind === 'team' && names[s.index] !== undefined) s.name = names[s.index]
      for (const s of streams) {
        if (s.role !== 'seat') continue
        const seat = seats.find((x) => x.id === s.seatId)
        if (seat) sse(s.res, 'view', seatView(seat))
      }
      return send(res, 200, { ok: true })
    }

    if (path === '/api/host/seats' && req.method === 'GET') return send(res, 200, seats.map(seatPublic))

    if (path === '/api/host/seat' && req.method === 'POST') {
      const body = await readBody(req, MAX_BODY_OTHER)
      const action = body.action
      if (action === 'ensure') {
        // One seat per team, plus one projector screen. Returns the links of seats it made.
        // Without a team list (no game yet) the team seats are left as they are.
        const hasTeams = Array.isArray(body.teams)
        const teams = hasTeams ? body.teams.slice(0, MAX_TEAMS).map((n) => String(n ?? '').slice(0, 40)) : []
        const made = {}
        if (hasTeams) teams.forEach((name, index) => {
          let s = seats.find((x) => x.kind === 'team' && x.index === index)
          if (!s) {
            const t = token()
            s = { id: token(9), kind: 'team', index, name, token: t, tokenHash: sha(t), device: null }
            seats.push(s)
            made[s.id] = t
          } else s.name = name
        })
        // Teams beyond the game's count are removed.
        if (hasTeams) {
          for (const s of seats.filter((x) => x.kind === 'team' && x.index >= teams.length)) kickSeat(s.id, 'removed')
          seats = seats.filter((x) => !(x.kind === 'team' && x.index >= teams.length))
        }
        if (!seats.some((x) => x.kind === 'screen')) {
          const t = token()
          const s = { id: token(9), kind: 'screen', index: 0, name: 'Projector', token: t, tokenHash: sha(t), device: null }
          seats.push(s)
          made[s.id] = t
        }
        saveSeats()
        seatsChanged()
        return send(res, 200, { seats: seats.map(seatPublic), links: made })
      }
      const seat = seats.find((s) => s.id === body.id)
      if (!seat) return send(res, 404, { error: 'no seat' })
      if (action === 'reissue') {
        // A new link: the old one stops working and the device on it is disconnected.
        const t = token()
        seat.token = t
        seat.tokenHash = sha(t)
        seat.device = null
        seat.claimedAt = null
        seat.deviceLabel = null
        kickSeat(seat.id, 'reissued')
        saveSeats()
        seatsChanged()
        return send(res, 200, { seat: seatPublic(seat), link: t })
      }
      if (action === 'remove') {
        // Access removed: no link works for this seat until the host issues a new one.
        seat.token = null
        seat.tokenHash = null
        seat.device = null
        seat.claimedAt = null
        seat.deviceLabel = null
        kickSeat(seat.id, 'removed')
        saveSeats()
        seatsChanged()
        return send(res, 200, { seat: seatPublic(seat) })
      }
      return send(res, 400, { error: 'action' })
    }

    if (path === '/api/host/audience' && req.method === 'POST') {
      const body = await readBody(req, MAX_BODY_OTHER * 4)
      if (typeof body.on === 'boolean') audience.on = body.on
      if (body.round === null) {
        audRound = null
      } else if (body.round && typeof body.round === 'object') {
        const r = body.round
        const id = cleanText(r.id, 80)
        const choices = Array.isArray(r.choices) ? r.choices.slice(0, MAX_CHOICES).map((c) => cleanText(c, 120)) : []
        if (!id || choices.length < 2) return send(res, 400, { error: 'round' })
        const secs = Math.min(600, Math.max(3, Number(r.secs) || 30))
        // A new question: the old round is gone; the same question again (the host's screen re-sent it) changes nothing.
        if (!audRound || audRound.id !== id) audRound = { id, kind: r.kind === 'vote' ? 'vote' : 'clue', q: cleanText(r.q, 600), choices, closesAt: now() + secs * 1000, correct: null, closed: false, counts: choices.map(() => 0), answers: new Map() }
      }
      if (body.close && audRound && audRound.id === body.close) audRound.closed = true
      if (body.reveal && audRound && audRound.id === body.reveal.id && audRound.correct === null) {
        const c = Number(body.reveal.correct)
        if (Number.isInteger(c) && c >= 0 && c < audRound.choices.length) {
          audRound.correct = c
          for (const [who, pick] of audRound.answers) if (pick === c) {
            const m = audience.members.get(who)
            if (m) m.score++
          }
        }
      }
      if (!audience.on) audRound = null
      scheduleClose()
      toAudience()
      tallyToHost()
      for (const s of streams) if (s.role === 'seat') { const seat = seats.find((x) => x.id === s.seatId); if (seat?.kind === 'screen') sse(s.res, 'view', seatView(seat)) }
      return send(res, 200, { ok: true, joined: audienceCount() })
    }

    if (path === '/api/host/reset' && req.method === 'POST') {
      // End of the event: every link stops working and nothing is kept.
      for (const s of seats) kickSeat(s.id, 'ended')
      seats = []
      view = null
      viewJson = 'null'
      // Nothing about the audience is kept either.
      for (const s of [...streams]) if (s.role === 'aud') (s.res.end(), streams.delete(s))
      audience.members.clear()
      audRound = null
      saveSeats()
      seatsChanged()
      return send(res, 200, { ok: true })
    }
    return send(res, 404, { error: 'not found' })
  }

  // ----- audience phones -----
  if (path === '/api/aud/join' && req.method === 'POST') {
    if (!audience.on) return send(res, 403, { error: 'closed' })
    if (!allowed('join:' + ip, 6, 60_000)) return send(res, 429, { error: 'slow down' })
    const c = cookies(req).gg_aud
    if (c && audience.members.has(sha(c))) return send(res, 200, { ok: true })
    if (audience.members.size >= MAX_AUDIENCE) return send(res, 503, { error: 'full' })
    const d = token(24)
    audience.members.set(sha(d), { score: 0 })
    return send(res, 200, { ok: true }, { 'Set-Cookie': setCookie('gg_aud', d, 12 * 3600) })
  }
  if (path === '/api/aud/events' && req.method === 'GET') {
    const c = cookies(req).gg_aud
    const h = c ? sha(c) : null
    if (!h || !audience.members.has(h)) return send(res, 401, { error: 'join first' })
    return openStream(req, res, { role: 'aud', audHash: h, ip }, () => {
      sse(res, 'state', audState(audience.members.get(h), h))
      tallyToHost()
    })
  }
  if (path === '/api/aud/answer' && req.method === 'POST') {
    const c = cookies(req).gg_aud
    const h = c ? sha(c) : null
    if (!h || !audience.members.has(h)) return send(res, 401, { error: 'join first' })
    if (!allowed('ans:' + h, 5, 5_000)) return send(res, 429, { error: 'slow down' })
    const body = await readBody(req, MAX_BODY_OTHER)
    const r = audRound
    if (!r || r.id !== body.id || !roundOpen(r)) return send(res, 409, { error: 'closed' })
    const pick = Number(body.choice)
    if (!Number.isInteger(pick) || pick < 0 || pick >= r.choices.length) return send(res, 400, { error: 'choice' })
    if (r.answers.has(h)) return send(res, 409, { error: 'already', mine: r.answers.get(h) })
    r.answers.set(h, pick)
    r.counts[pick]++
    tallyToHost()
    return send(res, 200, { ok: true, mine: pick })
  }

  // ----- devices (team tablets, projector) -----
  if (path === '/api/claim' && req.method === 'POST') {
    if (!allowed('claim:' + ip, 20, 60_000)) return send(res, 429, { error: 'slow down' })
    const body = await readBody(req, MAX_BODY_OTHER)
    const t = String(body.token ?? '')
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return send(res, 404, { error: 'invalid' })
    const h = sha(t)
    const seat = seats.find((s) => s.tokenHash && safeEqual(s.tokenHash, h))
    if (!seat) return send(res, 404, { error: 'invalid' })
    const mine = seatOf(req)
    if (seat.device && mine?.id !== seat.id) return send(res, 409, { error: 'taken' })
    if (mine && mine.id === seat.id) return send(res, 200, { kind: seat.kind, index: seat.index })
    const d = token(32)
    seat.device = sha(d)
    seat.claimedAt = now()
    seat.deviceLabel = deviceLabel(req)
    saveSeats()
    seatsChanged()
    log(`${seat.kind} ${seat.index + 1} claimed from`, ip)
    return send(res, 200, { kind: seat.kind, index: seat.index }, { 'Set-Cookie': setCookie('gg_dev', d, 24 * 3600) })
  }

  if (path === '/api/dev/events' && req.method === 'GET') {
    const seat = seatOf(req)
    if (!seat) return send(res, 401, { error: 'no seat' })
    return openStream(req, res, { role: 'seat', seatId: seat.id, ip }, () => {
      seat.lastSeen = now()
      sse(res, 'view', seatView(seat))
      seatsChanged()
    })
  }

  if (path === '/api/dev/send' && req.method === 'POST') {
    const seat = seatOf(req)
    if (!seat || seat.kind !== 'team') return send(res, 401, { error: 'no seat' })
    if (!allowed('send:' + seat.id, 10, 10_000)) return send(res, 429, { error: 'slow down' })
    const body = await readBody(req, MAX_BODY_OTHER)
    const type = body.type
    if (type !== 'final' && type !== 'intro') return send(res, 400, { error: 'type' })
    const text = String(body.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200)
    toHost('msg', { seat: seat.id, team: seat.index, type, text, at: now() })
    return send(res, 200, { ok: true })
  }

  return send(res, 404, { error: 'not found' })
}

function openStream(req, res, info, onOpen) {
  if (streams.size >= MAX_STREAMS) return send(res, 503, { error: 'full' })
  const fromIp = [...streams].filter((s) => s.ip === info.ip).length
  if (fromIp >= MAX_STREAMS_PER_IP) return send(res, 429, { error: 'too many' })
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.write('retry: 2000\n\n')
  const entry = { res, ...info }
  streams.add(entry)
  req.socket.setTimeout(0)
  onOpen()
  req.on('close', () => {
    streams.delete(entry)
    if (entry.seatId) {
      const seat = seats.find((s) => s.id === entry.seatId)
      if (seat) seat.lastSeen = now()
      seatsChanged()
    }
  })
}
// Keep streams open through routers that close quiet connections.
setInterval(() => {
  for (const s of streams) s.res.write(': ping\n\n')
}, 15_000).unref()

// ---------- static files ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}
function serveFile(req, res, path) {
  let rel
  try {
    rel = decodeURIComponent(path)
  } catch {
    return send(res, 400, 'Bad request')
  }
  if (rel.includes('\0')) return send(res, 400, 'Bad request')
  if (rel === '' || rel.endsWith('/')) rel += 'index.html'
  if (rel === 'index.html') rel = '/index.html'
  const file = normalize(join(DIST, rel))
  if (file !== DIST && !file.startsWith(DIST + sep)) return send(res, 403, 'Forbidden')
  let st
  try {
    st = statSync(file)
  } catch {
    return send(res, 404, 'Not found')
  }
  // /host without the slash: send the browser to /host/ so the page's relative links work.
  // The address comes from the checked file path (not the raw request), so it can't point to another site.
  if (st.isDirectory() && existsSync(join(file, 'index.html'))) return send(res, 301, 'Moved', { Location: '/' + relative(DIST, file).split(sep).map(encodeURIComponent).join('/') + '/' })
  if (!st.isFile()) return send(res, 404, 'Not found')
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream'
  const cache = rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
  const head = { ...SECURITY_HEADERS, 'X-Frame-Options': 'DENY', 'Content-Type': type, 'Cache-Control': cache }
  // Text files go out gzipped (made once, kept in memory): a room of phones loading the game at once
  // then needs about a third of the Wi-Fi time.
  const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || '')) && gzipped(file, st)
  if (gz) {
    res.writeHead(200, { ...head, 'Content-Encoding': 'gzip', 'Content-Length': gz.length, Vary: 'Accept-Encoding' })
    return res.end(req.method === 'HEAD' ? undefined : gz)
  }
  res.writeHead(200, { ...head, 'Content-Length': st.size, ...(COMPRESS.test(file) ? { Vary: 'Accept-Encoding' } : {}) })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}
const COMPRESS = /\.(html|js|css|json|svg|txt)$/i
const gzCache = new Map() // file -> { mtime, size, data }
let gzBytes = 0
function gzipped(file, st) {
  if (!COMPRESS.test(file) || st.size < 1024 || st.size > 4 * 1024 * 1024) return null
  const hit = gzCache.get(file)
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.data
  if (gzBytes > 64 * 1024 * 1024) return null
  const data = gzipSync(readFileSync(file), { level: 6 })
  if (hit) gzBytes -= hit.data.length
  gzCache.set(file, { mtime: st.mtimeMs, size: st.size, data })
  gzBytes += data.length
  return data
}

// ---------- server ----------
export function createServer() {
  // Half-sent requests are checked for every second, so a slow-connection attack can't hold sockets for long.
  const server = http.createServer({ connectionsCheckingInterval: 1000 }, async (req, res) => {
    try {
      if (!hostOk(req)) return send(res, 421, 'Misdirected request')
      const url = new URL(req.url || '/', 'http://x')
      const path = url.pathname
      if (path.startsWith('/api/')) return await api(req, res, path)
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' })
      return serveFile(req, res, path)
    } catch (e) {
      if (!res.headersSent) {
        if (e.status === 413) res.on('finish', () => req.destroy())
        send(res, e.status || 500, { error: e.status ? e.message : 'server error' }, e.status === 413 ? { Connection: 'close' } : {})
      }
      if (!e.status) log('error', e)
    }
  })
  server.headersTimeout = 10_000
  server.requestTimeout = 30_000
  server.keepAliveTimeout = 5_000
  server.maxHeadersCount = 50
  return server
}

// realpathSync: on the Pi this file is reached through the "current" link to the running version.
const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
if (isMain) {
  if (process.argv.includes('--set-pin')) {
    setPinInteractive().then(
      () => process.exit(0),
      (e) => {
        console.error(e.message)
        process.exit(1)
      },
    )
  } else {
    if (!existsSync(join(DIST, 'index.html'))) {
      console.error(`No built game in ${DIST}. Run  npm run build:pi  first.`)
      process.exit(1)
    }
    if (!config) console.warn('No host PIN yet: run  node pi/server.mjs --set-pin')
    createServer().listen(PORT, () => log(`Munaafasatul Ilm Live ${VERSION} on port ${PORT}, serving ${DIST}`))
  }
}
