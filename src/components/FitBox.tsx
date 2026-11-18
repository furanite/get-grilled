import { useRef, type DependencyList, type ReactNode } from 'react'
import { useFitText } from '../lib/fit'

/** A box whose text shrinks (down to `min` of its size) until it all fits; see useFitText. */
export default function FitBox({ className, deps, min, children }: { className: string; deps: DependencyList; min?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useFitText(ref, deps, min)
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
