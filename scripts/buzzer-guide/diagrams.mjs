// Inline SVG diagrams for the buzzer setup guide. Every colour comes from CSS classes on the page,
// so the drawings follow the page's light, dark and print colours.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

// ---------- small drawn objects ----------
const laptop = (x, y, label, sub = '') => `
  <g transform="translate(${x} ${y})">
    <rect class="d-obj" x="0" y="0" width="96" height="62" rx="6"/>
    <rect class="d-screen" x="7" y="7" width="82" height="48" rx="2"/>
    <path class="d-obj" d="M-10 62 h116 l-8 10 h-100 z"/>
    <text class="d-lab" x="48" y="92" text-anchor="middle">${esc(label)}</text>
    ${sub ? `<text class="d-sub" x="48" y="108" text-anchor="middle">${esc(sub)}</text>` : ''}
  </g>`
const box = (x, y, label = 'Buzzer box') => `
  <g transform="translate(${x} ${y})">
    <rect class="d-box" x="0" y="0" width="92" height="52" rx="6"/>
    <rect class="d-chip" x="12" y="14" width="30" height="22" rx="2"/>
    <circle class="d-led" cx="70" cy="26" r="6"/>
    <text class="d-lab" x="46" y="72" text-anchor="middle">${esc(label)}</text>
  </g>`
const podium = (x, y, label, lit = false) => `
  <g transform="translate(${x} ${y})">
    <path class="d-obj" d="M6 26 h56 l6 52 h-68 z"/>
    <ellipse class="${lit ? 'd-btn lit' : 'd-btn'}" cx="34" cy="20" rx="26" ry="10"/>
    <ellipse class="d-btn-top" cx="34" cy="16" rx="20" ry="6"/>
    <text class="d-lab" x="34" y="96" text-anchor="middle">${esc(label)}</text>
  </g>`
const projector = (x, y, label, sub = '') => `
  <g transform="translate(${x} ${y})">
    <rect class="d-screen" x="0" y="0" width="120" height="70" rx="3"/>
    <rect class="d-obj" x="56" y="70" width="8" height="12"/>
    <rect class="d-obj" x="36" y="82" width="48" height="5" rx="2"/>
    <text class="d-lab" x="60" y="106" text-anchor="middle">${esc(label)}</text>
    ${sub ? `<text class="d-sub" x="60" y="122" text-anchor="middle">${esc(sub)}</text>` : ''}
  </g>`
const router = (x, y) => `
  <g transform="translate(${x} ${y})">
    <rect class="d-obj" x="0" y="20" width="110" height="34" rx="8"/>
    <line class="d-wire" x1="22" y1="20" x2="14" y2="0"/><line class="d-wire" x1="88" y1="20" x2="96" y2="0"/>
    <circle class="d-led" cx="22" cy="37" r="3.5"/><circle class="d-led" cx="36" cy="37" r="3.5"/><circle class="d-led" cx="50" cy="37" r="3.5"/>
    <text class="d-lab" x="55" y="74" text-anchor="middle">Wi-Fi router</text>
    <text class="d-sub" x="55" y="90" text-anchor="middle">your own, WPA3</text>
  </g>`
const pi = (x, y) => `
  <g transform="translate(${x} ${y})">
    <rect class="d-pi" x="0" y="0" width="92" height="58" rx="6"/>
    <rect class="d-chip" x="30" y="16" width="26" height="26" rx="2"/>
    <rect class="d-obj" x="-6" y="10" width="10" height="16" rx="1"/>
    <g class="d-pins">${Array.from({ length: 10 }, (_, i) => `<rect x="${10 + i * 7}" y="4" width="4" height="4"/>`).join('')}</g>
    <text class="d-lab" x="46" y="78" text-anchor="middle">Raspberry Pi 5</text>
    <text class="d-sub" x="46" y="94" text-anchor="middle">runs the game</text>
  </g>`
