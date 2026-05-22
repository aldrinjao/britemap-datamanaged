'use client'

import { useState, use, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { verify } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { QuadratState, VerifyActionResponse } from '@/lib/types'

const REDIRECT_DELAY = 3

export default function EntityReviewPage({
  params,
}: {
  params: Promise<{ entityType: string; uuid: string }>
}) {
  const { entityType, uuid } = use(params)
  const { authUser } = useAuth()
  const qc = useQueryClient()
  const router = useRouter()
  const token = authUser?.token ?? ''

  const [returnComment, setReturnComment] = useState('')
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [actionResult, setActionResult] = useState<VerifyActionResponse | null>(null)
  const [countdown, setCountdown] = useState(REDIRECT_DELAY)

  // Auto-redirect to queue after a successful action
  useEffect(() => {
    if (!actionResult) return
    setCountdown(REDIRECT_DELAY)
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000)
    const timeout = setTimeout(() => router.push('/queue'), REDIRECT_DELAY * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [actionResult, router])

  const onSuccess = (res: VerifyActionResponse) => {
    setActionResult(res)
    qc.invalidateQueries({ queryKey: ['verify-queue'] })
  }

  const openMutation = useMutation({ mutationFn: () => verify.open(token, entityType, uuid), onSuccess })
  const returnMutation = useMutation({ mutationFn: () => verify.return(token, uuid, returnComment), onSuccess })
  const approveMutation = useMutation({ mutationFn: () => verify.approve(token, uuid, approvalRemarks || undefined), onSuccess })

  const entity = actionResult?.entity
  const state = (entity as { state?: QuadratState })?.state

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm">← Back</button>
        <h1 className="text-xl font-semibold capitalize">{entityType} Review</h1>
        {state && <StatusBadge state={state} />}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{uuid}</p>
        {entity && (
          <pre className="mt-3 text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-64 bg-slate-50 dark:bg-slate-950 rounded-lg p-3">
            {JSON.stringify(entity, null, 2)}
          </pre>
        )}
      </div>

      {!actionResult && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium mb-2">Open for Review</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Transitions submitted → under_review and stamps your reviewer ID.</p>
            <button
              onClick={() => openMutation.mutate()}
              disabled={openMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              {openMutation.isPending ? 'Opening…' : 'Open for Review'}
            </button>
            {openMutation.error && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">{String(openMutation.error)}</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium mb-2">Return for Revisions</h2>
            <textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              placeholder="Reviewer comment (required, 1–2000 chars)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
            />
            <button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending || returnComment.trim().length === 0}
              className="mt-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 dark:bg-orange-700 dark:hover:bg-orange-600 text-white text-sm disabled:opacity-50"
            >
              {returnMutation.isPending ? 'Returning…' : 'Return for Revisions'}
            </button>
            {returnMutation.error && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">{String(returnMutation.error)}</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium mb-2">Approve</h2>
            <textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Approval remarks (optional, ≤1000 chars)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approving…' : 'Approve Submission'}
            </button>
            {approveMutation.error && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">{String(approveMutation.error)}</p>
            )}
          </div>
        </div>
      )}

      {actionResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 rounded-xl p-4 space-y-2">
          <p className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">Action completed</p>
          {actionResult.publicPromotion && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Promoted to public: {actionResult.publicPromotion.clumpCount} clumps, {actionResult.publicPromotion.photoCount} photos
            </p>
          )}
          {actionResult.affectedClumpCount !== undefined && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {actionResult.affectedClumpCount} child clumps also returned.
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Returning to queue in {countdown}s…{' '}
            <button onClick={() => router.push('/queue')} className="underline hover:text-slate-700 dark:hover:text-slate-200">
              Go now
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
