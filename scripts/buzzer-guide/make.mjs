// Builds the buzzer setup guide for both games.
// node scripts/buzzer-guide/make.mjs <gg|ilm> public/buzzer-guide.html repo
// (artifact instead of repo makes a preview page without the document wrapper)
// The pictures live in public/buzzer-guide/; shots.mjs retakes them.
import { writeFileSync } from 'node:fs'
import * as D from './diagrams.mjs'

const [site, outFile, mode] = process.argv.slice(2)
const C = {
  gg: {
    app: 'Get Grilled',
    host: 'getgrilled.local',
    cmd: 'getgrilled',
    repo: 'furanite/get-grilled',
    dir: 'get-grilled',
    teams: ['Falcons', 'Engineers', 'Titans'],
    sound: 'its own buzz sound plays through the hall speakers',
    soundShort: 'its buzz sound plays',
    card: '',
    light: { screen: '#e4dbf5', codebg: '#ece6f7', ink: '#24123f', accent: '#5b2fa6', gold: '#9a6a12', bg: '#f7f5fb', panel: '#ffffff', line: '#ddd5ec' },
    dark: { screen: '#34245a', codebg: '#2a1c45', ink: '#efe9fb', accent: '#c4a6ff', gold: '#f5cd72', bg: '#140b24', panel: '#1f1336', line: '#3a2a58' },
    intro: 'Big light-up buttons tell the room which team pressed first. This guide takes you from a box of parts to a working game, with pictures for each step.',
  },
  ilm: {
    app: 'Munaafasatul Ilm',
    host: 'ilm.local',
    cmd: 'ilm',
    repo: 'furanite/ilm-munaafasah',
    dir: 'ilm-munaafasah',
    teams: ['Noor', 'Huda', 'Fajr'],
    sound: 'its own daff sound plays through the hall speakers',
    soundShort: 'its daff sound plays',
    card: `<p><b>Its own card.</b> ${'Munaafasatul Ilm'} lives on its own microSD card. If you also run Get Grilled, use the same Pi with two cards and swap them while the Pi is switched off.</p>`,
    light: { screen: '#d6ebe3', codebg: '#e3efea', ink: '#0d2b23', accent: '#0f6b55', gold: '#8a6414', bg: '#f4f8f6', panel: '#ffffff', line: '#cfe0d9' },
    dark: { screen: '#1d4a40', codebg: '#183d35', ink: '#e7f3ee', accent: '#7fd3b8', gold: '#e9c47f', bg: '#0a1f19', panel: '#11302a', line: '#25483f' },
    intro: 'Large light-up buttons show the room which team pressed first, so every team gets a fair turn. This guide takes you from a box of parts to a working game, with pictures for each step.',
  },
}[site]

const repoMode = mode === 'repo'
const img = (name, alt, cap, w) => `<figure class="shot"${w ? ` style="max-width:${w}px"` : ''}><img src="buzzer-guide/${name}.webp" alt="${alt}" loading="lazy"><figcaption>${cap}</figcaption></figure>`
const fig = (svg, cap, cls = '') => `<figure class="diagram ${cls}"><div class="scroll">${svg}</div><figcaption>${cap}</figcaption></figure>`
const t = C.teams

