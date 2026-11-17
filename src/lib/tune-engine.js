/* eslint-disable */
// Title tunes and suspense sounds, ported from the Tune Room page the owner listened to and picked from.
// Each piece is rendered once into an audio buffer with an OfflineAudioContext (a clock that always starts
// at zero, exactly as the scores were written), then played like a recording. Recorded instrument notes
// are loaded from ./sounds/ in the app itself, never from another site.
// Recordings: VSCO 2 Community Edition and VCSL (CC0); trumpet, harp, xylophone and piano from the
// tonejs-instruments collection by nbrosowsky (CC BY 3.0).

let ctx, master, verb
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)
let BUS = null
const out = () => BUS || master
function env(g, t, a, peak, d, rel = 0.12) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.setValueAtTime(peak, t + Math.max(a, d - rel))
  g.gain.exponentialRampToValueAtTime(0.0001, t + d + rel)
}
function send(node, wet = true) { node.connect(out()); if (wet) node.connect(BUS ? BUS.wet : verb) }
// A bus fades its dry sound and its reverb send together, so stopping is clean.
function newBus() { const b = ctx.createGain(); b.connect(master); b.wet = ctx.createGain(); b.wet.connect(verb); return b }
function fade(b, s = 0.3) { for (const g of [b.gain, b.wet.gain]) { g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(0, ctx.currentTime + s) } setTimeout(() => { b.disconnect(); b.wet.disconnect() }, s * 1000 + 3000) }
function osc(type, f, t, d, det = 0) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det; o.start(t); o.stop(t + d + 0.6); return o }
function lp(f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; return b }
function noiseSrc(t, d) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * d)), buf = ctx.createBuffer(1, len, ctx.sampleRate), x = buf.getChannelData(0)
  for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1
  const s = ctx.createBufferSource(); s.buffer = buf; s.start(t); return s
}
const I = {
  brass(m, t, d, g = 0.05, bright = 2800) {
    const f = lp(500, 1.2); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(bright, t + 0.07); f.frequency.exponentialRampToValueAtTime(bright * 0.6, t + d)
    const v = ctx.createGain(); env(v, t, 0.04, g, d, 0.15)
    for (const det of [-9, 0, 9]) osc('sawtooth', hz(m), t, d, det).connect(f)
    f.connect(v); send(v)
  },
  horn(m, t, d, g = 0.05) { I.brass(m, t, d, g, 1300) },
  strings(m, t, d, g = 0.03, trem = 0) {
    const f = lp(2200); const v = ctx.createGain(); env(v, t, 0.25, g, d, 0.5)
    for (const det of [-14, -5, 5, 14]) osc('sawtooth', hz(m), t, d, det).connect(f)
    if (trem) { const a = ctx.createGain(); a.gain.value = 0.6; const l = osc('sine', trem, t, d); const lg = ctx.createGain(); lg.gain.value = 0.4; l.connect(lg).connect(a.gain); f.connect(a).connect(v) } else f.connect(v)
    send(v)
  },
  bell(m, t, d = 1.6, g = 0.08) {
    for (const [k, gg, dd] of [[1, 1, 1], [2, 0.35, 0.5], [3, 0.12, 0.25], [4.2, 0.06, 0.15]]) { const v = ctx.createGain(); env(v, t, 0.004, g * gg, d * dd, 0.05); osc('sine', hz(m) * k, t, d * dd).connect(v); send(v) }
  },
  pluck(m, t, d = 0.9, g = 0.12) {
    const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + d)
    const f = lp(2600); f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + d)
    osc('triangle', hz(m), t, d).connect(f); const s = ctx.createGain(); s.gain.value = 0.35; osc('sawtooth', hz(m), t, d, 4).connect(s).connect(f)
    f.connect(v); send(v)
  },
  bass(m, t, d, g = 0.09) { const v = ctx.createGain(); env(v, t, 0.01, g, d, 0.06); const f = lp(700, 2); osc('sawtooth', hz(m), t, d).connect(f).connect(v); send(v, false) },
  lead(m, t, d, g = 0.04) { const v = ctx.createGain(); env(v, t, 0.01, g, d, 0.1); const f = lp(3200); osc('square', hz(m), t, d, -6).connect(f); osc('square', hz(m), t, d, 6).connect(f); f.connect(v); send(v) },
  timp(m, t, g = 0.4, d = 1.4) {
    const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t + d)
    const o = osc('sine', hz(m), t, d); o.frequency.exponentialRampToValueAtTime(hz(m) * 0.92, t + 0.4); o.connect(v); send(v)
    const n = noiseSrc(t, 0.08), nv = ctx.createGain(); nv.gain.setValueAtTime(g * 0.5, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); n.connect(lp(400)).connect(nv); send(nv)
  },
  roll(m, t, d, g0 = 0.04, g1 = 0.3) { const n = Math.floor(d / 0.055); for (let i = 0; i < n; i++) I.timp(m, t + i * 0.055, g0 + (g1 - g0) * (i / n), 0.35) },
  kick(t, g = 0.5) { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); const o = osc('sine', 140, t, 0.32); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); o.connect(v); send(v, false) },
  snare(t, g = 0.18, d = 0.16) {
    const n = noiseSrc(t, d), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.6
    const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(f).connect(v); send(v)
    const b = ctx.createGain(); b.gain.setValueAtTime(g * 0.6, t); b.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); osc('triangle', 185, t, 0.1).connect(b); send(b, false)
  },
  hat(t, g = 0.05, open = false) { const d = open ? 0.28 : 0.05; const n = noiseSrc(t, d), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(f).connect(v); send(v, false) },
  crash(t, g = 0.14, d = 2.6) { const n = noiseSrc(t, d), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200; const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(f).connect(v); send(v) },
  riser(t, d, g = 0.08) { const n = noiseSrc(t, d), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + d); const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + d); v.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05); n.connect(f).connect(v); send(v) },
  taiko(t, g = 0.55) { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); const o = osc('sine', 75, t, 0.9); o.frequency.exponentialRampToValueAtTime(48, t + 0.3); o.connect(v); send(v); const n = noiseSrc(t, 0.12), nv = ctx.createGain(); nv.gain.setValueAtTime(g * 0.5, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.connect(lp(260)).connect(nv); send(nv) },
  dum(t, g = 0.45) { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); const o = osc('sine', 95, t, 0.5); o.frequency.exponentialRampToValueAtTime(70, t + 0.25); o.connect(v); send(v) },
  tak(t, g = 0.16) { I.hat(t, g * 0.8); const n = noiseSrc(t, 0.18), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 9000; const v = ctx.createGain(); v.gain.setValueAtTime(g * 0.5, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); n.connect(f).connect(v); send(v) },
}
const chord = (inst, ms, t, d, g) => (CLEAN ? thin(ms) : ms).forEach((m) => I[inst](m, t, d, g))
// ---------- The new title tunes ----------
// Each tune: bpm, length in beats, and a score written in beats.
const TUNES = [
  { id: 'amethyst', theme: 'Royal Amethyst', name: 'Coronation', sw: 'linear-gradient(90deg,#3c1b72,#f5cd72)', bpm: 108, beats: 15,
    about: 'A royal fanfare in D major: timpani roll, trumpets over horns, a marching snare and a glockenspiel crown at the end.', tags: ['Trumpets', 'Horns', 'Timpani', 'Snare', 'Glockenspiel'],
    score(b) {
      I.roll(38, b(0), b(2), 0.03, 0.3); I.crash(b(2), 0.1)
      ;[[2,62,.5],[2.5,66,.5],[3,69,1],[4,74,1.5],[5.5,73,.5],[6,71,.5],[6.5,69,.5],[7,71,1],[8,74,.5],[8.5,76,.5],[9,78,1],[10,76,.5],[10.5,73,.5],[11,74,3.5]].forEach(([s,m,d]) => { I.brass(m, b(s), b(d) * 0.95, 0.045); I.brass(m - 12, b(s), b(d) * 0.95, 0.02) })
      const H = [[2,[50,57,62,66],2],[4,[47,54,59,62],2],[6,[55,59,62,67],1],[7,[57,61,64,69],1],[8,[54,57,62,66],2],[10,[57,61,64,67],1],[11,[50,57,62,66,69],4]]
      H.forEach(([s,ms,d]) => { chord('horn', ms, b(s), b(d), 0.018); chord('strings', ms.map((m) => m + 12), b(s), b(d), 0.012) })
      ;[[2,38],[4,45],[6,38],[7,45],[8,38],[10,45]].forEach(([s,m]) => I.timp(m, b(s), 0.4))
      I.roll(45, b(10.5), b(0.5), 0.1, 0.35); I.timp(38, b(11), 0.6, 2.4); I.crash(b(11), 0.16, 3.2)
      for (let s = 2; s < 11; s++) { I.snare(b(s), 0.09); if (s % 2) { I.snare(b(s + 0.75), 0.05) } }
      ;[86, 90, 93, 98].forEach((m, i) => I.bell(m, b(11 + i * 0.25), 2, 0.05))
    } },
  { id: 'emerald', theme: 'Emerald Oasis', name: 'Oasis at Dusk', sw: 'linear-gradient(90deg,#105a4a,#e9c47f)', bpm: 150, beats: 30,
    about: 'A sweeping, lilting theme in D Dorian: harp runs, warm horns and lush strings, landing on a bright D major chord.', tags: ['Harp', 'Horns', 'Strings', 'Timpani', 'Shaker'],
    score(b) {
      ;[50,57,62,65,69,74].forEach((m, i) => I.pluck(m, b(i), 1.4, 0.1))
      const mel = [[6,69,2],[8,74,1],[9,76,2],[11,77,1],[12,76,3],[15,74,1.5],[16.5,72,1.5],[18,74,2],[20,69,1],[21,73,3],[24,78,6]]
      mel.forEach(([s,m,d]) => { I.horn(m, b(s), b(d), 0.05); I.strings(m + 12, b(s), b(d), 0.012) })
      const H = [[6,[50,57,62,65],6],[12,[48,55,60,64],6],[18,[46,53,58,62],3],[21,[45,52,57,61],3],[24,[50,57,62,66,69],7]]
      H.forEach(([s,ms,d]) => { chord('strings', ms, b(s), b(d), 0.016); ms.forEach((m, i) => I.pluck(m + 12, b(s + i * 0.5), 1.2, 0.05)) })
      for (let s = 6; s < 24; s++) I.hat(b(s), s % 3 ? 0.02 : 0.035)
      ;[6,12,18].forEach((s) => I.timp(38, b(s), 0.25))
      I.roll(45, b(22), b(2), 0.04, 0.3); I.timp(38, b(24), 0.55, 2.5); I.crash(b(24), 0.12, 3)
      chord('brass', [50,57,62,66], b(24), b(6), 0.025)
      ;[74,78,81,86,90,93].forEach((m, i) => I.pluck(m, b(24 + i * 0.4), 1.6, 0.06))
    } },
  { id: 'neon', theme: 'Neon Circuit', name: 'Grid Run', sw: 'linear-gradient(90deg,#14164a,#2ef2ff 60%,#ff3fd8)', bpm: 124, beats: 21,
    about: 'An electronic game-show opener in E minor: four-on-the-floor kick, a pulsing saw bass, synth brass stabs and a lead that builds to a riser and a big drop.', tags: ['Synth brass', 'Saw bass', 'Lead synth', 'Kick', 'Riser'],
    score(b) {
      const roots = [40, 36, 38, 35], ch = [[64,67,71],[64,67,72],[66,69,74],[63,66,71]]
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4
        for (let k = 0; k < 4; k++) { I.kick(b(o + k), 0.45); I.hat(b(o + k + 0.5), 0.05); if (bar && (k === 1 || k === 3)) I.snare(b(o + k), 0.12) }
        for (let e = 0; e < 8; e++) I.bass(roots[bar] + (e % 2 ? 12 : 0), b(o + e * 0.5), b(0.45), 0.07)
        ;[0, 1.5, 3].forEach((s) => chord('brass', ch[bar], b(o + s), b(0.45), 0.022))
      }
      ;[[4,71,.5],[4.5,76,.5],[5,79,1],[6,78,.5],[6.5,76,.5],[7,74,1],[8,76,.5],[8.5,79,.5],[9,83,1.5],[10.5,81,.5],[11,79,1],[12,78,1],[13,79,.5],[13.5,78,.5],[14,75,2]].forEach(([s,m,d]) => I.lead(m, b(s), b(d) * 0.9, 0.035))
      I.riser(b(12), b(4), 0.1)
      I.kick(b(16), 0.7); I.crash(b(16), 0.16, 3)
      chord('brass', [52,59,64,66,67,71,76], b(16), b(4), 0.022); chord('strings', [64,71,76,79], b(16), b(5), 0.014)
      ;[88,91,95,100].forEach((m, i) => I.bell(m, b(16 + i * 0.25), 1.6, 0.05))
      for (let e = 0; e < 8; e++) I.bass(40, b(16 + e * 0.5), b(0.45), 0.06 * (1 - e / 9))
    } },
  { id: 'onyx', theme: 'Black & Gold', name: 'Gatsby Gold', sw: 'linear-gradient(90deg,#050403 40%,#f2cd6b)', bpm: 144, beats: 16,
    about: 'A swinging big-band opener in B-flat: walking bass, brush ride, shout chords from the horn section and a shimmering final chord.', tags: ['Big-band brass', 'Walking bass', 'Ride', 'Snare fill'],
    score(b) {
      const sw = (x) => (x % 1 === 0.5 ? Math.floor(x) + 0.66 : x)
      const walk = [46,50,53,55, 51,55,58,56, 53,57,60,58]
      walk.forEach((m, i) => I.bass(m - 12, b(i), b(0.9), 0.09))
      for (let i = 0; i < 12; i++) { I.hat(b(i), 0.05, true); if (i % 2) I.hat(b(i + 0.66), 0.035) }
      const stab = [[58,62,65,67],[55,58,62,65],[57,60,63,65]]
      for (let bar = 0; bar < 3; bar++) [1.66, 3].forEach((s) => chord('brass', stab[bar], b(bar * 4 + s), b(0.3), 0.022))
      ;[[0,65,.66],[0.66,67,.34],[1,70,1],[2,74,.66],[2.66,72,1.34],[4,70,.66],[4.66,67,.34],[5,70,.66],[5.66,72,.34],[6,75,2],[8,74,.66],[8.66,72,.34],[9,69,.66],[9.66,72,.34],[10,74,.66],[10.66,77,1.2]].forEach(([s,m,d]) => I.brass(m, b(s), b(d) * 0.92, 0.045, 3400))
      for (let k = 0; k < 8; k++) I.snare(b(11 + k * 0.125), 0.05 + k * 0.012)
      chord('brass', [46,58,62,65,67,69,72,74], b(12), b(3.5), 0.02); I.crash(b(12), 0.15, 3); I.kick(b(12), 0.5)
      ;[82,86,89,94].forEach((m, i) => I.bell(m, b(12.2 + i * 0.2), 1.6, 0.045))
    } },
  { id: 'rivals', theme: 'Red vs Blue', name: 'Face-Off', sw: 'linear-gradient(90deg,#ff3d5a,#14287a)', bpm: 138, beats: 16,
    about: 'A sports-broadcast showdown: high trumpets call, low trombones answer, both teams climb together, and it lands on a victory chord.', tags: ['Trumpets vs trombones', 'Drums', 'Timpani', 'Crash'],
    score(b) {
      for (let s = 0; s < 12; s++) { I.kick(b(s), s % 2 ? 0.3 : 0.5); if (s % 2) I.snare(b(s), 0.12); for (let q = 0; q < 4; q++) I.hat(b(s + q * 0.25), q ? 0.02 : 0.04) }
      ;[[0,67,.5],[0.5,72,.5],[1,75,.5],[1.5,79,1.5]].forEach(([s,m,d]) => I.brass(m, b(s), b(d), 0.05, 3600))
      chord('horn', [48,55,60,63], b(0), b(3.5), 0.016)
      ;[[4,43,.5],[4.5,48,.5],[5,51,.5],[5.5,55,1.5]].forEach(([s,m,d]) => { I.brass(m, b(s), b(d), 0.06, 1500); I.brass(m + 12, b(s), b(d), 0.025, 1500) })
      chord('horn', [44,51,56,60], b(4), b(3.5), 0.016)
      ;[70,72,74,75,77,79,80,83].forEach((m, i) => { I.brass(m, b(8 + i * 0.5), b(0.45), 0.045, 3600); I.brass(m - 24, b(8 + i * 0.5), b(0.45), 0.04, 1500) })
      I.roll(43, b(10), b(2), 0.05, 0.35)
      chord('brass', [48,55,60,64,67,72,76], b(12), b(3.5), 0.024); I.timp(36, b(12), 0.6, 2.4); I.crash(b(12), 0.18, 3)
    } },
  { id: 'ember', theme: 'Molten Ember', name: 'Inferno', sw: 'linear-gradient(90deg,#6e1322,#ffb64a)', bpm: 96, beats: 16,
    about: 'Dramatic and fiery in D minor: taiko drums, a growling low-brass ostinato, trembling strings and a horn line that rises into a blazing final chord.', tags: ['Taiko', 'Low brass', 'Tremolo strings', 'Horns', 'Riser'],
    score(b) {
      for (let bar = 0; bar < 3; bar++) {
        const o = bar * 4
        ;[[0,0.55],[1.5,0.3],[2,0.45],[3,0.3],[3.5,0.35]].forEach(([s,g]) => I.taiko(b(o + s), g))
        ;[[0,38,1.5],[1.5,38,.5],[2,41,1],[3,40,1]].forEach(([s,m,d]) => I.brass(m, b(o + s), b(d) * 0.9, 0.05, 900))
        chord('strings', bar < 2 ? [50,53,57] : [46,50,53], b(o), b(4), 0.016, 11)
      }
      ;[[4,62,1],[5,65,1],[6,69,1.5],[7.5,70,.5],[8,69,1],[9,67,.5],[9.5,65,.5],[10,64,1],[11,61,1]].forEach(([s,m,d]) => { I.horn(m, b(s), b(d), 0.055); I.horn(m - 12, b(s), b(d), 0.025) })
      I.riser(b(10), b(2), 0.1); I.roll(38, b(10.5), b(1.5), 0.05, 0.35)
      chord('brass', [38,50,57,62,65,69,74], b(12), b(3.5), 0.024); I.taiko(b(12), 0.8); I.crash(b(12), 0.16, 3.2)
      chord('strings', [62,65,69,74], b(12), b(4), 0.016, 11)
      I.bell(86, b(12.1), 2, 0.05)
    } },
  { id: 'heritage', theme: 'Heritage', name: 'Najdi Majesty', sw: 'linear-gradient(90deg,#0f5257,#e5b95e)', bpm: 100, beats: 16,
    about: 'Maqam Hijaz on D: a daff frame drum in maqsum rhythm, an oud melody, then strings and brass take it up an octave to a regal close.', tags: ['Daff', 'Oud', 'Strings', 'Brass', 'Timpani'],
    score(b) {
      for (let bar = 0; bar < 3; bar++) { const o = bar * 4; I.dum(b(o)); I.tak(b(o + 0.5)); I.tak(b(o + 1.5)); I.dum(b(o + 2), 0.35); I.tak(b(o + 3)); I.tak(b(o + 3.5), 0.1) }
      ;[[0,62,.5],[0.5,63,.5],[1,66,.5],[1.5,67,.5],[2,69,1],[3,70,.5],[3.5,69,.5],[4,67,.5],[4.5,66,.5],[5,67,.5],[5.5,66,.5],[6,63,1],[7,62,1]].forEach(([s,m,d]) => { I.pluck(m, b(s), 0.9, 0.13); I.pluck(m - 12, b(s), 0.7, 0.05) })
      ;[[0,[50,57,62],4],[4,[55,58,62],2],[6,[50,54,57],2],[8,[48,51,55],2],[10,[50,54,57,60],2]].forEach(([s,ms,d]) => chord('strings', ms, b(s), b(d), 0.014))
      ;[[8,74,1],[9,75,.5],[9.5,78,.5],[10,79,1],[11,81,1]].forEach(([s,m,d]) => { I.strings(m, b(s), b(d), 0.03); I.horn(m - 12, b(s), b(d), 0.04) })
      I.roll(38, b(11), b(1), 0.05, 0.35)
      chord('brass', [38,50,57,62,66,69,74], b(12), b(3.5), 0.022); chord('strings', [62,66,69,74], b(12), b(4), 0.016)
      I.timp(38, b(12), 0.6, 2.4); I.dum(b(12), 0.6); I.crash(b(12), 0.12, 3)
      I.pluck(75, b(13.5), 1, 0.08); I.pluck(74, b(14), 1.6, 0.1)
    } },
]
// ---------- Set B: punchier and cleaner ----------
// Fewer instruments at once, short "button" endings (stabs, not a long held chord) and a key change for lift.
I.stab = (ms, t, d = 0.16, g = 0.04, bright = 3400) => ms.forEach((m) => {
  const f = lp(bright, 1); const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.012); v.gain.setValueAtTime(g, t + d * 0.6); v.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08)
  osc('sawtooth', hz(m), t, d, -6).connect(f); osc('sawtooth', hz(m), t, d, 6).connect(f); f.connect(v); send(v)
})
I.clap = (t, g = 0.1) => [0, 0.012, 0.024].forEach((o) => { const n = noiseSrc(t + o, 0.12), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.8; const v = ctx.createGain(); v.gain.setValueAtTime(g, t + o); v.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.1); n.connect(f).connect(v); send(v) })
I.mallet = (m, t, g = 0.08) => { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); osc('sine', hz(m), t, 0.35).connect(v); send(v); const v2 = ctx.createGain(); v2.gain.setValueAtTime(g * 0.3, t); v2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); osc('sine', hz(m) * 4, t, 0.08).connect(v2); send(v2, false) }
// The "da-da-DAAA" button: short tight chords, one cymbal, done.
function button(b, at, ms, low) {
  ;[0, 0.5].forEach((o) => { I.stab(ms, b(at + o), 0.12, 0.035); I.snare(b(at + o), 0.1); I.kick(b(at + o), 0.35) })
  I.stab(ms, b(at + 1), 0.5, 0.04); I.stab([low, low + 12], b(at + 1), 0.5, 0.05, 1500); I.kick(b(at + 1), 0.6); I.timp(low, b(at + 1), 0.4, 0.9); I.crash(b(at + 1), 0.1, 1.4)
}
function beat(b, from, to, { clap = true, hats = 0.5 } = {}) {
  for (let s = from; s < to; s++) { I.kick(b(s), s % 2 ? 0.32 : 0.48); if (s % 2) (clap ? I.clap(b(s), 0.08) : I.snare(b(s), 0.11)); for (let h = 0; h < 1; h += hats) I.hat(b(s + h), h ? 0.025 : 0.04) }
}
const B_TUNES = {
  amethyst: { name: 'Royal Jackpot', bpm: 128, beats: 16, about: 'Bright fanfare trumpets over a pop beat, a lift up a key, and a crisp three-hit finish.', score(b) {
    beat(b, 0, 12)
    const mot = [[0,74,.5],[0.5,74,.5],[1,69,.5],[1.5,74,1],[2.5,78,1.5],[4,76,.5],[4.5,78,.5],[5,79,.5],[5.5,81,2.5]]
    mot.forEach(([s,m,d]) => I.brass(m, b(s), b(d) * 0.85, 0.05, 3600))
    mot.forEach(([s,m,d]) => I.brass(m + 2, b(s + 8), b(d) * 0.85, 0.05, 3600))
    ;[[0,50],[2,47],[4,55],[6,57],[8,52],[10,49]].forEach(([s,m]) => { for (let e = 0; e < 4; e++) I.bass(m - 12 + (e % 2 ? 12 : 0), b(s + e * 0.5), b(0.4), 0.07) })
    ;[[0,[62,66,69]],[2,[59,62,66]],[4,[59,62,67]],[6,[61,64,69]],[8,[64,68,71]],[10,[61,64,68]]].forEach(([s,ms]) => [0.5, 1.5].forEach((o) => I.stab(ms, b(s + o), 0.12, 0.022)))
    button(b, 12, [64, 68, 71, 76], 40)
  } },
  emerald: { name: 'Golden Hour', bpm: 116, beats: 16, about: 'Sunny and upbeat: marimba riff, claps and shaker, a warm horn tune and a neat stab ending.', score(b) {
    beat(b, 0, 12, { hats: 0.25 })
    const riff = [69, 76, 73, 76, 69, 76, 74, 76]
    for (let bar = 0; bar < 3; bar++) riff.forEach((m, i) => I.mallet(m + (bar === 2 ? 2 : 0), b(bar * 4 + i * 0.5), 0.07))
    ;[[2,76,.5],[2.5,78,.5],[3,81,1],[4,80,.5],[4.5,78,.5],[5,76,1],[6,73,.5],[6.5,76,1.5],[10,80,.5],[10.5,83,1.5]].forEach(([s,m,d]) => I.horn(m - 12, b(s), b(d) * 0.9, 0.06))
    ;[[0,45],[4,42],[8,47]].forEach(([s,m]) => { for (let e = 0; e < 8; e++) I.bass(m + (e % 4 === 3 ? 7 : 0), b(s + e * 0.5), b(0.35), 0.07) })
    button(b, 12, [71, 75, 78, 83], 35)
  } },
  neon: { name: 'Prize Drop', bpm: 128, beats: 16, about: 'Arcade-bright synths: a bouncing arpeggio, sidechain-style bass, a quick riser and a laser-zap finish.', score(b) {
    for (let s = 0; s < 12; s++) { I.kick(b(s), 0.5); I.hat(b(s + 0.5), 0.05); if (s % 2) I.clap(b(s), 0.08) }
    const arp = [[64,67,71,76],[60,64,67,72],[62,66,69,74]]
    for (let bar = 0; bar < 3; bar++) for (let e = 0; e < 16; e++) I.lead(arp[bar][e % 4] + 12, b(bar * 4 + e * 0.25), b(0.2), 0.022)
    ;[40, 36, 38].forEach((m, bar) => { for (let e = 0; e < 8; e++) I.bass(m, b(bar * 4 + e * 0.5 + 0.25), b(0.22), 0.08) })
    ;[[4,79,1],[5,78,.5],[5.5,76,.5],[6,74,1],[7,71,1],[8,76,.5],[8.5,79,.5],[9,83,2]].forEach(([s,m,d]) => I.brass(m, b(s), b(d) * 0.9, 0.035, 4200))
    I.riser(b(10), b(2), 0.08)
    button(b, 12, [64, 67, 71, 76], 40)
    const z = ctx.createGain(); z.gain.setValueAtTime(0.05, b(13.1)); z.gain.exponentialRampToValueAtTime(0.0001, b(13.1) + 0.5); const o = osc('square', 2400, b(13.1), 0.5); o.frequency.exponentialRampToValueAtTime(120, b(13.1) + 0.5); o.connect(lp(4000)).connect(z); send(z)
  } },
  onyx: { name: 'Showtime', bpm: 168, beats: 16, about: 'A fast Las Vegas big-band shout: walking bass, swing ride, punchy horn section and a classic "bah-DAH!" button.', score(b) {
    const walk = [46,50,53,55, 51,55,58,56, 53,57,60,58]
    walk.forEach((m, i) => I.pluck(m - 12, b(i), 0.4, 0.14))
    for (let i = 0; i < 12; i++) { I.hat(b(i), 0.04, true); if (i % 2) { I.hat(b(i + 0.66), 0.03); I.snare(b(i), 0.05) } }
    ;[[0,[58,62,65]],[4,[55,58,63]],[8,[57,60,63]]].forEach(([s,ms]) => [1.66, 3].forEach((o) => I.stab(ms, b(s + o), 0.14, 0.03)))
    ;[[0,70,.66],[0.66,72,.34],[1,74,.66],[1.66,77,1.34],[4,75,.66],[4.66,77,.34],[5,79,.66],[5.66,82,1.34],[8,81,.66],[8.66,79,.34],[9,77,.66],[9.66,74,.34],[10,77,1]].forEach(([s,m,d]) => I.brass(m, b(s), b(d) * 0.85, 0.045, 3800))
    I.stab([58, 62, 65, 69], b(13), 0.12, 0.035); I.snare(b(13), 0.12)
    I.stab([58, 62, 65, 70], b(13.66), 0.5, 0.04); I.stab([34, 46], b(13.66), 0.5, 0.05, 1500); I.kick(b(13.66), 0.6); I.crash(b(13.66), 0.1, 1.4)
  } },
  rivals: { name: 'Game On', bpm: 136, beats: 16, about: 'A drumline cadence, red and blue horns trading hits back and forth, then all together for a four-hit finish.', score(b) {
    for (let s = 0; s < 12; s++) { for (let q = 0; q < 4; q++) I.snare(b(s + q * 0.25), q ? 0.03 : 0.08, 0.06); if (s % 2 === 0) I.kick(b(s), 0.45) }
    for (let k = 0; k < 6; k++) { const hi = k % 2 === 0; I.stab(hi ? [72, 76, 79] : [48, 52, 55], b(k * 1.5), 0.25, hi ? 0.035 : 0.05, hi ? 3600 : 1600) }
    ;[[9,67],[9.5,69],[10,71],[10.5,72],[11,74],[11.5,76]].forEach(([s,m]) => { I.brass(m, b(s), b(0.4), 0.045, 3600); I.brass(m - 24, b(s), b(0.4), 0.04, 1500) })
    ;[0, 0.5, 1].forEach((o) => { I.stab([67, 72, 76], b(12 + o), 0.12, 0.035); I.snare(b(12 + o), 0.12); I.kick(b(12 + o), 0.4) })
    I.stab([67, 72, 76, 79], b(13.5), 0.5, 0.04); I.stab([36, 48], b(13.5), 0.5, 0.05, 1500); I.timp(36, b(13.5), 0.45, 1); I.crash(b(13.5), 0.1, 1.4)
  } },
  ember: { name: 'Hot Seat', bpm: 120, beats: 16, about: 'Driving and fiery: chugging low brass, taiko on the beat, a hot horn riff and two hard hits to finish.', score(b) {
    for (let s = 0; s < 12; s++) { I.taiko(b(s), s % 2 ? 0.25 : 0.45); if (s % 2) I.snare(b(s), 0.1); for (let e = 0; e < 2; e++) I.brass([38, 38, 41, 40][Math.floor(s / 3) % 4], b(s + e * 0.5), b(0.35), 0.04, 900) }
    ;[[2,74,.5],[2.5,72,.5],[3,74,1],[4,77,.5],[4.5,76,.5],[5,74,.5],[5.5,72,.5],[6,69,2],[8,74,.5],[8.5,77,.5],[9,81,1],[10,80,.5],[10.5,77,.5],[11,76,1]].forEach(([s,m,d]) => I.horn(m - 12, b(s), b(d) * 0.9, 0.06))
    I.stab([50, 57, 62], b(12), 0.2, 0.04, 2000); I.taiko(b(12), 0.6)
    I.stab([50, 57, 62, 65], b(13), 0.6, 0.045, 2200); I.stab([38], b(13), 0.6, 0.06, 900); I.taiko(b(13), 0.8); I.crash(b(13), 0.1, 1.4)
  } },
  heritage: { name: 'Majlis Night', bpm: 112, beats: 16, about: 'Gulf-style hand claps and daff, a lively oud riff in maqam Hijaz, strings in unison and three clean unison hits.', score(b) {
    for (let bar = 0; bar < 3; bar++) { const o = bar * 4; I.dum(b(o)); I.tak(b(o + 0.5)); I.tak(b(o + 1.5)); I.dum(b(o + 2), 0.35); I.tak(b(o + 3)); I.tak(b(o + 3.5), 0.1); [1, 3].forEach((c) => I.clap(b(o + c), 0.09)); I.clap(b(o + 3.5), 0.06) }
    const riff = [[0,62,.5],[0.5,63,.25],[0.75,66,.25],[1,67,.5],[1.5,69,.5],[2,70,.5],[2.5,69,.5],[3,66,.5],[3.5,63,.5]]
    riff.forEach(([s,m,d]) => I.pluck(m, b(s), 0.6, 0.13))
    riff.forEach(([s,m,d]) => I.pluck(m, b(s + 4), 0.6, 0.13))
    riff.forEach(([s,m,d]) => { I.pluck(m + 12, b(s + 8), 0.6, 0.1); I.strings(m + 12, b(s + 8), b(d) * 0.9, 0.02) })
    ;[0, 0.5].forEach((o) => { [50, 62, 74].forEach((m) => I.pluck(m, b(12 + o), 0.4, 0.12)); I.dum(b(12 + o), 0.45); I.clap(b(12 + o), 0.1) })
    ;[50, 62, 74].forEach((m) => { I.pluck(m, b(13), 1.4, 0.14); I.strings(m, b(13), 0.7, 0.02) }); I.stab([38, 50], b(13), 0.5, 0.05, 1300); I.dum(b(13), 0.7); I.timp(38, b(13), 0.4, 1); I.crash(b(13), 0.08, 1.2)
  } },
}
// ---------- Set C: the Set B tunes played with a gentle instrument set ----------
// The harshness came from buzzy sawtooth stacks, white-noise cymbals and close clashing notes.
// Clean mode swaps those for rounded tones, drops the noise cymbals and thins chords to plain triads.
let CLEAN = false
const RAW = { ...I }
function thin(ms) { const keep = []; for (const m of [...ms].sort((a, b) => a - b)) { if (keep.every((k) => { const d = Math.abs(m - k) % 12; return d > 2 && d < 10 })) keep.push(m) } return keep.slice(0, 4) }
function soft(m, t, d, g, bright = 1800, attack = 0.03) {
  const v = ctx.createGain(); env(v, t, attack, g, d, 0.12)
  const f = lp(bright, 0.5)
  const o1 = osc('triangle', hz(m), t, d); o1.connect(f)
  const h = ctx.createGain(); h.gain.value = 0.25; osc('sine', hz(m) * 2, t, d).connect(h).connect(f)
  const vib = osc('sine', 5.2, t, d); const vg = ctx.createGain(); vg.gain.value = 3; vib.connect(vg).connect(o1.detune)
  f.connect(v); send(v)
}
const CLEAN_I = {
  brass: (m, t, d, g = 0.05, bright = 2800) => soft(m, t, d, g * 1.6, Math.min(2400, bright * 0.7)),
  horn: (m, t, d, g = 0.05) => soft(m, t, d, g * 1.6, 1200, 0.05),
  strings: (m, t, d, g = 0.03) => soft(m, t, d, g * 1.4, 1500, 0.2),
  lead: (m, t, d, g = 0.04) => soft(m, t, d, g * 1.8, 2600, 0.01),
  bass: (m, t, d, g = 0.09) => { const v = ctx.createGain(); env(v, t, 0.01, g * 1.4, d, 0.06); osc('triangle', hz(m), t, d).connect(v); send(v, false) },
  stab: (ms, t, d = 0.16, g = 0.04) => thin(ms).forEach((m) => soft(m, t, d, g * 1.5, 2200, 0.01)),
  crash: (t, g = 0.14) => [96, 100, 103].forEach((m, i) => RAW.bell(m, t + i * 0.06, 1.2, g * 0.25)),
  riser: (t, d, g = 0.08) => { for (let i = 0; i < 8; i++) RAW.bell(72 + i * 2, t + (d * i) / 8, 0.4, 0.02 + i * 0.004) },
  hat: (t, g = 0.05, open = false) => RAW.hat(t, g * 0.5, false),
  clap: (t, g = 0.1) => RAW.clap(t, g * 0.6),
  snare: (t, g = 0.18, d = 0.16) => RAW.snare(t, g * 0.6, Math.min(d, 0.12)),
  tak: (t, g = 0.16) => RAW.tak(t, g * 0.6),
}
const chordRaw = chord
function withClean(on, fn) { CLEAN = on; Object.assign(I, on ? CLEAN_I : RAW); try { return fn() } finally { Object.assign(I, RAW); CLEAN = false } }

