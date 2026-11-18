# Draws the built-in question diagrams into questions/img/*.svg (black on white, no fonts to load).
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'questions', 'img')
os.makedirs(OUT, exist_ok=True)
S = 'stroke="#111" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
T = 'font-family="Arial,Helvetica,sans-serif" fill="#111"'

def svg(name, w, h, body):
    with open(os.path.join(OUT, name + '.svg'), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*2}" height="{h*2}"><rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>')

def and_body(x, y): return f'<path d="M{x},{y} H{x+50} A50,50 0 0 1 {x+50},{y+100} H{x} Z" {S}/>'
def or_body(x, y): return f'<path d="M{x},{y} Q{x+55},{y} {x+105},{y+50} Q{x+55},{y+100} {x},{y+100} Q{x+25},{y+50} {x},{y} Z" {S}/>'
def xor_extra(x, y): return f'<path d="M{x-12},{y} Q{x+13},{y+50} {x-12},{y+100}" {S}/>'
def line(x1, y1, x2, y2): return f'<path d="M{x1},{y1} L{x2},{y2}" {S}/>'
def dot(x, y): return f'<circle cx="{x}" cy="{y}" r="5" fill="#111"/>'
def label(x, y, t, size=22, anchor='middle'): return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" dominant-baseline="central" {T}>{t}</text>'

def gate(name, body, in_x, out_x, bubble=False):
    b = body
    b += line(20, 55, in_x, 55) + line(20, 105, in_x, 105)
    if bubble:
        b += f'<circle cx="{out_x+9}" cy="80" r="9" {S}/>'
        out_x += 18
    b += line(out_x, 80, 250, 80)
    b += label(10, 55, 'A', 18) + label(10, 105, 'B', 18) + label(262, 80, 'Q', 18)
    svg(name, 275, 160, b)

gate('gate-and', and_body(70, 30), 70, 170)
gate('gate-or', or_body(70, 30), 79, 175)
gate('gate-xor', or_body(76, 30) + xor_extra(76, 30), 73, 181)
gate('gate-nand', and_body(70, 30), 70, 170, bubble=True)
svg('gate-not', 275, 160, f'<path d="M80,30 L170,80 L80,130 Z" {S}/><circle cx="179" cy="80" r="9" {S}/>' + line(20, 80, 80, 80) + line(188, 80, 250, 80) + label(10, 80, 'A', 18) + label(262, 80, 'Q', 18))

# Half adder: XOR on top gives S, AND below gives C
b = or_body(200, 20) + xor_extra(200, 20) + and_body(200, 190)
b += line(40, 45, 197, 45) + line(40, 95, 197, 95)
b += line(100, 45, 100, 215) + line(100, 215, 200, 215) + dot(100, 45)
b += line(130, 95, 130, 265) + line(130, 265, 200, 265) + dot(130, 95)
b += line(305, 70, 370, 70) + line(300, 240, 370, 240)
b += label(24, 45, 'A') + label(24, 95, 'B') + label(388, 70, 'S') + label(388, 240, 'C')
svg('half-adder', 410, 310, b)

# Singly linked list
b = ''
for i, v in enumerate([12, 7, 30]):
    x = 20 + i * 130
    b += f'<rect x="{x}" y="40" width="90" height="50" rx="4" {S}/>' + line(x + 55, 40, x + 55, 90) + label(x + 27, 65, v) + dot(x + 72, 65)
    b += f'<path d="M{x+72},65 L{x+125},65" {S} marker-end="url(#ah)"/>'
b += label(420, 65, 'null', 20, 'start')
svg('linked-list', 480, 130, '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#111"/></marker></defs>' + b)

# Binary tree for a pre-order traversal
nodes = {4: (200, 40), 2: (110, 120), 6: (290, 120), 1: (60, 200), 3: (160, 200), 5: (240, 200), 7: (340, 200)}
edges = [(4, 2), (4, 6), (2, 1), (2, 3), (6, 5), (6, 7)]
b = ''.join(line(*nodes[a], *nodes[c]) for a, c in edges)
b += ''.join(f'<circle cx="{x}" cy="{y}" r="22" fill="#fff" stroke="#111" stroke-width="4"/>' + label(x, y, n) for n, (x, y) in nodes.items())
svg('binary-tree', 400, 240, b)

# Weighted graph for a shortest path
P = {'A': (40, 130), 'B': (150, 40), 'C': (150, 220), 'D': (290, 40), 'E': (290, 220), 'F': (400, 130)}
W = [('A', 'B', 4), ('A', 'C', 1), ('C', 'B', 2), ('B', 'D', 1), ('C', 'E', 5), ('D', 'E', 1), ('D', 'F', 3), ('E', 'F', 1)]
b = ''
for a, c, w in W:
    (x1, y1), (x2, y2) = P[a], P[c]
    b += line(x1, y1, x2, y2)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = y2 - y1, -(x2 - x1)
    n = (dx * dx + dy * dy) ** .5
    ox, oy = dx / n * 16, dy / n * 16
    b += f'<rect x="{mx+ox-12}" y="{my+oy-12}" width="24" height="24" rx="5" fill="#fff"/>' + label(mx + ox, my + oy, w, 20)
