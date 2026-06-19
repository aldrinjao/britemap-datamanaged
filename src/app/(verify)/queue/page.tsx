'use client'

import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { verify } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import type { QuadratState } from '@/lib/types'

export default function QueuePage() {
  const { authUser } = useAuth()
  const qc = useQueryClient()
  const token = authUser?.token ?? ''

  // Derive verifier scope — array of provinces they can review, or null for admin (all)
  const scope = authUser?.verificationScope
  const scopedProvinces = Array.isArray(scope) ? scope : null

  const [stateFilter, setStateFilter] = useState('submitted,under_review')
  // Pre-fill province to first scoped province for verifiers with a single province
  const [provinceFilter, setProvinceFilter] = useState(
    scopedProvinces?.length === 1 ? scopedProvinces[0] : '',
  )

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['verify-queue', stateFilter, provinceFilter],
    queryFn: ({ pageParam }) =>
      verify.queue(token, {
        state: stateFilter || undefined,
        provinceCode: provinceFilter || undefined,
        limit: 50,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
    enabled: !!token,
  })

  const openMutation = useMutation({
    mutationFn: ({ entityType, uuid }: { entityType: string; uuid: string }) =>
      verify.open(token, entityType, uuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verify-queue'] }),
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []
  const isInitialLoad = isFetching && items.length === 0

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Verification Queue</h1>

      {/* Scope notice for verifiers */}
      {scopedProvinces && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 text-xs text-blue-700 dark:text-blue-300">
          <span>🔒</span>
          <span>
            Your verification scope is limited to:{' '}
            <strong>{scopedProvinces.join(', ')}</strong>
          </span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          <option value="submitted,under_review">Submitted + Under Review</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="returned_for_revisions">Returned</option>
        </select>

        {/* Province filter — dropdown for scoped verifiers, free-text for admins */}
        {scopedProvinces ? (
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          >
            {scopedProvinces.length > 1 && <option value="">All my provinces</option>}
            {scopedProvinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="Province code (e.g. LAG)"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value.toUpperCase())}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-52"
          />
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Province</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-left">Revisions</th>
              <th className="px-4 py-3 text-left">Updated</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isInitialLoad ? (
              <TableSkeleton cols={6} />
            ) : (
              <>
                {items.map((item) => (
                  <tr key={item.uuid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${item.entityType}/${item.uuid}`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs">
                        {item.uuid.slice(0, 8)}…
                      </Link>
                      <span className="ml-2 text-slate-400 dark:text-slate-500 text-xs capitalize">{item.entityType}</span>
                      {item.escalated && <span className="ml-2 text-orange-500 dark:text-orange-400 text-xs">⚠ escalated</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.provinceCode}</td>
                    <td className="px-4 py-3">
                      <StatusBadge state={item.state as QuadratState} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.revisionCount}</td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {item.state === 'submitted' && (
                        <button
                          onClick={() => openMutation.mutate({ entityType: item.entityType, uuid: item.uuid })}
                          disabled={openMutation.isPending}
                          className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white disabled:opacity-50"
                        >
                          Open
                        </button>
                      )}
                      {item.state === 'under_review' && (
                        <Link
                          href={`/${item.entityType}/${item.uuid}`}
                          className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white"
                        >
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      No items matching current filters.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>

        {hasNextPage && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetching}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
            >
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