// ---------- Set D: real orchestra recordings ----------
// Short recorded notes (free sample libraries) are pitched to each note. Few instruments play at once,
// chords are kept to three open notes, and there are no cymbals, so nothing smears into noise.
const MAN = {"horn": [46, 50, 53, 57, 60, 74, 77], "tbn": [46, 50, 53, 60, 63, 65], "tuba": [34, 39, 41, 46, 50], "vln": [55, 57, 59, 62, 66, 69, 72, 76, 79, 83, 86], "vc": [36, 43, 50, 57, 60, 64, 67], "spic": [36, 43, 50, 53, 57, 60], "timp": [42, 49], "bd": [36], "wood": [72], "clave": [84], "tpt": [53, 57, 63, 65, 67, 74, 77, 81, 84], "xyl": [67, 72, 79, 84, 91, 96], "harp": [48, 52, 55, 59, 62, 65, 69, 72, 76, 79, 83, 86], "pno": [36, 42, 48, 54, 60, 66, 72, 78, 84]}
const GAIN = { tpt: 0.3, horn: 0.3, tbn: 0.28, tuba: 0.36, vln: 0.2, vc: 0.26, spic: 0.3, timp: 0.5, bd: 0.45, wood: 0.14, clave: 0.12, xyl: 0.16, harp: 0.28, pno: 0.22 }
const RING = new Set(['timp', 'bd', 'wood', 'clave', 'xyl', 'harp', 'pno', 'spic'])
const RAWBUF = {}, BUF = {}
let hall = null
function hallVerb() {
  // A smooth, dark hall: filtered noise that decays over about two seconds.
  if (hall) return hall
  hall = ctx.createConvolver()
  const len = Math.floor(ctx.sampleRate * 2.2), buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let y = 0; for (let i = 0; i < len; i++) { y += 0.18 * ((Math.random() * 2 - 1) - y); d[i] = y * Math.pow(1 - i / len, 3) * 2.2 } }
  hall.buffer = buf
  const g = ctx.createGain(); g.gain.value = 0.5; hall.connect(g).connect(master)
  return hall
}
/** Play one recorded note. d = how long to hold it (omit to let it ring), rel = release time. */
function R(inst, m, t, d, g = 1, rel = 0.16) {
  const ms = MAN[inst]; let near = ms[0]; for (const x of ms) if (Math.abs(x - m) < Math.abs(near - m)) near = x
  const buf = BUF[`${inst}_${near}`]; if (!buf) return
  const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = Math.pow(2, (m - near) / 12)
  const v = ctx.createGain(); const peak = GAIN[inst] * g
  v.gain.setValueAtTime(peak, t)
  src.connect(v); send(v); src.start(t)
  if (d != null && !(RING.has(inst) && rel === 0.16)) { v.gain.setValueAtTime(peak, t + d); v.gain.exponentialRampToValueAtTime(0.0001, t + d + rel); src.stop(t + d + rel + 0.05) }
}
const RC = (inst, ms, t, d, g, rel) => ms.forEach((m) => R(inst, m, t, d, g, rel))
const line = (inst, notes, b, g = 1, sh = 0, legato = 0.92) => notes.forEach(([s, m, d]) => R(inst, m + sh, b(s), (b(s + d) - b(s)) * legato, g))

