# Draws simple world flags into questions/img/flag-*.svg (all 3:2, colours approximate).
# Flags that carry religious writing (for example Saudi Arabia, Iraq, Iran, Afghanistan) are left out on purpose.
import os, math
OUT = os.path.join(os.path.dirname(__file__), '..', 'questions', 'img')
W, H = 300, 200
C = dict(red='#d52b1e', dred='#b5121b', maroon='#8a1538', white='#ffffff', blue='#0039a6', navy='#012169', lblue='#74acdf', sky='#4aadd6',
         green='#009a44', dgreen='#006c35', yellow='#fcd116', gold='#ffce00', black='#000000', orange='#ff8200', saffron='#ff9933', carmine='#9e3039', aqua='#00abc9')

def star(cx, cy, r, color, points=5, rot=-90, inner=0.382):
    pts = []
    for i in range(points * 2):
        a = math.radians(rot + i * 180 / points)
        rr = r if i % 2 == 0 else r * inner
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{color}"/>'
def rect(x, y, w, h, c): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
def poly(pts, c): return f'<polygon points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="{c}"/>'
def circle(cx, cy, r, c): return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>'
def hstripes(*cols, weights=None):
    weights = weights or [1] * len(cols)
    tot = sum(weights); y = 0; out = ''
    for c, w in zip(cols, weights):
        h = H * w / tot; out += rect(0, f'{y:.2f}', W, f'{h + 0.5:.2f}', C.get(c, c)); y += h
    return out
def vstripes(*cols, weights=None):
    weights = weights or [1] * len(cols)
    tot = sum(weights); x = 0; out = ''
    for c, w in zip(cols, weights):
        w2 = W * w / tot; out += rect(f'{x:.2f}', 0, f'{w2 + 0.5:.2f}', H, C.get(c, c)); x += w2
    return out
def crescent(cx, cy, r, color, bg, off=0.25, scale=0.8):
    return circle(cx, cy, r, color) + circle(cx + r * off, cy, r * scale, bg)
def nordic(bg, cross, inner=None):
    b = rect(0, 0, W, H, C[bg]) + rect(0, 80, W, 40, C[cross]) + rect(80, 0, 40, H, C[cross])
    if inner: b += rect(0, 88, W, 24, C[inner]) + rect(88, 0, 24, H, C[inner])
    return b
def union_jack(w=W, h=H):
    # St Andrew's and St Patrick's saltires (simplified, centred) under St George's cross
    t = h / 10
    b = f'<rect width="{w}" height="{h}" fill="{C["navy"]}"/>'
    b += f'<path d="M0,0 L{w},{h} M{w},0 L0,{h}" stroke="#fff" stroke-width="{t*3}"/>'
    b += f'<path d="M0,0 L{w},{h} M{w},0 L0,{h}" stroke="{C["red"]}" stroke-width="{t}"/>'
    b += f'<rect x="0" y="{h/2 - t*2.5}" width="{w}" height="{t*5}" fill="#fff"/><rect x="{w/2 - t*2.5}" y="0" width="{t*5}" height="{h}" fill="#fff"/>'
    b += f'<rect x="0" y="{h/2 - t*1.5}" width="{w}" height="{t*3}" fill="{C["red"]}"/><rect x="{w/2 - t*1.5}" y="0" width="{t*3}" height="{h}" fill="{C["red"]}"/>'
    return b
def canton_uk(): return f'<svg x="0" y="0" width="150" height="100" viewBox="0 0 {W} {H}" preserveAspectRatio="none">{union_jack()}</svg>'
def hoist_triangle(c, depth=0.5): return poly([(0, 0), (W * depth, H / 2), (0, H)], C.get(c, c))

