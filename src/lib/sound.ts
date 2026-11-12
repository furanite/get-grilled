import type { ThemeId } from './types'
import { ISLAMIC_SET } from './edition'

/**
 * Every sound is made in the browser with Web Audio: no audio files to download or license.
 * Browsers only allow sound after the person clicks or presses a key, so the first
 * click "unlocks" audio; a title tune asked for before that waits for it.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let verb: ConvolverNode | null = null
let enabled = true
let pendingTune: { theme: ThemeId; at: number } | null = null
let tuneBus: GainNode | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
    master = ctx.createGain()
    master.gain.value = 0.55
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
    verb = ctx.createConvolver()
    verb.buffer = impulse(ctx, 2.2)
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    verb.connect(wet).connect(master)
  }
  return ctx
}

function impulse(c: AudioContext, secs: number) {
  const len = Math.floor(c.sampleRate * secs)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  return buf
}

/** Ready to play: sound is on and the browser has allowed audio. */
function ready(): AudioContext | null {
  if (!enabled) return null
  const c = audio()
  if (!c || c.state !== 'running') return null
  return c
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  if (!on) {
    stopTune()
    pendingTune = null
  }
}
export const soundEnabled = () => enabled

/** Called on the first click or key press anywhere in the app. */
export function unlockAudio() {
  const c = audio()
  if (!c) return
  const go = () => {
    if (pendingTune && Date.now() - pendingTune.at < 30_000) titleTune(pendingTune.theme)
    pendingTune = null
  }
  if (c.state === 'suspended') c.resume().then(go, () => {})
  else go()
}

interface Note {
  f: number
  t?: number
  d?: number
  type?: OscillatorType
  g?: number
  a?: number
  wet?: boolean
  detune?: number
  bend?: number
  out?: AudioNode
  lp?: number
}

/** One enveloped oscillator. `t` is seconds from now. */
function tone(c: AudioContext, n: Note) {
  const t0 = c.currentTime + (n.t ?? 0)
  const d = n.d ?? 0.3
  const osc = c.createOscillator()
  osc.type = n.type ?? 'sine'
  osc.frequency.setValueAtTime(n.f, t0)
  if (n.bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.f * n.bend), t0 + d)
  if (n.detune) osc.detune.value = n.detune
  const g = c.createGain()
  const peak = n.g ?? 0.2
  const a = n.a ?? 0.008
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  let node: AudioNode = osc.connect(g)
  if (n.lp) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = n.lp
    node = g.connect(f)
  }
  const out = n.out ?? master!
  node.connect(out)
  if (n.wet !== false && verb) node.connect(verb)
  osc.start(t0)
  osc.stop(t0 + d + 0.05)
}