const tablet = (x, y, label) => `
  <g transform="translate(${x} ${y})">
    <rect class="d-obj" x="0" y="0" width="56" height="76" rx="6"/>
    <rect class="d-screen" x="5" y="6" width="46" height="62" rx="2"/>
    <text class="d-lab" x="28" y="94" text-anchor="middle">${esc(label)}</text>
  </g>`
const phone = (x, y) => `
  <g transform="translate(${x} ${y})">
    <rect class="d-obj" x="0" y="0" width="22" height="40" rx="4"/>
    <rect class="d-screen" x="3" y="4" width="16" height="30" rx="1"/>
  </g>`
const tag = (x, y, text, cls = '') => `<g transform="translate(${x} ${y})"><rect class="d-tag ${cls}" x="${-text.length * 3.6 - 8}" y="-11" width="${text.length * 7.2 + 16}" height="20" rx="10"/><text class="d-tagt" x="0" y="3.5" text-anchor="middle">${esc(text)}</text></g>`

// ---------- 1. Simple set-up: laptop + box + projector ----------
export function overviewLaptop() {
  return `<svg viewBox="0 0 720 340" role="img" aria-labelledby="ov1t"><title id="ov1t">The host laptop connects to the buzzer box by USB and to the projector by HDMI. Each podium button connects to the box by its own cable.</title>
  <path class="d-wire usb" d="M166 128 H 330"/>
  <path class="d-wire hdmi" d="M140 60 C 200 10, 480 10, 560 60"/>
  <g class="d-cables">
    <path class="d-wire cat" d="M376 152 C 376 200, 124 196, 124 242"/>
    <path class="d-wire cat" d="M376 152 C 376 204, 264 200, 264 242"/>
    <path class="d-wire cat" d="M376 152 C 376 204, 404 200, 404 242"/>
    <path class="d-wire cat" d="M376 152 C 376 200, 544 196, 544 242"/>
  </g>
  ${tag(248, 128, 'USB')}${tag(350, 22, 'HDMI')}${tag(620, 200, 'one cable per podium')}
  ${laptop(60, 60, 'Host laptop', 'Chrome or Edge')}
  ${box(330, 100).replace('y="72"', 'y="-10"')}
  ${projector(560, 30, 'Projector', 'audience window')}
  ${podium(90, 232, 'Team 1', true)}${podium(230, 232, 'Team 2')}${podium(370, 232, 'Team 3')}${podium(510, 232, 'Team 4')}
  </svg>`
}

// ---------- 2. Live on the Pi ----------
export function overviewPi(host) {
  return `<svg viewBox="0 0 780 410" role="img" aria-labelledby="ov2t"><title id="ov2t">The Pi plugs into your own Wi-Fi router by cable. The host laptop, the projector's computer, team tablets and audience phones all join that router. The buzzer box plugs into the host laptop by USB.</title>
  <path class="d-wire net" d="M440 205 L 534 188"/>
  <path class="d-wire net" d="M166 166 C 240 166, 280 205, 330 205"/>
  <path class="d-wire usb" d="M50 178 C 20 200, 20 262, 62 276"/>
  <path class="d-wire wifi" d="M426 170 C 470 90, 560 60, 620 58"/>
  <path class="d-wire wifi" d="M370 226 V 288"/>
  <path class="d-wire wifi" d="M420 226 C 450 280, 520 300, 556 304"/>
  ${tag(487, 176, 'network cable')}${tag(252, 172, 'cable (best)')}${tag(28, 226, 'USB')}${tag(520, 96, 'Wi-Fi or cable')}${tag(486, 282, 'Wi-Fi')}
  ${router(330, 170)}
  ${pi(540, 170)}
  ${laptop(60, 110, 'Host laptop', `opens ${host}/host/`)}
  ${box(62, 250)}
  ${projector(620, 20, 'Projector', 'opens its own link')}
  ${tablet(310, 290, '')}${tablet(376, 290, '')}<text class="d-lab" x="371" y="398" text-anchor="middle">Team tablets</text>
  <g>${phone(560, 290)}${phone(590, 284)}${phone(620, 294)}${phone(650, 286)}${phone(680, 292)}<text class="d-lab" x="632" y="360" text-anchor="middle">Audience phones</text><text class="d-sub" x="632" y="376" text-anchor="middle">scan the QR code</text></g>
  </svg>`
}

