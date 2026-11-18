/**
 * Get Grilled Live: talking to the Raspberry Pi server, when the game is served by one.
 *
 * On GitHub Pages there is no server and none of this runs. On the Pi, the same page works in
 * three ways: the host's screen (after the PIN), a team's tablet (opened from its link), or a
 * projector screen (opened from the projector link).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PublicView } from './views'

export interface Hello {
  gg: number
  live: boolean
  version: string
  pinSet: boolean
}

/** A seat as the host sees it: a team tablet or the projector, its link, and whether a device is on it. */
export interface Seat {
  id: string
  kind: 'team' | 'screen'
  index: number
  name: string
  link: string | null
  claimed: boolean
  claimedAt: number | null
  online: boolean
  lastSeen: number | null
  device: string | null
}

/** A message a team sent from its tablet (a typed final answer). */
export interface TeamMsg {
  seat: string
  team: number
  type: 'final' | 'intro'
  text: string
  at: number
}

// The server answers at the root of the Pi's address, for the host edition (/host/) too.
const api = (path: string) => '/api/' + path

async function post<T = unknown>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const r = await fetch(api(path), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify(body), credentials: 'same-origin' })
  let data = {} as T
  try {
    data = (await r.json()) as T
  } catch {
    /* empty reply */
  }
  return { ok: r.ok, status: r.status, data }
}

