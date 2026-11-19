import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Game, Lang, LogEntry, Question } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { standings } from '../lib/game'
import { useDialog } from './Legal'
import { APP_NAME } from '../lib/edition'
import { dirOf, qOf, aOf, nameOf, localeOf } from '../lib/lang'

/** What happened for one team over the game, worked out from the log. */
export interface TeamStats {
  right: number
  wrong: number
  /** Points taken from other teams on Steal tiles, and points other teams took from this one */
  stole: number
  lost: number
  /** Most right answers in a row on the board */
  bestRun: number
  /** The category this team scored most in (board only) */
  bestCat?: string
  adjusted: number
}

export function teamStats(game: Game): TeamStats[] {
  const log = game.log ?? []
  const out: TeamStats[] = game.teams.map(() => ({ right: 0, wrong: 0, stole: 0, lost: 0, bestRun: 0, adjusted: 0 }))
  const run = game.teams.map(() => 0)
  const byCat = game.teams.map(() => new Map<string, number>())
  for (const e of log) {
    const s = e.team >= 0 ? out[e.team] : undefined
    if (e.kind === 'right' || e.kind === 'lightning' || e.kind === 'mode' || (e.kind === 'final' && e.delta > 0) || (e.kind === 'tiebreak' && e.delta > 0)) {
      if (s) s.right++
      if (e.kind === 'right') {
        run.forEach((_, i) => (run[i] = i === e.team ? run[i] + 1 : 0))
        if (s) s.bestRun = Math.max(s.bestRun, run[e.team])
        if (e.cat) byCat[e.team].set(e.cat, (byCat[e.team].get(e.cat) ?? 0) + e.delta)
      }
    } else if (e.kind === 'wrong' || (e.kind === 'tiebreak' && e.delta === 0)) {
      if (s) s.wrong++
      if (e.kind === 'wrong' && e.team >= 0) run[e.team] = 0
    } else if (e.kind === 'final' && e.delta < 0 && s) s.right--
    else if (e.kind === 'steal') {
      if (s) s.lost += -e.delta
      if (e.by !== undefined && out[e.by]) out[e.by].stole += -e.delta
    } else if (e.kind === 'adjust' && s) s.adjusted += e.delta
  }
  out.forEach((s, i) => {
    let best: [string, number] | undefined
    for (const kv of byCat[i]) if (!best || kv[1] > best[1]) best = kv
    if (best) s.bestCat = best[0]
  })
  return out
}

const clock = (at: number, lang: Lang) => new Date(at).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })

/** One log line in words: "Right", "Wrong", "Steal from", and so on. */
export function kindText(t: Strings, e: LogEntry): string {
  if (e.kind === 'final') return e.delta >= 0 ? t.log.kinds.final : t.log.kinds.finalUndo
  if (e.kind === 'tiebreak') return e.delta > 0 ? t.log.kinds.tiebreak : t.log.kinds.tieMiss
  return t.log.kinds[e.kind]
}

/** The log as a spreadsheet file (comma-separated), for the organisers' records. */
export function logCsv(t: Strings, game: Game, lang: Lang): string {
  const cell = (v: unknown) => {
    const s = String(v ?? '')
    // Quote every cell, and stop a spreadsheet treating text as a formula.
    return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'
  }
  const head = [t.log.time, t.log.round, t.log.cat, t.log.value, t.log.team, t.log.result, t.log.points, t.log.question, t.log.answer]
  const rows = (game.log ?? []).map((e) => [
    clock(e.at, lang),
    e.round ?? '',
    e.cat ?? '',
    e.value ?? '',
    e.team >= 0 ? game.teams[e.team]?.name : t.log.nobodyTeam,
    kindText(t, e) + (e.by !== undefined ? ` (${game.teams[e.by]?.name})` : ''),
    e.delta,
    e.q ?? '',
    e.a ?? '',
  ])
  const totals = [[], [t.log.final], ...standings(game).map((r) => [r.rank, r.name, r.score])]
  // A byte-order mark so Excel opens the file as UTF-8 (Arabic names stay readable).
  return '﻿' + [head, ...rows, ...totals].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** Saves text as a file on the host's device. */
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const stamp = () => new Date().toISOString().slice(0, 10)
const safe = (s: string) => s.replace(/[^\w؀-ۿ-]+/g, '_').slice(0, 40)

/**
 * A print job: while it is on, the page to print is mounted, the browser's print window opens,
 * and the page is taken away again once printing is done or cancelled.
 */
export function usePrintJob(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!on) return
    const id = setTimeout(() => {
      try {
        window.print()
      } finally {
        setOn(false)
      }
    }, 80)
    return () => clearTimeout(id)
  }, [on])
  return [on, () => setOn(true)]
}