// ---------- 3. Pico pin map ----------
const LEFT = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15']
const RIGHT = ['VBUS', 'VSYS', 'GND', '3V3_EN', '3V3(OUT)', 'ADC_VREF', 'GP28', 'GND', 'GP27', 'GP26', 'RUN', 'GP22', 'GND', 'GP21', 'GP20', 'GP19', 'GP18', 'GND', 'GP17', 'GP16']
function role(name) {
  const m = /^GP(\d+)$/.exec(name)
  if (m) {
    const n = +m[1]
    if (n >= 2 && n <= 9) return ['btn', `Team ${n - 1} button`]
    if (n >= 10 && n <= 17) return ['led', `Team ${n - 9} light → driver in ${n - 9}`]
    if (n === 18) return ['rst', 'Reset button (optional)']
  }
  if (name === 'GND') return ['gnd', '']
  if (name === '3V3(OUT)') return ['pwr', '4.7 kΩ to each button pin']
  if (name === 'VBUS') return ['opt', '5 V lights only (see note)']
  return ['', '']
}
export function picoPins() {
  const top = 70, step = 21, bx = 300, bw = 160
  let s = `<svg viewBox="0 0 760 530" role="img" aria-labelledby="pinst"><title id="pinst">Raspberry Pi Pico seen from above with the USB socket at the top. Team buttons use GP2 to GP9, lights use GP10 to GP17, the optional reset uses GP18, and 3V3(OUT) is pin 36.</title>
  <rect class="d-board" x="${bx}" y="40" width="${bw}" height="450" rx="8"/>
  <rect class="d-obj" x="${bx + bw / 2 - 22}" y="28" width="44" height="22" rx="3"/>
  <text class="d-sub" x="${bx + bw / 2}" y="22" text-anchor="middle">USB</text>
  <rect class="d-chip" x="${bx + 48}" y="230" width="64" height="64" rx="3"/>
  <text class="d-lab" x="${bx + bw / 2}" y="266" text-anchor="middle">Pico</text>
  <rect class="d-obj" x="${bx + 62}" y="120" width="36" height="20" rx="3"/><text class="d-mini" x="${bx + 80}" y="156" text-anchor="middle">BOOTSEL</text>`
  LEFT.forEach((name, i) => {
    const y = top + i * step
    const [cls, what] = role(name)
    s += `<circle class="d-pin ${cls}" cx="${bx + 10}" cy="${y}" r="5"/>
      <text class="d-pinno" x="${bx + 22}" y="${y + 4}">${i + 1}</text>
      <text class="d-pinname ${cls}" x="${bx - 12}" y="${y + 4}" text-anchor="end">${name}</text>
      ${what ? `<text class="d-pinwhat ${cls}" x="${bx - 70}" y="${y + 4}" text-anchor="end">${esc(what)}</text>` : ''}`
  })
  RIGHT.forEach((name, i) => {
    const y = top + i * step
    const [cls, what] = role(name)
    s += `<circle class="d-pin ${cls}" cx="${bx + bw - 10}" cy="${y}" r="5"/>
      <text class="d-pinno" x="${bx + bw - 22}" y="${y + 4}" text-anchor="end">${40 - i}</text>
      <text class="d-pinname ${cls}" x="${bx + bw + 12}" y="${y + 4}">${name}</text>
      ${what ? `<text class="d-pinwhat ${cls}" x="${bx + bw + 82}" y="${y + 4}">${esc(what)}</text>` : ''}`
  })
  return s + '</svg>'
}