const D_TUNES = {
  amethyst: { name: 'Crown Fanfare', bpm: 112, beats: 15, about: 'A real brass fanfare in D major: trumpets over three horns, tuba bass and timpani, with violins joining for the final chord.', score(b) {
    for (let i = 0; i < 6; i++) R('timp', 45, b(i * 0.25), null, 0.25 + i * 0.06)
    R('timp', 38, b(1.5), null, 0.8)
    line('tpt', [[1.5,69,.5],[2,74,1],[3,74,.5],[3.5,76,.5],[4,78,1.5],[5.5,76,.5],[6,74,.5],[6.5,76,.5],[7,78,.5],[7.5,81,1.5],[9,79,.5],[9.5,78,.5],[10,76,.5],[10.5,73,.5]], b)
    R('tpt', 74, b(11), b(14) - b(11), 1.1, 1.4)
    const H = [[2,[62,66,69],2,38],[4,[62,67,71],2,43],[6,[62,66,69],1.5,42],[7.5,[61,64,69],1.5,45],[9,[62,67,71],1,43],[10,[61,64,67],1,45]]
    H.forEach(([s, ms, d, bass]) => { RC('horn', ms, b(s), (b(s + d) - b(s)) * 0.95, 0.42); R('tuba', bass, b(s), (b(s + d) - b(s)) * 0.9, 0.9) })
    ;[[4,43],[6,42],[7.5,45],[9,43],[10,45]].forEach(([s, m]) => R('timp', m, b(s), null, 0.5))
    for (let i = 0; i < 4; i++) R('timp', 45, b(10.5 + i * 0.125), null, 0.3 + i * 0.08)
    RC('horn', [62, 66, 69], b(11), b(14) - b(11), 0.45, 1.4); R('tuba', 38, b(11), b(14) - b(11), 1, 1.4)
    RC('vln', [74, 78, 81], b(11), b(14) - b(11), 0.75, 1.6)
    R('timp', 38, b(11), null, 1)
  } },
  emerald: { name: 'Oasis Sunrise', bpm: 100, beats: 16, about: 'Harp arpeggios and singing violins over cellos, from a soft minor opening to a warm major sunrise ending.', score(b) {
    const ch = [[0,[50,57,62,65,69,74],38],[2,[48,55,60,64,67,72],36],[4,[46,53,58,62,65,70],34],[6,[45,52,57,61,64,69],33],[8,[50,57,62,65,69,74],38],[10,[46,53,58,62,65,70],34],[11,[45,52,57,61,64,69],33]]
    ch.forEach(([s, arp, bass], k) => { const n = k >= 5 ? 3 : 6; for (let i = 0; i < n; i++) R('harp', arp[i], b(s + i * (k >= 5 ? 0.33 : 0.33)), null, 0.8); R('vc', bass + 12, b(s), (b(s + (k >= 5 ? 1 : 2)) - b(s)) * 0.97, 0.9, 0.3) })
    line('vln', [[1,69,1],[2,67,.5],[2.5,69,.5],[3,72,1],[4,70,1.5],[5.5,69,.5],[6,67,1],[7,64,1],[8,65,.5],[8.5,67,.5],[9,69,1],[10,74,1],[11,73,1]], b, 1, 0, 0.98)
    line('horn', [[8,57,2],[10,58,1],[11,57,1]], b, 0.5, 0, 0.97)
    ;[0, 4, 8].forEach((s) => R('timp', 38, b(s), null, 0.35))
    ;[50, 54, 57, 62, 66, 69, 74, 78, 81, 86].forEach((m, i) => R('harp', m, b(12 + i * 0.09), null, 0.75))
    R('vln', 74, b(12), b(15.5) - b(12), 1, 1.5); RC('horn', [57, 62, 66], b(12), b(15.5) - b(12), 0.42, 1.5); R('vc', 38, b(12), b(15.5) - b(12), 1, 1.5)
    R('timp', 38, b(12), null, 0.7)
  } },
  neon: { name: 'Power Up', bpm: 124, beats: 15, about: 'Driving cello spiccato and a sparkling xylophone, a bright trumpet hook over a steady bass drum, then a crisp two-hit finish.', score(b) {
    const ch = [[0,40,[76,79,83,88]],[2,36,[72,76,79,84]],[4,38,[74,78,81,86]],[6,35,[75,78,83,87]],[8,40,[76,79,83,88]],[10,36,[72,76,79,84]]]
    ch.forEach(([s, root, arp]) => { for (let e = 0; e < 4; e++) { R('spic', root + (e % 2 ? 12 : 0), b(s + e * 0.5), null, 0.85); R('xyl', arp[e], b(s + e * 0.5), null, 0.7) } })
    for (let s = 0; s < 12; s++) { R('bd', 36, b(s), null, s % 2 ? 0.6 : 0.85); R('wood', 72, b(s + 0.5), null, 0.7) }
    line('tpt', [[4,76,.5],[4.5,79,.5],[5,83,1],[6,81,.5],[6.5,78,.5],[7,75,1],[8,76,.5],[8.5,79,.5],[9,83,.5],[9.5,84,.5],[10,83,1],[11,79,1]], b)
    line('horn', [[4,64,2],[6,63,2],[8,64,2],[10,60,2]], b, 0.45, 0, 0.95)
    ;[12, 12.5].forEach((s) => { RC('tpt', [71, 76], b(s), b(0.3), 0.9, 0.08); R('spic', 40, b(s), null, 1); R('bd', 36, b(s), null, 0.9) })
    RC('tpt', [68, 76], b(13), b(14.5) - b(13), 0.95, 1.1); RC('horn', [56, 59, 64], b(13), b(14.5) - b(13), 0.5, 1.1); R('tuba', 40, b(13), b(14.5) - b(13), 1, 1.1)
    R('timp', 40, b(13), null, 0.9); R('bd', 36, b(13), null, 1); R('xyl', 88, b(13), null, 0.8)
  } },
  onyx: { name: 'Showtime', bpm: 152, beats: 16, about: 'Las Vegas big band with real players: walking bass, piano comping, a trumpet shout line with trombone answers and a "bah-DAH!" button.', score(b) {
    ;[46,50,53,55, 51,55,58,56, 53,57,60,58].forEach((m, i) => R('spic', m - 12, b(i), null, 0.95))
    ;[[0,[62,65,67]],[4,[63,67,70]],[8,[63,65,69]]].forEach(([s, ms]) => [1, 3].forEach((o) => RC('pno', ms, b(s + o), b(0.4), 0.8, 0.12)))
    for (let i = 0; i < 12; i++) R('clave', 84, b(i + (i % 2 ? 0.66 : 0)), null, i % 2 ? 0.6 : 0.4)
    line('tpt', [[0,70,.66],[0.66,72,.34],[1,74,.66],[1.66,77,1.34],[4,75,.66],[4.66,77,.34],[5,79,.66],[5.66,82,1.34],[8,81,.66],[8.66,79,.34],[9,77,.66],[9.66,74,.34],[10,77,1]], b, 1, 0, 0.85)
    ;[[2.66,[50,53,58]],[3,[50,53,58]],[6.66,[51,55,58]],[7,[51,55,58]],[11,[53,57,60]]].forEach(([s, ms], i) => RC('tbn', ms, b(s), b(i % 2 ? 0.6 : 0.25), 0.45, 0.08))
    RC('tpt', [70, 74], b(13), b(0.3), 0.9, 0.06); RC('tbn', [50, 58], b(13), b(0.3), 0.5, 0.06); R('bd', 36, b(13), null, 0.7)
    RC('tpt', [70, 74, 77], b(13.66), b(15) - b(13.66), 0.85, 1.1); RC('tbn', [50, 53, 58], b(13.66), b(15) - b(13.66), 0.5, 1.1); R('tuba', 34, b(13.66), b(15) - b(13.66), 1, 1.1)
    R('timp', 46, b(13.66), null, 0.9); R('bd', 36, b(13.66), null, 1)
  } },
  rivals: { name: 'Face-Off', bpm: 132, beats: 15, about: 'Red trumpets and blue trombones trade calls over timpani and bass drum, then climb together to a big C major finish.', score(b) {
    for (let s = 0; s < 12; s++) { R('bd', 36, b(s), null, s % 2 ? 0.55 : 0.8); R('wood', 72, b(s + 0.5), null, 0.6); R('wood', 72, b(s + 0.75), null, 0.4) }
    ;[[0,43],[2,36],[4,43],[6,38],[8,43],[10,43]].forEach(([s, m]) => R('timp', m, b(s), null, 0.55))
    line('tpt', [[0,72,.5],[0.5,76,.5],[1,79,1]], b); line('tbn', [[2,55,.5],[2.5,52,.5],[3,48,1]], b, 1.1)
    line('tpt', [[4,74,.5],[4.5,77,.5],[5,81,1]], b); line('tbn', [[6,57,.5],[6.5,53,.5],[7,50,1]], b, 1.1)
    const up = [[8,67,.5],[8.5,69,.5],[9,71,.5],[9.5,72,.5],[10,74,.5],[10.5,76,.5],[11,77,.5],[11.5,79,.5]]
    line('tpt', up, b, 0.9); line('tbn', up, b, 0.8, -12)
    ;[12, 12.5].forEach((s) => { RC('tpt', [72, 76], b(s), b(0.3), 0.9, 0.06); RC('tbn', [48, 55], b(s), b(0.3), 0.6, 0.06); R('bd', 36, b(s), null, 0.9) })
    RC('tpt', [72, 76, 79], b(13), b(14.5) - b(13), 0.85, 1.1); RC('tbn', [48, 55, 60], b(13), b(14.5) - b(13), 0.55, 1.1); R('tuba', 36, b(13), b(14.5) - b(13), 1, 1.1)
    R('timp', 36, b(13), null, 1); R('bd', 36, b(13), null, 1)
  } },
  ember: { name: 'Hot Seat', bpm: 120, beats: 15, about: 'Fiery and driving: chugging cello spiccato, low brass hits, timpani and bass drum, a bold horn tune and two hard hits to finish.', score(b) {
    const roots = [38, 38, 41, 40]
    for (let s = 0; s < 12; s++) { const r = roots[Math.floor(s / 3) % 4]; for (let e = 0; e < 2; e++) R('spic', r + (e ? 12 : 0), b(s + e * 0.5), null, e ? 0.7 : 1); R('bd', 36, b(s), null, s % 2 ? 0.55 : 0.85) }
    ;[0, 3, 6, 9].forEach((s, i) => { R('timp', roots[i] + 12 > 49 ? roots[i] : roots[i] + 12, b(s), null, 0.6); RC('tbn', [roots[i] + 12], b(s), b(0.35), 0.8, 0.08) })
    const mel = [[2,62,.5],[2.5,60,.5],[3,62,1],[4,65,.5],[4.5,64,.5],[5,62,.5],[5.5,60,.5],[6,57,2],[8,62,.5],[8.5,65,.5],[9,69,1],[10,68,.5],[10.5,65,.5],[11,64,1]]
    line('horn', mel, b, 1.1); line('horn', mel, b, 0.55, -12)
    RC('horn', [50, 57, 62], b(12), b(0.35), 0.8, 0.08); RC('tbn', [50], b(12), b(0.35), 0.8, 0.08); R('timp', 50, b(12), null, 0.7); R('bd', 36, b(12), null, 0.9)
    RC('horn', [57, 62, 65], b(13), b(14.5) - b(13), 0.7, 1.2); RC('tbn', [50], b(13), b(14.5) - b(13), 0.8, 1.2); R('tuba', 38, b(13), b(14.5) - b(13), 1, 1.2)
    R('timp', 38, b(13), null, 1); R('bd', 36, b(13), null, 1)
  } },
  heritage: { name: 'Majlis Night', bpm: 108, beats: 15, about: 'A lively riff in maqam Hijaz on harp (standing in for the oud), violins in unison, a cello drone, drum and woodblock, and three unison hits.', score(b) {
    for (let bar = 0; bar < 3; bar++) { const o = bar * 4; [[0,1],[2,0.7]].forEach(([s, g]) => R('bd', 36, b(o + s), null, g)); [0.5, 1.5, 3, 3.5].forEach((s) => R('wood', 72, b(o + s), null, s === 3.5 ? 0.5 : 0.8)); R('clave', 84, b(o + 1), null, 0.6); R('clave', 84, b(o + 3), null, 0.6) }
    R('vc', 50, b(0), b(12) - b(0), 0.6, 0.4); R('vc', 38, b(4), b(12) - b(4), 0.6, 0.4)
    const riff = [[0,62,.5],[0.5,63,.25],[0.75,66,.25],[1,67,.5],[1.5,69,.5],[2,70,.5],[2.5,69,.5],[3,66,.5],[3.5,63,.5]]
    riff.forEach(([s, m]) => { R('harp', m, b(s), null, 0.95); R('harp', m, b(s + 4), null, 0.95); R('harp', m + 12, b(s + 8), null, 0.8) })
    line('vln', riff.map(([s, m, d]) => [s + 8, m + 12, d]), b, 0.9, 0, 0.9)
    ;[12, 12.5].forEach((s) => { [50, 62, 74].forEach((m) => R('harp', m, b(s), null, 0.9)); RC('vln', [62, 74], b(s), b(0.3), 0.8, 0.06); R('bd', 36, b(s), null, 0.9) })
    ;[50, 62, 74].forEach((m) => R('harp', m, b(13), null, 1)); RC('vln', [62, 74], b(13), b(14.5) - b(13), 0.9, 1.2); R('vc', 50, b(13), b(14.5) - b(13), 0.9, 1.2); R('tuba', 38, b(13), b(14.5) - b(13), 0.8, 1.2)
    R('timp', 38, b(13), null, 0.9); R('bd', 36, b(13), null, 1)
  } },
}
// ---------- Suspense by theme: a clock that loops while the clue is open, and a roll and crash on Reveal ----------
// Each theme gets its own pair. Real recordings (wood block, harp, horns, timpani) are used where they suit the theme.
function subBus(p) { const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(BUS); n.wet = BUS.wet; return n }
function panned(p, fn) { const prev = BUS; BUS = subBus(p); try { fn() } finally { BUS = prev } }
function tick(t, f = 3000, g = 0.06, d = 0.025) { const n = noiseSrc(t, d), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6; const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(bp).connect(v); send(v, false) }
function blip(t, f, g = 0.03, d = 0.05) { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); osc('square', f, t, d).connect(lp(4000)).connect(v); send(v, false) }
function drip(t, g = 0.08) { const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.005); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); const o = osc('sine', 1400, t, 0.12); o.frequency.exponentialRampToValueAtTime(520, t + 0.1); o.connect(v); send(v) }
function wind(t, d, g = 0.03, f = 700) { const n = noiseSrc(t, d), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(f * 0.6, t); bp.frequency.linearRampToValueAtTime(f * 1.3, t + d * 0.5); bp.frequency.linearRampToValueAtTime(f * 0.7, t + d); const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + d * 0.4); v.gain.linearRampToValueAtTime(0.0001, t + d); n.connect(bp).connect(v); send(v) }
function sand(t, d, g = 0.012) { const n = noiseSrc(t, d), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.3); v.gain.setValueAtTime(g, t + d - 0.3); v.gain.linearRampToValueAtTime(0.0001, t + d); n.connect(hp).connect(v); send(v, false) }
function zap(t, g = 0.08) { const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); const o = osc('sawtooth', 2400, t, 0.5); o.frequency.exponentialRampToValueAtTime(70, t + 0.45); o.connect(lp(3000)).connect(v); send(v) }
function gong(t, g = 0.06, d = 3.2) { for (const [f, gg] of [[98, 1], [151, 0.6], [217, 0.45], [289, 0.3], [397, 0.2]]) { const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g * gg, t + 0.02); v.gain.exponentialRampToValueAtTime(0.0001, t + d); osc('sine', f, t, d, 0).connect(v); send(v) } }
function clink(t, g = 0.05) { for (const [m, gg] of [[98, 1], [103, 0.6], [108, 0.35]]) { const v = ctx.createGain(); v.gain.setValueAtTime(g * gg, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); osc('sine', hz(m), t, 0.35).connect(v); send(v) } }
function shaker(t, d, g0, g1, step = 0.06) { const n = Math.floor(d / step); for (let i = 0; i < n; i++) I.hat(t + i * step, g0 + (g1 - g0) * (i / n)) }
function snareRoll(t, d, g0, g1, step = 0.045, lo = false) { const n = Math.floor(d / step); for (let i = 0; i < n; i++) { const g = g0 + (g1 - g0) * (i / n) ** 1.4; lo ? brush(t + i * step, g) : I.snare(t + i * step, g, 0.07) } }
function brush(t, g) { const n = noiseSrc(t, 0.09), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.5; const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.03); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); n.connect(bp).connect(v); send(v) }
const ROLL = 1.8