F = {}
# Horizontal stripes
F['germany'] = hstripes('black', 'red', 'gold')
F['russia'] = hstripes('white', '#0039a6', 'red')
F['netherlands'] = hstripes('#ae1c28', 'white', '#21468b')
F['austria'] = hstripes('#ed2939', 'white', '#ed2939')
F['hungary'] = hstripes('#cd2a3e', 'white', '#436f4d')
F['bulgaria'] = hstripes('white', '#00966e', '#d62612')
F['lithuania'] = hstripes('#fdb913', '#006a44', '#c1272d')
F['estonia'] = hstripes('#0072ce', 'black', 'white')
F['yemen'] = hstripes('#ce1126', 'white', 'black')
F['armenia'] = hstripes('#d90012', '#0033a0', '#f2a800')
F['colombia'] = hstripes('#fcd116', '#003893', '#ce1126', weights=[2, 1, 1])
F['ukraine'] = hstripes('#0057b7', '#ffd700')
F['poland'] = hstripes('white', '#dc143c')
F['indonesia'] = hstripes('red', 'white')
F['spain'] = hstripes('#aa151b', '#f1bf00', '#aa151b', weights=[1, 2, 1])
F['thailand'] = hstripes('#a51931', 'white', '#2d2a4a', 'white', '#a51931', weights=[1, 1, 2, 1, 1])
F['latvia'] = hstripes(C['carmine'], 'white', C['carmine'], weights=[2, 1, 2])
F['mauritius'] = hstripes('#ea2839', '#1a206d', '#ffd500', '#00a551')
F['gabon'] = hstripes('#009e60', '#fcd116', '#3a75c4')
F['sierra-leone'] = hstripes('#1eb53a', 'white', '#0072c6')
F['botswana'] = rect(0, 0, W, H, '#6da9d2') + rect(0, 80, W, 40, 'white') + rect(0, 88, W, 24, 'black')
F['gambia'] = hstripes('#ce1126', 'white', '#0c1c8c', 'white', '#3a7728', weights=[6, 1, 4, 1, 6])
F['argentina'] = hstripes(C['lblue'], 'white', C['lblue']) + circle(150, 100, 20, '#f6b40e')
F['india'] = hstripes(C['saffron'], 'white', '#138808') + f'<circle cx="150" cy="100" r="26" fill="none" stroke="#000080" stroke-width="4"/>' + ''.join(f'<line x1="150" y1="100" x2="{150 + 26 * math.cos(i * math.pi / 12):.1f}" y2="{100 + 26 * math.sin(i * math.pi / 12):.1f}" stroke="#000080" stroke-width="1.5"/>' for i in range(24)) + circle(150, 100, 5, '#000080')
F['niger'] = hstripes('#e05206', 'white', '#0db02b') + circle(150, 100, 22, '#e05206')
F['syria'] = hstripes('#ce1126', 'white', 'black') + star(110, 100, 20, '#007a3d') + star(190, 100, 20, '#007a3d')
F['myanmar'] = hstripes('#fecb00', '#34b233', '#ea2839') + star(150, 108, 70, 'white')
F['ghana'] = hstripes('#ce1126', '#fcd116', '#006b3f') + star(150, 100, 32, 'black')
F['libya'] = hstripes('#e70013', 'black', '#239e46', weights=[1, 2, 1]) + crescent(140, 100, 26, 'white', 'black', off=0.3, scale=0.82) + star(170, 100, 12, 'white', rot=180)
F['costa-rica'] = hstripes('#002b7f', 'white', '#ce1126', 'white', '#002b7f', weights=[1, 1, 2, 1, 1])
F['azerbaijan'] = hstripes('#0092bc', '#e4002b', '#00af66') + crescent(142, 100, 26, 'white', '#e4002b', off=0.27, scale=0.8) + star(170, 100, 12, 'white', points=8, inner=0.55)
F['burkina-faso'] = hstripes('#ef2b2d', '#009e49') + star(150, 100, 32, '#fcd116')
F['laos'] = hstripes('#ce1126', '#002868', '#ce1126', weights=[1, 2, 1]) + circle(150, 100, 40, 'white')
F['singapore'] = hstripes('#ef3340', 'white') + crescent(60, 50, 32, 'white', '#ef3340', off=0.35, scale=0.85) + ''.join(star(85 + 20 * math.cos(math.radians(-90 + i * 72)), 50 + 20 * math.sin(math.radians(-90 + i * 72)), 7, 'white') for i in range(5))
# Vertical stripes
F['france'] = vstripes('#002395', 'white', '#ed2939')
F['italy'] = vstripes('#009246', 'white', '#ce2b37')
F['ireland'] = vstripes('#169b62', 'white', '#ff883e')
F['belgium'] = vstripes('black', '#fdda24', '#ef3340')
F['romania'] = vstripes('#002b7f', '#fcd116', '#ce1126')
F['mali'] = vstripes('#14b53a', '#fcd116', '#ce1126')
F['guinea'] = vstripes('#ce1126', '#fcd116', '#009460')
F['nigeria'] = vstripes('#008751', 'white', '#008751')
F['ivory-coast'] = vstripes('#f77f00', 'white', '#009e60')
F['peru'] = vstripes('#d91023', 'white', '#d91023')
F['senegal'] = vstripes('#00853f', '#fdef42', '#e31b23') + star(150, 100, 26, '#00853f')
F['cameroon'] = vstripes('#007a5e', '#ce1126', '#fcd116') + star(150, 100, 26, '#fcd116')
F['canada'] = vstripes('#d52b1e', 'white', '#d52b1e', weights=[1, 2, 1]) + '<path d="M150,40 L158,58 L170,52 L166,80 L182,66 L186,74 L200,72 L194,88 L202,92 L176,112 L180,122 L154,118 L154,150 L146,150 L146,118 L120,122 L124,112 L98,92 L106,88 L100,72 L114,74 L118,66 L134,80 L130,52 L142,58 Z" fill="#d52b1e"/>'
F['pakistan'] = vstripes('white', '#01411c', weights=[1, 3]) + crescent(185, 100, 48, 'white', '#01411c', off=0.28, scale=0.83) + star(200, 82, 16, 'white', rot=-60)
F['algeria'] = vstripes('#006233', 'white') + crescent(150, 100, 46, '#d21034', 'white', off=0.3, scale=0.8) + star(172, 100, 18, '#d21034', rot=180)
# Plain fields with symbols
F['japan'] = rect(0, 0, W, H, 'white') + circle(150, 100, 60, '#bc002d')
F['bangladesh'] = rect(0, 0, W, H, '#006a4e') + circle(135, 100, 60, '#f42a41')
F['palau'] = rect(0, 0, W, H, '#4aadd6') + circle(130, 100, 50, '#ffde00')
F['turkey'] = rect(0, 0, W, H, '#e30a17') + crescent(110, 100, 50, 'white', '#e30a17', off=0.25, scale=0.8) + star(165, 100, 22, 'white', rot=180)
F['tunisia'] = rect(0, 0, W, H, '#e70013') + circle(150, 100, 50, 'white') + crescent(140, 100, 38, '#e70013', 'white', off=0.25, scale=0.8) + star(160, 100, 16, '#e70013', rot=180)
F['vietnam'] = rect(0, 0, W, H, '#da251d') + star(150, 105, 60, '#ffff00')
F['china'] = rect(0, 0, W, H, '#ee1c25') + star(50, 50, 30, '#ffff00') + ''.join(star(x, y, 10, '#ffff00', rot=r) for x, y, r in [(100, 20, -50), (120, 40, -70), (120, 70, -90), (100, 90, -110)])
F['somalia'] = rect(0, 0, W, H, '#4189dd') + star(150, 105, 50, 'white')
F['morocco'] = rect(0, 0, W, H, '#c1272d') + f'<polygon points="{" ".join(f"{150 + 50 * math.cos(math.radians(-90 + i * 144)):.1f},{105 + 50 * math.sin(math.radians(-90 + i * 144)):.1f}" for i in range(5))}" fill="none" stroke="#006233" stroke-width="7" stroke-linejoin="miter"/>'
F['vatican-free-switzerland'] = None
F['switzerland'] = rect(0, 0, W, H, '#d52b1e') + rect(130, 50, 40, 100, 'white') + rect(100, 80, 100, 40, 'white')
F['maldives'] = rect(0, 0, W, H, '#d21034') + rect(50, 50, 200, 100, '#007e3a') + crescent(155, 100, 32, 'white', '#007e3a', off=0.3, scale=0.82)
F['mauritania'] = hstripes('#d01c1f', '#00a95c', '#d01c1f', weights=[1, 4, 1]) + f'<path d="M100,70 A50,50 0 0 0 200,70 A50,38 0 0 1 100,70 Z" fill="#ffd700"/>' + star(150, 70, 16, '#ffd700')
F['micronesia'] = rect(0, 0, W, H, '#75b2dd') + ''.join(star(150 + 50 * math.cos(math.radians(a)), 100 + 50 * math.sin(math.radians(a)), 14, 'white') for a in [-90, 0, 90, 180])
F['vietnam2'] = None
# Crosses
F['denmark'] = rect(0, 0, W, H, '#c8102e') + rect(0, 85, W, 30, 'white') + rect(90, 0, 30, H, 'white')
F['sweden'] = rect(0, 0, W, H, '#006aa7') + rect(0, 80, W, 40, '#fecc00') + rect(90, 0, 40, H, '#fecc00')
F['norway'] = rect(0, 0, W, H, '#ba0c2f') + rect(0, 75, W, 50, 'white') + rect(80, 0, 50, H, 'white') + rect(0, 87, W, 26, '#00205b') + rect(92, 0, 26, H, '#00205b')
F['finland'] = rect(0, 0, W, H, 'white') + rect(0, 80, W, 40, '#002f6c') + rect(85, 0, 40, H, '#002f6c')
F['iceland'] = rect(0, 0, W, H, '#02529c') + rect(0, 75, W, 50, 'white') + rect(80, 0, 50, H, 'white') + rect(0, 87, W, 26, '#dc1e35') + rect(92, 0, 26, H, '#dc1e35')
F['greece'] = ''.join(rect(0, f'{i * H / 9:.2f}', W, f'{H / 9 + 0.5:.2f}', '#0d5eaf' if i % 2 == 0 else 'white') for i in range(9)) + rect(0, 0, 111, 111, '#0d5eaf') + rect(0, 44.4, 111, 22.2, 'white') + rect(44.4, 0, 22.2, 111, 'white')
F['england'] = rect(0, 0, W, H, 'white') + rect(0, 80, W, 40, '#ce1124') + rect(130, 0, 40, H, '#ce1124')
F['scotland'] = rect(0, 0, W, H, '#005eb8') + f'<path d="M0,0 L{W},{H} M{W},0 L0,{H}" stroke="white" stroke-width="34"/>'
F['uk'] = union_jack()
F['georgia'] = rect(0, 0, W, H, 'white') + rect(0, 80, W, 40, '#ff0000') + rect(130, 0, 40, H, '#ff0000') + ''.join(rect(x - 14, y - 4, 28, 8, '#ff0000') + rect(x - 4, y - 14, 8, 28, '#ff0000') for x, y in [(65, 40), (235, 40), (65, 160), (235, 160)])
F['tonga'] = rect(0, 0, W, H, '#c10000') + rect(0, 0, 120, 90, 'white') + rect(48, 15, 24, 60, '#c10000') + rect(30, 33, 60, 24, '#c10000')
# Cantons and stripes
def us():
    b = ''.join(rect(0, f'{i * H / 13:.2f}', W, f'{H / 13 + 0.5:.2f}', '#b22234' if i % 2 == 0 else 'white') for i in range(13))
    b += rect(0, 0, 120, H * 7 / 13, '#3c3b6e')
    for row in range(9):
        for col in range(6 if row % 2 == 0 else 5):
            x = 10 + col * 20 + (10 if row % 2 else 0); y = 6 + row * 11.6
            b += star(x, y, 4.5, 'white')
    return b
