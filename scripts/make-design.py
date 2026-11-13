# Draws the architecture and graphic design pictures into questions/img/*.svg
# (simple line drawings on white; colour only where colour is the question; no fonts to load).
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'questions', 'img')
os.makedirs(OUT, exist_ok=True)
S = 'stroke="#111" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
S2 = 'stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"'
T = 'font-family="Arial,Helvetica,sans-serif" fill="#111"'

def svg(name, w, h, body):
    with open(os.path.join(OUT, name + '.svg'), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*2}" height="{h*2}"><rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>')

def path(d, s=S): return f'<path d="{d}" {s}/>'
def line(x1, y1, x2, y2, s=S): return path(f'M{x1},{y1} L{x2},{y2}', s)
def rect(x, y, w, h, s=S): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {s}/>'
def circ(x, y, r, s=S): return f'<circle cx="{x}" cy="{y}" r="{r}" {s}/>'
def label(x, y, t, size=22, anchor='middle', extra=''): return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" dominant-baseline="central" {T} {extra}>{t}</text>'

# ---------- Arches (opening in a wall) ----------
def arch(name, d):
    b = path('M20,250 L20,40 L380,40 L380,250') + path(d) + line(10, 250, 390, 250)
    svg(name, 400, 270, b)
arch('arch-round', 'M110,250 L110,150 A90,90 0 0 1 290,150 L290,250')
arch('arch-pointed', 'M110,250 L110,160 Q115,80 200,60 Q285,80 290,160 L290,250')
arch('arch-horseshoe', 'M130,250 L130,190 A90,90 0 1 1 270,190 L270,250')
arch('arch-ogee', 'M110,250 L110,170 C110,120 195,120 200,55 C205,120 290,120 290,170 L290,250')
arch('arch-flat', 'M110,250 L110,120 L290,120 L290,250')
arch('arch-multifoil', 'M110,250 L110,165 A30,30 0 0 1 135,120 A35,35 0 0 1 175,82 A30,30 0 0 1 225,82 A35,35 0 0 1 265,120 A30,30 0 0 1 290,165 L290,250')

# ---------- Classical column capitals ----------
def column(name, cap):
    b = rect(130, 120, 80, 180) + ''.join(line(140 + i * 15, 125, 140 + i * 15, 295, S2) for i in range(5))
    b += rect(115, 300, 110, 16) + cap
    svg(name, 340, 330, b)
column('col-doric', rect(105, 70, 130, 22) + path('M128,120 L118,92 L222,92 L212,120'))
column('col-ionic', rect(105, 70, 130, 18) + path('M120,88 L220,88 L215,120 L125,120') + circ(112, 104, 16) + circ(112, 104, 6, S2) + circ(228, 104, 16) + circ(228, 104, 6, S2))
column('col-corinthian', rect(100, 40, 140, 16) + path('M125,56 L215,56 L210,120 L130,120') +
       ''.join(path(f'M{x},120 Q{x-8},{95} {x+2},{72} Q{x+10},{95} {x+4},120', S2) for x in (134, 152, 170, 188, 204)) +
       path('M125,62 Q100,62 104,80 Q112,90 120,78', S2) + path('M215,62 Q240,62 236,80 Q228,90 220,78', S2))

# ---------- Roof types (front view of a house) ----------
def house(name, roof, w=420, h=280):
    b = rect(90, 160, 240, 100) + rect(185, 200, 50, 60) + line(40, 260, 380, 260) + roof
    svg(name, w, h, b)
house('roof-gable', path('M70,160 L210,50 L350,160 Z'))
house('roof-hip', path('M70,160 L150,70 L270,70 L350,160 Z'))
house('roof-mansard', path('M75,160 L110,85 L310,85 L345,160 Z') + path('M110,85 L150,50 L270,50 L310,85'))
house('roof-gambrel', path('M70,160 L110,90 L210,45 L310,90 L350,160 Z'))
house('roof-shed', path('M75,160 L75,95 L345,55 L345,160 Z'))
house('roof-flat', rect(80, 130, 260, 30) + rect(70, 120, 280, 10))
house('roof-dome', path('M100,160 Q100,40 210,40 Q320,40 320,160 Z') + line(210, 40, 210, 20) + circ(210, 16, 5))

# ---------- Beam cross-sections ----------
svg('section-i-beam', 260, 260, path('M50,40 H210 V70 H145 V190 H210 V220 H50 V190 H115 V70 H50 Z'))
svg('section-channel', 260, 260, path('M70,40 H200 V70 H105 V190 H200 V220 H70 Z'))
svg('section-angle', 260, 260, path('M70,40 H100 V190 H210 V220 H70 Z'))
svg('section-hollow', 260, 260, rect(60, 40, 140, 180) + rect(80, 60, 100, 140))

