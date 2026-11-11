// Compiles questions/*.txt into public/packs/<id>.json and public/packs/index.json.
// File format:
//   id: statics
//   name: Statics
//   nameAr: الاستاتيكا
//   group: engineering   (see GROUPS)
//   ## 100
//   Clue text :: Answer text
//   Clue text :: Answer text || H: Source   (source tag, required in Islamic and kids groups)
//   ## 200 ...
// Source tags: H = historical or sourced fact (needs a source), D = dramatised, F = fictional.
// A "?" after the letter (H?: ...) marks a fact still to be checked: it is left out of the
// game and listed in questions/TO-VERIFY.md until the "?" is removed.
// Lines starting with # (but not ##) are comments. Exits non-zero on any problem.
// Arabic: questions/ar/<same file name> has the same ## headings and one
// "ClueAr :: AnswerAr" line per question, in the same order as the English file.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'questions')
const outDir = join(root, 'public', 'packs')
const LEVELS = ['100', '200', '300', '400', '500']
export const GROUPS = ['engineering', 'cces', 'general', 'quran', 'hadith', 'aqidah', 'fiqh', 'prophets', 'arabic', 'tazkiyah', 'islamichistory', 'kids']
// Religious groups: every line needs a source tag, and the app plays these clues without spins or shakes.
export const RESPECT_GROUPS = ['quran', 'hadith', 'aqidah', 'fiqh', 'prophets', 'arabic', 'tazkiyah', 'islamichistory', 'kids']
const MIN = Number(process.env.MIN_PER_LEVEL ?? 1)

export function parsePack(text, file = 'pack') {
  const errors = []
  const meta = {}
  const levels = LEVELS.map(() => [])
  const unchecked = []
  let cur = -1
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    const at = `${file}:${i + 1}`
    if (!line || (line.startsWith('#') && !line.startsWith('##'))) return
    if (line.startsWith('##')) {
      const v = line.slice(2).trim()
      cur = LEVELS.indexOf(v)
      if (cur < 0) errors.push(`${at} unknown level "${v}"`)
      return
    }
    const m = /^(id|name|nameAr|group):\s*(.+)$/.exec(line)
    if (m && cur < 0) { meta[m[1]] = m[2].trim(); return }
    if (cur < 0) { errors.push(`${at} question before any "## level" heading`); return }
    const [body, tagText, extra] = line.split(/\s\|\|\s/)
    if (extra !== undefined) { errors.push(`${at} more than one " || " source tag`); return }
    const parts = body.split(/(?<=^|\s)::(?=\s|$)/)
    if (parts.length !== 2) { errors.push(`${at} needs exactly one " :: " between clue and answer`); return }
    const [q, a] = parts.map((s) => s.trim())
    if (!q || !a) { errors.push(`${at} empty clue or answer`); return }
    if (q.length > 260) errors.push(`${at} clue is longer than 260 characters`)
    if (a.length > 80) errors.push(`${at} answer is longer than 80 characters`)
    const item = { q, a, at }
    if (tagText !== undefined) {
      const t = /^([HDF])(\?)?(?::\s*(.*))?$/.exec(tagText.trim())
      if (!t) { errors.push(`${at} source tag must look like "H: source", "D: note" or "F"`); return }
      if (t[1] === 'H' && !t[3]?.trim()) { errors.push(`${at} historical tag needs a source after "H:"`); return }
      item.kind = t[1]
      if (t[3]?.trim()) item.src = t[3].trim()
      if (t[2]) { unchecked.push({ ...item, level: LEVELS[cur] }); return }
    } else if (RESPECT_GROUPS.includes(meta.group)) {
      errors.push(`${at} needs a source tag (" || H: source", " || D" or " || F")`)
      return
    }
    levels[cur].push(item)
  })
  if (!meta.id || !/^[a-z0-9-]+$/.test(meta.id)) errors.push(`${file}: missing or invalid "id:"`)
  if (!meta.name) errors.push(`${file}: missing "name:"`)
  if (!GROUPS.includes(meta.group)) errors.push(`${file}: "group:" must be one of ${GROUPS.join(', ')}`)
  const seen = new Map()
  levels.forEach((lvl, li) => {
    if (lvl.length < MIN) errors.push(`${file}: level ${LEVELS[li]} has ${lvl.length} questions, needs at least ${MIN}`)
    lvl.forEach(({ q, at }) => {
      const key = q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
      if (seen.has(key)) errors.push(`${at} duplicate clue (also at ${seen.get(key)})`)
      else seen.set(key, at)
    })
  })
  const clean = ({ q, a, kind, src }) => ({ q, a, ...(kind ? { kind } : {}), ...(src ? { src } : {}) })
  return { meta, levels: levels.map((l) => l.map(clean)), unchecked: unchecked.map(({ level, at, ...x }) => ({ level, at, ...clean(x) })), errors }
}