b += ''.join(f'<circle cx="{x}" cy="{y}" r="22" fill="#fff" stroke="#111" stroke-width="4"/>' + label(x, y, k) for k, (x, y) in P.items())
svg('weighted-graph', 440, 260, b)

def node(x, y, r=16): return f'<rect x="{x-r}" y="{y-r*0.75}" width="{2*r}" height="{1.5*r}" rx="3" fill="#fff" stroke="#111" stroke-width="3.5"/>'
import math
# Star
b = ''
pts = [(200 + 130 * math.cos(a), 140 + 110 * math.sin(a)) for a in [i * 2 * math.pi / 6 - math.pi / 2 for i in range(6)]]
b += ''.join(line(200, 140, x, y) for x, y in pts) + ''.join(node(x, y) for x, y in pts)
b += '<rect x="170" y="122" width="60" height="36" rx="6" fill="#fff" stroke="#111" stroke-width="4"/>' + label(200, 140, 'HUB', 15)
svg('topology-star', 400, 280, b)
# Ring
pts = [(200 + 130 * math.cos(a), 140 + 110 * math.sin(a)) for a in [i * 2 * math.pi / 6 - math.pi / 2 for i in range(6)]]
b = ''.join(line(*pts[i], *pts[(i + 1) % 6]) for i in range(6)) + ''.join(node(x, y) for x, y in pts)
svg('topology-ring', 400, 280, b)
# Full mesh
pts = [(200 + 130 * math.cos(a), 140 + 115 * math.sin(a)) for a in [i * 2 * math.pi / 5 - math.pi / 2 for i in range(5)]]
b = ''.join(line(*pts[i], *pts[j]) for i in range(5) for j in range(i + 1, 5)) + ''.join(node(x, y) for x, y in pts)
svg('topology-mesh', 400, 280, b)
# Bus
b = line(30, 140, 450, 140) + f'<rect x="20" y="130" width="10" height="20" fill="#111"/><rect x="450" y="130" width="10" height="20" fill="#111"/>'
for i, x in enumerate([90, 180, 270, 360]):
    y = 60 if i % 2 == 0 else 220
    b += line(x, 140, x, y) + node(x, y)
svg('topology-bus', 480, 280, b)

# Venn diagrams: A on the left, B on the right
def venn(name, fill_a, fill_b, fill_both):
    g = '#9aa4b2'
    d = '<defs><clipPath id="ca"><circle cx="150" cy="130" r="95"/></clipPath></defs>'
    b = '<rect x="10" y="10" width="380" height="240" fill="none" stroke="#111" stroke-width="3"/>' + label(30, 32, 'U', 18)
    if fill_a: b += f'<circle cx="150" cy="130" r="95" fill="{g}"/>'
    if fill_b: b += f'<circle cx="250" cy="130" r="95" fill="{g}"/>'
    b += f'<circle cx="250" cy="130" r="95" fill="{g if fill_both else "#fff"}" clip-path="url(#ca)"/>'
    if fill_a and not fill_b and not fill_both:
        pass
    b += f'<circle cx="150" cy="130" r="95" fill="none" stroke="#111" stroke-width="4"/><circle cx="250" cy="130" r="95" fill="none" stroke="#111" stroke-width="4"/>'
    b += label(90, 130, 'A', 26) + label(310, 130, 'B', 26)
    svg(name, 400, 260, d + b)

venn('venn-intersection', False, False, True)
venn('venn-union', True, True, True)
venn('venn-difference', True, False, False)
venn('venn-symmetric', True, True, False)

# ---------------- More picture questions (2026-11-12) ----------------
SF = 'stroke="#111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"'
AH = '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#111"/></marker></defs>'
def arrow(x1, y1, x2, y2): return f'<path d="M{x1},{y1} L{x2},{y2}" {S} marker-end="url(#ah)"/>'
def thin(x1, y1, x2, y2, w=2): return f'<path d="M{x1},{y1} L{x2},{y2}" stroke="#111" stroke-width="{w}" fill="none"/>'
def poly(pts, closed=False, w=4): return f'<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if closed else '') + f'" stroke="#111" stroke-width="{w}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
def hatch(x, y, w, down=True):
    b = thin(x, y, x + w, y, 3)
    for i in range(0, int(w), 10): b += thin(x + i + 10, y, x + i, y + (12 if down else -12), 2)
    return b

# Logic gates with a bubble: NOR and XNOR
gate('gate-nor', or_body(70, 30), 79, 175, bubble=True)
gate('gate-xnor', or_body(76, 30) + xor_extra(76, 30), 73, 181, bubble=True)

# 2-to-1 multiplexer
b = f'<path d="M120,30 L200,60 L200,170 L120,200 Z" {S}/>' + line(40, 75, 120, 75) + line(40, 155, 120, 155) + line(200, 115, 270, 115) + line(160, 215, 160, 185)
b += label(28, 75, 'I0', 18) + label(28, 155, 'I1', 18) + label(290, 115, 'Y', 18) + label(160, 232, 'S', 18)
svg('mux-2to1', 310, 250, b)

