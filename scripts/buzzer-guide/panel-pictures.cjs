// The four small drawings in the Buzzers panel, cut from the guide page in light colours.
// node scripts/buzzer-guide/panel-pictures.cjs "$PWD/public/buzzer-guide.html" public/buzzer-guide  (then convert the PNGs to .webp)
const { chromium } = require('playwright')
;(async () => {
  const [file, outDir] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 900, height: 900 }, colorScheme: 'light', deviceScaleFactor: 1.5 })
  await p.goto('file://' + file)
  await p.evaluate(() => document.querySelectorAll('img').forEach((i) => i.remove()))
  const map = { 0: 'panel-laptop', 1: 'panel-pi', 6: 'panel-flag', 7: 'panel-players' }
  const figs = await p.$$('figure.diagram svg')
  for (const [i, name] of Object.entries(map)) await figs[+i].screenshot({ path: `${outDir}/${name}.png`, omitBackground: false })
  await b.close()
})()
