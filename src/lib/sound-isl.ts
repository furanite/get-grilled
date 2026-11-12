import type { ThemeId } from './types'

/**
 * The Islamic site's sounds: breeze, local birds and a frame drum (daff) with no jingles.
 * No melodic instruments. Everything is made with Web Audio, so there are no audio files.
 * Each function takes a Kit: the audio context, where to send the sound, and the reverb.
 */
export interface Kit {
  c: AudioContext
  out: AudioNode
  verb: AudioNode | null
}

const noiseBufs = new WeakMap<BaseAudioContext, AudioBuffer>()
function whiteNoise(c: AudioContext) {
  let b = noiseBufs.get(c)
  if (!b) {
    const len = c.sampleRate * 4
    b = c.createBuffer(1, len, c.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    noiseBufs.set(c, b)
  }
  return b
}

const at = (k: Kit, t: number) => k.c.currentTime + Math.max(0, t)
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/** Sends a node to the output, panned, with some of it to the reverb. */
function send(k: Kit, node: AudioNode, pan = 0, wet = 0.25) {
  let n = node
  if (pan && typeof k.c.createStereoPanner === 'function') {
    const p = k.c.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, pan))
    n.connect(p)
    n = p
  }
  n.connect(k.out)
  if (wet > 0 && k.verb) {
    const w = k.c.createGain()
    w.gain.value = wet
    n.connect(w).connect(k.verb)
  }
}

/** A burst of filtered noise. */
function hiss(k: Kit, t: number, d: number, g: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass', pan = 0, wet = 0.2, a = 0.003) {
  const t0 = at(k, t)
  const src = k.c.createBufferSource()
  src.buffer = whiteNoise(k.c)
  const f = k.c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const gain = k.c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + a)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  src.connect(f).connect(gain)
  send(k, gain, pan, wet)
  src.start(t0, Math.random() * 3)
  src.stop(t0 + d + 0.05)
}

/** One enveloped sine or triangle with a pitch drop. */
function thump(k: Kit, t: number, f0: number, f1: number, fall: number, d: number, g: number, type: OscillatorType = 'sine', pan = 0, wet = 0.2) {
  const t0 = at(k, t)
  const o = k.c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t0)
  o.frequency.exponentialRampToValueAtTime(f1, t0 + fall)
  const gain = k.c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  o.connect(gain)
  send(k, gain, pan, wet)
  o.start(t0)
  o.stop(t0 + d + 0.05)
}

/* ---------- The daff (frame drum, no jingles) ---------- */

/** "Dum": the deep open stroke in the middle of the skin. `muted` damps it with the palm. */
export function dum(k: Kit, t: number, g = 0.45, pan = 0, tune = 1, muted = false) {
  const d = muted ? 0.22 : 0.9
  // The body of the skin, a deep sub-bass under it, a little overtone and the slap of the hand
  thump(k, t, 104 * tune, 50 * tune, 0.2, d, g, 'sine', pan, 0.3)
  thump(k, t, 64 * tune, 41 * tune, 0.32, d * 1.15, g * 0.75, 'sine', pan, 0.12)
  thump(k, t, 230 * tune, 150 * tune, 0.08, d * 0.25, g * 0.13, 'sine', pan, 0.2)
  hiss(k, t, 0.05, g * 0.28, 480, 0.7, 'lowpass', pan, 0.1)
}

/** "Tak": the bright stroke at the rim. */
export function tak(k: Kit, t: number, g = 0.22, pan = 0) {
  hiss(k, t, 0.075, g, 2400, 1.3, 'bandpass', pan, 0.25)
  thump(k, t, 540, 430, 0.04, 0.07, g * 0.35, 'triangle', pan, 0.2)
}

/** "Ka": a soft finger stroke at the rim. */
export function ka(k: Kit, t: number, g = 0.1, pan = 0) {
  hiss(k, t, 0.05, g, 3300, 1.6, 'bandpass', pan, 0.2)
}

/** A roll of rim strokes that grows from g0 to g1. */
export function roll(k: Kit, t: number, d: number, g0: number, g1: number, rate = 18, pan = 0) {
  const n = Math.max(2, Math.round(d * rate))
  for (let i = 0; i < n; i++) {
    const g = g0 + ((g1 - g0) * i) / (n - 1)
    if (i % 2) ka(k, t + i / rate, g * 0.8, pan + 0.1)
    else tak(k, t + i / rate, g, pan - 0.1)
  }
}