/** Content that only appears on paper: hidden on screen, the only thing printed while it is mounted. */
export function PrintArea({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-root">{children}</div>, document.body)
}

const signed = (d: number, lang: Lang) => (d > 0 ? '+' : d < 0 ? '−' : '') + num(Math.abs(d), lang)

function StatsGrid({ t, lang, game }: { t: Strings; lang: Lang; game: Game }) {
  const stats = teamStats(game)
  return (
    <div className="log-stats" data-testid="log-stats">
      {standings(game).map((r) => {
        const s = stats[r.index]
        return (
          <div className="log-team" key={r.index}>
            <b>
              {num(r.rank, lang)}. {r.name}
            </b>
            <span className="log-score">{num(r.score, lang)}</span>
            <dl>
              <dt>{t.log.right}</dt>
              <dd>{num(s.right, lang)}</dd>
              <dt>{t.log.wrong}</dt>
              <dd>{num(s.wrong, lang)}</dd>
              <dt>{t.log.bestRun}</dt>
              <dd>{num(s.bestRun, lang)}</dd>
              {(s.stole > 0 || s.lost > 0) && (
                <>
                  <dt>{t.log.steals}</dt>
                  <dd>
                    +{num(s.stole, lang)} / −{num(s.lost, lang)}
                  </dd>
                </>
              )}
              {s.adjusted !== 0 && (
                <>
                  <dt>{t.log.adjusted}</dt>
                  <dd>{signed(s.adjusted, lang)}</dd>
                </>
              )}
              {s.bestCat && (
                <>
                  <dt>{t.log.bestCat}</dt>
                  <dd>{s.bestCat}</dd>
                </>
              )}
            </dl>
          </div>
        )
      })}
    </div>
  )
}

function LogTable({ t, lang, game }: { t: Strings; lang: Lang; game: Game }) {
  const log = game.log ?? []
  if (!log.length) return <p className="muted">{t.log.empty}</p>
  const rounds = !!game.tournament
  return (
    <div className="log-scroll">
      <table className="log-table" data-testid="log-table">
        <thead>
          <tr>
            <th>{t.log.time}</th>
            {rounds && <th>{t.log.round}</th>}
            <th>{t.log.cat}</th>
            <th>{t.log.team}</th>
            <th>{t.log.result}</th>
            <th className="num">{t.log.points}</th>
            <th>{t.log.question}</th>
          </tr>
        </thead>
        <tbody>
          {log.map((e, i) => (
            <tr key={i} className={`k-${e.kind}`}>
              <td className="num">{clock(e.at, lang)}</td>
              {rounds && <td className="num">{e.round ? num(e.round, lang) : ''}</td>}
              <td>
                {e.cat}
                {e.value ? ` · ${num(e.value, lang)}` : ''}
              </td>
              <td>{e.team >= 0 ? game.teams[e.team]?.name : t.log.nobodyTeam}</td>
              <td>
                {kindText(t, e)}
                {e.by !== undefined ? ` (${game.teams[e.by]?.name})` : ''}
              </td>
              <td className={`num${e.delta < 0 ? ' neg' : ''}`}>{e.delta ? signed(e.delta, lang) : '·'}</td>
              <td className="log-q" dir="auto">
                {e.q}
                {e.a ? <em> → {e.a}</em> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The game log and judges' sheet: every point won and lost, team stats, and ways to print or keep it. */
export function LogSheet({ t, lang, game, onClose }: { t: Strings; lang: Lang; game: Game; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  const title = game.teams.map((tm) => tm.name).join(' · ')
  const [printing, print] = usePrintJob()
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel log-panel" role="dialog" aria-modal="true" aria-labelledby="log-title" ref={ref} data-testid="log" dir={dirOf(lang)} lang={lang}>
        <div className="legal-head">
          <h1 id="log-title">{t.log.title}</h1>
        </div>
        <div className="legal-body">
          <p className="muted">{t.log.help}</p>
          <StatsGrid t={t} lang={lang} game={game} />
          <LogTable t={t} lang={lang} game={game} />
        </div>
        <div className="legal-actions">
          <button type="button" className="ghost" onClick={print} data-testid="log-print">
            {t.log.print}
          </button>
          <button type="button" className="ghost" onClick={() => downloadText(`${safe(APP_NAME).toLowerCase()}-log-${stamp()}-${safe(title)}.csv`, logCsv(t, game, lang))} data-testid="log-csv" disabled={!game.log?.length}>
            {t.log.csv}
          </button>
          <button type="button" className="btn" onClick={onClose} data-autofocus data-testid="log-close">
            {t.done}
          </button>
        </div>
      </div>
      {printing && <PrintArea>
        <div className="print-sheet" dir={dirOf(lang)}>
          <h1>
            {t.log.title}: {title}
          </h1>
          <p>
            {new Date(game.startedAt).toLocaleString(localeOf(lang))}
          </p>
          <StatsGrid t={t} lang={lang} game={game} />
          <LogTable t={t} lang={lang} game={game} />
          <p className="print-sign">
            {t.log.signHost} ____________________ &nbsp; {t.log.signJudge} ____________________
          </p>
        </div>
      </PrintArea>}
    </div>
  )
}

/** Every question the game drew, with its answer, on paper: a backup in case the laptop fails, and a sheet for the judges. */
export function BackupSheet({ t, lang, game }: { t: Strings; lang: Lang; game: Game }) {
  const qa = (q: Question) => [qOf(q, lang), aOf(q, lang)]
  const boards = game.tournament
    ? game.tournament.rounds.flatMap((r, k) => (r.cats && r.clues ? [{ title: `${t.roundWord} ${k + 1}`, cats: r.cats, clues: r.clues }] : []))
    : [{ title: '', cats: game.cats, clues: game.clues }]
  const modeItems = game.tournament ? game.tournament.rounds.flatMap((r) => r.items ?? []) : (game.modeRound?.items ?? [])
  return (
    <PrintArea>
      <div className="print-sheet backup" dir={dirOf(lang)}>
        <h1>{t.sheet.title}</h1>
        <p>
          {game.teams.map((tm) => tm.name).join(' · ')} · {new Date(game.startedAt).toLocaleDateString(localeOf(lang))}
        </p>
        <p className="print-note">{t.sheet.note}</p>
        {boards.map((b, bi) => (
          <section key={bi}>
            {b.title && <h2>{b.title}</h2>}
            {b.cats.map((c, ci) => (
              <div className="sheet-cat" key={ci}>
                <h3>{nameOf(c, lang)}</h3>
                <ol>
                  {b.clues[ci].map((cl, l) => {
                    const [q, a] = qa(cl)
                    return (
                      <li key={l}>
                        <b>{cl.value || VALUES[l]}</b>
                        {cl.golden ? ` · ${t.golden}` : ''}
                        {cl.special === 'steal' ? ` · ${t.steal}` : cl.special === 'crowd' ? ` · ${t.crowd}` : ''}
                        {cl.img ? ` · ${t.sheet.picture}` : ''} — <span dir="auto">{q}</span>
                        <br />
                        <i>→ {a}</i>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </section>
        ))}
        {modeItems.length > 0 && (
          <section>
            <h2>{t.sheet.special}</h2>
            <ol>
              {modeItems.map((it, i) => (
                <li key={i}>
                  <span dir="auto">{it.q.replace(/ \| /g, ' / ')}</span>
                  <br />
                  <i>→ {it.a}</i>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!game.lightning?.length && (
          <section>
            <h2>{t.lightningTitle}</h2>
            <ol>
              {game.lightning.map((q, i) => {
                const [qq, a] = qa(q)
                return (
                  <li key={i}>
                    <span dir="auto">{qq}</span> <i>→ {a}</i>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
        {game.final && (
          <section>
            <h2>
              {t.finalTitle} · {game.final.cat.name}
            </h2>
            <p>
              <span dir="auto">{qa(game.final.q)[0]}</span>
              <br />
              <i>→ {qa(game.final.q)[1]}</i>
            </p>
          </section>
        )}
        {!!game.tiebreak?.length && (
          <section>
            <h2>{t.tb.title}</h2>
            <ol>
              {game.tiebreak.map((it, i) => (
                <li key={i}>
                  {it.cat.name} — <span dir="auto">{qa(it.q)[0]}</span> <i>→ {qa(it.q)[1]}</i>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </PrintArea>
  )
}
