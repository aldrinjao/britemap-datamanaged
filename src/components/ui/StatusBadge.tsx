import clsx from 'clsx'
import type { QuadratState } from '@/lib/types'

const STYLES: Record<QuadratState, string> = {
  submitted:             'bg-yellow-100  dark:bg-yellow-500/20  text-yellow-700  dark:text-yellow-300  border-yellow-300  dark:border-yellow-500/40',
  under_review:          'bg-blue-100    dark:bg-blue-500/20    text-blue-700    dark:text-blue-300    border-blue-300    dark:border-blue-500/40',
  returned_for_revisions:'bg-orange-100  dark:bg-orange-500/20  text-orange-700  dark:text-orange-300  border-orange-300  dark:border-orange-500/40',
  approved:              'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  abandoned:             'bg-slate-100   dark:bg-slate-500/20   text-slate-600   dark:text-slate-400   border-slate-300   dark:border-slate-500/40',
}

const LABELS: Record<QuadratState, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  returned_for_revisions: 'Returned',
  approved: 'Approved',
  abandoned: 'Abandoned',
}

export function StatusBadge({ state }: { state: QuadratState }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        STYLES[state] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600',
      )}
    >
      {LABELS[state] ?? state}
    </span>
  )
}