# ---------- Domes on square bases ----------


# ---------- Islamic geometric patterns ----------
def star8(cx, cy, r):
    pts = []
    for i in range(16):
        rr = r if i % 2 == 0 else r * 0.62
        a = math.pi / 8 * i - math.pi / 2
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" {S}/>'
svg('pattern-star8', 300, 300, star8(150, 150, 120) + rect(65, 65, 170, 170, S2) + f'<rect x="65" y="65" width="170" height="170" transform="rotate(45 150 150)" {S2}/>')
b = ''
for i in range(6):
    for j in range(6):
        x, y = 30 + i * 40, 30 + j * 40
        b += f'<rect x="{x+6}" y="{y+6}" width="28" height="28" rx="14" {S2}/>' + circ(x + 20, y + 20, 5, S2)
svg('pattern-mashrabiya', 300, 300, rect(20, 20, 260, 260) + b)

# Wind catcher (barjeel) on a house
svg('windcatcher', 360, 320,
    rect(60, 170, 240, 130) + rect(140, 40, 80, 130) + ''.join(line(140 + i * 20, 40, 140 + i * 20, 110, S2) for i in range(1, 4)) +
    rect(130, 30, 100, 12) + line(20, 300, 340, 300) +
    path('M40,70 Q90,60 130,75', S2) + path('M120,70 L132,76 L120,82', S2) + path('M180,180 L180,240', S2) + path('M172,228 L180,242 L188,228', S2))

# Courtyard house plan (top view)
svg('plan-courtyard', 340, 340, rect(30, 30, 280, 280) + rect(110, 110, 120, 120) + circ(170, 170, 18, S2) +
    line(110, 110, 30, 30, S2) + line(230, 110, 310, 30, S2) + line(110, 230, 30, 310, S2) + line(230, 230, 310, 310, S2))

# ---------- Floor plan symbols ----------
svg('plan-door', 320, 260, line(20, 200, 120, 200, 'stroke="#111" stroke-width="10"') + line(220, 200, 300, 200, 'stroke="#111" stroke-width="10"') +
    line(120, 200, 120, 100) + path('M120,100 A100,100 0 0 1 220,200', S2))
svg('plan-window', 320, 200, line(20, 100, 100, 100, 'stroke="#111" stroke-width="14"') + line(220, 100, 300, 100, 'stroke="#111" stroke-width="14"') +
    rect(100, 92, 120, 16, S2) + line(100, 100, 220, 100, S2))
svg('plan-stairs', 320, 300, rect(80, 30, 160, 240) + ''.join(line(80, 30 + i * 24, 240, 30 + i * 24, S2) for i in range(1, 10)) +
    line(160, 250, 160, 60) + path('M146,78 L160,52 L174,78'))

# ---------- City layouts ----------
b = rect(20, 20, 320, 320) + ''.join(line(20 + i * 64, 20, 20 + i * 64, 340, S2) for i in range(1, 5)) + ''.join(line(20, 20 + i * 64, 340, 20 + i * 64, S2) for i in range(1, 5))
svg('city-grid', 360, 360, b)
b = circ(180, 180, 40) + circ(180, 180, 100, S2) + circ(180, 180, 160, S2) + ''.join(line(180 + 40 * math.cos(a), 180 + 40 * math.sin(a), 180 + 160 * math.cos(a), 180 + 160 * math.sin(a), S2) for a in [k * math.pi / 4 for k in range(8)])
svg('city-radial', 360, 360, b)
b = line(20, 180, 340, 180) + ''.join(path(f'M{x},180 L{x},{110 if k % 2 else 250} {"" }', S2) + circ(x, 110 if k % 2 else 250, 18, S2) for k, x in enumerate(range(60, 320, 50)))
svg('city-culdesac', 360, 360, b)
svg('roundabout', 360, 360, circ(180, 180, 60) + circ(180, 180, 120) + line(160, 0, 160, 63, S2) + line(200, 0, 200, 63, S2) +
    line(160, 297, 160, 360, S2) + line(200, 297, 200, 360, S2) + line(0, 160, 63, 160, S2) + line(0, 200, 63, 200, S2) +
    line(297, 160, 360, 160, S2) + line(297, 200, 360, 200, S2))

# ---------- Passive design: overhang shades the high summer sun, lets in low winter sun ----------


