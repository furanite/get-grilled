/**
 * The connection to the buzzer box, shared by the whole app.
 *
 * In Chrome or Edge the box plugs into the host's laptop by USB and is reached with Web Serial.
 * For testing without a box, opening the app with ?buzzsim=1 adds a pretend box that the browser
 * tests (and anyone rehearsing) can press from the console with window.ggBuzz.press(button).
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { type BoxEvent, type BoxMode, type BuzzSettings, type Press, cleanBuzzSettings, lightCommand, modeCommand, parseLine } from './buzz'

// Minimal Web Serial types (not in TypeScript's DOM library yet).
interface SerialPortLike {
  open(o: { baudRate: number }): Promise<void>
  close(): Promise<void>
  setSignals?(s: { dataTerminalReady?: boolean }): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo?(): { usbVendorId?: number; usbProductId?: number }
}
interface SerialLike {
  requestPort(o?: { filters?: { usbVendorId?: number }[] }): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
  addEventListener(type: 'disconnect' | 'connect', fn: (e: Event) => void): void
}
const serial = (): SerialLike | null => (typeof navigator !== 'undefined' && 'serial' in navigator ? ((navigator as unknown as { serial: SerialLike }).serial ?? null) : null)

/** Raspberry Pi's USB vendor id, which the Pico uses. */
const PICO_VENDOR = 0x2e8a

export type BoxStatus = 'none' | 'connecting' | 'connected' | 'lost'

export interface BoxState {
  status: BoxStatus
  /** Buttons the box reports, once it has said hello */
  buttons: number
  sim: boolean
  error: string
}

type Listener = (e: BoxEvent) => void

/** Whether a real box can be used in this browser (Chrome or Edge on a computer). */
export const serialSupported = () => !!serial()

/** The pretend box is on when the page was opened with ?buzzsim=1. */
const simWanted = () => {
  try {
    return new URLSearchParams(location.search).get('buzzsim') === '1'
  } catch {
    return false
  }
}

class Box {
  state: BoxState = { status: 'none', buttons: 0, sim: false, error: '' }
  private subs = new Set<() => void>()
  private listeners = new Set<Listener>()
  private port: SerialPortLike | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private mode: BoxMode = 'idle'
  private lit: number[] = []
  private sim: Sim | null = null

  constructor() {
    if (typeof window === 'undefined') return
    if (simWanted()) {
      this.sim = new Sim((line) => this.onLine(line))
      ;(window as unknown as { ggBuzz: Sim }).ggBuzz = this.sim
      this.set({ status: 'connected', sim: true, buttons: 8 })
      return
    }
    const s = serial()
    if (!s) return
    s.addEventListener('disconnect', (e) => {
      if ((e.target as unknown) === this.port || (e as unknown as { port?: unknown }).port === this.port) this.lost()
    })
    // A box this browser was allowed to use before connects again by itself.
    s.addEventListener('connect', () => {
      if (this.state.status !== 'connected') void this.reconnect()
    })
    void this.reconnect()
  }