const digits = (s) => (s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).match(/\d+/g) ?? []).sort().join(',')

// Reads an Arabic file and pairs it with the parsed English levels.
export function mergeArabic(levels, text, file = 'ar') {
  const errors = []
  const ar = LEVELS.map(() => [])
  let cur = -1
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    const at = `${file}:${i + 1}`
    if (!line || (line.startsWith('#') && !line.startsWith('##'))) return
    if (line.startsWith('##')) {
      cur = LEVELS.indexOf(line.slice(2).trim())
      if (cur < 0) errors.push(`${at} unknown level`)
      return
    }
    if (cur < 0) { errors.push(`${at} line before any "## level" heading`); return }
    const parts = line.split(/(?<=^|\s)::(?=\s|$)/)
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) { errors.push(`${at} needs "clue :: answer"`); return }
    ar[cur].push({ qAr: parts[0].trim(), aAr: parts[1].trim(), at })
  })
  const out = levels.map((lvl, li) => {
    if (ar[li].length !== lvl.length) {
      errors.push(`${file}: level ${LEVELS[li]} has ${ar[li].length} Arabic lines but ${lvl.length} English questions`)
      return lvl
    }
    return lvl.map((qa, qi) => {
      const t = ar[li][qi]
      if (digits(qa.a) !== digits(t.aAr)) errors.push(`${t.at} numbers in the answer differ from the English (${qa.a}), lines may be out of step`)
      return { ...qa, qAr: t.qAr, aAr: t.aAr }
    })
  })
  return { levels: out, errors }
}

function main() {
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.txt')).sort()
  const index = []
  const review = []
  let errors = []
  for (const f of files) {
    let { meta, levels, unchecked, errors: errs } = parsePack(readFileSync(join(srcDir, f), 'utf8'), f)
    errors = errors.concat(errs)
    if (unchecked.length) review.push({ name: meta.name, file: f, items: unchecked })
    if (errs.length) continue
    let arCount = 0
    const arPath = join(srcDir, 'ar', f)
    if (existsSync(arPath)) {
      const m = mergeArabic(levels, readFileSync(arPath, 'utf8'), `ar/${f}`)
      errors = errors.concat(m.errors)
      if (m.errors.length) continue
      levels = m.levels
      arCount = levels.reduce((s, l) => s + l.length, 0)
    }
    const respect = RESPECT_GROUPS.includes(meta.group) || undefined
    // PACK_EDITION=islamic builds a site with only the Islamic and Kids collections (used by the Ilm Munfasah site).
    if (process.env.PACK_EDITION === 'islamic' && !respect) continue
    const pack = { id: meta.id, name: meta.name, nameAr: meta.nameAr, group: meta.group, respect, levels }
    writeFileSync(join(outDir, `${meta.id}.json`), JSON.stringify(pack))
    index.push({ id: meta.id, name: meta.name, nameAr: meta.nameAr, group: meta.group, counts: levels.map((l) => l.length) })
    console.log(`${meta.id.padEnd(18)} ${levels.map((l) => String(l.length).padStart(4)).join(' ')}  total ${levels.reduce((s, l) => s + l.length, 0)}  arabic ${arCount}`)
  }
  const ids = index.map((c) => c.id)
  ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errors.push(`duplicate category id "${id}"`) })
  if (errors.length) {
    console.error(errors.join('\n'))
    console.error(`\n${errors.length} problem(s) found`)
    process.exit(1)
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index))
  writeFileSync(join(srcDir, 'TO-VERIFY.md'), reviewMarkdown(review))
  const n = review.reduce((s, r) => s + r.items.length, 0)
  if (n) console.log(`\n${n} question(s) marked "?" are held back from the game; see questions/TO-VERIFY.md`)
}

// The list of held-back questions, for the owner to check.
export function reviewMarkdown(review) {
  const lines = ['# Questions to verify', '', 'These questions are marked with "?" in their source tag, so the game leaves them out.', 'Check each one; then delete the "?" (keep it in the game) or fix or delete the line.', 'This file is rewritten by `npm run packs`.', '']
  if (!review.length) lines.push('Nothing to verify.')
  for (const r of review) {
    lines.push(`## ${r.name} (questions/${r.file})`, '')
    for (const x of r.items) lines.push(`- **${x.level}**, line ${x.at.split(':').pop()}: ${x.q} **Answer:** ${x.a}${x.src ? ` _(Source: ${x.src})_` : ''}`)
    lines.push('')
  }
  return lines.join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