# D flip-flop
b = f'<rect x="100" y="30" width="130" height="170" rx="4" {S}/>' + line(40, 70, 100, 70) + line(70, 160, 100, 160) + f'<path d="M100,145 L118,160 L100,175" {S}/>'
b += line(230, 70, 290, 70) + line(230, 160, 290, 160) + label(115, 70, 'D', 22, 'start') + label(218, 70, 'Q', 22, 'end') + label(218, 160, 'Q', 22, 'end') + thin(203, 145, 218, 145, 2.5)
b += label(28, 160, 'CLK', 15)
svg('d-flipflop', 320, 230, b)

# Seven-segment displays
SEG = {'a': (0, 0, 1, 0), 'b': (1, 0, 1, 1), 'c': (1, 1, 1, 2), 'd': (0, 2, 1, 2), 'e': (0, 1, 0, 2), 'f': (0, 0, 0, 1), 'g': (0, 1, 1, 1)}
DIG = {2: 'abged', 4: 'fgbc', 7: 'abc', 9: 'abcdfg'}
def seven(n):
    b = '<rect x="20" y="15" width="160" height="250" rx="16" fill="#1d1d1d"/>'
    for k, (x1, y1, x2, y2) in SEG.items():
        on = k in DIG[n]
        X = lambda v: 55 + v * 90
        Y = lambda v: 45 + v * 95
        b += f'<path d="M{X(x1) + (8 if x1 != x2 else 0)},{Y(y1) + (8 if y1 != y2 else 0)} L{X(x2) - (8 if x1 != x2 else 0)},{Y(y2) - (8 if y1 != y2 else 0)}" stroke="{"#ff3b30" if on else "#3a3a3a"}" stroke-width="16" stroke-linecap="round"/>'
    svg(f'seg-{n}', 200, 280, b)
for n in DIG: seven(n)

# Trusses (span with 6 panels)
def truss(name, kind):
    xs = [30 + i * 70 for i in range(7)]
    top, bot = 50, 150
    b = ''
    if kind == 'warren':
        tx = [65 + i * 70 for i in range(6)]
        b += poly([(tx[0], top), (tx[-1], top)]) + poly([(xs[0], bot), (xs[-1], bot)])
        pts = []
        for i in range(6): pts += [(xs[i], bot), (tx[i], top)]
        pts.append((xs[6], bot))
        b += poly(pts)
    else:
        b += poly([(xs[0], bot), (xs[1], top), (xs[5], top), (xs[6], bot), (xs[0], bot)])
        for i in range(1, 6): b += line(xs[i], top, xs[i], bot)
        for i in range(1, 5):
            left = i < 3
            # Pratt: diagonals slope down towards the middle. Howe: up towards the middle.
            if (kind == 'pratt') == left: b += line(xs[i], top, xs[i + 1], bot)
            else: b += line(xs[i], bot, xs[i + 1], top)
    b += f'<path d="M{xs[0]},{bot} l-14,24 h28 Z" {S}/><circle cx="{xs[6]}" cy="{bot+12}" r="10" {S}/>'
    svg(name, 480, 190, b)
truss('truss-pratt', 'pratt'); truss('truss-howe', 'howe'); truss('truss-warren', 'warren')

# Supports
b = line(40, 60, 260, 60) + f'<path d="M150,60 l-28,48 h56 Z" {S}/>' + hatch(110, 112, 80)
svg('support-pin', 300, 150, b)
b = line(40, 60, 260, 60) + f'<path d="M150,60 l-28,40 h56 Z" {S}/><circle cx="133" cy="110" r="9" {S}/><circle cx="167" cy="110" r="9" {S}/>' + thin(105, 122, 195, 122, 3)
for i in range(0, 90, 10): b += thin(105 + i + 10, 122, 105 + i, 134, 2)
svg('support-roller', 300, 150, b)
b = f'<path d="M60,20 L60,140" stroke="#111" stroke-width="5"/>'
for y in range(20, 140, 12): b += thin(60, y, 46, y + 12, 2)
b += f'<rect x="60" y="66" width="190" height="28" {S}/>'
svg('support-fixed', 280, 160, b)

# Beams with loads
b = f'<path d="M50,20 L50,150" stroke="#111" stroke-width="5"/>'
for y in range(20, 150, 12): b += thin(50, y, 36, y + 12, 2)
b += f'<rect x="50" y="76" width="300" height="22" {S}/>' + arrow(340, 15, 340, 70) + label(355, 25, 'P', 20, 'start')
svg('beam-cantilever', 400, 170, AH + b)
b = f'<rect x="40" y="60" width="340" height="22" {S}/>' + f'<path d="M50,82 l-18,30 h36 Z" {S}/>' + hatch(26, 116, 50)
b += f'<path d="M370,82 l-18,26 h36 Z" {S}/><circle cx="361" cy="114" r="6" {S}/><circle cx="379" cy="114" r="6" {S}/>' + arrow(210, 5, 210, 54) + label(225, 15, 'P', 20, 'start')
svg('beam-simple', 420, 140, AH + b)

