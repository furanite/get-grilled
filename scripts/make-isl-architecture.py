# Draws the Islamic architecture picture questions into questions/img/isl-*.svg.
# Buildings and architectural elements only: no people or living beings, and never Makkah or Madinah.
# Plain shapes, no fonts and no outside files, so they load under the site's strict security rules.
import math
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'questions', 'img')
os.makedirs(OUT, exist_ok=True)

W, H = 400, 300
SKY = '#f3ead8'      # warm sand sky
INK = '#22304a'      # deep indigo for buildings
INK2 = '#36476a'     # a lighter face of the same
GOLD = '#c99a3b'
TURQ = '#2f8f8a'
RED = '#a8442c'
WHITE = '#fbf7ee'
MUD = '#9c6b3e'
MUD2 = '#80552f'
GROUND = '#d9c7a3'


def svg(name, body, sky=SKY):
    with open(os.path.join(OUT, f'isl-{name}.svg'), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W*2}" height="{H*2}">'
                f'<rect width="{W}" height="{H}" fill="{sky}"/>{body}</svg>')


def rect(x, y, w, h, fill=INK, extra=''):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" {extra}/>'


def path(d, fill=INK, extra=''):
    return f'<path d="{d}" fill="{fill}" {extra}/>'


def circle(x, y, r, fill=INK):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}"/>'


def ground(y=262):
    return rect(0, y, W, H - y, GROUND)


def pointed_arch(x, y, w, h, fill=SKY):
    """A pointed arch opening: x,y is the bottom-left corner."""
    r = w * 0.62
    spring = y - h + w * 0.55
    return path(f'M{x},{y} V{spring} Q{x},{y-h+w*0.12} {x+w/2},{y-h} Q{x+w},{y-h+w*0.12} {x+w},{spring} V{y} Z', fill)


def round_arch(x, y, w, h, fill=SKY):
    return path(f'M{x},{y} V{y-h+w/2} A{w/2},{w/2} 0 0 1 {x+w},{y-h+w/2} V{y} Z', fill)


def onion(cx, base, w, h, fill=WHITE):
    """An onion dome sitting on `base`, w wide and h tall."""
    a = w / 2
    return path(f'M{cx-a*0.82},{base} C{cx-a*1.25},{base-h*0.35} {cx-a*0.55},{base-h*0.7} {cx},{base-h} '
                f'C{cx+a*0.55},{base-h*0.7} {cx+a*1.25},{base-h*0.35} {cx+a*0.82},{base} Z', fill)


def half_dome(cx, base, r, fill=INK):
    return path(f'M{cx-r},{base} A{r},{r} 0 0 1 {cx+r},{base} Z', fill)


def finial(cx, top, length=14, fill=GOLD):
    return rect(cx - 1.2, top - length, 2.4, length, fill) + circle(cx, top - length - 2, 2.6, fill)


def pencil_minaret(cx, base, top, w=9, fill=INK, balconies=3):
    """An Ottoman pencil minaret: thin shaft, balconies and a sharp cone."""
    b = rect(cx - w / 2, top, w, base - top, fill)
    for i in range(balconies):
        y = top + 18 + i * (base - top - 40) / max(1, balconies)
        b += rect(cx - w / 2 - 3, y, w + 6, 3, fill)
    b += path(f'M{cx-w/2-1},{top} L{cx},{top-34} L{cx+w/2+1},{top} Z', fill)
    b += finial(cx, top - 34, 8)
    return b


# ---------- Landmarks ----------

def dome_of_the_rock():
    b = ground()
    # Octagon seen from the front: a wide central face and two narrower side faces
    b += rect(100, 175, 200, 87, INK)
    b += rect(100, 175, 45, 87, INK2) + rect(255, 175, 45, 87, INK2)
    b += rect(96, 170, 208, 7, INK)
    for x in (160, 182, 204, 226):
        b += pointed_arch(x, 236, 14, 34, '#e8dcc2')
    for x in (112, 128, 267, 283):
        b += pointed_arch(x, 236, 9, 28, '#e8dcc2')
    # Drum and the golden dome
    b += rect(150, 140, 100, 32, INK2)
    for x in range(156, 246, 12):
        b += pointed_arch(x, 166, 6, 18, '#e8dcc2')
    b += path('M146,141 C146,78 254,78 254,141 Z', GOLD)
    b += finial(200, 86, 16)
    return b


