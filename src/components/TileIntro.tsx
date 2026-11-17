import type { Clue } from '../lib/types'
import type { Strings } from '../lib/i18n'

/** What a Golden, Steal or Audience tile is, shown before its question (on the host's card and the big screen). */
export default function TileIntro({ t, clue, big = false }: { t: Strings; clue: Clue; big?: boolean }) {
  const kinds = [clue.golden ? 'golden' : null, clue.special ?? null].filter(Boolean) as ('golden' | 'steal' | 'crowd')[]
  return (
    <div className={`tile-intro${big ? ' big' : ''}`} data-testid="tile-intro">
      {kinds.map((k) => (
        <div key={k} className={`tile-intro-item ${k}`}>
          <b>{k === 'golden' ? t.golden : k === 'steal' ? t.steal : t.crowd}</b>
          <p>{k === 'golden' ? t.goldenHelp : k === 'steal' ? t.stealHelp : t.crowdHelp}</p>
        </div>
      ))}
    </div>
  )
}