// ---------- 4. One podium, wired ----------
export function wiringOne() {
  return `<svg viewBox="0 0 780 380" role="img" aria-labelledby="w1t"><title id="w1t">Wiring for team 1. GP2 goes to the podium button, with a 4.7 kilo-ohm resistor up to 3V3 and a 100 nanofarad capacitor down to ground; the other side of the button goes to ground. GP10 goes to driver input 1; driver output 1 goes to the minus side of the button's light; the plus side of the light and the driver's COM pin go to plus 12 volts; the driver's ground and the adapter's minus go to the Pico's ground.</title>
  <rect class="d-board" x="20" y="50" width="130" height="260" rx="8"/>
  <text class="d-lab" x="85" y="40" text-anchor="middle">Pico</text>
  <text class="d-pinname pwr" x="140" y="84" text-anchor="end">3V3 (36)</text>
  <text class="d-pinname btn" x="140" y="134" text-anchor="end">GP2 (4)</text>
  <text class="d-pinname led" x="140" y="204" text-anchor="end">GP10 (14)</text>
  <text class="d-pinname gnd" x="140" y="284" text-anchor="end">GND (3)</text>

  <path class="n-pwr" d="M150 80 H 230"/>
  <rect class="d-res" x="222" y="88" width="16" height="30" rx="2"/><path class="n-pwr" d="M230 80 V 88"/><path class="n-btn" d="M230 118 V 130"/>
  <text class="d-sub" x="246" y="108">4.7 kΩ</text>
  <path class="n-btn" d="M150 130 H 540"/>
  <circle class="dot btn" cx="230" cy="130" r="4"/><circle class="dot btn" cx="300" cy="130" r="4"/>
  <path class="n-btn" d="M300 130 V 222"/>
  <path class="d-cap" d="M286 222 H 314 M286 230 H 314"/>
  <path class="n-gnd" d="M300 230 V 340"/>
  <text class="d-sub" x="280" y="232" text-anchor="end">100 nF</text>

  <rect class="d-chip big" x="350" y="176" width="112" height="84" rx="4"/>
  <text class="d-lab inv" x="406" y="222" text-anchor="middle">ULN2803A</text>
  <text class="d-mini inv" x="358" y="196">1 IN1</text><text class="d-mini inv" x="454" y="196" text-anchor="end">OUT1 18</text>
  <text class="d-mini inv" x="362" y="252">9 GND</text><text class="d-mini inv" x="452" y="252" text-anchor="end">COM 10</text>
  <path class="n-led" d="M150 200 H 350"/>
  <path class="n-led" d="M462 200 H 540"/>
  <path class="n-gnd" d="M380 260 V 340"/>
  <path class="n-pwr12" d="M432 260 V 296"/>

  <path class="n-gnd" d="M150 280 H 170 V 340 H 740"/>
  <path class="n-pwr12" d="M432 296 H 710"/>
  <text class="d-pinname pwr12" x="40" y="366">+12 V rail: adapter plus, driver COM, every light’s plus</text>
  <text class="d-pinname gnd" x="460" y="366">GND rail: Pico, driver, adapter minus</text>
  <text class="d-pinname pwr12" x="530" y="290" text-anchor="end">+12 V</text>
  

  <rect class="d-podium" x="560" y="88" width="200" height="232" rx="10"/>
  <text class="d-lab" x="660" y="80" text-anchor="middle">Podium 1</text>
  <text class="d-sub" x="550" y="118" text-anchor="end">pair A</text>
  <text class="d-sub" x="550" y="188" text-anchor="end">pair B</text>
  <text class="d-mini" x="497" y="166" text-anchor="middle">CAT6 cable, up to 15 m</text>
  <circle class="d-sw" cx="620" cy="130" r="5"/><circle class="d-sw" cx="680" cy="130" r="5"/>
  <path class="d-plunger" d="M612 112 H 688 M650 112 V 100"/>
  <text class="d-sub" x="650" y="156" text-anchor="middle">button</text>
  <path class="n-btn" d="M540 130 H 615"/>
  <path class="n-gnd" d="M685 130 H 740 V 340"/>
  <circle class="d-lamp" cx="650" cy="200" r="16"/><path class="d-lampx" d="M639 189 L661 211 M661 189 L639 211"/>
  <text class="d-mini" x="622" y="226" text-anchor="middle">−</text><text class="d-mini" x="678" y="226" text-anchor="middle">+</text>
  <text class="d-sub" x="650" y="246" text-anchor="middle">button’s light</text>
  <path class="n-led" d="M540 200 H 634"/>
  <path class="n-pwr12" d="M666 200 H 710 V 296"/>
  </svg>`
}