def malwiya():
    b = ground()
    b += rect(110, 238, 180, 24, MUD2)
    # A cone whose ramp spirals round it
    top, bot = 70, 238
    def half(y):
        return 18 + (90 - 18) * (y - top) / (bot - top)
    b += path(f'M{200-half(bot)},{bot} L{200-half(top)},{top} L{200+half(top)},{top} L{200+half(bot)},{bot} Z', MUD)
    y = bot
    step = 30
    while y - step > top:
        y2 = y - step
        b += path(f'M{200-half(y)},{y} L{200+half(y2)},{y2} L{200+half(y2)},{y2+6} L{200-half(y)},{y+6} Z', MUD2)
        y = y2
    b += rect(186, 46, 28, 24, MUD) + pointed_arch(194, 66, 12, 16, SKY)
    return b


def taj_mahal():
    b = ground(248)
    b += rect(30, 232, 340, 18, WHITE, f'stroke="{INK}" stroke-width="2"')
    # Four minarets
    for x in (50, 92, 308, 350):
        b += rect(x - 5, 112, 10, 120, WHITE, f'stroke="{INK}" stroke-width="1.5"')
        for y in (145, 180, 210):
            b += rect(x - 8, y, 16, 3, INK)
        b += rect(x - 9, 104, 18, 8, WHITE, f'stroke="{INK}" stroke-width="1.5"')
        b += onion(x, 104, 16, 16, WHITE) + finial(x, 88, 6)
    # Main hall with its great iwan
    b += rect(120, 150, 160, 82, WHITE, f'stroke="{INK}" stroke-width="2"')
    b += pointed_arch(176, 232, 48, 70, '#d8cdb8')
    for x in (132, 254):
        b += pointed_arch(x, 190, 14, 26, '#d8cdb8') + pointed_arch(x, 228, 14, 26, '#d8cdb8')
    # Drum, onion dome and two kiosks (chhatris)
    b += rect(162, 136, 76, 16, WHITE, f'stroke="{INK}" stroke-width="2"')
    b += onion(200, 138, 104, 96, WHITE).replace('/>', f' stroke="{INK}" stroke-width="2"/>') + finial(200, 42, 14)
    for x in (140, 260):
        b += rect(x - 12, 132, 24, 18, WHITE, f'stroke="{INK}" stroke-width="1.5"')
        b += onion(x, 132, 26, 22, WHITE).replace('/>', f' stroke="{INK}" stroke-width="1.5"/>') + finial(x, 110, 6)
    return b


def sultan_ahmed():
    b = ground()
    b += rect(105, 180, 190, 82, INK)
    for x in range(118, 290, 22):
        b += round_arch(x, 250, 12, 24, '#cfd5e2')
    # A cascade of domes
    b += half_dome(200, 150, 62, INK2) + rect(138, 148, 124, 34, INK2)
    b += finial(200, 88, 16)
    for cx in (138, 262):
        b += half_dome(cx, 180, 34, INK2)
    for cx in (116, 284):
        b += half_dome(cx, 184, 16, INK)
    # Six minarets
    for cx, top in ((32, 70), (68, 54), (100, 54), (300, 54), (332, 54), (368, 70)):
        b += pencil_minaret(cx, 262, top)
    return b


def djenne():
    b = ground()
    b += path('M60,262 L72,150 L328,150 L340,262 Z', MUD)
    # Three tower fronts with pinnacles
    for cx, top in ((120, 70), (200, 52), (280, 70)):
        b += path(f'M{cx-30},{150} L{cx-24},{top+18} L{cx+24},{top+18} L{cx+30},{150} Z', MUD)
        for dx in (-18, 0, 18):
            b += path(f'M{cx+dx-6},{top+20} L{cx+dx-4},{top} L{cx+dx+4},{top} L{cx+dx+6},{top+20} Z', MUD2)
            b += circle(cx + dx, top - 3, 4, MUD2)
    # Pilasters along the roof line
    for x in range(78, 330, 16):
        b += path(f'M{x-4},150 L{x-3},132 L{x+3},132 L{x+4},150 Z', MUD2)
    # The palm-wood sticks (toron) poking out of the walls
    for row in range(5):
        y = 110 + row * 30
        for x in range(76, 330, 22):
            if y < 150 and not any(abs(x - c) < 26 for c in (120, 200, 280)):
                continue
            b += rect(x, y, 10, 2.5, '#5a3a1e')
    return b