F['usa'] = us()
F['liberia'] = ''.join(rect(0, f'{i * H / 11:.2f}', W, f'{H / 11 + 0.5:.2f}', '#bf0a30' if i % 2 == 0 else 'white') for i in range(11)) + rect(0, 0, 91, 91, '#002868') + star(45, 46, 28, 'white')
F['malaysia'] = None
F['chile'] = hstripes('white', '#d52b1e') + rect(0, 0, 100, 100, '#0039a6') + star(50, 52, 26, 'white')
F['cuba'] = ''.join(rect(0, f'{i * 40}', W, 40.5, '#002a8f' if i % 2 == 0 else 'white') for i in range(5)) + hoist_triangle('#cb1515', 0.43) + star(42, 100, 22, 'white')
F['czechia'] = hstripes('white', '#d7141a') + hoist_triangle('#11457e', 0.5)
F['philippines'] = hstripes('#0038a8', '#ce1126') + poly([(0, 0), (173, 100), (0, 200)], 'white') + circle(62, 100, 18, '#fcd116') + star(18, 25, 9, '#fcd116') + star(18, 175, 9, '#fcd116') + star(150, 100, 9, '#fcd116', rot=0)
F['bahamas'] = hstripes('#00778b', '#ffc72c', '#00778b') + hoist_triangle('black', 0.43)
F['jamaica'] = rect(0, 0, W, H, '#009b3a') + poly([(0, 0), (150, 100), (0, 200)], 'black') + poly([(300, 0), (150, 100), (300, 200)], 'black') + f'<path d="M0,0 L{W},{H} M{W},0 L0,{H}" stroke="#fed100" stroke-width="26"/>'
F['sudan'] = hstripes('#d21034', 'white', 'black') + hoist_triangle('#007229', 0.33)
F['uae'] = hstripes('#00732f', 'white', 'black') + rect(0, 0, 75, H, '#ff0000')
F['kuwait'] = hstripes('#007a3d', 'white', '#ce1126') + poly([(0, 0), (75, 66.7), (75, 133.3), (0, 200)], 'black')
F['jordan'] = hstripes('black', 'white', '#007a3d') + hoist_triangle('#ce1126', 0.5) + star(52, 100, 16, 'white', points=7, inner=0.5)
F['palestine'] = hstripes('black', 'white', '#007a3d') + hoist_triangle('#ce1126', 0.5)
F['qatar'] = rect(0, 0, W, H, '#8a1538') + poly([(0, 0), (90, 0)] + [p for i in range(9) for p in [(120, (i + 0.5) * H / 9), (90, (i + 1) * H / 9)]] + [(0, H)], 'white')
F['bahrain'] = rect(0, 0, W, H, '#ce1126') + poly([(0, 0), (75, 0)] + [p for i in range(5) for p in [(115, (i + 0.5) * H / 5), (75, (i + 1) * H / 5)]] + [(0, H)], 'white')
F['oman'] = hstripes('white', '#db161b', '#008000') + rect(0, 0, 90, H, '#db161b')
F['benin'] = hstripes('#fcd116', '#e8112d') + rect(0, 0, 120, H, '#008751')
F['madagascar'] = hstripes('#fc3d32', '#007e3a') + rect(0, 0, 100, H, 'white')
F['guinea-bissau'] = hstripes('#fcd116', '#009e49') + rect(0, 0, 100, H, '#ce1126') + star(50, 100, 26, 'black')
F['djibouti'] = hstripes('#6ab2e7', '#12ad2b') + hoist_triangle('white', 0.43) + star(42, 100, 18, '#d7141a')
F['south-africa'] = rect(0, 0, W, H, '#002395') + rect(0, 0, W, 100, '#e03c31') + f'<path d="M0,0 L120,100 L0,200 M120,100 L300,100" stroke="white" stroke-width="66" fill="none"/><path d="M0,0 L120,100 L0,200 M120,100 L300,100" stroke="#007749" stroke-width="40" fill="none"/>' + poly([(0, 30), (84, 100), (0, 170)], '#ffb612') + poly([(0, 46), (64, 100), (0, 154)], 'black')
F['tanzania'] = poly([(0, 0), (300, 0), (0, 200)], '#1eb53a') + poly([(300, 0), (300, 200), (0, 200)], '#00a3dd') + f'<path d="M0,200 L300,0" stroke="#fcd116" stroke-width="64"/><path d="M0,200 L300,0" stroke="black" stroke-width="44"/>'
F['trinidad'] = rect(0, 0, W, H, '#ce1126') + f'<path d="M30,-10 L270,210" stroke="white" stroke-width="70"/><path d="M30,-10 L270,210" stroke="black" stroke-width="52"/>'
F['brazil'] = rect(0, 0, W, H, '#009c3b') + poly([(150, 20), (280, 100), (150, 180), (20, 100)], '#ffdf00') + circle(150, 100, 48, '#002776') + '<path d="M104,92 Q150,78 196,112" stroke="white" stroke-width="8" fill="none"/>'
F['panama'] = rect(0, 0, 150, 100, 'white') + rect(150, 0, 150, 100, '#da121a') + rect(0, 100, 150, 100, '#072357') + rect(150, 100, 150, 100, 'white') + star(75, 50, 24, '#072357') + star(225, 150, 24, '#da121a')
F['uruguay'] = ''.join(rect(0, f'{i * H / 9:.2f}', W, f'{H / 9 + 0.5:.2f}', 'white' if i % 2 == 0 else '#0038a8') for i in range(9)) + rect(0, 0, 111, 111, 'white') + ''.join(f'<line x1="55" y1="55" x2="{55 + 42 * math.cos(i * math.pi / 8):.1f}" y2="{55 + 42 * math.sin(i * math.pi / 8):.1f}" stroke="#fcd116" stroke-width="5"/>' for i in range(16)) + circle(55, 55, 20, '#fcd116')
F['north-macedonia'] = rect(0, 0, W, H, '#ce2028') + ''.join(poly([(150, 100), (150 + 260 * math.cos(math.radians(a - 7)), 100 + 260 * math.sin(math.radians(a - 7))), (150 + 260 * math.cos(math.radians(a + 7)), 100 + 260 * math.sin(math.radians(a + 7)))], '#f9d616') for a in [0, 45, 90, 135, 180, 225, 270, 315]) + circle(150, 100, 30, '#ce2028') + circle(150, 100, 24, '#f9d616')
F['seychelles'] = poly([(0, 200), (0, 0), (100, 0)], '#003f87') + poly([(0, 200), (100, 0), (200, 0)], '#fcd856') + poly([(0, 200), (200, 0), (300, 0), (300, 66)], '#d62828') + poly([(0, 200), (300, 66), (300, 133)], 'white') + poly([(0, 200), (300, 133), (300, 200)], '#007a3d')
F['australia'] = rect(0, 0, W, H, '#012169') + canton_uk() + star(75, 150, 26, 'white', points=7, inner=0.45) + ''.join(star(x, y, r, 'white', points=7, inner=0.45) for x, y, r in [(225, 160, 12), (190, 95, 12), (225, 40, 12), (260, 85, 12)]) + star(240, 112, 7, 'white')
F['new-zealand'] = rect(0, 0, W, H, '#012169') + canton_uk() + ''.join(star(x, y, r, 'white') + star(x, y, r * 0.75, '#c8102e') for x, y, r in [(225, 165, 15), (190, 95, 13), (225, 45, 13), (260, 85, 13)])
for k in [k for k, v in F.items() if v is None]: del F[k]

for k, body in F.items():
    with open(os.path.join(OUT, f'flag-{k}.svg'), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 {W + 12} {H + 12}" width="{(W + 12) * 2}" height="{(H + 12) * 2}"><defs><clipPath id="fc"><rect width="{W}" height="{H}"/></clipPath></defs><rect x="-6" y="-6" width="{W + 12}" height="{H + 12}" fill="#fff"/><g clip-path="url(#fc)">{body}</g><rect x="0" y="0" width="{W}" height="{H}" fill="none" stroke="#888" stroke-width="1.5"/></svg>')
print(len(F), 'flags')