const css = `
:root {
  /* Layout: one reading column with numbered parts; diagrams and screenshots sit full width inside it. */
  --bg: ${C.light.bg}; --panel: ${C.light.panel}; --ink: ${C.light.ink}; --muted-f: #5d5670; --accent: ${C.light.accent}; --gold: ${C.light.gold}; --line: ${C.light.line};
  --btn: #1769aa; --led: #b5531a; --pwr: #b3261e; --gnd: #4a4a55; --warn-bg: #fff4dc; --warn-ink: #5b3d00;
  --screen: ${C.light.screen}; --pcb: #cfe6d6; --codebg: ${C.light.codebg};
  --display: "Avenir Next", "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --body: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: ${C.dark.bg}; --panel: ${C.dark.panel}; --ink: ${C.dark.ink}; --muted-f: #b9b2c9; --accent: ${C.dark.accent}; --gold: ${C.dark.gold}; --line: ${C.dark.line};
  --btn: #6fb8ff; --led: #ffab6b; --pwr: #ff8a80; --gnd: #b9b9c6; --screen: ${C.dark.screen}; --pcb: #1f4a33; --codebg: ${C.dark.codebg}; --screen: ${C.dark.screen}; --pcb: #1f4a33; --codebg: ${C.dark.codebg}; --warn-bg: #3a2c0c; --warn-ink: #ffe3a3; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: ${C.dark.bg}; --panel: ${C.dark.panel}; --ink: ${C.dark.ink}; --muted-f: #b9b2c9; --accent: ${C.dark.accent}; --gold: ${C.dark.gold}; --line: ${C.dark.line};
  --btn: #6fb8ff; --led: #ffab6b; --pwr: #ff8a80; --gnd: #b9b9c6; --screen: ${C.dark.screen}; --pcb: #1f4a33; --codebg: ${C.dark.codebg}; --warn-bg: #3a2c0c; --warn-ink: #ffe3a3; color-scheme: dark }
* { box-sizing: border-box }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 var(--body) }
.wrap { max-width: 920px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)) }
.muted { color: var(--muted-f) }
h1, h2, h3 { font-family: var(--display); line-height: 1.2; text-wrap: balance; margin: 0 }
h1 { font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: -0.01em }
h2 { font-size: 1.6rem; display: flex; gap: 14px; align-items: baseline }
h2 .n { font: 600 0.95rem var(--mono); color: var(--gold); border: 1.5px solid var(--gold); border-radius: 999px; padding: 2px 10px; flex: none; transform: translateY(-3px) }
h3 { font-size: 1.15rem; margin-top: 8px }
.eyebrow { font: 600 0.78rem var(--body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent) }
header.top { display: grid; gap: 12px; padding-bottom: 22px; border-bottom: 2px solid var(--ink) }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center }
.toolbar a, .toolbar button { font: 600 0.92rem var(--body); color: var(--ink); background: var(--panel); border: 1.5px solid var(--line); border-radius: 999px; padding: 6px 14px; text-decoration: none; cursor: pointer }
.toolbar a:hover, .toolbar button:hover { border-color: var(--accent) }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px }
.notice { background: var(--warn-bg); color: var(--warn-ink); border-radius: 10px; padding: 12px 16px; font-size: 0.95rem }
nav.toc { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 6px 22px; padding: 18px 0; border-bottom: 1px solid var(--line) }
nav.toc a { color: var(--ink); text-decoration: none; display: flex; gap: 10px }
nav.toc a span { font-family: var(--mono); color: var(--gold); min-width: 1.6em }
nav.toc a:hover { color: var(--accent) }
section.part { display: grid; gap: 16px; padding-top: 40px; scroll-margin-top: 12px }
.who { font-size: 0.9rem; color: var(--muted-f) }
ol.steps { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 12px }
ol.steps > li { counter-increment: s; display: grid; grid-template-columns: 2rem 1fr; gap: 10px; min-width: 0 }
ol.steps > li::before { content: counter(s); font: 700 0.9rem var(--mono); width: 1.8rem; height: 1.8rem; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--bg) }
ol.steps > li > div { min-width: 0 }
ul { margin: 0; padding-left: 1.2em } li + li { margin-top: 4px }
code, kbd, .cmd { font-family: var(--mono); font-size: 0.9em }
code { background: var(--codebg); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere }
kbd { border: 1.5px solid var(--line); border-bottom-width: 3px; border-radius: 5px; padding: 0 6px; background: var(--panel) }
pre.term { margin: 0; background: #0f0d14; color: #e8e6ef; border-radius: 10px; padding: 14px 16px; overflow-x: auto; font: 0.9rem/1.6 var(--mono) }
pre.term .p { color: #8bd49c } pre.term .c { color: #9a94ab }
figure { margin: 0; display: grid; gap: 8px; min-width: 0 }
figcaption { font-size: 0.88rem; color: var(--muted-f) }
figure.diagram { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px }
figure.diagram .scroll { overflow-x: auto }
figure.diagram svg { display: block; width: 100%; min-width: 560px; height: auto }
figure.diagram.small svg { min-width: 0 }
figure.shot img { display: block; width: 100%; height: auto; border-radius: 10px; border: 1px solid var(--line) }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; align-items: start }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem }
.tbl { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--panel) }
th, td { text-align: left; vertical-align: top; padding: 9px 12px; border-bottom: 1px solid var(--line) }
th { font: 600 0.78rem var(--body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted-f) }
tr:last-child td { border-bottom: 0 }
td.qty { font-family: var(--mono); white-space: nowrap }
.choice { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px }
.choice > div { border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 16px; background: var(--panel) }
.players { border: 2px dashed var(--gold); border-radius: 14px; padding: 18px; display: grid; gap: 12px; background: var(--panel) }
.key { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 0.85rem }
.key span::before { content: ""; display: inline-block; width: 18px; height: 4px; border-radius: 2px; margin-right: 6px; vertical-align: middle; background: currentColor }
.k-btn { color: var(--btn) } .k-led { color: var(--led) } .k-pwr { color: var(--pwr) } .k-gnd { color: var(--gnd) }
footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 0.88rem; color: var(--muted-f) }

/* drawings */
svg text { font-family: var(--body) }
.d-obj { fill: var(--line); stroke: var(--ink); stroke-width: 1.5 }
.d-screen { fill: var(--screen); stroke: var(--ink); stroke-width: 1.2 }
.d-box, .d-pi { fill: var(--panel); stroke: var(--ink); stroke-width: 2 }
.d-pi { fill: var(--pcb) }
.d-board { fill: var(--pcb); stroke: var(--ink); stroke-width: 1.5 }
.d-chip { fill: var(--ink) } .d-chip.big { fill: #1d1b22 }
.d-pins rect { fill: var(--gold) }
.d-led { fill: var(--line); stroke: var(--ink); stroke-width: 1 } .d-led.on { fill: #3ccf6e } .d-glow { fill: none; stroke: #3ccf6e; stroke-width: 2; opacity: .5 }
.d-btn { fill: #c62828; stroke: var(--ink); stroke-width: 1.5 } .d-btn.lit { fill: #ffd54a; stroke: var(--gold); stroke-width: 3 }
.d-btn-top { fill: #ffffff; opacity: .25 }
.d-lab { fill: var(--ink); font-size: 14px; font-weight: 600 } .d-lab.inv, .d-mini.inv { fill: #f2f0f6 }
.d-sub { fill: var(--muted-f); font-size: 12px }
.d-mini { fill: var(--muted-f); font-size: 11px }
.d-mono { fill: var(--ink); font: 13px var(--mono) }
.d-wire { fill: none; stroke: var(--ink); stroke-width: 2.5; stroke-linecap: round }
.d-wire.usb { stroke: var(--btn) } .d-wire.hdmi { stroke: var(--muted-f); stroke-dasharray: 2 0 } .d-wire.cat { stroke: var(--gold) }
.d-wire.net { stroke: var(--gold); stroke-width: 3.5 } .d-wire.wifi { stroke: var(--accent); stroke-dasharray: 6 6 }
.d-tag { fill: var(--panel); stroke: var(--line); stroke-width: 1.2 } .d-tagt { fill: var(--ink); font-size: 11.5px; font-weight: 600 }
.d-pin { fill: var(--panel); stroke: var(--ink); stroke-width: 1 }
.d-pin.btn { fill: var(--btn) } .d-pin.led { fill: var(--led) } .d-pin.rst { fill: var(--accent) } .d-pin.gnd { fill: var(--gnd) } .d-pin.pwr, .d-pin.opt { fill: var(--pwr) }
.d-pinno { fill: var(--muted-f); font: 10px var(--mono) }
.d-pinname { fill: var(--muted-f); font: 600 12px var(--mono) }
.d-pinname.btn, .d-pinwhat.btn { fill: var(--btn) } .d-pinname.led, .d-pinwhat.led { fill: var(--led) } .d-pinname.rst, .d-pinwhat.rst { fill: var(--accent) }
.d-pinname.gnd { fill: var(--gnd) } .d-pinname.pwr, .d-pinwhat.pwr, .d-pinname.pwr12, .d-pinname.opt, .d-pinwhat.opt { fill: var(--pwr) }
.d-pinwhat { font-size: 12px; fill: var(--muted-f) }
.n-btn, .n-led, .n-pwr, .n-pwr12, .n-gnd { fill: none; stroke-width: 2.5; stroke-linejoin: round }
.n-btn { stroke: var(--btn) } .n-led { stroke: var(--led) } .n-pwr, .n-pwr12 { stroke: var(--pwr) } .n-gnd { stroke: var(--gnd) }
.dot.btn { fill: var(--btn) }
.d-res { fill: var(--panel); stroke: var(--btn); stroke-width: 2 }
.d-cap { stroke: var(--ink); stroke-width: 3; fill: none }
.d-podium { fill: none; stroke: var(--muted-f); stroke-width: 1.5; stroke-dasharray: 6 5 }
.d-cable { stroke: var(--gold); stroke-width: 2; fill: none }
.d-sw { fill: var(--panel); stroke: var(--ink); stroke-width: 2 } .d-plunger { stroke: var(--ink); stroke-width: 2.5; fill: none }
.d-lamp { fill: #ffd54a; stroke: var(--ink); stroke-width: 2 } .d-lampx { stroke: var(--ink); stroke-width: 1.5 }
.d-leg { fill: #9a9aa6 } .d-notch { fill: var(--bg); stroke: none }
.d-panel { fill: var(--panel); stroke: var(--line); stroke-width: 1.5 }
.d-num { fill: var(--accent) } .d-numt { fill: var(--bg); font: 700 13px var(--mono) }
.d-hl { fill: none; stroke: var(--gold); stroke-width: 2.5 }
.d-arrow { stroke: var(--gold); stroke-width: 2.5; fill: none; marker-end: none }
.d-code { stroke: var(--muted-f); stroke-width: 3; stroke-linecap: round }
.d-input { fill: var(--bg); stroke: var(--line); stroke-width: 1.5 }
.d-btnshape { fill: var(--accent) }

@media (max-width: 560px) { h2 { font-size: 1.3rem } body { font-size: 15px } }
@media print {
  :root { --bg: #fff; --panel: #fff; --ink: #111; --muted-f: #444; --line: #bbb; --screen: #e8e8ee; --pcb: #d9eedf; --codebg: #eee; color-scheme: light }
  body { font-size: 11pt } .wrap { max-width: none; padding: 0 }
  .toolbar, nav.toc { display: none }
  section.part { break-before: page; padding-top: 0 }
  section.part:first-of-type { break-before: auto }
  figure, .players, tr, ol.steps > li { break-inside: avoid }
  figure.diagram svg { min-width: 0 }
  pre.term { background: #fff; color: #111; border: 1px solid #999 } pre.term .p, pre.term .c { color: #333 }
  a { color: inherit; text-decoration: none }
  .d-chip.big { fill: #333 }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto } }
`