const THEME_SUS = {
  amethyst: {
    clock: ['Palace clock', 'A grand wooden tick-tock, a soft harp note each bar and a low string hum that creeps upward.'],
    roll: ['Timpani roll and royal hit', 'Real timpani roll up, then a cymbal, horns and harp ring out together.'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 4; k++) R(k % 2 ? 'clave' : 'wood', k % 2 ? 84 : 72, t + k * B, null, 0.55); R('harp', [50, 53, 57, 55][bar % 4], t, null, 0.45); I.strings(38 + Math.min(bar, 5), t, 4 * B, 0.006); return 4 * B },
    hit(t) { for (let i = 0, n = 30; i < n; i++) R('timp', 42, t + i * (ROLL / n), null, 0.12 + 0.5 * (i / n) ** 1.5); const h = t + ROLL; R('timp', 42, h, null, 1); R('bd', 36, h, null, 0.8); RC('horn', [50, 57, 62], h, 1.4, 0.6, 1.2); RC('harp', [62, 66, 69, 74], h, null, 0.8); I.crash(h, 0.07, 2.4) },
  },
  emerald: {
    clock: ['Water clock', 'Water drops for the seconds, a soft wooden click between them, a warm breeze and a harp note every two bars.'],
    roll: ['Rain shaker and harp sweep', 'A shaker that swells like rain, a harp sweeping up, then a soft cymbal and a warm harp and cello chord.'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 4; k++) { drip(t + k * B, 0.07); R('clave', 84, t + k * B + B / 2, null, 0.18) } if (bar % 2 === 0) { R('harp', 57, t, null, 0.5); R('harp', 64, t + 0.25, null, 0.4) } wind(t, 4 * B + 0.4, 0.012, 500); return 4 * B },
    hit(t) { shaker(t, ROLL, 0.01, 0.06, 0.05); const sw = [57, 60, 64, 67, 69, 72, 76, 79, 81, 84]; sw.forEach((m, i) => R('harp', m, t + 0.6 + i * 0.11, null, 0.5)); const h = t + ROLL; I.crash(h, 0.05, 2.2); RC('harp', [57, 64, 69, 72], h, null, 0.9); R('vc', 45, h, 1.6, 0.8, 1); R('vln', 76, h, 1.6, 0.6, 1) },
  },
  neon: {
    clock: ['Digital countdown', 'Arcade beeps tick the seconds over a low synth pulse that rises a step every bar.'],
    roll: ['Synth roll and laser zap', 'An electronic snare roll with a rising sweep, then a laser zap, a cymbal and a bright synth chord.'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 4; k++) blip(t + k * B, k === 0 ? 1760 : 1320, 0.025); for (let k = 0; k < 8; k++) I.bass(33 + Math.min(bar, 6), t + k * B / 2, 0.18, 0.05); I.kick(t, 0.25); return 4 * B },
    hit(t) { snareRoll(t, ROLL, 0.015, 0.12, 0.04); I.riser(t, ROLL, 0.06); const h = t + ROLL; zap(h, 0.07); I.crash(h, 0.08, 2); I.stab([64, 67, 71, 76], h, 0.6, 0.05, 3000); I.kick(h, 0.6) },
  },
  onyx: {
    clock: ['Pocket watch and bass', 'A quick, quiet pocket-watch tick over a walking double bass, like a late-night jazz club.'],
    roll: ['Brush roll and big band hit', 'A brushed snare roll, then a ride cymbal, a bass drum and a trumpet and trombone "bah-DAH!".'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 8; k++) tick(t + k * B / 2, 5200, 0.035, 0.015); [38, 42, 45, 47].forEach((m, k) => R('vc', m, t + k * B, B * 0.8, 0.7, 0.08)); return 4 * B },
    hit(t) { snareRoll(t, ROLL, 0.02, 0.16, 0.05, true); const h = t + ROLL; R('bd', 36, h - 0.25, null, 0.5); RC('tpt', [67, 71, 74], h - 0.25, 0.15, 0.55, 0.08); R('bd', 36, h, null, 1); RC('tpt', [67, 71, 74, 79], h, 1.2, 0.7, 0.8); RC('tbn', [50, 55], h, 1.2, 0.8, 0.8); I.crash(h, 0.06, 2.6) },
  },
  rivals: {
    clock: ['Red and blue heartbeat', 'The ticks swap between the left speaker (red) and the right speaker (blue) over a heartbeat thump.'],
    roll: ['Drumline face-off', 'A marching snare roll that bounces between the two sides, then a crash on each side and the whole brass section together.'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 4; k++) panned(k % 2 ? 0.8 : -0.8, () => tick(t + k * B, k % 2 ? 2600 : 3400, 0.07, 0.03)); I.kick(t, 0.35); I.kick(t + 0.2, 0.22); return 4 * B },
    hit(t) { const n = Math.floor(ROLL / 0.05); for (let i = 0; i < n; i++) panned(i % 2 ? 0.7 : -0.7, () => I.snare(t + i * 0.05, 0.02 + 0.12 * (i / n) ** 1.4, 0.07)); const h = t + ROLL; panned(-0.8, () => I.crash(h, 0.06, 2.2)); panned(0.8, () => I.crash(h + 0.03, 0.06, 2.2)); RC('tpt', [60, 64, 67], h, 1.3, 0.6, 1); RC('tbn', [48, 55], h, 1.3, 0.8, 1); R('bd', 36, h, null, 1); R('timp', 42, h, null, 0.8) },
  },
  ember: {
    clock: ['Molten heartbeat', 'A deep, slow clock and a taiko heartbeat over a low rumble that grows a little each bar.'],
    roll: ['Taiko roll and gong', 'Taiko drums speed up into a roll, then one huge hit, a gong and low trombones.'],
    loop(bar, t) { const B = 0.5; for (let k = 0; k < 4; k++) R('wood', 60, t + k * B, null, 0.35); I.taiko(t, 0.3); I.taiko(t + 0.24, 0.2); I.strings(31 + Math.min(bar, 5), t, 4 * B, 0.008); return 4 * B },
    hit(t) { let x = 0, gap = 0.22; while (x < ROLL) { I.taiko(t + x, 0.12 + 0.35 * (x / ROLL)); x += gap; gap = Math.max(0.05, gap * 0.86) } const h = t + ROLL; I.taiko(h, 0.65); gong(h, 0.06); RC('tbn', [46, 53], h, 1.5, 0.9, 1); R('timp', 42, h, null, 0.9) },
  },
  heritage: {
    clock: ['Hourglass (no music)', 'Sand trickling through an hourglass, a water drop for each second and a soft desert breeze. No instruments.'],
    roll: ['Frame drum roll (no music)', 'A frame-drum roll that speeds up and swells, a deep drum hit, a gust of wind and two coffee cups clinking.'],
    loop(bar, t) { const B = 0.5; sand(t, 4 * B + 0.3); for (let k = 0; k < 4; k++) drip(t + k * B, k === 0 ? 0.08 : 0.05); if (bar % 2 === 0) wind(t, 4 * B + 0.6, 0.018, 450); return 4 * B },
    hit(t) { let x = 0, gap = 0.2; while (x < ROLL) { I.dum(t + x, 0.08 + 0.3 * (x / ROLL)); I.hat(t + x + gap / 2, 0.02 + 0.04 * (x / ROLL)); x += gap; gap = Math.max(0.05, gap * 0.85) } const h = t + ROLL; I.dum(h, 0.8); I.tak(h + 0.12, 0.12); wind(h - 0.4, 2.2, 0.05, 900); clink(h + 0.35, 0.05); clink(h + 0.55, 0.035) },
  },
}
function heritageQuiet(t0) {
  wind(t0, 6.5, 0.11, 600); wind(t0 + 2.5, 4, 0.07, 900)
  // a falcon calling twice in the distance
  for (const at of [0.9, 2.1]) { const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t0 + at); v.gain.exponentialRampToValueAtTime(0.07, t0 + at + 0.05); v.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.7); const o = osc('sine', 2300, t0 + at, 0.7); o.frequency.setValueAtTime(2300, t0 + at); o.frequency.exponentialRampToValueAtTime(1500, t0 + at + 0.65); const vib = osc('sine', 28, t0 + at, 0.7); const vg = ctx.createGain(); vg.gain.value = 90; vib.connect(vg).connect(o.frequency); o.connect(v); send(v) }
  // coffee poured from a dallah, then two cups
  const t = t0 + 3.2, n = noiseSrc(t, 1.6), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1600, t + 1.5); const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.1, t + 0.15); v.gain.setValueAtTime(0.1, t + 1.3); v.gain.linearRampToValueAtTime(0.0001, t + 1.6); n.connect(bp).connect(v); send(v)
  clink(t0 + 5.0, 0.12); clink(t0 + 5.25, 0.09)
  // embers crackling
  for (let i = 0; i < 18; i++) tick(t0 + 0.3 + Math.random() * 6, 1800 + Math.random() * 2500, 0.06 + Math.random() * 0.05, 0.012)
  return 7
}


