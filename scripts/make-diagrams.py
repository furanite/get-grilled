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
print('ok', len(os.listdir(OUT)))