/** A circle of three drummers playing together: the grand hits. */
function circle(k: Kit, t: number, stroke: 'D' | 'T' | 'k', g: number, big = false) {
  const spots: [number, number, number][] = [
    [-0.55, rnd(-0.008, 0.008), rnd(0.97, 1.0)],
    [0, 0, 1],
    [0.55, rnd(-0.008, 0.008), rnd(1.0, 1.03)],
  ]
  for (const [pan, dt, tune] of spots) {
    if (stroke === 'D') dum(k, t + dt, g * 0.6, pan, tune)
    else if (stroke === 'T') tak(k, t + dt, g * 0.55, pan)
    else ka(k, t + dt, g * 0.4, pan)
  }
  // A big bendir underneath the grand hits
  if (big && stroke === 'D') dum(k, t, g * 0.7, 0, 0.72)
}

/* ---------- Breeze ---------- */

export interface Breeze {
  gain: GainNode
  filter: BiquadFilterNode
  stop: (fade?: number) => void
}

/** A breeze: looped noise with a slowly wandering filter and gusts. */
export function breeze(k: Kit, t: number, d: number, g: number, centre = 650, width = 380, pan = 0): Breeze {
  g *= 0.6
  const c = k.c
  const t0 = at(k, t)
  const src = c.createBufferSource()
  src.buffer = whiteNoise(c)
  src.loop = true
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = centre
  f.Q.value = 0.7
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  const wander = c.createOscillator()
  wander.frequency.value = rnd(0.11, 0.17)
  const wanderAmt = c.createGain()
  wanderAmt.gain.value = width
  wander.connect(wanderAmt).connect(f.frequency)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + Math.min(1.6, d * 0.35))
  gain.gain.setValueAtTime(g, t0 + Math.max(0.1, d * 0.6))
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  // Gusts: a slow wobble in loudness
  const gust = c.createOscillator()
  gust.frequency.value = rnd(0.21, 0.29)
  const gustAmt = c.createGain()
  gustAmt.gain.value = g * 0.35
  const sway = c.createGain()
  sway.gain.value = 1
  gust.connect(gustAmt).connect(sway.gain)
  src.connect(f).connect(lp).connect(gain).connect(sway)
  send(k, sway, pan, 0.15)
  src.start(t0, Math.random() * 3)
  wander.start(t0)
  gust.start(t0)
  const end = t0 + d + 0.1
  src.stop(end)
  wander.stop(end)
  gust.stop(end)
  return {
    gain,
    filter: f,
    stop(fade = 0.4) {
      const now = c.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fade)
      for (const n of [src, wander, gust]) {
        try {
          n.stop(now + fade + 0.05)
        } catch {
          /* already stopped */
        }
      }
    },
  }
}

/** One soft wave: it swells in, breaks gently and draws back over the sand. */
export function wave(k: Kit, t: number, g = 0.06, len = 5, pan = 0) {
  const c = k.c
  const t0 = at(k, t)
  const src = c.createBufferSource()
  src.buffer = whiteNoise(c)
  src.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.4
  lp.frequency.setValueAtTime(260, t0)
  lp.frequency.linearRampToValueAtTime(1300, t0 + len * 0.42)
  lp.frequency.exponentialRampToValueAtTime(380, t0 + len)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.linearRampToValueAtTime(g, t0 + len * 0.42)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
  src.connect(lp).connect(gain)
  send(k, gain, pan, 0.2)
  // The fizz of the foam as it draws back
  const foam = c.createBufferSource()
  foam.buffer = whiteNoise(c)
  foam.loop = true
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3500
  const fg = c.createGain()
  fg.gain.setValueAtTime(0.0001, t0)
  fg.gain.setValueAtTime(0.0001, t0 + len * 0.35)
  fg.gain.linearRampToValueAtTime(g * 0.18, t0 + len * 0.5)
  fg.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
  foam.connect(hp).connect(fg)
  send(k, fg, -pan, 0.2)
  src.start(t0, Math.random() * 3)
  foam.start(t0, Math.random() * 3)
  src.stop(t0 + len + 0.1)
  foam.stop(t0 + len + 0.1)
}

/** A calm shore: waves one after another for `d` seconds. */
export function shore(k: Kit, t: number, d: number, g = 0.05) {
  let tt = t
  let i = 0
  while (tt < t + d) {
    const len = rnd(4.5, 6.5)
    wave(k, tt, g * rnd(0.8, 1.1), Math.min(len, t + d - tt + 1.5), i % 2 ? 0.3 : -0.3)
    tt += len * 0.7
    i++
  }
}