# Function graphs
def graph(name, f, x0, x1, y0, y1, n=200):
    W, H, P = 360, 260, 20
    sx = lambda x: P + (x - x0) / (x1 - x0) * (W - 2 * P)
    sy = lambda y: H - P - (y - y0) / (y1 - y0) * (H - 2 * P)
    b = AH + f'<path d="M{P},{sy(0)} L{W-P+4},{sy(0)}" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/><path d="M{sx(0)},{H-P} L{sx(0)},{P-4}" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/>'
    b += label(W - P + 2, sy(0) + 16, 'x', 16) + label(sx(0) + 14, P, 'y', 16)
    pts = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        try: y = f(x)
        except (ValueError, ZeroDivisionError): continue
        if y0 - 1 <= y <= y1 + 1: pts.append((sx(x), max(P - 6, min(H - P + 6, sy(y)))))
    b += f'<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" stroke="#c0392b" stroke-width="4" fill="none" stroke-linejoin="round"/>'
    svg(name, W, H, b)
graph('graph-sine', math.sin, -7, 7, -1.6, 1.6)
graph('graph-parabola', lambda x: x * x, -3, 3, -1.5, 9)
graph('graph-exponential', math.exp, -3, 2.5, -1.5, 12)
graph('graph-log', lambda x: math.log(x), -1, 8, -3.5, 2.5, 400)
graph('graph-abs', abs, -4, 4, -1.5, 4.5)
graph('graph-normal', lambda x: math.exp(-x * x / 2), -4, 4, -0.15, 1.2)

# Levers: F = fulcrum, L = load, E = effort
def lever(name, order):
    b = AH + line(40, 100, 400, 100)
    pos = {'a': 60, 'm': 220, 'b': 380}
    for k, what in zip('amb', order):
        x = pos[k]
        if what == 'F': b += f'<path d="M{x},100 l-22,40 h44 Z" fill="#f2c94c" {SF}/>'
        if what == 'L': b += f'<rect x="{x-24}" y="52" width="48" height="48" fill="#9aa4b2" {SF}/>' + label(x, 76, 'kg', 16)
        if what == 'E': b += arrow(x, 20, x, 92)
    b += hatch(30, 142, 380)
    svg(name, 440, 170, b)
lever('lever-1', 'LFE'); lever('lever-2', 'FLE'); lever('lever-3', 'FEL')

# Simple machines
b = AH + hatch(60, 30, 220, down=False).replace('y', 'y') + line(170, 30, 170, 60) + f'<circle cx="170" cy="95" r="35" {S}/><circle cx="170" cy="95" r="5" fill="#111"/>'
b += line(135, 95, 135, 230) + line(205, 95, 205, 175) + f'<rect x="180" y="175" width="50" height="45" fill="#9aa4b2" {SF}/>' + arrow(135, 200, 135, 245)
svg('machine-pulley', 340, 260, b)
b = poly([(30, 220), (380, 220), (380, 60), (30, 220)], True) + f'<g transform="rotate(-24.6 210 140)"><rect x="185" y="97" width="56" height="40" fill="#9aa4b2" {SF}/></g>'
svg('machine-incline', 410, 250, b)
b = poly([(120, 40), (220, 40), (170, 230)], True) + hatch(60, 230, 220)
svg('machine-wedge', 340, 260, b)

# Crystal unit cells (cube drawn in oblique view)
def cube_pts():
    o = [(80, 200), (240, 200), (240, 40), (80, 40)]
    d = (60, -40)
    back = [(x + d[0], y + d[1]) for x, y in o]
    return o, back
def cell(name, kind):
    o, k = cube_pts()
    b = ''
    for i in range(4): b += thin(*o[i], *o[(i + 1) % 4], 3) + thin(*k[i], *k[(i + 1) % 4], 3) + thin(*o[i], *k[i], 3)
    atoms = o + k
    if kind == 'bcc': atoms = atoms + [((o[0][0] + k[2][0]) / 2, (o[0][1] + k[2][1]) / 2)]
    if kind == 'fcc':
        faces = [(o[0], o[2]), (k[0], k[2]), (o[0], k[3]), (o[1], k[2]), (o[3], k[2]), (o[0], k[1])]
        atoms = atoms + [((a[0] + c[0]) / 2, (a[1] + c[1]) / 2) for a, c in faces]
    r = 15 if kind != 'sc' else 18
    atoms.sort(key=lambda p: -p[1] + p[0] * 0.01)
    for x, y in atoms: b += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#5b8def" stroke="#111" stroke-width="2.5"/>'
    svg(name, 340, 240, b)
cell('cell-sc', 'sc'); cell('cell-bcc', 'bcc'); cell('cell-fcc', 'fcc')