  subscribe = (fn: () => void) => {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
  get = () => this.state

  private set(p: Partial<BoxState>) {
    this.state = { ...this.state, ...p }
    this.subs.forEach((f) => f())
  }

  /** Hear every message from the box. */
  on(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** Ask the browser for the box (shows Chrome's list of USB devices). */
  async connect() {
    const s = serial()
    if (!s) return
    try {
      const port = await s.requestPort({ filters: [{ usbVendorId: PICO_VENDOR }] })
      await this.use(port)
    } catch (e) {
      // Closing the picker is not an error worth showing.
      if ((e as Error)?.name !== 'NotFoundError') this.set({ status: 'none', error: String((e as Error)?.message ?? e) })
    }
  }

  private async reconnect() {
    const s = serial()
    if (!s) return
    const ports = await s.getPorts().catch(() => [])
    const port = ports.find((p) => p.getInfo?.().usbVendorId === PICO_VENDOR) ?? ports[0]
    if (port) await this.use(port).catch(() => {})
  }

  private async use(port: SerialPortLike) {
    await this.disconnect()
    this.set({ status: 'connecting', error: '' })
    await port.open({ baudRate: 115200 })
    // The Pico only sends once the computer says it is listening.
    await port.setSignals?.({ dataTerminalReady: true }).catch(() => {})
    this.port = port
    this.writer = port.writable?.getWriter() ?? null
    void this.readLoop(port)
    this.set({ status: 'connected' })
    this.send('HELLO')
    this.send(modeCommand(this.mode))
    this.send(lightCommand(this.lit))
  }

  private async readLoop(port: SerialPortLike) {
    const dec = new TextDecoder()
    let buf = ''
    try {
      this.reader = port.readable?.getReader() ?? null
      while (this.reader) {
        const { value, done } = await this.reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let nl: number
        while ((nl = buf.indexOf('\n')) >= 0) {
          this.onLine(buf.slice(0, nl))
          buf = buf.slice(nl + 1)
        }
        // A box that sends junk without line breaks can't fill the memory.
        if (buf.length > 512) buf = ''
      }
    } catch {
      this.lost()
    }
  }

  private onLine(line: string) {
    const e = parseLine(line)
    if (!e) return
    if (e.kind === 'hello') this.set({ buttons: e.buttons })
    this.listeners.forEach((f) => f(e))
  }

  private lost() {
    this.port = null
    this.writer = null
    this.reader = null
    if (this.state.status !== 'none') this.set({ status: 'lost' })
  }

  async disconnect() {
    const port = this.port
    this.port = null
    try {
      await this.reader?.cancel()
    } catch {
      /* already closed */
    }
    this.reader?.releaseLock?.()
    this.writer?.releaseLock()
    this.reader = null
    this.writer = null
    await port?.close().catch(() => {})
    if (!this.sim) this.set({ status: 'none', buttons: 0 })
  }

  send(cmd: string) {
    if (this.sim) return this.sim.command(cmd)
    if (!this.writer) return
    this.writer.write(new TextEncoder().encode(cmd + '\n')).catch(() => this.lost())
  }

  setMode(mode: BoxMode) {
    this.mode = mode
    this.send(modeCommand(mode))
  }

  light(buttons: number[]) {
    this.lit = buttons
    this.send(lightCommand(buttons))
  }
}

/**
 * A pretend box that behaves like the firmware: early presses lock a button out for a quarter
 * of a second, and only each button's first press while open counts.
 */
export class Sim {
  private mode: BoxMode = 'idle'
  private openedAt = 0
  private got = new Set<number>()
  private penalty = new Map<number, number>()
  lit: number[] = []
  constructor(private out: (line: string) => void, private now: () => number = () => performance.now() * 1000) {}

  command(line: string) {
    const [cmd, arg] = line.trim().split(/\s+/)
    if (cmd === 'HELLO') this.out('GG BUZZ 1 8')
    else if (cmd === 'PING') this.out('PONG')
    else if (cmd === 'IDLE' || cmd === 'READY') {
      this.mode = cmd === 'IDLE' ? 'idle' : 'ready'
      this.got.clear()
    } else if (cmd === 'OPEN') {
      this.mode = 'open'
      this.openedAt = this.now()
      this.got.clear()
      this.lit = []
    } else if (cmd === 'LIGHT') {
      const m = Number(arg) | 0
      this.lit = [0, 1, 2, 3, 4, 5, 6, 7].filter((b) => m & (1 << b))
    }
  }

  /** Press a button (0-based). `at` is microseconds after opening, for tests that need exact times. */
  press(button: number, at?: number) {
    const t = at !== undefined ? this.openedAt + at : this.now()
    if (this.mode === 'idle') return this.out(`T ${button}`)
    if (this.mode === 'ready') {
      this.penalty.set(button, t + 250_000)
      return this.out(`E ${button}`)
    }
    if (this.got.has(button) || (this.penalty.get(button) ?? 0) > t) return
    this.got.add(button)
    if (this.got.size === 1) this.lit = [button]
    this.out(`P ${button} ${Math.max(0, Math.round(t - this.openedAt))}`)
  }

  reset() {
    this.out('R')
  }
}

let box: Box | null = null
/** The one box connection for the app. */
export function getBox(): Box {
  if (!box) box = new Box()
  return box
}

export function useBoxState(): BoxState {
  const b = getBox()
  return useSyncExternalStore(b.subscribe, b.get, b.get)
}

const KEY = 'gg.buzz.v1'
export function loadBuzzSettings(): BuzzSettings {
  try {
    return cleanBuzzSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return cleanBuzzSettings(null)
  }
}
export function saveBuzzSettings(s: BuzzSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked: the settings last until the page closes */
  }
}

/** Buzzer settings that every part of the app sees change at once. */
const settingSubs = new Set<() => void>()
let settings: BuzzSettings | null = null
export function getBuzzSettings(): BuzzSettings {
  if (!settings) settings = loadBuzzSettings()
  return settings
}
export function setBuzzSettings(s: BuzzSettings) {
  settings = cleanBuzzSettings(s)
  saveBuzzSettings(settings)
  settingSubs.forEach((f) => f())
}
export function useBuzzSettings(): BuzzSettings {
  return useSyncExternalStore(
    (f) => {
      settingSubs.add(f)
      return () => settingSubs.delete(f)
    },
    getBuzzSettings,
    getBuzzSettings,
  )
}

/** Whether a box is plugged in and ready (or the pretend box is on). */
export function useBoxReady(): boolean {
  return useBoxState().status === 'connected'
}

/** Hear the box's messages while a component is on screen. */
export function useBoxEvents(fn: Listener) {
  const [ref] = useState(() => ({ fn }))
  ref.fn = fn
  useEffect(() => getBox().on((e) => ref.fn(e)), [ref])
}

export type { Press }
