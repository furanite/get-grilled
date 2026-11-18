// Moves questions to a different points level, keeping their wording.
//
//   node scripts/relevel.mjs moves.tsv [questions-dir]
//
// moves.tsv has one move per line: file <TAB> line number <TAB> new level <TAB> start of the clue
// Line numbers are the ones in the file before any move. The clue start is checked so a
// stale line number never moves the wrong question. Write "-" as the line number to find the
// question by its exact clue text instead (the whole clue, before " :: "), which keeps working
// while other lines are added to the file. The Arabic file (questions/ar/<file>),
// which is line-aligned per level, gets the same moves so the pairs stay matched.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const LEVELS = ['100', '200', '300', '400', '500']
const here = dirname(fileURLToPath(import.meta.url))
const [movesPath, dirArg] = process.argv.slice(2)
if (!movesPath) { console.error('usage: node scripts/relevel.mjs moves.tsv [questions-dir]'); process.exit(1) }
const dir = dirArg ?? join(here, '..', 'questions')

// Splits a file into blocks: header lines, then one block per "## " section.
function sections(lines) {
  const out = [{ head: null, lines: [] }]
  lines.forEach((l, i) => {
    if (l.trim().startsWith('##')) out.push({ head: l.trim().slice(2).trim(), headLine: l, lines: [] })
    else out[out.length - 1].lines.push({ text: l, n: i + 1 })
  })
  return out
}
const isQ = (t) => t.trim() && !t.trim().startsWith('#') && t.includes('::')

const byFile = new Map()
let bad = 0
readFileSync(movesPath, 'utf8').split(/\r?\n/).forEach((row, i) => {
  if (!row.trim() || row.startsWith('#')) return
  const [file, line, to, start = ''] = row.split('\t')
  if (!LEVELS.includes(to?.trim())) { console.error(`moves:${i + 1} bad level "${to}"`); bad++; return }
  if (!byFile.has(file)) byFile.set(file, [])
  byFile.get(file).push({ line: line.trim() === '-' ? NaN : Number(line), to: to.trim(), start: start.trim() })
})

let moved = 0
for (const [file, moves] of byFile) {
  const path = join(dir, file)
  const text = readFileSync(path, 'utf8')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const secs = sections(lines)
  const arPath = join(dir, 'ar', file)
  const ar = existsSync(arPath) ? sections(readFileSync(arPath, 'utf8').split(/\r?\n/)) : null
  const pending = LEVELS.map(() => [])
  const arPending = LEVELS.map(() => [])
  const drop = new Set()
  const arDrop = new Set()
  const clueOf = (t) => t.split(/(?<=^|\s)::(?=\s|$)/)[0].trim()
  for (const mv of moves) {
    if (Number.isNaN(mv.line)) {
      const hits = secs.filter((s) => LEVELS.includes(s.head)).flatMap((s) => s.lines.filter((l) => isQ(l.text) && clueOf(l.text) === mv.start))
      if (hits.length !== 1) { console.error(`${file}: ${hits.length ? 'more than one question has' : 'no question has'} the clue "${mv.start}"`); bad++; continue }
      mv.line = hits[0].n
    }
    const si = secs.findIndex((s) => s.lines.some((l) => l.n === mv.line))
    const sec = secs[si]
    const from = sec?.head
    const entry = sec?.lines.find((l) => l.n === mv.line)
    if (!entry || !LEVELS.includes(from) || !isQ(entry.text)) { console.error(`${file}:${mv.line} is not a question in a points level`); bad++; continue }
    const norm = (s) => s.replace(/\s+/g, ' ').toLowerCase()
    if (mv.start && !norm(entry.text.trim()).startsWith(norm(mv.start).slice(0, 40))) { console.error(`${file}:${mv.line} clue does not start with "${mv.start}"`); bad++; continue }
    if (from === mv.to) continue
    drop.add(mv.line)
    pending[LEVELS.indexOf(mv.to)].push(entry.text)
    if (ar) {
      const idx = sec.lines.filter((l) => isQ(l.text)).indexOf(entry)
      const asec = ar.find((s) => s.head === from)
      const aq = asec.lines.filter((l) => isQ(l.text))[idx]
      if (!aq) { console.error(`ar/${file}: no Arabic line for ${file}:${mv.line}`); bad++; continue }
      arDrop.add(aq.n)
      arPending[LEVELS.indexOf(mv.to)].push(aq.text)
    }
    moved++
  }
  const rebuild = (ss, dropSet, add) => {
    const out = []
    for (const s of ss) {
      if (s.head !== null) out.push(s.headLine)
      const kept = s.lines.filter((l) => !dropSet.has(l.n)).map((l) => l.text)
      const li = LEVELS.indexOf(s.head)
      if (li >= 0 && add[li].length) {
        let end = kept.length
        while (end > 0 && !kept[end - 1].trim()) end--
        kept.splice(end, 0, ...add[li])
      }
      out.push(...kept)
    }
    return out.join(eol)
  }
  writeFileSync(path, rebuild(secs, drop, pending))
  if (ar) writeFileSync(arPath, rebuild(ar, arDrop, arPending))
}
console.log(`moved ${moved} question(s) in ${byFile.size} file(s)${bad ? `, ${bad} problem(s)` : ''}`)
if (bad) process.exit(1)