/** A quick gust that rises and falls, for opening a tile. */
export function whoosh(k: Kit, t: number, d = 0.55, g = 0.12, f0 = 350, f1 = 1700) {
  g *= 0.65
  const t0 = at(k, t)
  const src = k.c.createBufferSource()
  src.buffer = whiteNoise(k.c)
  const f = k.c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 0.9
  f.frequency.setValueAtTime(f0, t0)
  f.frequency.exponentialRampToValueAtTime(f1, t0 + d * 0.55)
  f.frequency.exponentialRampToValueAtTime(f0 * 1.4, t0 + d)
  const gain = k.c.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + d * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  src.connect(f).connect(gain)
  send(k, gain, 0, 0.3)
  src.start(t0, Math.random() * 3)
  src.stop(t0 + d + 0.05)
}

/* ---------- Birds ---------- */

/** One whistled note that follows [time, Hz] points. `vib` adds a quick flutter. */
function whistle(k: Kit, t: number, pts: [number, number][], g: number, pan = 0, opt: { vib?: number; vibDepth?: number; a?: number; lp?: number; harm?: number } = {}) {
  const c = k.c
  const t0 = at(k, t)
  const end = pts[pts.length - 1][0]
  const o = c.createOscillator()
  o.frequency.setValueAtTime(pts[0][1], t0 + pts[0][0])
  for (const [pt, f] of pts.slice(1)) o.frequency.linearRampToValueAtTime(f, t0 + pt)
  let vib: OscillatorNode | null = null
  if (opt.vib) {
    vib = c.createOscillator()
    vib.frequency.value = opt.vib
    const amt = c.createGain()
    amt.gain.value = pts[0][1] * (opt.vibDepth ?? 0.03)
    vib.connect(amt).connect(o.frequency)
  }
  const gain = c.createGain()
  const a = opt.a ?? 0.012
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + a)
  gain.gain.setValueAtTime(g, t0 + Math.max(a, end - 0.025))
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + end + 0.01)
  let node: AudioNode = o.connect(gain)
  if (opt.harm) {
    // A quiet second harmonic gives doves and owls their hollow sound
    const o2 = c.createOscillator()
    o2.frequency.setValueAtTime(pts[0][1] * 2, t0 + pts[0][0])
    for (const [pt, f] of pts.slice(1)) o2.frequency.linearRampToValueAtTime(f * 2, t0 + pt)
    const g2 = c.createGain()
    g2.gain.value = opt.harm
    o2.connect(g2).connect(gain)
    o2.start(t0)
    o2.stop(t0 + end + 0.05)
  }
  if (opt.lp) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = opt.lp
    node = gain.connect(f)
  }
  send(k, node, pan, 0.35)
  o.start(t0)
  o.stop(t0 + end + 0.05)
  if (vib) {
    vib.start(t0)
    vib.stop(t0 + end + 0.05)
  }
}

const j = (f: number) => f * rnd(0.95, 1.05)

/** White-eared bulbul (Gulf gardens): a short, liquid, bubbling phrase. */
export function bulbul(k: Kit, t: number, g = 0.06, pan = 0) {
  const s = rnd(0.95, 1.06)
  whistle(k, t, [[0, 1700 * s], [0.05, 2350 * s], [0.09, 2200 * s]], g, pan, { vib: 38, vibDepth: 0.02 })
  whistle(k, t + 0.12, [[0, 2650 * s], [0.07, 2100 * s]], g * 0.9, pan)
  whistle(k, t + 0.22, [[0, 1900 * s], [0.05, 2550 * s], [0.12, 2250 * s]], g, pan, { vib: 42, vibDepth: 0.025 })
  whistle(k, t + 0.38, [[0, 1650 * s], [0.09, 1500 * s]], g * 0.8, pan)
}

/** Purple sunbird: a fast, high, sparkling trill. */
export function sunbird(k: Kit, t: number, g = 0.03, pan = 0) {
  for (let i = 0; i < 12; i++) whistle(k, t + i * 0.038, [[0, i % 2 ? 4700 : 5300], [0.028, i % 2 ? 4500 : 5100]], g, pan, { a: 0.004 })
  whistle(k, t + 0.5, [[0, 6200], [0.16, 4100]], g * 1.1, pan, { a: 0.006 })
}