// ---------- 5. ULN2803A pins ----------
export function ulnPins() {
  let s = `<svg viewBox="0 0 560 300" role="img" aria-labelledby="ulnt"><title id="ulnt">ULN2803A seen from above with the notch at the top. Pins 1 to 8 on the left are inputs from GP10 to GP17. Pin 9 is ground. Pin 10 is COM, to plus 12 volts. Pins 18 down to 11 on the right are outputs 1 to 8, each to the minus side of a team's light.</title>
  <rect class="d-chip big" x="220" y="30" width="120" height="250" rx="4"/>
  <path class="d-notch" d="M266 30 a14 14 0 0 0 28 0"/>`
  for (let i = 0; i < 9; i++) {
    const y = 52 + i * 26
    const l = i + 1, r = 18 - i
    const lt = l <= 8 ? `IN${l}  ← GP${9 + l}` : 'GND → ground rail'
    const rt = r >= 11 ? `OUT${r === 18 ? 1 : 19 - r} → team ${19 - r} light −` : 'COM → +12 V'
    const lc = l <= 8 ? 'led' : 'gnd', rc = r >= 11 ? 'led' : 'pwr12'
    s += `<rect class="d-leg" x="206" y="${y - 5}" width="14" height="10"/><rect class="d-leg" x="340" y="${y - 5}" width="14" height="10"/>
      <text class="d-mini inv" x="230" y="${y + 4}">${l}</text><text class="d-mini inv" x="330" y="${y + 4}" text-anchor="end">${r}</text>
      <text class="d-pinname ${lc}" x="198" y="${y + 4}" text-anchor="end">${lt}</text>
      <text class="d-pinname ${rc}" x="362" y="${y + 4}">${rt}</text>`
  }
  return s + '</svg>'
}

// ---------- 6. Putting the program on the Pico ----------
export function picoSteps() {
  const panel = (x, n, title, inner) => `<g transform="translate(${x} 0)"><rect class="d-panel" x="0" y="0" width="176" height="170" rx="10"/><circle class="d-num" cx="22" cy="22" r="13"/><text class="d-numt" x="22" y="27" text-anchor="middle">${n}</text>${inner}<text class="d-lab" x="88" y="158" text-anchor="middle">${esc(title)}</text></g>`
  return `<svg viewBox="0 0 740 172" role="img" aria-labelledby="pst"><title id="pst">Four steps: hold BOOTSEL while plugging in; drag the MicroPython file onto the drive; save main.py to the Pico from Thonny; unplug and replug, and the Pico's own light comes on.</title>
  ${panel(0, 1, 'Hold BOOTSEL, plug in', `<rect class="d-board" x="58" y="40" width="60" height="96" rx="5"/><rect class="d-obj" x="76" y="30" width="24" height="14" rx="2"/><rect class="d-hl" x="64" y="52" width="20" height="14" rx="2"/><path class="d-arrow" d="M40 59 H 60"/><text class="d-mini" x="36" y="50" text-anchor="middle">press</text><path class="d-wire usb" d="M88 30 V 6"/>`)}
  ${panel(188, 2, 'Drag the .uf2 file on', `<path class="d-obj" d="M40 54 h36 l8 8 h52 v62 h-96 z"/><text class="d-mini" x="88" y="100" text-anchor="middle">RPI-RP2</text><rect class="d-hl" x="104" y="34" width="42" height="26" rx="3"/><text class="d-mini" x="125" y="51" text-anchor="middle">.uf2</text><path class="d-arrow" d="M120 62 L 100 84"/>`)}
  ${panel(376, 3, 'Thonny: save as main.py', `<rect class="d-screen" x="28" y="40" width="120" height="86" rx="4"/><rect class="d-obj" x="28" y="40" width="120" height="14" rx="4"/><path class="d-code" d="M38 66 h60 M38 78 h80 M38 90 h50 M38 102 h70"/><rect class="d-hl" x="70" y="108" width="70" height="14" rx="3"/><text class="d-mini" x="105" y="119" text-anchor="middle">main.py</text>`)}
  ${panel(564, 4, 'Replug: light comes on', `<rect class="d-board" x="58" y="40" width="60" height="96" rx="5"/><rect class="d-obj" x="76" y="30" width="24" height="14" rx="2"/><circle class="d-led on" cx="104" cy="56" r="6"/><circle class="d-glow" cx="104" cy="56" r="13"/><path class="d-wire usb" d="M88 30 V 6"/>`)}
  </svg>`
}