# Stress-strain curve (ductile metal), with the highest point marked and an x where it breaks
pts = [(40, 250), (110, 100)]
for i in range(1, 41):
    t = i / 40
    pts.append((110 + 260 * t, 100 - 70 * (1 - (t - 0.55) ** 2 / 0.55 ** 2)))
b = AH + f'<path d="M40,250 L40,20" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/><path d="M40,250 L400,250" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/>'
b += label(222, 272, 'Strain', 16) + f'<text x="18" y="135" font-size="16" text-anchor="middle" transform="rotate(-90 18 135)" {T}>Stress</text>'
b += f'<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" stroke="#c0392b" stroke-width="4" fill="none"/>'
top = min(pts, key=lambda p: p[1])
b += f'<circle cx="{top[0]:.1f}" cy="{top[1]:.1f}" r="8" fill="#111"/>' + f'<path d="M{top[0]+45:.1f},{top[1]+50:.1f} L{top[0]+8:.1f},{top[1]+12:.1f}" {S} marker-end="url(#ah)"/>' + label(top[0] + 50, top[1] + 64, '?', 26, 'start')
end = pts[-1]
b += label(end[0] + 8, end[1], '×', 26)
svg('stress-strain', 420, 290, b)

# Power and circuit symbols
b = line(20, 60, 70, 60) + line(20, 160, 70, 160) + line(260, 60, 310, 60) + line(260, 160, 310, 160)
for i in range(4):
    b += f'<path d="M70,{60 + i*25} a12.5,12.5 0 0 1 0,25" {S}/>'
    b += f'<path d="M260,{60 + i*25} a12.5,12.5 0 0 0 0,25" {S}/>'
b += line(150, 50, 150, 170) + line(180, 50, 180, 170)
b = b.replace('M70,60 a', 'M70,60 a')
svg('sym-transformer', 330, 220, b)
b = line(20, 110, 100, 110) + line(220, 110, 300, 110) + f'<circle cx="160" cy="110" r="60" {S}/><path d="M125,110 C140,70 150,70 160,110 C170,150 180,150 195,110" {S}/>'
svg('sym-ac-source', 320, 220, b)
b = line(150, 20, 150, 90) + line(100, 90, 200, 90) + line(118, 110, 182, 110) + line(136, 130, 164, 130)
svg('sym-ground', 300, 160, b)
# Three-phase wye and delta
b = ''.join(line(160, 130, 160 + 100 * math.cos(a), 130 + 100 * math.sin(a)) for a in [-math.pi / 2, math.pi / 6, 5 * math.pi / 6]) + dot(160, 130)
b += label(160, 18, 'A', 18) + label(262, 192, 'B', 18) + label(58, 192, 'C', 18)
svg('three-phase-wye', 320, 240, b)
P3 = [(160, 30), (275, 210), (45, 210)]
b = poly(P3, True) + ''.join(dot(x, y) for x, y in P3) + label(160, 14, 'A', 18) + label(298, 214, 'B', 18) + label(22, 214, 'C', 18)
svg('three-phase-delta', 320, 240, b)

# Fluids: Venturi meter and U-tube manometer
b = poly([(20, 60), (130, 60), (200, 95), (260, 95), (400, 60), (480, 60)]) + poly([(20, 200), (130, 200), (200, 165), (260, 165), (400, 200), (480, 200)])
b += line(80, 60, 80, 10) + line(100, 60, 100, 10) + line(220, 95, 220, 30) + line(240, 95, 240, 30)
b += f'<rect x="82" y="20" width="16" height="40" fill="#5b8def" opacity=".6"/><rect x="222" y="62" width="16" height="33" fill="#5b8def" opacity=".6"/>' + AH + arrow(30, 130, 110, 130)
svg('venturi', 500, 230, b)
b = f'<path d="M80,30 L80,200 A60,60 0 0 0 200,200 L200,30" stroke="#111" stroke-width="5" fill="none"/><path d="M110,30 L110,200 A30,30 0 0 0 170,200 L170,30" stroke="#111" stroke-width="5" fill="none"/>'
b += f'<path d="M82,150 L108,150 L108,200 A28,28 0 0 0 172,200 L172,90 L198,90 L198,200 A58,58 0 0 1 82,200 Z" fill="#5b8def" opacity=".7"/>'
b += AH + arrow(95, 0, 95, 26) + label(60, 10, 'P₁', 18) + arrow(185, 0, 185, 26) + label(222, 10, 'P₂', 18)
svg('manometer', 280, 280, b)

# Data structures: stack and queue; database crow's foot
b = AH
for i, v in enumerate([42, 17, 8, 23]):
    b += f'<rect x="120" y="{60 + i*45}" width="110" height="45" fill="#fff" {SF}/>' + label(175, 82 + i * 45, v)
b += arrow(110, 15, 150, 55) + f'<path d="M200,55 L240,15" {S} marker-end="url(#ah)"/>' + thin(110, 245, 240, 245, 3)
svg('ds-stack', 350, 260, b)
b = AH
for i, v in enumerate([42, 17, 8, 23]):
    b += f'<rect x="{100 + i*70}" y="70" width="70" height="60" fill="#fff" {SF}/>' + label(135 + i * 70, 100, v)
