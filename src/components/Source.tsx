import type { Question } from '../lib/types'
import type { Strings } from '../lib/i18n'

/** The source tag under an answer: where a fact comes from, or that a line is dramatised or fictional. */
export default function Source({ t, q }: { t: Strings; q: Pick<Question, 'kind' | 'src'> }) {
  if (!q.kind && !q.src) return null
  const label = q.kind === 'D' ? t.srcDramatised : q.kind === 'F' ? t.srcFictional : t.srcLabel
  return (
    <small className="src" dir="auto" data-testid="source">
      {label}
      {q.src ? `: ${q.src}` : ''}
    </small>
  )
}