def cordoba_arches():
    b = rect(0, 0, W, H, '#2a1d17')
    def arch_ring(cx, cy, r1, r2, n, start, end):
        out = ''
        for i in range(n):
            a1 = start + (end - start) * i / n
            a2 = start + (end - start) * (i + 1) / n
            pts = []
            for a in (a1, a2):
                pts.append((cx + r2 * math.cos(a), cy - r2 * math.sin(a)))
            for a in (a2, a1):
                pts.append((cx + r1 * math.cos(a), cy - r1 * math.sin(a)))
            d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'
            out += path(d, RED if i % 2 == 0 else WHITE)
        return out
    for cx in (70, 200, 330):
        # Upper round arch
        b += arch_ring(cx, 96, 44, 58, 13, -0.05, math.pi + 0.05)
        # Lower horseshoe arch: it carries on past the half circle
        b += arch_ring(cx, 186, 40, 54, 15, -0.42, math.pi + 0.42)
    for x in (5, 135, 265, 395):
        b += rect(x - 9, 100, 18, 162, '#d9c9a8') + rect(x - 13, 100, 26, 8, '#b9a47c')
        b += rect(x - 7, 190, 14, 72, '#cbb894')
    b += rect(0, 262, W, 38, '#1c130f')
    return b


def kalyan():
    b = ground()
    b += rect(80, 210, 240, 52, MUD2)
    for x in range(92, 310, 24):
        b += pointed_arch(x, 252, 12, 26, '#e3d2b4')
    top, bot = 70, 262
    b += path(f'M170,{bot} L182,{top} L218,{top} L230,{bot} Z', MUD)
    for y in range(90, 250, 22):
        b += rect(170 + (y - top) / (bot - top) * 0 + 6 * (bot - y) / (bot - top), y, 60 - 12 * (bot - y) / (bot - top), 4, MUD2)
    # The lantern with arched openings, and its cornice
    b += rect(176, 40, 48, 30, MUD) + rect(172, 66, 56, 6, MUD2) + rect(172, 36, 56, 6, MUD2)
    for x in (181, 195, 209):
        b += pointed_arch(x, 64, 9, 20, SKY)
    b += path('M178,36 C182,22 218,22 222,36 Z', MUD2)
    return b


def qutb_minar():
    b = ground()
    top, bot = 36, 262
    def half(y):
        return 9 + (28 - 9) * (y - top) / (bot - top)
    b += path(f'M{200-half(bot)},{bot} L{200-half(top)},{top} L{200+half(top)},{top} L{200+half(bot)},{bot} Z', RED)
    # Flutes
    for y in range(top, bot, 3):
        pass
    for k in (-0.6, -0.2, 0.2, 0.6):
        b += path(f'M{200+k*half(bot)},{bot} L{200+k*half(top)},{top}', 'none', f'stroke="#7d2e1d" stroke-width="2"')
    # Five storeys, each ending in a balcony
    for y in (210, 160, 116, 78, 50):
        h = half(y)
        b += rect(200 - h - 7, y, 2 * h + 14, 6, '#7d2e1d')
        b += path(f'M{200-h-7},{y+6} L{200-h},{y+13} L{200+h},{y+13} L{200+h+7},{y+6} Z', '#7d2e1d')
    b += rect(193, 20, 14, 16, '#e9dcc4') + path('M190,20 L200,10 L210,20 Z', '#7d2e1d')
    return b


