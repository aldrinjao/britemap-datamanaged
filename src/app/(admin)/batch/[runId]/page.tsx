'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { batch } from '@/lib/api'
import type { BatchStatus } from '@/lib/types'

const STATUS_STYLE: Record<BatchStatus, string> = {
  queued: 'text-yellow-300 bg-yellow-500/10',
  running: 'text-blue-300 bg-blue-500/10',
  succeeded: 'text-emerald-400 bg-emerald-500/10',
  failed: 'text-red-400 bg-red-500/10',
}

export default function BatchRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params)
  const { authUser } = useAuth()
  const token = authUser?.token ?? ''

  const { data: run, isLoading, error } = useQuery({
    queryKey: ['batch-run', runId],
    queryFn: () => batch.get(token, runId),
    enabled: !!token,
  })

  if (isLoading) return <div className="p-6 text-slate-400">Loading…</div>
  if (error || !run) return <div className="p-6 text-red-400">Failed to load run.</div>

  return (
    <div className="p-6 max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/batch" className="text-slate-400 hover:text-white text-sm">← Batch Runs</Link>
        <h1 className="text-xl font-semibold text-white">Run Detail</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-slate-400">{run.runId}</p>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[run.status]}`}>
            {run.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-400 text-xs">Started</p><p className="text-white">{new Date(run.startedAt).toLocaleString()}</p></div>
          <div><p className="text-slate-400 text-xs">Finished</p><p className="text-white">{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Triggered by</p><p className="text-white">{run.triggeredBy}</p></div>
          <div><p className="text-slate-400 text-xs">Duration</p><p className="text-white">{run.finishedAt ? `${Math.round((run.finishedAt - run.startedAt) / 1000)}s` : '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Stale → Escalated</p><p className="text-white">{run.staleUnderReviewEscalated}</p></div>
          <div><p className="text-slate-400 text-xs">Stale → Abandoned</p><p className="text-white">{run.staleReturnedAbandoned}</p></div>
        </div>

        {run.errorMessage && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-xs text-red-400">
            {run.errorMessage}
          </div>
        )}

        {run.sampleEventIds && run.sampleEventIds.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Sample audit events</p>
            <div className="space-y-1">
              {run.sampleEventIds.map((id) => (
                <Link key={id} href={`/audit?eventId=${id}`} className="block text-xs font-mono text-emerald-400 hover:underline">
                  {id}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