const SR = 44100
let BASE = './'
const FILES = {}
/** Where the app keeps its recorded notes (public/sounds/). */
export function setSoundBase(base) { BASE = base }
// Which recorded instruments each piece uses. Written out because the built app renames functions,
// so reading a score's own source text does not work there.
const USES = {"title-amethyst": ["timp", "tpt", "horn", "tuba", "vln"], "title-emerald": ["harp", "vc", "vln", "horn", "timp"], "title-neon": ["spic", "xyl", "bd", "wood", "tpt", "horn", "tuba", "timp"], "title-onyx": ["spic", "pno", "clave", "tpt", "tbn", "bd", "tuba", "timp"], "title-rivals": ["bd", "wood", "timp", "tpt", "tbn", "tuba"], "title-ember": ["spic", "bd", "timp", "tbn", "horn", "tuba"], "title-heritage": ["bd", "wood", "clave", "vc", "harp", "vln", "tuba", "timp"], "loop-amethyst": ["harp"], "hit-amethyst": ["timp", "bd", "horn", "harp"], "loop-emerald": ["clave", "harp"], "hit-emerald": ["harp", "vc", "vln"], "loop-neon": [], "hit-neon": [], "loop-onyx": ["vc"], "hit-onyx": ["bd", "tpt", "tbn"], "loop-rivals": [], "hit-rivals": ["tpt", "tbn", "bd", "timp"], "loop-ember": ["wood"], "hit-ember": ["tbn", "timp"], "loop-heritage": [], "hit-heritage": []}
async function loadFor(insts) {
  const want = insts.flatMap((k) => (MAN[k] || []).map((m) => `${k}_${m}`)).filter((k) => !BUF[k])
  await Promise.all(want.map(async (k) => {
    if (!FILES[k]) FILES[k] = fetch(`${BASE}sounds/${k}.mp3`).then((r) => { if (!r.ok) throw new Error(k); return r.arrayBuffer() })
    const ab = await FILES[k]
    BUF[k] = await new Promise((ok, no) => ctx.decodeAudioData(ab.slice(0), ok, no))
  }))
}
function fresh(len) {
  ctx = new OfflineAudioContext(2, Math.ceil(SR * len), SR)
  master = ctx.createGain(); master.gain.value = 0.7
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)
  verb = ctx.createConvolver()
  const n = ctx.sampleRate * 2.6, buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6) }
  verb.buffer = buf
  const wet = ctx.createGain(); wet.gain.value = 0.28; verb.connect(wet).connect(master)
  hall = null
}
// The scores draw on shared module state (ctx, BUS, hall), so pieces are made one at a time.
let queue = Promise.resolve()
function render(...args) {
  const run = queue.then(() => renderNow(...args))
  queue = run.catch(() => {})
  return run
}
async function renderNow(len, wet, useHall, insts, write) {
  fresh(len)
  if (insts.length) await loadFor(insts)
  const bus = newBus(); bus.wet.gain.value = wet
  if (useHall) { bus.wet.disconnect(); bus.wet.connect(hallVerb()) }
  BUS = bus
  try { write(0.08) } finally { BUS = null }
  const out = await ctx.startRendering()
  ctx = null
  return out
}