def registan():
    b = ground()
    def madrasa(cx, w, h, dome=False):
        out = ''
        if dome:
            out += rect(cx + w / 2 - 6, 262 - h - 20, 44, 24, INK2)
            out += path(f'M{cx+w/2-10},{262-h-18} C{cx+w/2-10},{262-h-70} {cx+w/2+42},{262-h-70} {cx+w/2+42},{262-h-18} Z', TURQ)
            for k in range(-2, 3):
                x = cx + w / 2 + 16 + k * 9
                out += path(f'M{x},{262-h-18} Q{x+k*1.5},{262-h-48} {cx+w/2+16},{262-h-62}', 'none', f'stroke="#1f6662" stroke-width="2"')
        out += rect(cx - w / 2, 262 - h, w, h, INK)
        out += rect(cx - w / 2 + 6, 262 - h + 6, w - 12, h - 6, TURQ)
        out += pointed_arch(cx - w * 0.28, 262, w * 0.56, h * 0.82, INK2)
        for side in (-1, 1):
            x = cx + side * (w / 2 + 8)
            out += rect(x - 6, 262 - h - 20, 12, h + 20, INK)
            out += path(f'M{x-8},{262-h-20} C{x-8},{262-h-34} {x+8},{262-h-34} {x+8},{262-h-20} Z', TURQ)
        return out
    b += madrasa(70, 78, 120) + madrasa(330, 78, 120) + madrasa(200, 96, 140, dome=True)
    return b


def hassan_ii():
    b = rect(0, 0, W, H, '#dfe8ea')
    b += rect(0, 236, W, 64, '#5f8fa3')
    for x in range(0, W, 40):
        b += path(f'M{x},244 q10,-6 20,0 t20,0', 'none', f'stroke="{WHITE}" stroke-width="2"')
    b += rect(150, 186, 240, 52, '#e8e0cf') + rect(150, 180, 240, 8, '#2e7d5b')
    for x in range(164, 380, 24):
        b += pointed_arch(x, 232, 12, 30, '#b9b09c')
    # The very tall square minaret with its green crown
    b += rect(78, 40, 52, 198, '#e8e0cf')
    for y in (70, 110, 150, 190):
        b += rect(86, y, 36, 24, '#2e7d5b')
        b += pointed_arch(98, y + 22, 12, 18, '#e8e0cf')
    b += rect(74, 36, 60, 8, '#2e7d5b')
    b += rect(92, 14, 24, 22, '#e8e0cf') + path('M90,14 L104,2 L118,14 Z', '#2e7d5b')
    b += finial(104, 2, 6)
    return b


def kairouan():
    b = ground()
    b += rect(40, 210, 320, 52, '#c9b28a')
    for x in range(44, 360, 16):
        b += rect(x, 202, 9, 10, '#c9b28a')
    # The massive square minaret in three stepped tiers
    b += rect(150, 110, 100, 152, '#b89c6e')
    for x in range(150, 250, 14):
        b += rect(x + 2, 102, 9, 9, '#b89c6e')
    b += rect(168, 70, 64, 40, '#b89c6e')
    for x in range(168, 232, 12):
        b += rect(x + 2, 63, 8, 8, '#b89c6e')
    b += rect(186, 46, 28, 24, '#b89c6e') + path('M184,46 C186,28 214,28 216,46 Z', '#a88c5e')
    for y in (140, 185, 225):
        b += round_arch(194, y, 12, 22, '#6b5a3c')
    b += round_arch(194, 100, 12, 20, '#6b5a3c')
    return b


def faisal():
    b = ground()
    # A tent-like roof of folded triangles
    b += path('M88,236 L200,96 L312,236 Z', '#e6e1d6', f'stroke="{INK}" stroke-width="2"')
    b += path('M200,96 L170,236 M200,96 L230,236 M200,96 L200,236', 'none', f'stroke="{INK}" stroke-width="2"')
    b += path('M88,236 L130,236 L120,262 L80,262 Z M312,236 L270,236 L280,262 L320,262 Z', '#cfc8b8')
    b += rect(120, 236, 160, 26, '#cfc8b8')
    for x in range(132, 272, 18):
        b += rect(x, 242, 10, 18, INK2)
    # Four very slim pencil minarets
    for cx in (40, 72, 328, 360):
        b += rect(cx - 4, 50, 8, 212, '#e6e1d6', f'stroke="{INK}" stroke-width="1.5"')
        b += rect(cx - 7, 120, 14, 4, INK)
        b += path(f'M{cx-5},50 L{cx},22 L{cx+5},50 Z', INK)
    return b