b += arrow(20, 100, 92, 100) + arrow(388, 100, 460, 100)
svg('ds-queue', 480, 200, b)
b = f'<rect x="20" y="70" width="140" height="60" rx="6" {S}/><rect x="340" y="70" width="140" height="60" rx="6" {S}/>' + label(90, 100, 'Customer', 20) + label(410, 100, 'Order', 20)
b += line(160, 100, 340, 100) + line(185, 85, 185, 115) + line(310, 100, 340, 80) + line(310, 100, 340, 120) + line(310, 85, 310, 115)
svg('er-one-to-many', 500, 200, b)


# ---------- Harder diagrams so every Diagram Night level has pictures (2026-11-18) ----------
def nand(x, y): return and_body(x, y) + f'<circle cx="{x+109}" cy="{y+50}" r="9" {S}/>'
def nor(x, y): return or_body(x, y) + f'<circle cx="{x+114}" cy="{y+50}" r="9" {S}/>'
def path(d): return f'<path d="{d}" {S}/>'

# Full adder: two XORs give the sum, two ANDs and an OR give the carry
b = or_body(200, 35) + xor_extra(200, 35) + or_body(450, 60) + xor_extra(450, 60) + and_body(450, 220) + and_body(450, 380) + or_body(650, 300)
b += line(40, 60, 197, 60) + line(40, 110, 197, 110) + line(40, 295, 450, 295)
b += path('M120,60 V405 H450') + dot(120, 60) + path('M150,110 V455 H450') + dot(150, 110)
b += path('M305,85 H447') + path('M360,85 V245 H450') + dot(360, 85)
b += path('M400,295 V135 H447') + dot(400, 295)
b += path('M555,110 H800') + path('M550,270 H600 V325 H659') + path('M550,430 H610 V375 H659') + path('M755,350 H800')
b += label(24, 60, 'A') + label(24, 110, 'B') + label(18, 295, 'Cin', 18) + label(818, 110, 'S') + label(826, 350, 'Cout', 18)
svg('full-adder', 860, 500, b)

# SR latch from two cross-coupled NOR gates
b = nor(200, 30) + nor(200, 230)
b += line(40, 55, 200, 55) + line(40, 305, 200, 305)
b += path('M323,80 H440') + path('M323,280 H440')
b += path('M360,80 V150 L170,205 V255 H200') + dot(360, 80)
b += path('M380,280 V215 L150,150 V105 H200') + dot(380, 280)
b += label(24, 55, 'R') + label(24, 305, 'S') + label(458, 80, 'Q') + label(458, 280, 'Q') + thin(450, 263, 466, 263, 2.5)
svg('sr-latch', 490, 340, b)

# Timing diagram: Q toggles on every rising clock edge (a divide-by-two)
def wave(y, edges, x0=90, x1=620, hi=0, lo=40):
    pts, lvl, x = [(x0, y + lo)], 0, x0
    for e in edges:
        pts += [(e, y + (hi if lvl else lo)), (e, y + (lo if lvl else hi))]; lvl ^= 1
    pts.append((x1, y + (hi if lvl else lo)))
    return poly(pts)
clk = [110 + 32 * i for i in range(16)]
b = wave(30, clk) + wave(130, clk[0::2]) + label(45, 50, 'CLK', 18) + label(45, 150, 'Q', 20)
for e in clk[0::2]: b += f'<path d="M{e},20 V190" stroke="#888" stroke-width="1.5" stroke-dasharray="4 5"/>'
svg('timing-toggle', 640, 210, b)

# 3-variable Karnaugh map: 1s at 001, 011, 101, 111 and 110 (C + AB)
cols = ['00', '01', '11', '10']
ones = {(0, '01'), (0, '11'), (1, '01'), (1, '11'), (1, '10')}
b = ''
for r in range(2):
    for c, bc in enumerate(cols):
        x, y = 120 + c * 80, 80 + r * 70
        b += f'<rect x="{x}" y="{y}" width="80" height="70" fill="#fff" stroke="#111" stroke-width="3"/>' + label(x + 40, y + 35, 1 if (r, bc) in ones else 0, 28)
for c, bc in enumerate(cols): b += label(160 + c * 80, 60, bc, 20)
b += label(85, 115, '0', 20) + label(85, 185, '1', 20) + label(100, 40, 'A \\ BC', 18)
svg('kmap-3var', 470, 240, b)

# XOR built from four NAND gates
b = nand(180, 130) + nand(400, 30) + nand(400, 230) + nand(600, 130)
b += line(40, 55, 400, 55) + line(40, 305, 400, 305)
b += path('M110,55 V155 H180') + dot(110, 55) + path('M140,305 V205 H180') + dot(140, 305)
b += path('M298,180 H340') + path('M340,105 V255') + line(340, 105, 400, 105) + line(340, 255, 400, 255) + dot(340, 180)
b += path('M518,80 H550 V155 H600') + path('M518,280 H560 V205 H600') + line(718, 180, 780, 180)
b += label(24, 55, 'A') + label(24, 305, 'B') + label(798, 180, 'Q')
svg('nand-xor', 820, 340, b)

