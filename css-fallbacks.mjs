// Older browsers (Chrome before 111, Safari before 16.2) do not know color-mix(). There, a declaration that
// uses it is dropped, so a button can lose its background and its text, which is drawn in the page colour,
// disappears. This PostCSS step gives every such declaration a plain fallback colour, and puts the
// color-mix() version back inside @supports, so newer browsers look exactly as before.

/** Splits "a, b(c, d), e" at top-level commas. */
function splitArgs(s) {
  const out = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  out.push(cur.trim())
  return out
}
/** Replaces each color-mix(...) in a value with its nearest single colour. */
export function fallbackValue(value) {
  let v = value
  for (;;) {
    const i = v.indexOf('color-mix(')
    if (i < 0) return v
    let depth = 0, j = i + 'color-mix'.length
    for (; j < v.length; j++) {
      if (v[j] === '(') depth++
      else if (v[j] === ')' && --depth === 0) break
    }
    const [, a = '', b = ''] = splitArgs(v.slice(i + 'color-mix('.length, j))
    const part = (x) => {
      const m = x.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/)
      return m ? { c: m[1].trim(), p: +m[2] } : { c: x.trim(), p: null }
    }
    const A = part(a), B = part(b)
    const pa = A.p ?? (B.p != null ? 100 - B.p : 50)
    let pick = pa >= 50 ? A.c : B.c
    // Mixing with transparent only fades a colour, so keep the colour unless it is mostly see-through.
    if (B.c === 'transparent') pick = pa >= 35 ? A.c : 'transparent'
    if (A.c === 'transparent') pick = pa <= 65 ? B.c : 'transparent'
    v = v.slice(0, i) + pick + v.slice(j + 1)
  }
}

export default function colorMixFallbacks() {
  return {
    postcssPlugin: 'color-mix-fallbacks',
    OnceExit(root, { AtRule }) {
      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && rule.parent.name === 'supports') return
        if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
        const decls = rule.nodes.filter((n) => n.type === 'decl' && n.value.includes('color-mix('))
        if (!decls.length) return
        const modern = rule.clone({ nodes: [] })
        for (const d of decls) {
          modern.append(d.clone())
          d.value = fallbackValue(d.value)
        }
        const sup = new AtRule({ name: 'supports', params: '(color:color-mix(in oklab,red,blue))' })
        sup.append(modern)
        rule.after(sup)
      })
    },
  }
}
colorMixFallbacks.postcss = true