# ---------- Colour ----------
HUES = ['#e53935', '#f4511e', '#fb8c00', '#fdd835', '#c0ca33', '#43a047', '#00897b', '#1e88e5', '#3949ab', '#5e35b1', '#8e24aa', '#d81b60']
def wheel(name, mark=None, missing=None):
    b = ''
    for i, c in enumerate(HUES):
        a0 = math.radians(i * 30 - 105); a1 = math.radians(i * 30 - 75)
        x0, y0 = 160 + 130 * math.cos(a0), 160 + 130 * math.sin(a0)
        x1, y1 = 160 + 130 * math.cos(a1), 160 + 130 * math.sin(a1)
        fill = '#fff' if missing is not None and i in missing else c
        b += f'<path d="M160,160 L{x0:.1f},{y0:.1f} A130,130 0 0 1 {x1:.1f},{y1:.1f} Z" fill="{fill}" stroke="#111" stroke-width="2"/>'
    if mark:
        for i in mark:
            a = math.radians(i * 30 - 90)
            b += circ(round(160 + 100 * math.cos(a), 1), round(160 + 100 * math.sin(a), 1), 14, 'stroke="#111" stroke-width="5" fill="#fff"')
    svg(name, 320, 320, b)
wheel('colour-wheel')
wheel('colour-complementary', mark=[0, 6])
wheel('colour-analogous', mark=[7, 8, 9])
wheel('colour-triadic', mark=[0, 4, 8])
def overlap(name, cols, mode):
    pts = [(130, 120), (210, 120), (170, 190)]
    blend = 'screen' if mode == 'add' else 'multiply'
    bg = '#000' if mode == 'add' else '#fff'
    b = f'<rect width="340" height="300" fill="{bg}"/><g style="isolation:isolate">' + ''.join(f'<circle cx="{x}" cy="{y}" r="80" fill="{c}" style="mix-blend-mode:{blend}"/>' for (x, y), c in zip(pts, cols)) + '</g>'
    svg(name, 340, 300, b)
overlap('colour-rgb', ['#ff0000', '#00ff00', '#0000ff'], 'add')
overlap('colour-cmy', ['#00ffff', '#ff00ff', '#ffff00'], 'sub')
svg('colour-warm-cool', 420, 200, ''.join(f'<rect x="{20 + i * 64}" y="40" width="56" height="56" fill="{c}" stroke="#111" stroke-width="2"/>' for i, c in enumerate(['#e53935', '#fb8c00', '#fdd835'])) +
    ''.join(f'<rect x="{220 + i * 64}" y="40" width="56" height="56" fill="{c}" stroke="#111" stroke-width="2"/>' for i, c in enumerate(['#1e88e5', '#00897b', '#5e35b1'])) +
    label(100, 140, 'A', 30) + label(310, 140, 'B', 30))
svg('colour-tints', 440, 140, ''.join(f'<rect x="{20 + i * 80}" y="30" width="72" height="72" fill="{c}" stroke="#111" stroke-width="2"/>' for i, c in enumerate(['#0d47a1', '#1e88e5', '#64b5f6', '#bbdefb', '#e3f2fd'])))
svg('colour-temperature', 460, 140, f'<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ff8a1c"/><stop offset="0.5" stop-color="#fff4e0"/><stop offset="1" stop-color="#9ec8ff"/></linearGradient></defs><rect x="20" y="30" width="420" height="50" fill="url(#g)" stroke="#111" stroke-width="2"/>' +
    label(30, 110, '2700 K', 18, 'start') + label(430, 110, '6500 K', 18, 'end'))

# ---------- Composition and proportion ----------
phi = (1 + 5 ** 0.5) / 2
W = 400; H = W / phi
b = rect(10, 10, W, round(H, 1))
x, y, w, h = 10, 10, W, H
d = ''
for k in range(7):
    if k % 4 == 0:   # cut square on left
        s = h; b += line(round(x + s, 1), round(y, 1), round(x + s, 1), round(y + h, 1), S2); d += f'M{x:.1f},{y+h:.1f} A{s:.1f},{s:.1f} 0 0 1 {x+s:.1f},{y:.1f} '; x += s; w -= s
    elif k % 4 == 1: # top square
        s = w; b += line(round(x, 1), round(y + s, 1), round(x + w, 1), round(y + s, 1), S2); d += f'A{s:.1f},{s:.1f} 0 0 1 {x+s:.1f},{y+s:.1f} '; y += s; h -= s
    elif k % 4 == 2: # right square
        s = h; b += line(round(x + w - s, 1), round(y, 1), round(x + w - s, 1), round(y + h, 1), S2); d += f'A{s:.1f},{s:.1f} 0 0 1 {x+w-s:.1f},{y+h:.1f} '; w -= s
    else:            # bottom square
        s = w; b += line(round(x, 1), round(y + h - s, 1), round(x + w, 1), round(y + h - s, 1), S2); d += f'A{s:.1f},{s:.1f} 0 0 1 {x:.1f},{y+h-s:.1f} '; h -= s