def badshahi():
    b = ground()
    b += rect(70, 160, 260, 102, RED)
    b += pointed_arch(176, 262, 48, 82, '#e8d7c3')
    for x in (98, 128, 252, 282):
        b += pointed_arch(x, 252, 20, 50, '#e8d7c3')
    # Three white marble onion domes, the middle one largest
    for cx, w, h in ((128, 50, 52), (200, 76, 78), (272, 50, 52)):
        b += rect(cx - w * 0.36, 150, w * 0.72, 12, WHITE)
        b += onion(cx, 152, w, h, WHITE) + finial(cx, 152 - h, 10)
    # Corner minarets, octagonal with small kiosks on top
    for cx in (40, 360):
        b += rect(cx - 8, 92, 16, 170, RED)
        for y in (130, 175, 220):
            b += rect(cx - 11, y, 22, 4, '#7d2e1d')
        b += rect(cx - 10, 78, 20, 14, WHITE) + half_dome(cx, 78, 10, WHITE) + finial(cx, 68, 6)
    return b


def demak():
    b = ground()
    b += rect(80, 214, 240, 48, '#efe4cf') + rect(80, 214, 240, 6, '#5a4632')
    for x in range(96, 310, 26):
        b += rect(x, 222, 6, 40, '#5a4632')
    # Three stacked, square, pyramid roofs with no dome
    b += path('M60,216 L200,170 L340,216 Z', '#3f3a35')
    b += rect(150, 156, 100, 16, '#efe4cf')
    b += path('M118,160 L200,124 L282,160 Z', '#3f3a35')
    b += rect(168, 110, 64, 16, '#efe4cf')
    b += path('M146,114 L200,70 L254,114 Z', '#3f3a35')
    b += rect(197, 54, 6, 18, '#3f3a35') + circle(200, 52, 5, '#3f3a35')
    return b



def ibn_tulun():
    b = ground()
    b += rect(30, 196, 340, 66, '#c9ad80')
    for x in range(40, 360, 26):
        b += pointed_arch(x, 252, 16, 40, '#6e5a3c')
    for x in range(30, 370, 12):
        b += rect(x + 2, 188, 8, 9, '#c9ad80')
    # Minaret: a square base, then a round shaft, with a stair winding round the outside
    b += rect(250, 120, 64, 142, '#bf9f6c')
    b += rect(262, 70, 40, 50, '#bf9f6c')
    for i in range(3):
        y = 196 - i * 36
        b += path(f'M250,{y} L314,{y-26} L314,{y-18} L250,{y+8} Z', '#8f7448')
    b += path('M262,90 L302,74 L302,80 L262,96 Z', '#8f7448')
    b += rect(270, 44, 24, 26, '#bf9f6c') + path('M268,44 C270,30 294,30 296,44 Z', '#8f7448')
    return b


def gur_e_amir():
    b = ground()
    b += rect(110, 170, 180, 92, '#2c4a7a')
    b += rect(122, 182, 156, 80, TURQ)
    b += pointed_arch(170, 262, 60, 72, '#1f3354')
    # A tall drum and a ribbed, melon-shaped turquoise dome
    b += rect(150, 112, 100, 60, '#2c4a7a')
    for x in range(156, 248, 10):
        b += rect(x, 118, 5, 48, '#e8c46a')
    b += path('M140,114 C120,60 170,20 200,18 C230,20 280,60 260,114 Z', TURQ)
    for k in (-3, -2, -1, 0, 1, 2, 3):
        b += path(f'M{200+k*17},114 C{200+k*22},70 {200+k*10},30 200,18', 'none', 'stroke="#1f6662" stroke-width="3"')
    b += finial(200, 18, 12)
    for cx in (96, 304):
        b += rect(cx - 8, 120, 16, 142, '#2c4a7a') + path(f'M{cx-10},120 C{cx-10},104 {cx+10},104 {cx+10},120 Z', TURQ)
    return b