const parts = [
  ['choose', 'Pick your set-up'],
  ['parts', 'Get the parts'],
  ['build', 'Build the buzzer box'],
  ['program', 'Put the program on the box'],
  ['connect', 'Connect and test each team'],
  ['pi', 'Live on the Raspberry Pi'],
  ['play', 'During the game'],
  ['fix', 'If something goes wrong'],
]
const H = (i, extra = '') => `<h2><span class="n">${i + 1}</span>${parts[i][1]}${extra}</h2>`

const body = `
<div class="wrap">
<header class="top">
  <div class="eyebrow">${C.app} · Help</div>
  <h1>Buzzer setup guide</h1>
  <p class="muted" style="max-width:62ch;margin:0">${C.intro}</p>
  <div class="notice"><b>Not tried on real hardware yet.</b> The box program and the game have been tested with a practice box in the browser, but nobody has built this box or run it on a real Raspberry Pi so far. Build it well before the event and do a full rehearsal with every podium.</div>
  ${repoMode ? `<div class="toolbar"><a href="./">← Back to the game</a><button type="button" id="print">Print this guide</button><span class="muted" style="font-size:.9rem">or press <kbd>Ctrl</kbd> + <kbd>P</kbd> (<kbd>⌘</kbd> + <kbd>P</kbd> on a Mac)</span></div>` : `<div class="toolbar"><span class="muted" style="font-size:.9rem">To print, press <kbd>Ctrl</kbd> + <kbd>P</kbd> (<kbd>⌘</kbd> + <kbd>P</kbd> on a Mac). Each part starts on a new page.</span></div>`}
</header>

<nav class="toc" aria-label="Parts of this guide">
${parts.map(([id, name], i) => `<a href="#${id}"><span>${i + 1}</span>${name}</a>`).join('\n')}
</nav>

<section class="part" id="choose">
  ${H(0)}
  <p>The buzzer box always plugs into the <b>host’s laptop</b> by USB, whichever way you run the game. Choose one of these two set-ups.</p>
  <div class="choice">
    <div><h3>A. Laptop and projector</h3><p>The host runs ${C.app} in <b>Chrome or Edge</b> on a laptop, with the projector showing the audience window. No Raspberry Pi needed. Do parts 2 to 5 and 7.</p></div>
    <div><h3>B. Live on a Raspberry Pi</h3><p>The Pi runs the game on its own Wi-Fi, so team tablets, the projector and audience phones all follow along. Do every part.</p></div>
  </div>
  ${fig(D.overviewLaptop(), 'Set-up A. The box sends each press to the laptop; the projector shows the order.')}
  ${fig(D.overviewPi(C.host), `Set-up B. The Pi is plugged into your router by cable. Everything else joins the router. The buzzer box still plugs into the host laptop.`)}
</section>

<section class="part" id="parts">
  ${H(1)}
  <p class="who">For whoever builds the box. The list is for 4 teams. For each extra team (up to 8), add one button, one cable and one 4.7 kΩ resistor and 100 nF capacitor.</p>
  <h3>Buzzer box</h3>
  <div class="tbl"><table>
    <thead><tr><th>Part</th><th>Qty</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Raspberry Pi Pico or Pico 2, with headers</td><td class="qty">1</td><td>The W (wireless) versions work too.</td></tr>
      <tr><td>100 mm arcade push button with built-in light, 12 V</td><td class="qty">4</td><td>One per podium. 5 V versions also work (see the note in part 3).</td></tr>
      <tr><td>ULN2803A driver chip (DIP-18) and socket</td><td class="qty">1</td><td>Lets the Pico switch the 12 V lights.</td></tr>
      <tr><td>12 V 2 A power adapter and DC socket</td><td class="qty">1</td><td>For the lights only.</td></tr>
      <tr><td>4.7 kΩ resistor</td><td class="qty">4</td><td>One per button, for long cables.</td></tr>
      <tr><td>100 nF ceramic capacitor</td><td class="qty">4</td><td>One per button, filters noise on long cables.</td></tr>
      <tr><td>Small push button</td><td class="qty">1</td><td>Optional: a Reset button on the box for the host.</td></tr>
      <tr><td>CAT6 network cable, with RJ45 sockets or screw terminals</td><td class="qty">1 per podium</td><td>Up to about 15 m each. Lengths don’t need to match.</td></tr>
      <tr><td>Project box, perfboard, wire, USB cable for the Pico</td><td class="qty">1</td><td>Use a USB cable that carries data, not a charge-only one.</td></tr>
    </tbody></table></div>
  <h3>Only for set-up B (Raspberry Pi)</h3>
  <div class="tbl"><table>
    <thead><tr><th>Part</th><th>Qty</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Raspberry Pi 5 (4 GB is plenty) and its power supply</td><td class="qty">1</td><td></td></tr>
      <tr><td>microSD card, 32 GB or larger</td><td class="qty">1</td><td>${site === 'ilm' ? 'A card of its own for this game.' : ''}</td></tr>
      <tr><td>Wi-Fi router of your own</td><td class="qty">1</td><td>WPA3 if you can. Needs internet only before the event, for updates.</td></tr>
      <tr><td>Network cables</td><td class="qty">2</td><td>Pi to router, and ideally host laptop to router.</td></tr>
    </tbody></table></div>
</section>

<section class="part" id="build">
  ${H(2)}
  <p class="who">For whoever builds the box. Unplug the 12 V adapter and the USB cable while you solder.</p>
  <div class="key"><span class="k-btn">button wires</span><span class="k-led">light wires</span><span class="k-pwr">power</span><span class="k-gnd">ground</span></div>
  ${fig(D.picoPins(), 'The Pico seen from above, USB socket at the top. Pin numbers are printed small beside each pin. Team 1 uses GP2 and GP10, team 2 uses GP3 and GP11, and so on.')}
  ${fig(D.wiringOne(), 'One podium, fully wired (team 1). Repeat for each team with the next pins: the resistor, capacitor and button go on the next GP pin from GP3 to GP9, and the light on the next driver channel.')}
  ${fig(D.ulnPins(), 'The ULN2803A driver from above. Find the notch at one end: pin 1 is to its left. Fit it in a socket so you can swap it.', 'small')}
  <ol class="steps">
    <li><div><b>Buttons.</b> Wire each team’s button between its GP pin (GP2 for team 1 up to GP9 for team 8) and GND. Add one 4.7 kΩ resistor from that GP pin to <code>3V3(OUT)</code> (pin 36), and one 100 nF capacitor from that GP pin to GND.</div></li>
    <li><div><b>Lights.</b> Connect GP10 to GP17 to driver pins 1 to 8. Driver outputs (pins 18 down to 11) go to the <b>minus</b> side of each team’s light. The <b>plus</b> side of every light and driver pin 10 (COM) go to +12 V.</div></li>
    <li><div><b>Ground.</b> Join the Pico’s GND, driver pin 9 and the adapter’s minus. Every ground must meet.</div></li>
    <li><div><b>Podium cables.</b> Use one CAT6 cable per podium: one twisted pair for the button, one pair for its light. Label both ends with the team number.</div></li>
    <li><div><b>Reset (optional).</b> A small button from GP18 to GND lets the host clear the buzz order from the box.</div></li>
  </ol>
  <p class="muted"><b>5 V lights:</b> use the Pico’s VBUS (pin 40, 5 V from USB) instead of the 12 V adapter, and keep all lights together under about 400 mA.</p>
</section>

<section class="part" id="program">
  ${H(3)}
  <p class="who">Once per box, on any computer.</p>
  ${fig(D.picoSteps(), 'The four steps below, in pictures.')}
  <ol class="steps">
    <li><div>Hold the small <b>BOOTSEL</b> button on the Pico while you plug it into a computer. It shows up as a drive called <code>RPI-RP2</code> (or <code>RP2350</code> for a Pico 2).</div></li>
    <li><div>Download MicroPython for your board from micropython.org (Raspberry Pi Pico, or Pico 2) and drag the <code>.uf2</code> file onto that drive. The Pico restarts.</div></li>
    <li><div>Install Thonny (thonny.org), open it, and choose <b>MicroPython (Raspberry Pi Pico)</b> at the bottom right. Open <code>buzzer/firmware/main.py</code> from the ${C.app} code on GitHub (${C.repo}), then <b>File → Save as… → Raspberry Pi Pico</b>, named <code>main.py</code>.</div></li>
    <li><div><b>Close Thonny</b> (it keeps the USB port busy), then unplug and replug the Pico. Its own small light comes on: the program is running.</div></li>
  </ol>
</section>

<section class="part" id="connect">
  ${H(4)}
  <p class="who">For the host, before every event. Use <b>Chrome or Edge on a laptop or desktop</b>. Safari, Firefox, iPads and phones can’t talk to USB devices.</p>
  ${img('topbar', `The top bar of ${C.app}, with the Buzzers button`, 'The <b>Buzzers</b> button is in the top bar. Its dot turns green when the box is connected.')}
  <ol class="steps">
    <li><div>Plug in the 12 V adapter, then plug the box into the host laptop by USB.</div></li>
    <li><div>Open ${C.app}, set up your game, then press <b>Buzzers</b> and <b>Connect the buzzer box</b>. Chrome shows a list of devices: pick the Pico (it may be called “Board CDC” or “USB Serial Device”). Chrome remembers it, so next time it connects by itself.</div></li>
    <li><div>Ask each team to press its button. The matching team lights up in the panel, its podium light comes on, and ${C.soundShort}.</div></li>
    <li><div>If a press lights the wrong team, change the <b>Button</b> number next to that team. The two teams swap, so no button is used twice.</div></li>
    <li><div>Press <b>Light all buttons</b> to check every light at once.</div></li>
  </ol>
  <div class="pair">
    ${img('buzz-connect', 'The Buzzers panel before connecting, with the Connect the buzzer box button', 'Before connecting: press <b>Connect the buzzer box</b>.')}
    ${img('buzz-test', `The Buzzers panel during a test: ${t[1]} is marked pressed`, `Testing: ${t[1]} pressed button 2. (This picture uses the practice box, so the status says “Practice box”. With the real box it says “Connected · 8 buttons”.)`)}
  </div>
  <h3>Two settings in the same panel</h3>
  <ul>
    <li><b>Open the buzzers as soon as the question shows.</b> Leave it off for a fair game: buzzers stay locked until you have read the clue.</li>
    <li><b>Tie window.</b> Presses closer together than this (5 milliseconds to start with) show as a tie.</li>
  </ul>
  <p class="muted"><b>Rehearse without the box:</b> add <code>?buzzsim=1</code> to the end of the game’s address. A practice box appears, and you can press team buttons from the browser console with <code>ggBuzz.press(0)</code> for team 1, <code>ggBuzz.press(1)</code> for team 2, and so on.</p>
</section>

<section class="part" id="pi">
  ${H(5)}
  <p class="who">Only for set-up B. The first time takes about an hour, mostly waiting. ${site === 'ilm' ? '' : ''}</p>
  ${C.card}
  <h3>The router</h3>
  <ol class="steps">
    <li><div>Give the Wi-Fi a name and a strong password, and choose <b>WPA3</b> if offered. If the router has only WPA2, plug the host laptop into the router by cable.</div></li>
    <li><div>Turn on <b>client isolation</b> (also called AP isolation) so phones can’t reach each other. Don’t use the separate guest network: it often blocks the Pi too.</div></li>
    <li><div>Change the router’s admin password, and turn off WPS and remote management.</div></li>
    <li><div>Once the Pi has joined, give it a <b>fixed address</b> (an “address reservation” in the router’s DHCP settings) so links and QR codes keep working.</div></li>
  </ol>
  <h3>The Pi’s card and the installer</h3>
  <ol class="steps">
    <li><div>On your computer, open <b>Raspberry Pi Imager</b>, choose <b>Raspberry Pi OS Lite (64-bit)</b>, and in its settings set a user name, a strong password and your time zone, and turn on SSH. Leave the Pi’s Wi-Fi empty: it uses the cable.</div></li>
    <li><div>Put the card in the Pi, plug the Pi into the router by cable, and switch it on. Then, on the Pi (keyboard and screen, or SSH), run:</div></li>
  </ol>
  <pre class="term"><span class="p">$</span> sudo apt-get install -y git
<span class="p">$</span> git clone https://github.com/${C.repo}.git
<span class="p">$</span> cd ${C.dir}
<span class="p">$</span> sudo bash pi/install.sh</pre>
  <ol class="steps" start="3" style="counter-reset: s 2">
    <li><div>The installer asks for the <b>Wi-Fi name and password</b> (they go on the projector’s join card as a QR code) and the <b>update key</b>. On your first Pi choose <b>1</b>: it shows a private key once. Copy it into GitHub under <b>Settings → Secrets and variables → Actions → New repository secret</b>, named <code>PI_SIGNING_KEY</code>.</div></li>
    <li><div>On GitHub, open <b>Actions → Raspberry Pi release → Run workflow</b> once. Then back on the Pi:</div></li>
  </ol>
  <pre class="term"><span class="p">$</span> ${C.cmd} update   <span class="c"># fetches and checks the newest release</span>
<span class="p">$</span> ${C.cmd} pin      <span class="c"># choose the host PIN (6 to 12 digits)</span>
<span class="p">$</span> ${C.cmd} status   <span class="c"># shows the version and the Pi's address</span></pre>
  <p class="muted">The installer turns SSH off at the end. To keep it, run <code>sudo bash pi/install.sh --keep-ssh</code>. It is safe to run the installer again.</p>

  <h3>Let the host laptop use the box on the Pi</h3>
  <p>Chrome and Edge only let a page use a USB device over a secure address, and the Pi uses plain <code>http</code>. Change this once on the host laptop.</p>
  ${fig(D.chromeFlag(C.host), 'A drawing of the setting in Chrome. In Edge, open <code>edge://flags</code> and search for the same name.')}
  <ol class="steps">
    <li><div>Open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.</div></li>
    <li><div>In the box, type <code>http://${C.host}</code>, a comma, and the Pi’s number address from <code>${C.cmd} status</code> (for example <code>http://192.168.1.10</code>).</div></li>
    <li><div>Choose <b>Enabled</b>, then <b>Relaunch</b>. Now connect and test the box as in part 5.</div></li>
  </ol>
  ${img('buzz-insecure', 'The Buzzers panel on the Pi before the browser setting, explaining what to change', 'Before the change, the Buzzers panel shows this message instead of the Connect button.', 520)}

  <h3>Connect the screens on the day</h3>
  <ol class="steps">
    <li><div>Switch on the router, then the Pi. The game starts by itself within a minute.</div></li>
    <li><div>On the host laptop, open <code>http://${C.host}/host/</code> and sign in with the PIN. If the name doesn’t open, use the address from <code>${C.cmd} status</code>.</div></li>
    <li><div>Set up the game, then press <b>Devices</b>. Each team gets a link and QR code: scan it with that team’s tablet. Open the <b>Projector</b> link on the projector’s computer. One device per link: if a team needs a different tablet, press <b>Reissue link</b>.</div></li>
    <li><div>For the audience, tick <b>Let the audience play along on their phones</b> and <b>Show the join QR code on the projector</b>. Untick the QR code once people are in.</div></li>
    <li><div>Afterwards, press <b>End the event</b> to stop every link.</div></li>
  </ol>
  <div class="pair">
    ${img('devices', 'The Devices panel with a link and QR code for each team and the projector', `<b>Devices</b>: ${t[0]}’s QR code is open. Each team’s dot turns green when its tablet is online.`)}
    ${img('tablet', `A team tablet showing the board and Your pick`, `A team tablet: the board, the team’s name, and “Your pick!” on its turn.`)}
  </div>
  ${img('projector-join', 'The projector showing two QR codes: join the Wi-Fi, then open the game', 'The projector’s join card for the audience: first the Wi-Fi, then the game. (Example Wi-Fi name.)', 760)}
</section>

<section class="part" id="play">
  ${H(6)}
  <h3>For the host</h3>
  <ol class="steps">
    <li><div>Open a clue and read it out. The buzzers stay locked.</div></li>
    <li><div>Press <b>Open buzzers</b> or the <kbd>B</kbd> key. A team that presses before that is locked out for a quarter of a second.</div></li>
    <li><div>The order appears on the clue card and on the projector, with the gap after the first team. The first team’s light comes on and ${C.sound}.</div></li>
    <li><div>Mark the team right or wrong. After a wrong answer, the next team’s light comes on.</div></li>
    <li><div>After a tie, or to start again, press <b>Re-open buzzers</b> (or the Reset button on the box).</div></li>
  </ol>
  <div class="pair">
    ${img('clue-locked', 'A clue card with the Open buzzers button and the words Buzzers locked', 'While you read: <b>Buzzers locked</b>.')}
    ${img('clue-order', `A clue card showing the buzz order: 1st ${t[1]}, 2nd ${t[0]} 0.084 seconds later, 3rd ${t[2]}`, `After pressing <kbd>B</kbd>: ${t[1]} were first, ${t[0]} 0.084 s later.`)}
  </div>
  <div class="players">
    <div class="eyebrow">For players · read this out before the first round</div>
    ${fig(D.playerStates(), 'Wait, press, answer.', 'small')}
    <ul>
      <li>Keep your hands off the button while the host reads. Pressing early locks your team out for a quarter of a second.</li>
      <li>When the host opens the buzzers, press once. Pressing again changes nothing.</li>
      <li>If your light comes on, it is your turn. Answer when the host points to you.</li>
      <li>The screen shows the order down to the thousandth of a second. Teams within the tie window show <b>TIE</b>, and the host re-opens the buzzers.</li>
      <li>Cable lengths don’t matter: a press reaches the box in well under a millionth of a second, even from 15 m away.</li>
    </ul>
  </div>
</section>

<section class="part" id="fix">
  ${H(7)}
  <div class="tbl"><table>
    <thead><tr><th>What you see</th><th>What to try</th></tr></thead>
    <tbody>
      <tr><td>No <b>Buzzers</b> button in the top bar</td><td>Use Chrome or Edge on a laptop or desktop. Safari, Firefox, iPads and phones can’t reach USB devices.</td></tr>
      <tr><td>The panel talks about a “secure address”</td><td>You are on the Pi’s address. Make the Chrome change in part 6, then relaunch the browser.</td></tr>
      <tr><td>The Pico isn’t in Chrome’s list</td><td>Close Thonny. Try another USB cable (some only charge). Check the Pico’s own light is on; if not, put <code>main.py</code> on it again (part 4).</td></tr>
      <tr><td>Status says <b>Connection lost</b></td><td>Check the USB cable, unplug and replug the box, then press <b>Connect the buzzer box</b>.</td></tr>
      <tr><td>One button does nothing in the test</td><td>Check its wire at the GP pin and at GND, and its 4.7 kΩ resistor. Swap its cable with a working podium to find whether the cable or the button is at fault.</td></tr>
      <tr><td>The wrong team lights up</td><td>Change the <b>Button</b> number next to each team in the Buzzers panel.</td></tr>
      <tr><td>Presses work but a light stays off</td><td>Is the 12 V adapter plugged in? Check the driver chip is the right way round (notch), pin 10 goes to +12 V, pin 9 to ground, and the light’s plus and minus aren’t swapped.</td></tr>
      <tr><td>Presses appear when nobody pressed</td><td>Long cables pick up noise. Check each button has its 4.7 kΩ resistor and 100 nF capacitor, and that the button uses the two wires of one twisted pair.</td></tr>
      <tr><td>A team pressed but is shown as “too early”</td><td>They pressed before <b>Open buzzers</b>. Remind players to wait (part 7).</td></tr>
      <tr><td><code>http://${C.host}</code> doesn’t open</td><td>Use the number address from <code>${C.cmd} status</code>. Check the device is on your game Wi-Fi, not the guest network or mobile data.</td></tr>
      <tr><td>A team tablet is “turned away”</td><td>Each link works on one device only. In <b>Devices</b>, press <b>Reissue link</b> and scan the new QR code.</td></tr>
      <tr><td>Forgot the host PIN</td><td>On the Pi, run <code>${C.cmd} pin</code> and choose a new one.</td></tr>
      <tr><td>Something broke after an update</td><td>Run <code>${C.cmd} use-previous</code> to go back one version (works offline). <code>${C.cmd} update</code> later gets the newest again. <code>${C.cmd} logs</code> shows what happened.</td></tr>
    </tbody></table></div>
</section>

<footer>
  ${C.app} buzzer setup guide. Pictures of the game are taken from the app itself; the drawings show wiring and settings and are not photographs. The full technical notes are in <code>buzzer/README.md</code> and <code>pi/README.md</code> in the ${C.app} code on GitHub.
</footer>
</div>
${repoMode ? '<script src="buzzer-guide/print.js"></script>' : ''}
`

const head = `<title>${C.app} Buzzer Guide</title>
<meta name="description" content="Step-by-step pictures for building, connecting and testing the ${C.app} buzzer box, and running the game live on a Raspberry Pi.">
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>`

const html = repoMode
  ? `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="favicon.svg">
${head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')}
</head>
<body>${body}</body>
</html>
`
  : head + '\n' + body
writeFileSync(outFile, html)
console.log('wrote', outFile, html.length)