function noise(c: AudioContext, t: number, d: number, g: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass', out?: AudioNode) {
  const t0 = c.currentTime + t
  const len = Math.floor(c.sampleRate * d)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + Math.min(0.05, d / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  src.connect(f).connect(gain).connect(out ?? master!)
  if (verb) gain.connect(verb)
  src.start(t0)
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** A soft bell: a sine with a quiet octave and twelfth that die away faster. */
function bell(c: AudioContext, midi: number, t: number, d = 1.6, g = 0.16, out?: AudioNode) {
  const f = hz(midi)
  tone(c, { f, t, d, g, a: 0.006, out })
  tone(c, { f: f * 2, t, d: d * 0.5, g: g * 0.35, out })
  tone(c, { f: f * 3, t, d: d * 0.25, g: g * 0.12, out })
}

/** A plucked string, for the Heritage theme. */
function pluck(c: AudioContext, midi: number, t: number, d = 1.2, g = 0.16, out?: AudioNode) {
  const f = hz(midi)
  tone(c, { f, t, d, g, type: 'triangle', a: 0.003, lp: 2200, out })
  tone(c, { f: f * 2, t, d: d * 0.4, g: g * 0.3, type: 'sawtooth', a: 0.002, lp: 1800, out })
}

/** A warm analog pad note, for Neon. */
function synth(c: AudioContext, midi: number, t: number, d = 1.2, g = 0.08, out?: AudioNode) {
  const f = hz(midi)
  tone(c, { f, t, d, g, type: 'sawtooth', a: 0.02, lp: 1600, detune: -6, out })
  tone(c, { f, t, d, g, type: 'sawtooth', a: 0.02, lp: 1600, detune: 6, out })
}

type Voice = (c: AudioContext, midi: number, t: number, d?: number, g?: number, out?: AudioNode) => void

/** Title tune: a short, calm phrase in each theme's own colour. Midi notes and start times. */
// The Islamic themes have no title tune: the Islamic site plays no music.
const TUNES: Partial<Record<ThemeId, { voice: Voice; notes: [number, number, number?][]; pad: number[] }>> = {
  // [midi, start, length]
  amethyst: { voice: bell, notes: [[67, 0], [72, 0.4], [76, 0.8], [74, 1.3], [79, 1.7, 2.6], [72, 2.6], [76, 3.0, 2.8]], pad: [48, 55, 64] },
  emerald: { voice: bell, notes: [[69, 0], [72, 0.45], [76, 0.9], [74, 1.35], [72, 1.8], [69, 2.25, 2.4], [76, 2.9, 2.8]], pad: [45, 52, 60] },
  neon: { voice: synth, notes: [[64, 0, 0.5], [67, 0.3, 0.5], [71, 0.6, 0.5], [74, 0.9, 0.8], [71, 1.5, 0.5], [76, 1.8, 2.2], [79, 2.7, 2.4]], pad: [40, 47, 55] },
  onyx: { voice: bell, notes: [[62, 0], [69, 0.5], [74, 1.0], [73, 1.5], [74, 1.85], [78, 2.3, 2.8], [81, 3.0, 2.8]], pad: [38, 45, 54] },
  rivals: { voice: bell, notes: [[64, 0], [64, 0.25], [71, 0.5], [69, 1.0], [71, 1.35], [76, 1.8, 2.6], [71, 2.7, 2.6]], pad: [40, 47, 56] },
  ember: { voice: pluck, notes: [[57, 0], [60, 0.4], [64, 0.8], [65, 1.2], [64, 1.6], [60, 2.0, 1.8], [64, 2.6, 2.6]], pad: [45, 52, 57] },
  // Hijaz on D: D Eb F# G A Bb C
  heritage: { voice: pluck, notes: [[62, 0], [63, 0.35], [66, 0.7], [67, 1.05], [69, 1.5, 1.4], [67, 2.1], [66, 2.45], [63, 2.8], [62, 3.2, 2.6]], pad: [38, 45, 50] },
}

export function titleTune(theme: ThemeId) {
  if (!enabled) return
  const c = audio()
  if (!c) return
  if (c.state !== 'running') {
    pendingTune = { theme, at: Date.now() }
    c.resume().then(
      () => {
        if (pendingTune) {
          pendingTune = null
          titleTune(theme)
        }
      },
      () => {},
    )
    return
  }
  stopTune()
  const tune = ISLAMIC_SET ? undefined : TUNES[theme]
  if (!tune) return
  const bus = c.createGain()
  bus.gain.value = 1
  bus.connect(master!)
  tuneBus = bus
  for (const [m, t, d] of tune.notes) tune.voice(c, m, 0.15 + t, d ?? 1.5, undefined, bus)
  // A quiet pad underneath
  for (const m of tune.pad) tone(c, { f: hz(m), t: 0.1, d: 5.6, g: 0.035, a: 1.2, type: 'triangle', lp: 900, out: bus })
}

/** Fades the title tune out, for example when the host leaves the title screen. */
export function stopTune() {
  pendingTune = null
  if (!tuneBus || !ctx) return
  const g = tuneBus.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setValueAtTime(g.value, ctx.currentTime)
  g.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
  const bus = tuneBus
  tuneBus = null
  setTimeout(() => bus.disconnect(), 800)
}

/** A brass chord that swells, a timpani roll and a cymbal shimmer: the game begins. */
function start() {
  const c = ready()
  if (!c) return
  stopTune()
  // Timpani roll into a hit
  for (let i = 0; i < 10; i++) tone(c, { f: 73, t: i * 0.07, d: 0.25, g: 0.05 + i * 0.012, bend: 0.8 })
  tone(c, { f: 98, t: 0.72, d: 1.6, g: 0.5, bend: 0.6 })
  noise(c, 0.72, 0.25, 0.25, 180, 1, 'lowpass')
  // Fanfare: G - C - E - G, then the full chord
  const brass = (m: number, t: number, d: number, g = 0.07) => {
    const f = hz(m)
    for (const det of [-7, 0, 7]) tone(c, { f, t, d, g, type: 'sawtooth', a: 0.06, detune: det, lp: 2400 })
  }
  brass(55, 0.72, 0.25)
  brass(60, 0.98, 0.25)
  brass(64, 1.24, 0.25)
  for (const m of [48, 55, 60, 64, 67, 72]) brass(m, 1.5, 2.6, 0.05)
  noise(c, 1.5, 2.4, 0.08, 7000, 0.7, 'highpass')
  bell(c, 84, 1.55, 2.2, 0.08)
}

const fx = {
  /** Opening a tile: a quick rising whoosh with a soft tick. */
  open() {
    const c = ready()
    if (!c) return
    noise(c, 0, 0.35, 0.12, 900, 0.8)
    tone(c, { f: 330, t: 0, d: 0.35, g: 0.06, bend: 2, type: 'triangle' })
    tone(c, { f: 880, t: 0.28, d: 0.5, g: 0.06 })
  },
  /** A golden tile: a sparkle run. */
  golden() {
    const c = ready()
    if (!c) return
    ;[84, 88, 91, 96, 100].forEach((m, i) => bell(c, m, 0.45 + i * 0.07, 0.9, 0.05))
  },
  reveal() {
    const c = ready()
    if (!c) return
    bell(c, 76, 0, 1.1, 0.1)
    bell(c, 83, 0.09, 1.3, 0.08)
  },
  right() {
    const c = ready()
    if (!c) return
    bell(c, 72, 0, 0.8, 0.13)
    bell(c, 76, 0.09, 0.8, 0.13)
    bell(c, 79, 0.18, 1.4, 0.14)
  },
  wrong() {
    const c = ready()
    if (!c) return
    tone(c, { f: 196, t: 0, d: 0.42, g: 0.12, type: 'square', lp: 900, bend: 0.85, wet: false })
    tone(c, { f: 185, t: 0, d: 0.42, g: 0.1, type: 'square', lp: 900, bend: 0.85, wet: false })
  },
  /** The last seconds of the timer. */
  tick(final = false) {
    const c = ready()
    if (!c) return
    tone(c, { f: final ? 1320 : 1000, d: 0.08, g: 0.07, wet: false })
  },
  timeUp() {
    const c = ready()
    if (!c) return
    tone(c, { f: 110, d: 1.4, g: 0.22, type: 'triangle' })
    tone(c, { f: 220, d: 1.0, g: 0.1, type: 'sine' })
    tone(c, { f: 233, d: 1.0, g: 0.06, type: 'sine' })
  },
  /** Score changed by hand, or a small UI confirmation. */
  soft() {
    const c = ready()
    if (!c) return
    tone(c, { f: 660, d: 0.15, g: 0.05 })
  },
  start,
  /** The winners: a rising arpeggio that lands on a bright chord. */
  win() {
    const c = ready()
    if (!c) return
    ;[60, 64, 67, 72, 76, 79].forEach((m, i) => bell(c, m, i * 0.11, 1.2, 0.1))
    for (const m of [60, 64, 67, 72, 84]) tone(c, { f: hz(m), t: 0.7, d: 2.6, g: 0.04, type: 'sawtooth', a: 0.08, lp: 2600 })
    noise(c, 0.7, 2, 0.06, 7000, 0.7, 'highpass')
  },
}

export const sfx = fx