/** House sparrow: two bright chirps. */
export function sparrow(k: Kit, t: number, g = 0.04, pan = 0) {
  whistle(k, t, [[0, 4100], [0.06, 3000]], g, pan, { a: 0.004 })
  whistle(k, t + 0.11, [[0, 3400], [0.03, 4300], [0.08, 3300]], g, pan, { a: 0.004 })
}

/** Crested lark: a clear "twee-tee-too-ee". */
export function lark(k: Kit, t: number, g = 0.045, pan = 0) {
  whistle(k, t, [[0, 2800], [0.12, 3450]], g, pan)
  whistle(k, t + 0.17, [[0, 3050], [0.08, 3000]], g * 0.8, pan)
  whistle(k, t + 0.3, [[0, 2450], [0.1, 2350]], g * 0.85, pan)
  whistle(k, t + 0.45, [[0, 2900], [0.16, 3650]], g, pan, { vib: 30, vibDepth: 0.015 })
}

/** Nightingale: "piu piu piu" swelling, then a rich trill. */
export function nightingale(k: Kit, t: number, g = 0.05, pan = 0) {
  for (let i = 0; i < 4; i++) whistle(k, t + i * 0.2, [[0, 1850], [0.12, 1350]], g * (0.5 + i * 0.17), pan, { a: 0.03 })
  for (let i = 0; i < 14; i++) whistle(k, t + 0.85 + i * 0.033, [[0, i % 2 ? 2500 : 3200], [0.025, i % 2 ? 2350 : 3050]], g * 0.75, pan, { a: 0.003 })
  whistle(k, t + 1.35, [[0, 1200], [0.07, 1150]], g * 0.8, pan, { vib: 55, vibDepth: 0.06 })
}

/** Goldfinch: a quick, tinkling twitter. */
export function goldfinch(k: Kit, t: number, g = 0.04, pan = 0) {
  const fs = [3600, 4300, 3900, 4700, 3500, 4200, 4500, 3800, 4400, 4000]
  let tt = 0
  fs.forEach((f, i) => {
    const d = i % 3 === 2 ? 0.07 : 0.045
    whistle(k, t + tt, [[0, j(f)], [d * 0.5, f * (i % 2 ? 1.12 : 0.9)], [d, f]], g * (0.8 + (i % 3) * 0.1), pan, { a: 0.004 })
    tt += d + 0.025
  })
}

/** Canary: a rolling trill that climbs, then two sweet warbles. */
export function canary(k: Kit, t: number, g = 0.035, pan = 0) {
  for (let i = 0; i < 16; i++) {
    const f = 2900 + i * 30
    whistle(k, t + i * 0.032, [[0, i % 2 ? f * 1.12 : f], [0.024, i % 2 ? f * 1.05 : f * 1.08]], g * (0.6 + i * 0.025), pan, { a: 0.003 })
  }
  whistle(k, t + 0.6, [[0, 3200], [0.07, 3900], [0.14, 3500]], g, pan, { vib: 34, vibDepth: 0.02 })
  whistle(k, t + 0.8, [[0, 3700], [0.08, 4300], [0.18, 3600]], g, pan, { vib: 30, vibDepth: 0.02 })
}

/** Robin: a thin, sweet cascade that tumbles down. */
export function robin(k: Kit, t: number, g = 0.035, pan = 0) {
  const fs = [5200, 4700, 4900, 4200, 4400, 3700, 3300]
  fs.forEach((f, i) => whistle(k, t + i * 0.09, [[0, j(f)], [0.035, f * 1.08], [0.07, f * 0.94]], g * (1 - i * 0.06), pan, { a: 0.006 }))
}

export type BirdId = 'bulbul' | 'sunbird' | 'sparrow' | 'lark' | 'nightingale' | 'goldfinch' | 'canary' | 'robin'
export const BIRDS: Record<BirdId, { name: string; call: (k: Kit, t: number, g?: number, pan?: number) => void; len: number }> = {
  bulbul: { name: 'Bulbul', call: bulbul, len: 0.5 },
  sunbird: { name: 'Sunbird', call: sunbird, len: 0.7 },
  sparrow: { name: 'Sparrow', call: sparrow, len: 0.2 },
  lark: { name: 'Lark', call: lark, len: 0.65 },
  nightingale: { name: 'Nightingale', call: nightingale, len: 1.45 },
  goldfinch: { name: 'Goldfinch', call: goldfinch, len: 0.75 },
  canary: { name: 'Canary', call: canary, len: 1.0 },
  robin: { name: 'Robin', call: robin, len: 0.65 },
}