def selimiye():
    b = ground()
    b += rect(100, 186, 200, 76, INK)
    for x in range(112, 292, 20):
        b += round_arch(x, 252, 10, 24, '#cfd5e2')
    # One great dome, buttressed by small turrets, and four very tall minarets close by
    b += rect(128, 160, 144, 28, INK2)
    b += half_dome(200, 162, 78, INK2) + finial(200, 84, 18)
    for x in (136, 166, 234, 264):
        b += rect(x - 6, 140, 12, 24, INK) + path(f'M{x-7},140 L{x},128 L{x+7},140 Z', INK)
    for cx in (84, 112, 288, 316):
        b += pencil_minaret(cx, 262, 30, 10)
    return b


def shah_isfahan():
    b = rect(0, 0, W, H, SKY)
    b += rect(0, 246, W, 54, GROUND)
    b += rect(60, 250, 280, 26, '#7fb3c8')
    # Turquoise dome behind a great portal flanked by two minarets
    b += rect(220, 110, 90, 60, '#2a5f8a')
    b += path('M210,112 C210,40 320,40 320,112 Z', TURQ) + finial(265, 52, 12)
    b += rect(120, 100, 120, 146, '#2a5f8a')
    b += rect(130, 110, 100, 136, TURQ)
    b += pointed_arch(150, 246, 60, 120, '#e8c46a')
    b += pointed_arch(160, 246, 40, 96, '#1f3354')
    for cx in (110, 250):
        b += rect(cx - 7, 50, 14, 196, '#2a5f8a') + rect(cx - 10, 62, 20, 8, '#e8c46a')
        b += path(f'M{cx-8},50 C{cx-8},38 {cx+8},38 {cx+8},50 Z', TURQ)
    return b


def qarawiyyin():
    b = ground()
    b += rect(40, 170, 320, 92, '#efe6d2')
    for x in range(56, 350, 30):
        b += pointed_arch(x, 252, 18, 44, '#3f6b4a')
    # Rows of green-tiled pitched roofs, and a square white minaret
    for x in range(40, 360, 40):
        b += path(f'M{x},172 L{x+20},146 L{x+40},172 Z', '#2e7d5b')
    b += rect(60, 60, 50, 112, '#efe6d2', f'stroke="{INK}" stroke-width="1.5"')
    b += rect(66, 80, 38, 22, '#2e7d5b') + rect(66, 120, 38, 22, '#2e7d5b')
    b += rect(56, 56, 58, 6, '#2e7d5b') + rect(74, 34, 22, 22, '#efe6d2', f'stroke="{INK}" stroke-width="1.5"')
    b += path('M72,34 L85,22 L98,34 Z', '#2e7d5b') + finial(85, 22, 6)
    return b


def umayyad_damascus():
    b = ground()
    # A long prayer hall with a high central gable and dome, and square minarets
    b += rect(40, 182, 320, 80, '#cdb98f')
    for x in range(52, 350, 22):
        b += round_arch(x, 252, 12, 30, '#6b5a3c')
    b += path('M40,184 L200,160 L360,184 Z', '#8a7a5a')
    b += rect(170, 120, 60, 64, '#cdb98f') + path('M164,124 L200,100 L236,124 Z', '#8a7a5a')
    b += half_dome(200, 104, 26, '#6f8f8a')
    for cx, top in ((60, 70), (340, 84)):
        b += rect(cx - 12, top, 24, 182 - top, '#cdb98f')
        b += rect(cx - 16, top, 32, 6, '#8a7a5a') + rect(cx - 8, top - 22, 16, 22, '#cdb98f') + path(f'M{cx-10},{top-22} L{cx},{top-38} L{cx+10},{top-22} Z', '#8a7a5a')
    b += rect(194, 40, 12, 60, '#cdb98f') + path('M192,40 L200,26 L208,40 Z', '#8a7a5a')
    return b


# ---------- Architectural elements ----------