# Five-stage pipeline chart: four instructions
ST = ['IF', 'ID', 'EX', 'MEM', 'WB']
b = ''
for c in range(8): b += label(150 + c * 70, 30, c + 1, 18)
for i in range(4):
    b += label(40, 80 + i * 55, f'i{i+1}', 20)
    for k, st in enumerate(ST):
        x = 115 + (i + k) * 70
        b += f'<rect x="{x}" y="{58 + i*55}" width="70" height="44" fill="#fff" stroke="#111" stroke-width="3"/>' + label(x + 35, 80 + i * 55, st, 17)
b += label(80, 30, 'cycle', 16)
svg('pipeline', 690, 290, b)

# Trees and graphs for data structures
def tree(name, W, H, nodes, edges, fills={}):
    b = ''.join(line(*nodes[a], *nodes[c]) for a, c in edges)
    for n, (x, y) in nodes.items():
        f = fills.get(n, '#fff'); tc = '#fff' if f != '#fff' else '#111'
        b += f'<circle cx="{x}" cy="{y}" r="22" fill="{f}" stroke="#111" stroke-width="4"/>' + f'<text x="{x}" y="{y}" font-size="20" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" fill="{tc}">{n}</text>'
    svg(name, W, H, b)
tree('avl-left-left', 300, 260, {30: (200, 40), 20: (140, 125), 10: (80, 210)}, [(30, 20), (20, 10)])
RB = {13: (300, 40), 8: (170, 115), 17: (430, 115), 1: (100, 195), 11: (240, 195), 15: (370, 195), 25: (500, 195), 6: (140, 270), 22: (460, 270), 27: (540, 270)}
red = {n: '#c0392b' for n in (8, 17, 6, 22, 27)}
tree('red-black-tree', 600, 310, RB, [(13, 8), (13, 17), (8, 1), (8, 11), (17, 15), (17, 25), (1, 6), (25, 22), (25, 27)], {**{n: '#111' for n in RB}, **red})
D = {'A': (60, 130), 'B': (200, 50), 'C': (200, 210), 'D': (340, 130), 'E': (470, 130)}
b = AH
for a, c in [('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E')]:
    (x1, y1), (x2, y2) = D[a], D[c]; L = math.hypot(x2 - x1, y2 - y1); ux, uy = (x2 - x1) / L, (y2 - y1) / L
    b += arrow(x1 + ux * 26, y1 + uy * 26, x2 - ux * 30, y2 - uy * 30)
b += ''.join(f'<circle cx="{x}" cy="{y}" r="24" fill="#fff" stroke="#111" stroke-width="4"/>' + label(x, y, n) for n, (x, y) in D.items())
svg('dag', 530, 260, b)

# Bending moment diagrams for a simply supported beam
def bmd(name, udl):
    b = AH + f'<rect x="40" y="70" width="400" height="16" {S}/>' + f'<path d="M48,86 l-16,26 h32 Z" {S}/>' + f'<path d="M432,86 l-16,22 h32 Z" {S}/><circle cx="424" cy="114" r="5" {S}/><circle cx="440" cy="114" r="5" {S}/>'
    if udl:
        b += f'<path d="M40,30 H440" {S}/>' + ''.join(arrow(x, 30, x, 64) for x in range(50, 441, 39))
        pts = [(40 + 400 * i / 40, 150 + 110 * 4 * (i / 40) * (1 - i / 40)) for i in range(41)]
    else:
        b += arrow(240, 10, 240, 64)
        pts = [(40, 150), (240, 260), (440, 150)]
    b += thin(30, 150, 455, 150, 2.5) + f'<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z" fill="#f4c7c3" stroke="#c0392b" stroke-width="4" stroke-linejoin="round"/>'
    b += label(470, 150, 'M', 20, 'start')
    svg(name, 500, 280, b)
bmd('bmd-point', False)
bmd('bmd-udl', True)

# Mohr's circle of stress
cx, cy, R = 250, 150, 95
b = AH + f'<path d="M30,{cy} L480,{cy}" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/><path d="M70,270 L70,20" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/>'
b += f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#c0392b" stroke-width="4"/>'
a = math.radians(35); px, py = cx + R * math.cos(a), cy - R * math.sin(a); qx, qy = 2 * cx - px, 2 * cy - py
b += line(px, py, qx, qy) + dot(px, py) + dot(qx, qy) + dot(cx, cy) + dot(cx - R, cy) + dot(cx + R, cy)
b += label(486, cy + 18, 'σ', 22) + label(88, 22, 'τ', 22) + label(cx - R - 14, cy + 20, 'σ₂', 18) + label(cx + R + 16, cy + 20, 'σ₁', 18)
svg('mohr-circle', 500, 290, b)