/* ---------- The game's sounds ---------- */

export const islamicFx = {
  /** Opening a tile: a gust of breeze, a rim stroke and a sparrow. */
  open(k: Kit) {
    whoosh(k, 0, 0.55, 0.18)
    tak(k, 0.2, 0.3)
    sparrow(k, 0.32, 0.03, 0.3)
  },
  /** A golden tile: a sunbird's sparkle and a bulbul. */
  golden(k: Kit) {
    roll(k, 0.35, 0.3, 0.04, 0.12)
    sunbird(k, 0.45, 0.05, -0.3)
    bulbul(k, 1.05, 0.07, 0.3)
  },
  /** The answer appears. */
  reveal(k: Kit) {
    dum(k, 0, 0.42)
    tak(k, 0.13, 0.2)
    bulbul(k, 0.24, 0.05, 0.25)
  },
  /** Right answer: dum-tak-tak-DUM and a bulbul's song. */
  right(k: Kit) {
    dum(k, 0, 0.4)
    tak(k, 0.13, 0.2)
    tak(k, 0.2, 0.16)
    circle(k, 0.3, 'D', 0.55)
    bulbul(k, 0.45, 0.06, -0.3)
    sparrow(k, 0.95, 0.035, 0.4)
  },
  /** Wrong answer: two damped, falling strokes. Gentle, but clear. */
  wrong(k: Kit) {
    dum(k, 0, 0.42, 0, 0.85, true)
    dum(k, 0.2, 0.38, 0, 0.68, true)
  },
  /** The last seconds of the timer: a rim stroke; the last one is a dum. */
  tick(k: Kit, final = false) {
    if (final) dum(k, 0, 0.3, 0, 1.1, true)
    tak(k, 0, final ? 0.42 : 0.32)
  },
  /** Time is up: a deep stroke and a robin's falling cascade. */
  timeUp(k: Kit) {
    circle(k, 0, 'D', 0.5)
    robin(k, 0.3, 0.035)
  },
  soft(k: Kit) {
    ka(k, 0, 0.25)
  },
  /** The game begins: the breeze rises, the drums roll into one great stroke, and the birds answer. */
  start(k: Kit) {
    breeze(k, 0, 4.6, 0.09)
    wave(k, 0, 0.05, 5)
    roll(k, 0.3, 1.1, 0.03, 0.26, 18, -0.2)
    roll(k, 0.36, 1.04, 0.02, 0.2, 18, 0.25)
    circle(k, 1.45, 'D', 0.75, true)
    circle(k, 1.62, 'T', 0.5)
    bulbul(k, 1.75, 0.06, -0.35)
    sparrow(k, 2.05, 0.035, 0.5)
    goldfinch(k, 2.3, 0.035, 0.2)
    sunbird(k, 2.95, 0.03, -0.5)
  },
  /** The winners: two bars of maqsum, a triple stroke and the whole garden singing. */
  win(k: Kit) {
    breeze(k, 0, 5.5, 0.08)
    shore(k, 0, 6, 0.045)
    const s = 60 / 116 / 4
    playPattern(k, 0, IQA.maqsum, s, 2, 0.5)
    const end = 32 * s
    roll(k, end, 0.35, 0.05, 0.24)
    circle(k, end + 0.4, 'D', 0.7, true)
    circle(k, end + 0.55, 'D', 0.7, true)
    circle(k, end + 0.75, 'D', 0.85, true)
    bulbul(k, end + 1.0, 0.06, -0.4)
    sunbird(k, end + 1.2, 0.03, 0.5)
    nightingale(k, end + 1.4, 0.04, 0.2)
    canary(k, end + 1.6, 0.03, -0.1)
  },
}

/* ---------- Suspense: before the answer is revealed ---------- */

/**
 * A heartbeat on the daff that slowly quickens over a rising breeze.
 * Starts when a clue opens and stops when the answer is shown or the clue closes.
 * It fades away on its own after `limit` seconds so a forgotten clue does not drum for ever.
 */
