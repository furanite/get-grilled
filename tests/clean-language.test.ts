import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// The owner's rule (2026-11-23): no curse words, slurs or crude language anywhere in the game,
// in English, Arabic or Urdu, because it is played at a Saudi university and with families.
// Words are matched whole, so names like Dickens, Scunthorpe or Cocks (the cryptographer) and
// engineering words like "assess" or "cockpit" never trip it.
const EN = [
  'fuck\\w*', 'shit\\w*', 'bitch\\w*', 'bastards?', 'damn\\w*', 'goddam\\w*', 'crap', 'crappy', 'piss', 'pissed', 'pissing',
  'asshole\\w*', 'arsehole\\w*', 'cunt\\w*', 'whores?', 'sluts?', 'slutty', 'fags?', 'faggots?', 'nigg\\w*', 'retard', 'retards', 'retarded',
  'wank', 'wanker\\w*', 'wanking', 'twats?', 'bollocks', 'bugger\\w*', 'porn\\w*', 'sexy', 'boobs?', 'tits', 'horny', 'stupid\\w*', 'idiot\\w*',
  'moron', 'morons', 'moronic', 'dumbass', 'jackass', 'douche\\w*', 'pee', 'peeing', 'poop\\w*', 'wtf', 'stfu', 'prostitut\\w*', 'hookers?',
]
const AR = ['شرموط\\S*', 'قحب\\S*', 'منيوك\\S*', 'منيك\\S*', 'كسمك', 'كس أمك', 'طيز\\S*', 'عرص', 'معرص', 'خول', 'زبي', 'يلعن أبو\\S*', 'ابن الكلب', 'يا حمار', 'يا كلب', 'يا غبي', 'حقير']
const UR = ['چوتیا\\S*', 'بہن ?چود\\S*', 'ماں ?چود\\S*', 'گانڈو', 'حرامزاد\\S*', 'حرامی', 'رنڈی\\S*', 'کنجر\\S*', 'کمین\\S*', 'الو کا پٹھا', 'بے ?غیرت']
const en = new RegExp(`(?<![A-Za-z])(${EN.join('|')})(?![A-Za-z])`, 'i')
const arUr = new RegExp(`(?<![\\u0600-\\u06FF])(${[...AR, ...UR].join('|')})(?![\\u0600-\\u06FF])`)

// Haram food and drink stay out of the Food packs (fiqh and law packs may still name them, as rulings).
const FOOD_EN = /(?<![A-Za-z])(pork|ham|bacon|prosciutto|jam[oó]n|sausages?|pepperoni|salami|wine|beer|ale|liquor|vodka|whisk(?:e)?y|rum|gin|sake|brandy|cocktails?)(?![A-Za-z])/i
const FOOD_AR = /(لحم الخنزير|النبيذ|الجعة|البيرة|الخمر|خمور|ويسكي|فودكا)/

const root = join(__dirname, '..')
const walk = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const files = [...walk(join(root, 'questions')), ...walk(join(root, 'src')), join(root, 'index.html')]
  .filter((p) => /\.(txt|json|md|ts|tsx|js|mjs|html|css)$/.test(p) && existsSync(p))
const lines = files.flatMap((p) => readFileSync(p, 'utf8').split('\n').map((text, i) => ({ at: `${relative(root, p)}:${i + 1}`, text })))

describe('clean language (owner, 2026-11-23)', () => {
  it('no curse words, slurs or crude words in English', () => {
    expect(lines.filter((l) => en.test(l.text)).map((l) => `${l.at} | ${l.text.slice(0, 160)}`)).toEqual([])
  })

  it('no curse words, slurs or crude words in Arabic or Urdu', () => {
    expect(lines.filter((l) => arUr.test(l.text)).map((l) => `${l.at} | ${l.text.slice(0, 160)}`)).toEqual([])
  })

  it('the Food packs name no pork or alcohol dishes', () => {
    const food = lines.filter((l) => /questions\/(?:ar\/|ur\/)?food\.txt:/.test(l.at))
    expect(food.length).toBeGreaterThan(0)
    expect(food.filter((l) => FOOD_EN.test(l.text) || FOOD_AR.test(l.text)).map((l) => `${l.at} | ${l.text}`)).toEqual([])
  })

  it('the checker catches a planted word and leaves look-alike names alone', () => {
    expect(en.test('What the shit is this')).toBe(true)
    expect(en.test('Charles Dickens wrote this. Scunthorpe. Clifford Cocks. assess the cockpit.')).toBe(false)
    expect(arUr.test('يا حمار')).toBe(true)
    expect(arUr.test('الحمار حيوان أليف')).toBe(false)
  })
})
