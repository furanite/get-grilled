import { useEffect, useState } from 'react'
import type { Lang } from '../lib/types'
import type { Strings } from '../lib/i18n'
import { CatIcon } from './Brand'
import { sfx } from '../lib/sound'

/** A category on the vote's shortlist. */
export interface VoteCat {
  id: string
  name: string
  nameAr?: string
  builtIn: boolean
}

/** Who picks, in order: each team, then the audience, then the host. */
export interface Voter {
  kind: 'team' | 'audience' | 'host'
  name: string
}

/** Where the vote is: the shortlist, who picks in what order, and the picks so far (one per voter, in order). */
export interface VoteState {
  cats: VoteCat[]
  voters: Voter[]
  picks: string[]
}

export const votersFor = (t: Strings, teams: string[]): Voter[] => [
  ...teams.map((name): Voter => ({ kind: 'team', name })),
  { kind: 'audience', name: t.voteAudience },
  { kind: 'host', name: t.voteHost },
]

const catName = (c: VoteCat, lang: Lang) => (lang === 'ar' && c.nameAr ? c.nameAr : c.name)

/** The shortlist with each category's picker on it. Shared by the host screen and the audience window. */
export function VoteBoard({ t, lang, vote, onPick, big }: { t: Strings; lang: Lang; vote: VoteState; onPick?: (id: string) => void; big?: boolean }) {
  const turn = vote.voters[vote.picks.length]
  const done = !turn
  return (
    <div className={`vote${big ? ' big' : ''}`} data-testid={big ? 'audience-vote' : 'vote'}>
      <span className="label">{t.voteTitle}</span>
      <h1 className="vote-turn" data-testid="vote-turn" aria-live="polite">
        {done ? (
          t.voteAllIn
        ) : turn.kind === 'team' ? (
          <>
            <b>{turn.name}</b>, {t.voteTurn}
          </>
        ) : (
          <>
            <b>{turn.name}</b>: {t.voteTurn}
          </>
        )}
      </h1>
      {turn?.kind === 'audience' && <p className="muted">{t.voteAudienceHelp}</p>}
      <ol className="vote-voters">
        {vote.voters.map((v, i) => {
          const c = vote.cats.find((x) => x.id === vote.picks[i])
          return (
            <li key={i} className={i < vote.picks.length ? 'done' : i === vote.picks.length ? 'now' : ''} data-voter={i}>
              <b>{v.name}</b>
              <span>{c ? catName(c, lang) : '…'}</span>
            </li>
          )
        })}
      </ol>
      <div className="cat-grid vote-grid">
        {vote.cats.map((c) => {
          const by = vote.picks.indexOf(c.id)
          return (
            <button key={c.id} className={`cat-pick${by >= 0 ? ' voted' : ''}`} aria-pressed={by >= 0} disabled={!onPick || by >= 0 || done} onClick={() => onPick?.(c.id)} data-vote-cat={c.id} tabIndex={onPick ? undefined : -1}>
              <CatIcon id={c.builtIn ? c.id : 'custom'} />
              <b>{catName(c, lang)}</b>
              {by >= 0 && (
                <small className="vote-by">
                  {t.voteBy} {vote.voters[by].name}
                </small>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The host's side of the vote: picks on the voters' behalf, can undo, and starts the game once every vote is in. */
export function Vote({ t, lang, cats, teams, busy, error, onChange, onDone, onBack }: { t: Strings; lang: Lang; cats: VoteCat[]; teams: string[]; busy: boolean; error: string; onChange: (v: VoteState | null) => void; onDone: (ids: string[]) => void; onBack: () => void }) {
  const [vote, setVote] = useState<VoteState>(() => ({ cats, voters: votersFor(t, teams), picks: [] }))
  useEffect(() => {
    onChange(vote)
  }, [vote, onChange])
  useEffect(() => () => onChange(null), [onChange])
  const done = vote.picks.length >= vote.voters.length
  const pick = (id: string) => {
    if (done || vote.picks.includes(id)) return
    sfx.soft()
    setVote((v) => ({ ...v, picks: [...v.picks, id] }))
  }
  const left = vote.cats.filter((c) => !vote.picks.includes(c.id))
  const turn = vote.voters[vote.picks.length]
  return (
    <main className="vote-screen stack">
      <VoteBoard t={t} lang={lang} vote={vote} onPick={pick} />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        {turn?.kind === 'audience' && (
          <button className="btn alt" onClick={() => pick(left[Math.floor(Math.random() * left.length)].id)} data-testid="vote-random">
            {t.voteRandom}
          </button>
        )}
        <button className="ghost" onClick={() => setVote((v) => ({ ...v, picks: v.picks.slice(0, -1) }))} disabled={!vote.picks.length || busy} data-testid="vote-undo">
          {t.voteUndo}
        </button>
        {done && (
          <button className="btn big" onClick={() => onDone(vote.picks)} disabled={busy} data-testid="vote-start" autoFocus>
            {busy ? t.loading : t.voteStart}
          </button>
        )}
        <button className="ghost" onClick={onBack} disabled={busy}>
          {t.voteBack}
        </button>
      </div>
    </main>
  )
}