export function suspense(base: Kit, limit = 45): { stop: (fade?: number) => void } {
  const c = base.c
  const bus = c.createGain()
  bus.gain.value = 1
  bus.connect(base.out)
  const vbus = c.createGain()
  vbus.gain.value = 1
  if (base.verb) vbus.connect(base.verb)
  const k: Kit = { c, out: bus, verb: base.verb ? vbus : null }
  const air = breeze(k, 0, limit + 2, 0.06, 380, 160)
  shore(k, 0, limit, 0.03)
  air.gain.gain.setTargetAtTime(0.11, c.currentTime + 2, 10)
  air.filter.frequency.setTargetAtTime(950, c.currentTime + 1, 14)
  const t0 = c.currentTime + 0.15
  let next = t0
  let beat = 0
  let stopped = false
  const bpmAt = (s: number) => 64 + Math.min(1, s / 28) * 30
  const tickId = setInterval(() => {
    if (stopped) return
    const now = c.currentTime
    if (now - t0 > limit) return stop(3)
    while (next < now + 0.25) {
      const rel = next - now
      const s = next - t0
      const g = 0.16 + Math.min(1, s / 25) * 0.12
      // lub-dub
      dum(k, rel, g, 0, 0.82)
      dum(k, rel + 0.17, g * 0.6, 0, 0.78, true)
      if (s > 8 && beat % 2 === 1) ka(k, rel + 60 / bpmAt(s) / 2, 0.05)
      if (s > 16) ka(k, rel + (60 / bpmAt(s)) * 0.75, 0.04)
      // Now and then a far-off bird
      if (beat > 0 && beat % 11 === 0) (beat % 22 === 0 ? robin : goldfinch)(k, rel + 0.3, 0.012, beat % 22 === 0 ? -0.7 : 0.7)
      next += 60 / bpmAt(s)
      beat++
    }
  }, 60)
  function stop(fade = 0.25) {
    if (stopped) return
    stopped = true
    clearInterval(tickId)
    const now = c.currentTime
    for (const g of [bus.gain, vbus.gain]) {
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      g.linearRampToValueAtTime(0, now + fade)
    }
    air.stop(fade)
    setTimeout(() => {
      bus.disconnect()
      vbus.disconnect()
    }, (fade + 1.5) * 1000)
  }
  return { stop }
}

/* ---------- Title tunes (preview only until approved) ---------- */

/**
 * Iqa' (rhythmic cycles). One character per step: D dum, T tak, k ka, . rest.
 * `step` is how many sixteenths each character lasts.
 */
export const IQA = {
  maqsum: { name: 'Maqsum (4/4)', p: 'D.T...T.D...T...', step: 1 },
  baladi: { name: 'Baladi (4/4)', p: 'D.D...T.D...T...', step: 1 },
  saidi: { name: "Sa'idi (4/4)", p: 'D.T...D.D...T...', step: 1 },
  malfuf: { name: 'Malfuf (2/4)', p: 'D..T..T.D..T..T.', step: 1 },
  wahda: { name: 'Wahda (4/4, stately)', p: 'D.....k.T...k.k.', step: 1 },
  ayyub: { name: 'Ayyub (2/4)', p: 'D..kD.T.D..kD.T.', step: 1 },
  khaliji: { name: 'Khaliji (Gulf, 2/4)', p: 'D..T..D.T..T..D.', step: 1 },
  chakacha: { name: 'Chakacha (East African 6/8)', p: 'D.TkT.D.TkT.', step: 1 },
  dawrHindi: { name: 'Dawr Hindi (7/8)', p: 'DkTTDDT', step: 2 },
  aksak: { name: 'Aksak (9/8)', p: 'D.T.D.TT.', step: 2 },
  hadrah: { name: 'Hadrah / rebana (interlocking)', p: 'D.TkT.TkD.TkT.Tk', step: 1 },
  doira: { name: 'Doira usul (Central Asia)', p: 'D..TD.T.D..TD.T.', step: 1 },
  andalusi: { name: "Quddam (Andalusi 6/8)", p: 'D..T.TD..T.T', step: 1 },
} as const
export type IqaId = keyof typeof IQA

function stepsOf(i: (typeof IQA)[IqaId]) {
  return i.p.length * i.step
}

/** Plays `bars` cycles of an iqa'. `s` is one sixteenth in seconds. Returns the time it ends. */
function playPattern(k: Kit, t: number, iqa: (typeof IQA)[IqaId], s: number, bars: number, g: number, grand = true) {
  const len = stepsOf(iqa)
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < iqa.p.length; i++) {
      const ch = iqa.p[i]
      const tt = t + (b * len + i * iqa.step) * s
      if (ch === '.') continue
      const stroke = ch as 'D' | 'T' | 'k'
      if (grand) circle(k, tt, stroke, g * (i === 0 ? 1.15 : 1), i === 0 && b === 0)
      else if (stroke === 'D') dum(k, tt, g)
      else if (stroke === 'T') tak(k, tt, g * 0.5)
      else ka(k, tt, g * 0.35)
    }
  }
  return t + bars * len * s
}