def horseshoe_arch():
    b = rect(0, 0, W, H, '#e9dfcb')
    b += rect(110, 40, 180, 222, '#c7b48c')
    # The opening widens above where it springs from the columns
    b += path('M150,262 V170 A62,62 0 1 1 250,170 V262 Z', '#3b2f25')
    b += rect(140, 160, 14, 102, '#a8946a') + rect(246, 160, 14, 102, '#a8946a')
    b += rect(0, 262, W, 38, '#b8a37a')
    return b


def muqarnas():
    """A portal hood filled with tiers of small niches, stepping in towards the top, like a honeycomb."""
    b = rect(0, 0, W, H, '#ead9b8')
    b += rect(70, 20, 260, 262, '#8a6a3a')
    b += pointed_arch(90, 282, 220, 262, '#c9a66b')
    # Row by row from the bottom up, each tier narrower and pushed in under the arch
    y = 200
    for i in range(9):
        h = 22 - i
        half = 105 * math.sqrt(max(0.0, 1 - ((200 - y) / 182) ** 2)) if y < 200 else 105
        n = max(1, int(2 * half / 20))
        w = 2 * half / n
        x0 = 200 - half + (w / 2 if i % 2 and n > 1 else 0)
        for j in range(n - (1 if i % 2 and n > 1 else 0)):
            x = x0 + j * w
            fill = '#e3c48c' if (i + j) % 2 else '#b98d4c'
            b += path(f'M{x},{y} V{y-h*0.45} Q{x},{y-h} {x+w/2},{y-h} Q{x+w},{y-h} {x+w},{y-h*0.45} V{y} Z', fill, 'stroke="#6e5026" stroke-width="1.2"')
        y -= h
    b += rect(90, 200, 220, 82, '#5c4630')
    b += pointed_arch(160, 282, 80, 70, '#3a2b1c')
    return b


def mihrab():
    b = rect(0, 0, W, H, '#efe6d2')
    b += rect(110, 40, 180, 230, '#d8c49b')
    b += rect(122, 52, 156, 218, '#c4a974')
    # The niche
    b += pointed_arch(150, 270, 100, 186, '#2f5d55')
    b += pointed_arch(162, 270, 76, 160, '#3f776d')
    for x in range(168, 236, 10):
        b += rect(x, 150, 4, 120, '#36695f')
    b += rect(0, 270, W, 30, '#7a2f2f')
    for x in range(0, W, 30):
        b += rect(x + 4, 274, 22, 4, '#a24b3a')
    return b


def minbar():
    b = rect(0, 0, W, H, '#efe6d2')
    b += rect(0, 262, W, 38, '#7a2f2f')
    # A stair of steps rising to a seat under a small canopy, with a door at the foot
    steps = 8
    for i in range(steps):
        x = 90 + i * 22
        top = 252 - i * 18
        b += rect(x, top, 22, 262 - top, '#8a5a2b', 'stroke="#5e3b1a" stroke-width="1.5"')
    b += path('M86,262 L86,252 L268,108 L282,108 L282,262 Z', 'none', 'stroke="#5e3b1a" stroke-width="5"')
    b += rect(70, 170, 34, 92, '#6e4520') + pointed_arch(76, 262, 22, 70, '#3a2410')
    b += path('M70,170 L87,150 L104,170 Z', '#6e4520')
    b += rect(262, 108, 40, 154, '#6e4520')
    b += rect(260, 56, 4, 52, '#6e4520') + rect(298, 56, 4, 52, '#6e4520')
    b += path('M254,58 L282,26 L308,58 Z', '#6e4520') + finial(281, 26, 8)
    return b


def mashrabiya():
    b = rect(0, 0, W, H, '#e8dcc4')
    b += rect(100, 30, 200, 240, '#6b4423')
    # A lattice of turned wooden spindles and beads
    for y in range(44, 258, 14):
        b += rect(110, y, 180, 3, '#c79a5b')
    for x in range(114, 290, 14):
        b += rect(x, 40, 3, 222, '#c79a5b')
    for y in range(44, 258, 14):
        for x in range(114, 290, 14):
            b += circle(x + 1.5, y + 1.5, 3.4, '#e0b674')
    b += rect(92, 22, 216, 10, '#4a2e17') + rect(92, 266, 216, 10, '#4a2e17')
    return b