/** Ask whether a Get Grilled server is behind this page. Gives null on GitHub Pages or any plain host. */
export async function detectServer(timeoutMs = 2500): Promise<Hello | null> {
  if (typeof fetch === 'undefined' || location.protocol === 'file:') return null
  const ctl = new AbortController()
  const id = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(api('hello'), { signal: ctl.signal, credentials: 'same-origin', cache: 'no-store' })
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null
    const h = (await r.json()) as Hello
    return h && h.gg === 1 && h.live ? h : null
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

/** Which way this page is being used, from its address: ?t=… is a team link, ?s=… a projector link. */
export function deviceLink(): { kind: 'team' | 'screen'; token: string } | null {
  const q = new URLSearchParams(location.search)
  const t = q.get('t')
  const s = q.get('s')
  if (t) return { kind: 'team', token: t }
  if (s) return { kind: 'screen', token: s }
  if (q.get('device') === '1') return { kind: 'team', token: '' }
  return null
}

/** Build the link a device opens: the page's own address with the seat's key. */
export function seatUrl(seat: Seat): string | null {
  if (!seat.link) return null
  // Devices open the normal app at the root, not the host edition.
  const u = new URL('/', location.href)
  u.search = ''
  u.hash = ''
  u.searchParams.set(seat.kind === 'team' ? 't' : 's', seat.link)
  return u.toString()
}

// ----- host -----
export const hostMe = async () => {
  try {
    const r = await fetch(api('host/me'), { credentials: 'same-origin', cache: 'no-store' })
    return ((await r.json()) as { host: boolean }).host === true
  } catch {
    return false
  }
}
export const hostLogin = (pin: string) => post<{ error?: string; triesLeft?: number; retryIn?: number }>('host/login', { pin })
export const hostLogout = () => post('host/logout', {})
export const ensureSeats = (teams: string[]) => post<{ seats: Seat[] }>('host/seat', { action: 'ensure', teams })
export const reissueSeat = (id: string) => post('host/seat', { action: 'reissue', id })
export const removeSeat = (id: string) => post('host/seat', { action: 'remove', id })
export const endEvent = () => post('host/reset', {})

/** The host's live link: seats, team messages, and sending the room what it may see. */
class HostLive {
  seats: Seat[] = []
  msgs: TeamMsg[] = []
  connected = false
  private subs = new Set<() => void>()
  private es: EventSource | null = null
  private snapshot = { seats: this.seats, msgs: this.msgs, connected: false }
  private pending: PublicView | null = null
  private sending = false

  subscribe = (f: () => void) => {
    this.subs.add(f)
    return () => this.subs.delete(f)
  }
  get = () => this.snapshot
  private changed() {
    this.snapshot = { seats: this.seats, msgs: this.msgs, connected: this.connected }
    this.subs.forEach((f) => f())
  }

  start() {
    if (this.es) return
    const es = new EventSource(api('host/events'), { withCredentials: true })
    this.es = es
    es.onopen = () => {
      this.connected = true
      this.changed()
    }
    es.onerror = () => {
      this.connected = false
      this.changed()
    }
    es.addEventListener('seats', (e) => {
      try {
        this.seats = JSON.parse((e as MessageEvent).data) as Seat[]
        this.changed()
      } catch {
        /* ignore a broken message */
      }
    })
    es.addEventListener('msg', (e) => {
      try {
        const m = JSON.parse((e as MessageEvent).data) as TeamMsg
        this.msgs = [...this.msgs.filter((x) => !(x.team === m.team && x.type === m.type)), m]
        this.changed()
      } catch {
        /* ignore */
      }
    })
  }

  stop() {
    this.es?.close()
    this.es = null
    this.connected = false
    this.changed()
  }

  clearMsgs(type: TeamMsg['type']) {
    this.msgs = this.msgs.filter((m) => m.type !== type)
    this.changed()
  }

  /** Send the room's view; if one is on its way, only the newest waiting one goes next. */
  publish(v: PublicView) {
    this.pending = v
    if (this.sending) return
    void this.flush()
  }
  private async flush() {
    this.sending = true
    while (this.pending) {
      const v = this.pending
      this.pending = null
      try {
        await post('host/publish', { view: v })
      } catch {
        /* the server is restarting; the next change sends again */
      }
    }
    this.sending = false
  }
}

let host: HostLive | null = null
export function getHostLive(): HostLive {
  if (!host) host = new HostLive()
  return host
}
export function useHostLive() {
  const h = getHostLive()
  return useSyncExternalStore(h.subscribe, h.get, h.get)
}

// ----- devices -----
export type ClaimResult = { ok: true; kind: 'team' | 'screen'; index: number } | { ok: false; reason: 'taken' | 'invalid' | 'offline' }

export async function claim(tokenStr: string): Promise<ClaimResult> {
  try {
    const r = await post<{ kind: 'team' | 'screen'; index: number; error?: string }>('claim', { token: tokenStr })
    if (r.ok) return { ok: true, kind: r.data.kind, index: r.data.index }
    return { ok: false, reason: r.status === 409 ? 'taken' : 'invalid' }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

export const sendFromTeam = (type: TeamMsg['type'], text: string) => post('dev/send', { type, text })

export interface DeviceState {
  status: 'connecting' | 'live' | 'lost' | 'revoked' | 'none'
  seat: { kind: 'team' | 'screen'; index: number; name: string } | null
  view: PublicView | null
}

/** A team tablet's or projector's live feed from the server. */
export function useDeviceFeed(enabled: boolean): DeviceState {
  const [st, setSt] = useState<DeviceState>({ status: 'connecting', seat: null, view: null })
  const esRef = useRef<EventSource | null>(null)
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    const es = new EventSource(api('dev/events'), { withCredentials: true })
    esRef.current = es
    es.addEventListener('view', (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as { seat: DeviceState['seat']; view: PublicView | null }
        setSt({ status: 'live', seat: d.seat, view: d.view })
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('revoked', () => {
      stopped = true
      es.close()
      setSt((s) => ({ ...s, status: 'revoked' }))
    })
    es.onerror = () => {
      if (stopped) return
      // The server refuses a device with no seat (401): EventSource then closes for good.
      if (es.readyState === EventSource.CLOSED) setSt((s) => ({ ...s, status: s.seat ? 'revoked' : 'none' }))
      else setSt((s) => ({ ...s, status: 'lost' }))
    }
    return () => {
      stopped = true
      es.close()
    }
  }, [enabled])
  return st
}