export interface TuneSpec {
  iqa: IqaId
  bpm: number
  birds: BirdId[]
  /** How loud the breeze is, 0 to about 0.12. */
  breeze: number
  /** Drum loudness. */
  g?: number
  why: string
}

export const ISLAMIC_TUNES: Partial<Record<ThemeId, TuneSpec>> = {
  amethyst: { iqa: 'andalusi', bpm: 96, birds: ['nightingale', 'robin'], breeze: 0.07, why: 'Andalusi quddam; a nightingale on a Cordoba night' },
  emerald: { iqa: 'maqsum', bpm: 104, birds: ['bulbul', 'goldfinch'], breeze: 0.08, why: 'Maqsum; songbirds in a mosque courtyard' },
  neon: { iqa: 'aksak', bpm: 112, birds: ['canary', 'sparrow'], breeze: 0.08, why: 'Ottoman aksak 9/8 with bright chirping' },
  onyx: { iqa: 'wahda', bpm: 84, birds: ['bulbul', 'sunbird'], breeze: 0.06, why: 'Stately wahda, like turning a gilded page' },
  rivals: { iqa: 'doira', bpm: 112, birds: ['lark', 'goldfinch'], breeze: 0.09, why: 'Central Asian doira; larks over the steppe' },
  ember: { iqa: 'aksak', bpm: 116, birds: ['nightingale', 'canary'], breeze: 0.07, why: 'Aksak 9/8; the nightingale of the Ottoman tulip gardens' },
  rawdah: { iqa: 'baladi', bpm: 100, birds: ['bulbul', 'sunbird', 'goldfinch', 'canary'], breeze: 0.09, why: 'Baladi; a full garden chorus' },
  fajr: { iqa: 'wahda', bpm: 80, birds: ['lark', 'robin', 'sparrow'], breeze: 0.07, why: 'Slow wahda; the dawn chorus wakes' },
  duha: { iqa: 'maqsum', bpm: 108, birds: ['sunbird', 'bulbul'], breeze: 0.08, why: 'Maqsum; bright morning sunbirds' },
  zuhr: { iqa: 'saidi', bpm: 112, birds: ['sparrow', 'lark'], breeze: 0.06, why: "Sa'idi; noon light, sparrows and a lark" },
  asr: { iqa: 'malfuf', bpm: 104, birds: ['goldfinch', 'bulbul'], breeze: 0.09, why: 'Malfuf; the afternoon breeze and goldfinches' },
  maghrib: { iqa: 'ayyub', bpm: 100, birds: ['robin', 'sparrow'], breeze: 0.1, why: 'Ayyub; birds settling at sunset' },
  isha: { iqa: 'andalusi', bpm: 88, birds: ['nightingale', 'robin'], breeze: 0.06, why: 'Quddam; the night falls quiet and a nightingale sings' },
  qiyam: { iqa: 'wahda', bpm: 70, birds: ['nightingale'], breeze: 0.05, g: 0.35, why: 'Soft wahda; the still of the night and one nightingale' },
  mughal: { iqa: 'dawrHindi', bpm: 108, birds: ['bulbul', 'canary'], breeze: 0.08, why: 'Dawr Hindi 7/8 with bulbuls of the subcontinent' },
  sahel: { iqa: 'chakacha', bpm: 116, birds: ['sunbird', 'goldfinch'], breeze: 0.1, why: '6/8 cycle; songbirds in the dry wind' },
  swahili: { iqa: 'chakacha', bpm: 108, birds: ['sunbird', 'canary'], breeze: 0.11, why: 'Chakacha 6/8 of the coast; sea breeze and sunbirds' },
  nusantara: { iqa: 'hadrah', bpm: 104, birds: ['bulbul', 'sunbird'], breeze: 0.08, why: 'Interlocking rebana (hadrah); bulbul and sunbird' },
  zellige: { iqa: 'andalusi', bpm: 104, birds: ['bulbul', 'goldfinch'], breeze: 0.08, why: 'Andalusi quddam of Fez; bulbul and goldfinch' },
  suzani: { iqa: 'doira', bpm: 108, birds: ['lark', 'canary'], breeze: 0.09, why: 'Doira usul of Bukhara; larks and canaries' },
  bosnia: { iqa: 'aksak', bpm: 108, birds: ['nightingale', 'robin'], breeze: 0.08, why: 'Balkan aksak 9/8; nightingale and robin' },
  tatar: { iqa: 'ayyub', bpm: 116, birds: ['lark', 'sparrow'], breeze: 0.1, why: 'Lively 2/4; the skylark over the Volga steppe' },
  kubachi: { iqa: 'chakacha', bpm: 126, birds: ['lark', 'goldfinch'], breeze: 0.1, why: 'Quick 6/8 of the mountains; mountain wind' },
  hui: { iqa: 'wahda', bpm: 96, birds: ['nightingale', 'sparrow'], breeze: 0.07, why: 'Measured wahda; a songbird and sparrows' },
  jumuah: { iqa: 'khaliji', bpm: 104, birds: ['bulbul', 'canary', 'sunbird'], breeze: 0.09, why: 'Khaliji; the grandest, a festive Friday' },
  mawlid: { iqa: 'hadrah', bpm: 100, birds: ['nightingale', 'bulbul', 'sunbird', 'canary'], breeze: 0.09, why: 'Hadrah of the Mawlid gatherings; every bird sings' },
}

