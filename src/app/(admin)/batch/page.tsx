'use client'

import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { batch } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import type { BatchStatus } from '@/lib/types'

const STATUS_STYLE: Record<BatchStatus, string> = {
  queued: 'text-yellow-600 dark:text-yellow-300',
  running: 'text-blue-600 dark:text-blue-300',
  succeeded: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-red-600 dark:text-red-400',
}

export default function BatchPage() {
  const { authUser } = useAuth()
  const qc = useQueryClient()
  const token = authUser?.token ?? ''
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['batch-runs'],
    queryFn: ({ pageParam }) =>
      batch.list(token, { limit: 50, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
    enabled: !!token,
  })

  const triggerMutation = useMutation({
    mutationFn: () => batch.trigger(token, authUser?.firebaseUser.uid ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch-runs'] }),
  })

  const runs = data?.pages.flatMap((p) => p.runs) ?? []
  const hasActiveRun = runs.some((r) => r.status === 'queued' || r.status === 'running')
  const isInitialLoad = isFetching && runs.length === 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Batch Verification Runs</h1>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={triggerMutation.isPending || hasActiveRun}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm disabled:opacity-50"
        >
          {triggerMutation.isPending ? 'Triggering…' : hasActiveRun ? 'Run in progress' : 'Trigger Run'}
        </button>
      </div>

      {triggerMutation.data && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-300">
          Run queued: {triggerMutation.data.runId}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Run ID</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Escalated</th>
              <th className="px-4 py-3 text-left">Abandoned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isInitialLoad ? (
              <TableSkeleton cols={6} />
            ) : (
              <>
                {runs.map((run) => (
                  <tr key={run.runId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/batch/${run.runId}`} className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline">
                        {run.runId.slice(0, 16)}…
                      </Link>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{run.triggeredBy}</p>
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${STATUS_STYLE[run.status]}`}>
                      {run.status}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {run.finishedAt ? `${Math.round((run.finishedAt - run.startedAt) / 1000)}s` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{run.staleUnderReviewEscalated}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{run.staleReturnedAbandoned}</td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      No runs yet.
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

      <ConfirmDialog
        open={confirmOpen}
        title="Trigger batch run"
        message="This will immediately start an on-demand batch verification run. Any stale items will be escalated or abandoned. Continue?"
        confirmLabel="Trigger Run"
        onConfirm={() => { triggerMutation.mutate(); setConfirmOpen(false) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
