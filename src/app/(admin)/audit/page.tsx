'use client'

import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { audit } from '@/lib/api'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import type { AuditAction } from '@/lib/types'

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  'verification.open': 'Opened review',
  'verification.approve': 'Approved',
  'verification.return': 'Returned',
  'verification.escalated': 'Escalated',
  'verification.abandoned': 'Abandoned',
  'user.created': 'User created',
  'user.patched': 'User updated',
  'user.deactivated': 'User deactivated',
  'batch.run.started': 'Batch started',
  'batch.run.succeeded': 'Batch succeeded',
  'batch.run.failed': 'Batch failed',
}

export default function AuditPage() {
  const { authUser } = useAuth()
  const token = authUser?.token ?? ''
  const [actionFilter, setActionFilter] = useState('')

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['audit-log', actionFilter],
    queryFn: ({ pageParam }) =>
      audit.list(token, { action: actionFilter || undefined, limit: 50, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
    enabled: !!token,
  })

  const events = data?.pages.flatMap((p) => p.events) ?? []
  const isInitialLoad = isFetching && events.length === 0

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Audit Log</h1>

      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
      >
        <option value="">All actions</option>
        {Object.entries(ACTION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">State change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isInitialLoad ? (
              <TableSkeleton cols={5} />
            ) : (
              <>
                {events.map((e) => (
                  <tr key={e.eventId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(e.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-mono">{e.actor.uid.slice(0, 8)}…</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs">{e.actor.role}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs">
                      {ACTION_LABELS[e.action as AuditAction] ?? e.action}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-mono">{e.subject.id.slice(0, 8)}…</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs">{e.subject.type} · {e.subject.provinceCode}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {e.fromState && e.toState ? `${e.fromState} → ${e.toState}` : '—'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      No events.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
        {hasNextPage && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => fetchNextPage()} disabled={isFetching} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50">
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