/**
 * A grand title tune of about seven seconds: the breeze rises, a bird calls, the drum circle rolls
 * into a great stroke, two cycles of the theme's iqa' with birds answering, then a triple stroke.
 * Returns a handle to stop it.
 */
export function islamicTitleTune(base: Kit, theme: ThemeId): { stop: (fade?: number) => void; length: number } | null {
  const spec = ISLAMIC_TUNES[theme]
  if (!spec) return null
  const c = base.c
  const bus = c.createGain()
  bus.connect(base.out)
  const vbus = c.createGain()
  if (base.verb) vbus.connect(base.verb)
  const k: Kit = { c, out: bus, verb: base.verb ? vbus : null }
  const iqa = IQA[spec.iqa]
  const s = 60 / spec.bpm / 4
  const g = spec.g ?? 0.5
  const birds = spec.birds.map((b) => BIRDS[b])
  const night = theme === 'qiyam' || theme === 'isha'

  breeze(k, 0, 10, spec.breeze)
  shore(k, 0, 10, spec.breeze * 0.55)
  birds[0].call(k, 0.25, undefined, -0.4)
  // Roll in
  const r0 = 0.25 + birds[0].len + 0.1
  roll(k, r0, 0.9, 0.02, g * 0.45, 18, -0.25)
  roll(k, r0 + 0.04, 0.86, 0.015, g * 0.35, 18, 0.25)
  const t1 = r0 + 0.95
  const barLen = stepsOf(iqa) * s
  const end = playPattern(k, t1, iqa, s, 2, g * (night ? 0.7 : 1))
  // Birds answer in the middle of each cycle
  ;(birds[1] ?? birds[0]).call(k, t1 + barLen * 0.5, undefined, 0.45)
  birds[0].call(k, t1 + barLen * 1.5, undefined, -0.45)
  // Sting: roll and triple stroke
  roll(k, end, 0.32, 0.04, g * 0.5)
  const hit = end + 0.36
  const beat = 60 / spec.bpm
  circle(k, hit, 'D', g * 1.3, true)
  circle(k, hit + beat * 0.5, 'D', g * 1.3, true)
  circle(k, hit + beat, 'D', g * 1.6, true)
  whoosh(k, hit + beat - 0.3, 1.3, spec.breeze * 1.4, 300, 1100)
  // The whole chorus over the tail
  birds.forEach((b, i) => b.call(k, hit + beat + 0.25 + i * 0.3, undefined, i % 2 ? 0.5 : -0.5))
  const length = hit + beat + 0.25 + birds.length * 0.3 + 1.6

  let stopped = false
  return {
    length,
    stop(fade = 0.6) {
      if (stopped) return
      stopped = true
      const now = c.currentTime
      for (const gn of [bus.gain, vbus.gain]) {
        gn.cancelScheduledValues(now)
        gn.setValueAtTime(gn.value, now)
        gn.linearRampToValueAtTime(0, now + fade)
      }
      setTimeout(() => {
        bus.disconnect()
        vbus.disconnect()
      }, (fade + 0.5) * 1000)
    },
  }
}
