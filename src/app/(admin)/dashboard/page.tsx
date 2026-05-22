'use client'

import dynamic from 'next/dynamic'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { batch, verify, publicApi } from '@/lib/api'
import type { PublicQuadrat } from '@/lib/types'

const BritemapGL = dynamic(
  () => import('@/components/map/BritemapGL').then((m) => m.BritemapGL),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-200 dark:bg-slate-900 animate-pulse rounded-xl" /> },
)

function StatCard({ label, value, sub, loading }: { label: string; value: string | number; sub?: string; loading?: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      {loading ? (
        <>
          <div className="h-9 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse mt-1" />
          <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse mt-1.5" />
        </>
      ) : (
        <>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { authUser } = useAuth()
  const router = useRouter()
  const token = authUser?.token ?? ''

  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['dash-batch-recent'],
    queryFn: () => batch.list(token, { limit: 1 }),
    enabled: !!token,
  })

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['dash-queue-submitted'],
    queryFn: () => verify.queue(token, { state: 'submitted', limit: 50 }),
    enabled: !!token,
  })

  const { data: underReviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['dash-queue-under-review'],
    queryFn: () => verify.queue(token, { state: 'under_review', limit: 50 }),
    enabled: !!token,
  })

  const { data: quadratsData, isFetching: quadratsFetching } = useInfiniteQuery({
    queryKey: ['public-quadrats'],
    queryFn: ({ pageParam }) => publicApi.listQuadrats({ limit: 200, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
  })

  const allQuadrats = quadratsData?.pages.flatMap((p) => p.items) ?? []
  const countByProvince = allQuadrats.reduce<Record<string, number>>((acc, q) => {
    acc[q.provinceCode] = (acc[q.provinceCode] ?? 0) + 1
    return acc
  }, {})

  const lastRun = batchData?.runs[0]

  const queueCount = queueData
    ? queueData.nextCursor
      ? `${queueData.items.length}+`
      : queueData.items.length
    : '—'

  const reviewCount = underReviewData
    ? underReviewData.nextCursor
      ? `${underReviewData.items.length}+`
      : underReviewData.items.length
    : '—'

  const handleMapQuadratClick = (q: PublicQuadrat) => {
    router.push(`/map?province=${encodeURIComponent(q.province)}`)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Approved Quadrats"
          value={allQuadrats.length.toLocaleString()}
          sub={quadratsFetching ? 'loading…' : 'public dataset'}
          loading={quadratsFetching && allQuadrats.length === 0}
        />
        <StatCard
          label="Awaiting Review"
          value={queueCount}
          sub="submitted state"
          loading={queueLoading}
        />
        <StatCard
          label="Under Review"
          value={reviewCount}
          sub="active reviews"
          loading={reviewLoading}
        />
        <StatCard
          label="Last Batch Run"
          value={lastRun ? lastRun.status : '—'}
          sub={lastRun ? new Date(lastRun.startedAt).toLocaleDateString() : 'No runs yet'}
          loading={batchLoading}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden" style={{ height: 420 }}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Approved Quadrats by Province</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Click a point to filter by province in the full map</p>
          </div>
          <a href="/map" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
            Explore full map →
          </a>
        </div>
        <div className="h-[368px]">
          <BritemapGL
            quadrats={allQuadrats}
            quadratCountByProvince={countByProvince}
            showLayerPanel={false}
            onQuadratClick={handleMapQuadratClick}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
