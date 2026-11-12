// Compiles questions/*.txt into public/packs/<id>.json and public/packs/index.json.
// File format:
//   id: statics
//   name: Statics
//   nameAr: الاستاتيكا
//   group: engineering   (one of engineering, cces, general)
//   ## 100
//   Clue text :: Answer text
//   Clue with a picture {img:gate-and.svg} :: Answer   (picture in questions/img/, copied to public/packs/img/)
//   ## 200 ...
// Lines starting with # (but not ##) are comments. Exits non-zero on any problem.
// Arabic: questions/ar/<same file name> has the same ## headings and one
// "ClueAr :: AnswerAr" line per question, in the same order as the English file.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'questions')
const outDir = join(root, 'public', 'packs')
const LEVELS = ['100', '200', '300', '400', '500']
export const GROUPS = ['engineering', 'cces', 'general']
const MIN = Number(process.env.MIN_PER_LEVEL ?? 1)

export function parsePack(text, file = 'pack') {
  const errors = []
  const meta = {}
  const levels = LEVELS.map(() => [])
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
    const parts = line.split(/(?<=^|\s)::(?=\s|$)/)
    if (parts.length !== 2) { errors.push(`${at} needs exactly one " :: " between clue and answer`); return }
    let [q, a] = parts.map((s) => s.trim())
    let img
    const im = /\s*\{img:([a-z0-9-]+\.(?:svg|png|webp|jpg))\}\s*$/.exec(q)
    if (im) {
      img = `packs/img/${im[1]}`
      q = q.slice(0, im.index).trim()
      if (!existsSync(join(srcDir, 'img', im[1]))) errors.push(`${at} picture ${img} not found`)
    } else if (/\{img:/.test(q)) errors.push(`${at} picture must be written {img:name.svg} at the end of the clue`)
    if (!q || !a) { errors.push(`${at} empty clue or answer`); return }
    if (q.length > 260) errors.push(`${at} clue is longer than 260 characters`)
    if (a.length > 80) errors.push(`${at} answer is longer than 80 characters`)
    levels[cur].push(img ? { q, a, img, at } : { q, a, at })
  })
  if (!meta.id || !/^[a-z0-9-]+$/.test(meta.id)) errors.push(`${file}: missing or invalid "id:"`)
  if (!meta.name) errors.push(`${file}: missing "name:"`)
  if (!GROUPS.includes(meta.group)) errors.push(`${file}: "group:" must be one of ${GROUPS.join(', ')}`)
  const seen = new Map()
  levels.forEach((lvl, li) => {
    if (lvl.length < MIN) errors.push(`${file}: level ${LEVELS[li]} has ${lvl.length} questions, needs at least ${MIN}`)
    lvl.forEach(({ q, img, at }) => {
      // The same words can ask about different pictures
      const key = q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + (img ? ` ${img}` : '')
      if (seen.has(key)) errors.push(`${at} duplicate clue (also at ${seen.get(key)})`)
      else seen.set(key, at)
    })
  })
  return { meta, levels: levels.map((l) => l.map(({ q, a, img }) => (img ? { q, a, img } : { q, a }))), errors }
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

// Themed nights: questions/nights.json, a list of ready-made game setups.
//   { "id", "name", "nameAr"?, "about", "aboutAr"?, "cats": [1 to 6 category ids], "teams"?: [2 to 4 names], "teamsAr"?,
//     "extras"?: { "golden": 0-3, "steal": 0-3, "crowd": 0-2, "streak", "comeback", "lightning", "final": true/false } }
export function checkNights(nights, ids) {
  const errors = []
  if (!Array.isArray(nights)) return ['nights.json must be a list']
  const seen = new Set()
  nights.forEach((n, i) => {
    const at = `nights.json #${i + 1}`
    if (!n || typeof n !== 'object') return errors.push(`${at} is not an object`)
    if (typeof n.id !== 'string' || !/^[a-z0-9-]+$/.test(n.id)) errors.push(`${at} needs an "id" of lowercase letters, digits and dashes`)
    else if (seen.has(n.id)) errors.push(`${at} duplicate id "${n.id}"`)
    else seen.add(n.id)
    if (typeof n.name !== 'string' || !n.name.trim() || n.name.length > 40) errors.push(`${at} needs a "name" of up to 40 characters`)
    if (typeof n.about !== 'string' || n.about.length > 200) errors.push(`${at} needs an "about" of up to 200 characters`)
    if (!Array.isArray(n.cats) || n.cats.length < 1 || n.cats.length > 6) errors.push(`${at} needs 1 to 6 "cats"`)
    else for (const c of n.cats) if (!ids.includes(c)) errors.push(`${at} unknown category "${c}"`)
    for (const k of ['teams', 'teamsAr']) if (n[k] !== undefined && (!Array.isArray(n[k]) || n[k].length < 2 || n[k].length > 4 || n[k].some((t) => typeof t !== 'string' || !t.trim() || t.length > 24))) errors.push(`${at} "${k}" must be 2 to 4 names of up to 24 characters`)
    const x = n.extras ?? {}
    for (const [k, max] of [['golden', 3], ['steal', 3], ['crowd', 2]]) if (x[k] !== undefined && !(Number.isInteger(x[k]) && x[k] >= 0 && x[k] <= max)) errors.push(`${at} extras.${k} must be 0 to ${max}`)
    for (const k of ['streak', 'comeback', 'lightning', 'final']) if (x[k] !== undefined && typeof x[k] !== 'boolean') errors.push(`${at} extras.${k} must be true or false`)
  })
  return errors
}

function main() {
  mkdirSync(outDir, { recursive: true })
  if (existsSync(join(srcDir, 'img'))) cpSync(join(srcDir, 'img'), join(outDir, 'img'), { recursive: true })
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.txt')).sort()
  const index = []
  let errors = []
  for (const f of files) {
    let { meta, levels, errors: errs } = parsePack(readFileSync(join(srcDir, f), 'utf8'), f)
    errors = errors.concat(errs)
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
    const pack = { id: meta.id, name: meta.name, nameAr: meta.nameAr, group: meta.group, levels }
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
  const nightsPath = join(srcDir, 'nights.json')
  const nights = existsSync(nightsPath) ? JSON.parse(readFileSync(nightsPath, 'utf8')) : []
  const nightErrors = checkNights(nights, ids)
  if (nightErrors.length) {
    console.error(nightErrors.join('\n'))
    process.exit(1)
  }
  writeFileSync(join(outDir, 'nights.json'), JSON.stringify(nights))
  console.log(`${nights.length} themed nights`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