def eight_star():
    b = rect(0, 0, W, H, '#f2e9d6')
    cx, cy, r = 200, 150, 100
    def square(rot):
        pts = [(cx + r * math.cos(rot + k * math.pi / 2), cy + r * math.sin(rot + k * math.pi / 2)) for k in range(4)]
        return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'
    b += path(square(math.pi / 4), GOLD, f'stroke="{INK}" stroke-width="4"')
    b += path(square(0), GOLD, f'stroke="{INK}" stroke-width="4"')
    b += circle(cx, cy, 34, '#f2e9d6') + f'<circle cx="{cx}" cy="{cy}" r="34" fill="none" stroke="{INK}" stroke-width="4"/>'
    return b


def iwan():
    b = ground()
    b += rect(60, 140, 280, 122, '#c9b28a')
    # A tall vaulted hall, walled on three sides and open on the fourth, inside a rectangular frame
    b += rect(120, 40, 160, 222, '#3a6f8f')
    b += rect(132, 52, 136, 210, '#e3d4b2')
    b += pointed_arch(150, 262, 100, 196, '#5c4630')
    b += path('M150,262 L170,230 L230,230 L250,262 Z', '#7a5e40')
    for x in (74, 98, 288, 312):
        b += pointed_arch(x, 250, 16, 36, '#5c4630')
    return b


def chahar_bagh():
    b = rect(0, 0, W, H, '#e9e0c9')
    # Plan view: a walled garden cut into four by water channels, a pool at the crossing
    b += rect(60, 20, 280, 260, '#7a9a5a', f'stroke="{INK}" stroke-width="6"')
    b += rect(190, 20, 20, 260, '#4f8fb0') + rect(60, 140, 280, 20, '#4f8fb0')
    b += rect(176, 126, 48, 48, '#4f8fb0', f'stroke="{INK}" stroke-width="3"')
    for x, y in ((80, 40), (230, 40), (80, 170), (230, 170)):
        for i in range(3):
            for j in range(3):
                b += circle(x + 15 + i * 32, y + 15 + j * 32, 7, '#4f6d3a')
    return b


def ablaq():
    b = rect(0, 0, W, H, '#efe6d2')
    for i, y in enumerate(range(20, 262, 18)):
        b += rect(70, y, 260, 18, '#2b2b2b' if i % 2 else '#e7dcc4')
    b += pointed_arch(150, 262, 100, 170, '#5b3a22')
    b += rect(0, 262, W, 38, '#b8a37a')
    return b


def spiral_or_ottoman():
    """An Ottoman 'pencil' minaret on its own, for the minaret-shape question."""
    b = ground()
    b += half_dome(260, 230, 70, INK2) + rect(170, 228, 180, 34, INK2)
    b += pencil_minaret(110, 262, 60, 14)
    return b


for name, fn in [
    ('dome-of-the-rock', dome_of_the_rock), ('malwiya', malwiya), ('taj-mahal', taj_mahal),
    ('sultan-ahmed', sultan_ahmed), ('djenne', djenne), ('cordoba-arches', cordoba_arches),
    ('kalyan', kalyan), ('qutb-minar', qutb_minar), ('registan', registan), ('hassan-ii', hassan_ii),
    ('kairouan', kairouan), ('faisal', faisal), ('badshahi', badshahi), ('demak', demak),
    ('horseshoe-arch', horseshoe_arch), ('muqarnas', muqarnas), ('mihrab', mihrab), ('minbar', minbar),
    ('mashrabiya', mashrabiya), ('eight-star', eight_star), ('iwan', iwan), ('chahar-bagh', chahar_bagh),
    ('ablaq', ablaq), ('pencil-minaret', spiral_or_ottoman),
    ('ibn-tulun', ibn_tulun), ('gur-e-amir', gur_e_amir), ('selimiye', selimiye), ('shah-isfahan', shah_isfahan),
    ('qarawiyyin', qarawiyyin), ('umayyad-damascus', umayyad_damascus),
]:
    svg(name, fn())
print('drew 30 pictures')