/**
 * The title piece for a theme. set: 'a' | 'b' | 'd' (the Tune Room sets) or 'e' (Heritage, no music).
 * Resolves to an AudioBuffer that any AudioContext can play.
 */
export function renderTitle(theme, set) {
  if (set === 'e') return render(7.5, 0.6, false, [], (t0) => heritageQuiet(t0))
  const T = set === 'a' ? TUNES.find((x) => x.id === theme) : set === 'b' ? B_TUNES[theme] : D_TUNES[theme]
  if (!T) return Promise.reject(new Error(`no tune ${theme}/${set}`))
  const B = 60 / T.bpm
  const len = T.beats * B + 2.6
  const write = (t0) => (set === 'd' ? T.score((x) => t0 + x * B) : withClean(false, () => T.score((x) => t0 + x * B)))
  return render(len, set === 'a' ? 1 : set === 'b' ? 0.5 : 0.32, set === 'd', set === 'd' ? USES['title-' + theme] || [] : [], write)
}

/** The theme's suspense clock (four bars, ready to loop), or its drum roll and crash. */
export const ROLL_SECONDS = ROLL
export function renderSuspense(theme, kind) {
  const S = THEME_SUS[theme]
  if (!S) return Promise.reject(new Error(`no suspense ${theme}`))
  if (kind === 'roll') return render(ROLL + 3.2, 0.35, true, USES['hit-' + theme] || [], (t0) => S.hit(t0))
  // Four bars, rendered with a little room so the last notes ring into the loop point.
  let from = 0, len = 0
  return render(8.6, 0.3, true, USES['loop-' + theme] || [], (t0) => { let t = t0; for (let bar = 0; bar < 4; bar++) t += S.loop(bar + 2, t); from = t0; len = t - t0 }).then((buf) => {
    // Cut exactly four bars and lay the ringing tail back over the start, so the loop has no seam.
    const a = Math.round(from * SR), n = Math.round(len * SR)
    const out = new AudioBuffer({ length: n, numberOfChannels: buf.numberOfChannels, sampleRate: SR })
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = out.getChannelData(ch)
      for (let i = 0; i < n; i++) dst[i] = src[a + i] || 0
      for (let i = a + n; i < src.length; i++) dst[(i - a - n) % n] += src[i]
    }
    return out
  })
}