# Fourier series of a square wave, showing the overshoot at each jump
def sq(x, n=15): return 4 / math.pi * sum(math.sin((2 * k + 1) * x) / (2 * k + 1) for k in range(n))
graph('fourier-square', sq, -7, 7, -1.6, 1.6, 900)

# Phase portraits
def portrait(name, traj, arrows_at):
    W = H = 300; c = 150
    b = AH + thin(10, c, W - 10, c, 2) + thin(c, 10, c, H - 10, 2)
    for pts in traj:
        b += f'<path d="M' + ' L'.join(f'{c + x:.1f},{c - y:.1f}' for x, y in pts) + '" stroke="#c0392b" stroke-width="3" fill="none"/>'
        for i in arrows_at:
            if i + 1 < len(pts):
                (x1, y1), (x2, y2) = pts[i], pts[i + 1]
                b += f'<path d="M{c + x1:.1f},{c - y1:.1f} L{c + x2:.1f},{c - y2:.1f}" stroke="#c0392b" stroke-width="3" marker-end="url(#ah)"/>'
    svg(name, W, H, b)
spirals = []
for a0 in (0, math.pi):
    spirals.append([(130 * math.exp(-0.18 * t) * math.cos(t + a0), 130 * math.exp(-0.18 * t) * math.sin(t + a0)) for t in [i * 0.1 for i in range(260)]])
portrait('phase-spiral', spirals, [12, 70, 140])
sad = []
for k in (-1, 1):
    for m in (-1, 1):
        for c0 in (8, 30):
            pts = []
            for i in range(120):
                t = i * 0.04
                x, y = k * 140 * math.exp(-t), m * c0 * math.exp(t)
                if abs(y) > 140: break
                pts.append((x, y))
            sad.append(pts)
sad += [[(k * 140 * math.exp(-i * 0.05), 0) for i in range(40)] for k in (-1, 1)] + [[(0, k * 4 * math.exp(i * 0.05)) for i in range(70)] for k in (-1, 1)]
portrait('phase-saddle', sad, [15])

# Decaying vibration with two successive peaks marked
W, H = 520, 260
f = lambda t: math.exp(-0.25 * t) * math.cos(2 * math.pi * t / 2.0)
sx = lambda t: 40 + t / 12 * 460; sy = lambda v: 130 - v * 100
b = AH + f'<path d="M40,130 L505,130" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/><path d="M40,245 L40,15" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/>'
b += '<path d="M' + ' L'.join(f'{sx(t):.1f},{sy(f(t)):.1f}' for t in [i * 0.02 for i in range(601)]) + '" stroke="#c0392b" stroke-width="4" fill="none"/>'
for t, n in ((2.0, '₁'), (4.0, '₂')):
    b += f'<path d="M{sx(t):.1f},130 V{sy(f(t)):.1f}" stroke="#111" stroke-width="2" stroke-dasharray="5 4"/>' + label(sx(t) + 18, sy(f(t)) - 14, 'x' + n, 20)
b += label(510, 150, 't', 18) + label(56, 18, 'x', 18)
svg('damped-peaks', W, H, b)

# Two springs in series holding a mass
def zig(x0, x1, y, n=8, a=14):
    pts = [(x0, y)] + [(x0 + 15 + (x1 - x0 - 30) * (i + 0.5) / n, y + (a if i % 2 else -a)) for i in range(n)] + [(x1 - 15, y), (x1, y)]
    return poly([(x0, y), (x0 + 15, y)] + pts[1:], w=3.5)
b = thin(40, 40, 40, 160, 4) + ''.join(thin(40, y, 28, y + 12, 2) for y in range(40, 160, 12))
b += zig(40, 190, 100) + f'<rect x="190" y="88" width="14" height="24" fill="#111"/>' + zig(204, 354, 100)
b += f'<rect x="354" y="60" width="90" height="80" rx="4" {S}/>' + label(399, 100, 'm') + label(115, 65, 'k₁') + label(279, 65, 'k₂')
b += thin(354, 150, 444, 150, 3)
svg('springs-series', 470, 180, b)

# Resonance: amplitude ratio against frequency ratio for several damping ratios
W, H = 420, 280
sx = lambda r: 50 + r / 2.5 * 350; sy = lambda a: 250 - a / 5.5 * 220
b = AH + f'<path d="M50,250 L410,250" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/><path d="M50,250 L50,15" stroke="#111" stroke-width="2.5" marker-end="url(#ah)"/>'
for z in (0.1, 0.2, 0.35, 0.7):
    pts = [(sx(r), sy(min(5.4, 1 / math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2)))) for r in [i * 0.0125 for i in range(201)]]
    b += '<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" stroke="#c0392b" stroke-width="3" fill="none"/>'
b += f'<path d="M{sx(1)},250 V20" stroke="#888" stroke-width="1.5" stroke-dasharray="5 5"/>' + label(sx(1), 266, '1', 18) + label(400, 268, 'ω/ωₙ', 16) + label(70, 20, 'X/X₀', 16, 'start')
svg('resonance-curves', W, H, b)

print('ok', len(os.listdir(OUT)))