// ---------- 7. Chrome setting (drawn, not a screenshot) ----------
export function chromeFlag(host) {
  return `<svg viewBox="0 0 720 210" role="img" aria-labelledby="cft"><title id="cft">Drawing of Chrome's flags page: the address bar shows chrome://flags, the setting "Insecure origins treated as secure" has a text box containing http://${host} and the Pi's number address, and its menu is set to Enabled.</title>
  <rect class="d-panel" x="0" y="0" width="720" height="210" rx="10"/>
  <rect class="d-obj" x="0" y="0" width="720" height="40" rx="10"/>
  <rect class="d-screen" x="70" y="9" width="560" height="22" rx="11"/>
  <text class="d-mono" x="86" y="25">chrome://flags/#unsafely-treat-insecure-origin-as-secure</text>
  <text class="d-lab" x="24" y="72">Insecure origins treated as secure</text>
  <text class="d-sub" x="24" y="92">Treat given (insecure) origins as secure origins. Multiple origins can be supplied as a comma-separated list.</text>
  <rect class="d-input" x="24" y="108" width="470" height="44" rx="4"/>
  <text class="d-mono" x="36" y="135">http://${esc(host)},http://192.168.1.10</text>
  <rect class="d-hl" x="530" y="112" width="160" height="36" rx="6"/>
  <text class="d-lab" x="610" y="135" text-anchor="middle">Enabled ▾</text>
  <rect class="d-btnshape" x="560" y="164" width="130" height="32" rx="16"/><text class="d-lab inv" x="625" y="185" text-anchor="middle">Relaunch</text>
  <text class="d-mini" x="24" y="186">Use your Pi’s own number address from “status”.</text>
  </svg>`
}

// ---------- 8. For players: the button and its light ----------
export function playerStates() {
  const st = (x, lit, title, sub, extra = '') => `<g transform="translate(${x} 0)">${podium(40, 34, '', lit)}${extra}<text class="d-lab" x="74" y="146" text-anchor="middle">${esc(title)}</text><text class="d-sub" x="74" y="164" text-anchor="middle">${esc(sub)}</text></g>`
  const press = `<path class="d-arrow" d="M74 2 V 30 M66 22 L74 30 L82 22"/>`
  const glow = `<path class="d-arrow" d="M30 40 L18 34 M118 40 L130 34 M40 26 L32 14 M108 26 L116 14 M74 20 V 6"/>`
  return `<svg viewBox="0 0 600 172" role="img" aria-labelledby="pst2"><title id="pst2">Three moments: while the host reads, wait with the light off. When the host opens the buzzers, press. If your light comes on, it is your turn to answer.</title>
  ${st(0, false, 'Host is reading', 'wait, hands off')}
  ${st(200, false, 'Buzzers open', 'press once', press)}
  ${st(400, true, 'Your light is on', 'answer now', glow)}
  </svg>`
}