b += path(d)
svg('golden-spiral', 420, int(H) + 20, b)
b = rect(10, 10, 420, 280) + ''.join(line(10 + 140 * i, 10, 10 + 140 * i, 290, S2 + ' stroke-dasharray="8 6"') for i in (1, 2)) + ''.join(line(10, 10 + 93.3 * i, 430, 10 + 93.3 * i, S2 + ' stroke-dasharray="8 6"') for i in (1, 2))
b += circ(150, 103, 14, 'fill="#111"') + path('M10,250 Q120,200 220,235 T430,220', S2)
svg('rule-of-thirds', 440, 300, b)

# ---------- Typography ----------
svg('type-serif-sans', 460, 200, label(120, 95, 'Aa', 110, extra='font-family="Georgia,Times New Roman,serif"').replace(T, 'fill="#111"') + label(340, 95, 'Aa', 110) + label(120, 180, 'A', 20) + label(340, 180, 'B', 20))
svg('type-baseline', 520, 240, f'<text x="40" y="160" font-size="150" {T}>Hxgy</text>' + line(20, 160, 500, 160, 'stroke="#e53935" stroke-width="3"'))
svg('type-xheight', 520, 240, label(40, 170, 'Hxgy', 150, 'start').replace('dominant-baseline="central"', 'dominant-baseline="alphabetic"') +
    line(20, 170, 500, 170, 'stroke="#999" stroke-width="2"') + line(20, 92, 500, 92, 'stroke="#e53935" stroke-width="3"'))
svg('type-kerning', 460, 200, label(130, 90, 'AV', 110) + label(340, 90, 'A V', 110) + label(130, 180, '1', 20) + label(340, 180, '2', 20))
svg('type-alignment', 460, 260, ''.join(line(40 + (60 if i % 2 else 0), 40 + i * 36, 420 - (0 if i % 2 else 50), 40 + i * 36, 'stroke="#111" stroke-width="12" stroke-linecap="round"') for i in range(6)))
svg('type-justified', 460, 260, ''.join(line(40, 40 + i * 36, 420 if i < 5 else 220, 40 + i * 36, 'stroke="#111" stroke-width="12" stroke-linecap="round"') for i in range(6)))
svg('type-centred', 460, 260, ''.join(line(230 - w, 40 + i * 36, 230 + w, 40 + i * 36, 'stroke="#111" stroke-width="12" stroke-linecap="round"') for i, w in enumerate([180, 120, 160, 90, 170, 110])))

# ---------- Symbols and simple redrawn marks ----------
svg('sym-power', 260, 260, path('M85,80 A80,80 0 1 0 175,80', 'stroke="#111" stroke-width="16" fill="none" stroke-linecap="round"') + line(130, 40, 130, 130, 'stroke="#111" stroke-width="16" stroke-linecap="round"'))
b = ''
for k in range(3):
    a = math.radians(k * 120)
    b += f'<g transform="rotate({k*120} 150 150)"><path d="M110,90 L150,30 L190,90" stroke="#111" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M178,72 L196,98 L166,98" fill="#111"/></g>'

svg('sym-wifi', 300, 260, circ(150, 210, 14, 'fill="#111"') + ''.join(path(f'M{150 - r * 0.8:.0f},{210 - r * 0.6:.0f} A{r},{r} 0 0 1 {150 + r * 0.8:.0f},{210 - r * 0.6:.0f}', 'stroke="#111" stroke-width="14" fill="none" stroke-linecap="round"') for r in (60, 110, 160)))

svg('sym-play', 260, 260, circ(130, 130, 110) + path('M105,85 L180,130 L105,175 Z', 'fill="#111"'))
svg('sym-share', 280, 260, line(80, 130, 200, 60, 'stroke="#111" stroke-width="10"') + line(80, 130, 200, 200, 'stroke="#111" stroke-width="10"') + circ(80, 130, 28, 'fill="#111"') + circ(200, 60, 28, 'fill="#111"') + circ(200, 200, 28, 'fill="#111"'))
svg('sym-hamburger', 260, 220, ''.join(line(50, y, 210, y, 'stroke="#111" stroke-width="18" stroke-linecap="round"') for y in (60, 110, 160)))
svg('sym-floppy', 260, 260, path('M40,40 H190 L220,70 V220 H40 Z') + rect(80, 40, 90, 60) + rect(70, 140, 120, 80))
