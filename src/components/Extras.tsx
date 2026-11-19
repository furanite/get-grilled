import { useRef, useState } from 'react'
import type { Lang, PoolEdit } from '../lib/types'
import { VALUES } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { num } from '../lib/i18n'
import { emptyPool } from '../lib/game'
import { type Flag, type ViewPrefs, loadFlags, saveFlags } from '../lib/store'
import { voiceAvailable } from '../lib/voice'
import { useDialog } from './Legal'
import { downloadText } from './Sheets'
import { dirOf } from '../lib/lang'

/** The app's version, stamped at build time from package.json. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

function Panel({ id, title, lang, onClose, children, actions, testid }: { id: string; title: string; lang: Lang; onClose: () => void; children: React.ReactNode; actions: React.ReactNode; testid: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel extras-panel" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} data-testid={testid} dir={dirOf(lang)} lang={lang}>
        <div className="legal-head">
          <h1 id={id}>{title}</h1>
        </div>
        <div className="legal-body">{children}</div>
        <div className="legal-actions">{actions}</div>
      </div>
    </div>
  )
}

/** Display options for this device. */
export function ViewDialog({ t, lang, view, setView, onClose }: { t: Strings; lang: Lang; view: ViewPrefs; setView: (v: ViewPrefs) => void; onClose: () => void }) {
  const row = (k: keyof ViewPrefs, label: string, help?: string) => (
    <label className="check view-opt">
      <input type="checkbox" checked={view[k]} onChange={(e) => setView({ ...view, [k]: e.target.checked })} data-testid={`view-${k}`} />
      <span>
        <b>{label}</b>
        {help && <span className="muted small"> {help}</span>}
      </span>
    </label>
  )
  return (
    <Panel
      id="view-title"
      title={t.view.title}
      lang={lang}
      onClose={onClose}
      testid="view-dialog"
      actions={
        <button className="btn" onClick={onClose} data-autofocus data-testid="view-done">
          {t.done}
        </button>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        {row('big', t.view.big, t.view.bigHelp)}
        {row('cb', t.view.cb, t.view.cbHelp)}
        {voiceAvailable() && row('voice', t.view.voice, t.view.voiceHelp)}
        {row('awake', t.view.awake)}
      </div>
    </Panel>
  )
}

/** What's new in this version, and whether the game is ready to work offline. */
export function NewsDialog({ t, lang, offline, onClose }: { t: Strings; lang: Lang; offline: boolean; onClose: () => void }) {
  return (
    <Panel
      id="news-title"
      title={t.news.title}
      lang={lang}
      onClose={onClose}
      testid="news-dialog"
      actions={
        <button className="btn" onClick={onClose} data-autofocus>
          {t.done}
        </button>
      }
    >
      <p className="muted">
        {t.news.version} {APP_VERSION}
        {offline ? ` · ✓ ${t.news.offlineReady}` : ''}
      </p>
      <ul className="news-list">
        {t.news.items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <p className="muted small">{t.news.offline}</p>
    </Panel>
  )
}

/** Questions flagged during games: check each, then take it out of play or keep it. */
export function FlagsDialog({ t, lang, pools, setPool, onClose }: { t: Strings; lang: Lang; pools: Record<string, PoolEdit>; setPool: (id: string, edit: PoolEdit | null) => void; onClose: () => void }) {
  const [flags, setFlags] = useState<Flag[]>(loadFlags)
  const store = (f: Flag[]) => {
    setFlags(f)
    saveFlags(f)
  }
  const takeOut = (f: Flag) => {
    const edit = pools[f.catId] ?? emptyPool()
    if (!edit.off[f.level].includes(f.id)) setPool(f.catId, { ...edit, off: edit.off.map((l, i) => (i === f.level ? [...l, f.id] : l)) })
    store(flags.map((x) => (x === f ? { ...x, out: true } : x)))
  }
  const text = () =>
    flags
      .map((f) => `${f.cat} · ${VALUES[f.level]}${f.out ? ' (taken out of play)' : ''}\n${f.q}\n→ ${f.a}${f.note ? `\nNote: ${f.note}` : ''}`)
      .join('\n\n') + '\n'
  return (
    <Panel
      id="flags-title"
      title={t.flag.title}
      lang={lang}
      onClose={onClose}
      testid="flags-dialog"
      actions={
        <>
          <button className="ghost" disabled={!flags.length} onClick={() => downloadText(`flagged-questions-${new Date().toISOString().slice(0, 10)}.txt`, text(), 'text/plain;charset=utf-8')} data-testid="flags-download">
            {t.flag.download}
          </button>
          <button className="ghost" disabled={!flags.length} onClick={() => store([])} data-testid="flags-clear">
            {t.flag.clearAll}
          </button>
          <button className="btn" onClick={onClose} data-autofocus>
            {t.done}
          </button>
        </>
      }
    >
      <p className="muted">{t.flag.help}</p>
      {!flags.length ? (
        <p className="muted">{t.flag.none}</p>
      ) : (
        <ul className="flag-list">
          {flags.map((f, i) => (
            <li key={`${f.catId}-${f.id}-${i}`} data-flag={i}>
              <span className="label">
                {f.cat} · {num(VALUES[f.level], lang)}
              </span>
              <p dir="auto">{f.q}</p>
              <p dir="auto">
                <i>→ {f.a}</i>
              </p>
              <input className="input" maxLength={300} placeholder={t.flag.note} value={f.note ?? ''} dir="auto" onChange={(e) => store(flags.map((x) => (x === f ? { ...x, note: e.target.value } : x)))} />
              <div className="row">
                {f.out ? (
                  <span className="pill">{t.flag.takenOut}</span>
                ) : (
                  <button className="btn bad" onClick={() => takeOut(f)} data-testid={`flag-out-${i}`}>
                    {t.flag.takeOut}
                  </button>
                )}
                <button className="ghost" onClick={() => store(flags.filter((x) => x !== f))} data-testid={`flag-keep-${i}`}>
                  {f.out ? t.remove : t.flag.keep}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
