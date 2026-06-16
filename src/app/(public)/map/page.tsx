'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/api'
import type { PublicQuadrat } from '@/lib/types'
import Link from 'next/link'
import {
  StatsFilterPanel,
  DEFAULT_MAP_FILTERS,
  applyMapFilters,
  type MapFilters,
} from '@/components/map/StatsFilterPanel'
import { useAuth } from '@/lib/auth-context'

// BritemapGL uses MapLibre/WebGL — must be client-only, no SSR
const BritemapGL = dynamic(
  () => import('@/components/map/BritemapGL').then((m) => m.BritemapGL),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950 animate-pulse" /> },
)

function filtersFromParams(params: URLSearchParams): MapFilters {
  return {
    search:       params.get('search')       ?? '',
    region:       params.get('region')       ?? '',
    province:     params.get('province')     ?? '',
    municipality: params.get('municipality') ?? '',
    minClumps:    Number(params.get('minClumps')  ?? 0),
    minPhotos:    Number(params.get('minPhotos')  ?? 0),
  }
}

function filtersToParams(f: MapFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search)         p.set('search',       f.search)
  if (f.region)         p.set('region',       f.region)
  if (f.province)       p.set('province',     f.province)
  if (f.municipality)   p.set('municipality', f.municipality)
  if (f.minClumps > 0)  p.set('minClumps',    String(f.minClumps))
  if (f.minPhotos > 0)  p.set('minPhotos',    String(f.minPhotos))
  return p
}

function MapPageContent() {
  const { authUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedQuadrat, setSelectedQuadrat] = useState<PublicQuadrat | null>(null)
  const [filters, setFilters] = useState<MapFilters>(() => filtersFromParams(searchParams))
  const [layerFilteredCount, setLayerFilteredCount] = useState<number | undefined>(undefined)

  // Read initial quadrat UUID from URL once on mount
  const [initialQuadratId] = useState(() => searchParams.get('quadrat'))
  const initialSelectionDone = useRef(false)

  const handleFiltersChange = useCallback((newFilters: MapFilters) => {
    setFilters(newFilters)
    const qs = filtersToParams(newFilters)
    if (selectedQuadrat) qs.set('quadrat', selectedQuadrat._id)
    const qsStr = qs.toString()
    router.replace(qsStr ? `/map?${qsStr}` : '/map', { scroll: false })
  }, [router, selectedQuadrat])

  const handleQuadratClick = useCallback((q: PublicQuadrat) => {
    setSelectedQuadrat(q)
    const qs = filtersToParams(filters)
    qs.set('quadrat', q._id)
    router.replace(`/map?${qs.toString()}`, { scroll: false })
  }, [filters, router])

  const handleCloseQuadrat = useCallback(() => {
    setSelectedQuadrat(null)
    const qs = filtersToParams(filters)
    const qsStr = qs.toString()
    router.replace(qsStr ? `/map?${qsStr}` : '/map', { scroll: false })
  }, [filters, router])

  // Fetch all public quadrats (paginate to completion for map display)
  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['public-quadrats'],
    queryFn: ({ pageParam }) => publicApi.listQuadrats({ limit: 200, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
  })

  // Fetch remaining pages automatically
  if (hasNextPage && !isFetching) fetchNextPage()

  const allQuadrats = data?.pages.flatMap((p) => p.items) ?? []

  // Pre-select quadrat from URL on initial load (once data is available)
  useEffect(() => {
    if (initialSelectionDone.current || !initialQuadratId || !allQuadrats.length) return
    const q = allQuadrats.find((q) => q._id === initialQuadratId)
    if (q) {
      setSelectedQuadrat(q)
      initialSelectionDone.current = true
    }
  }, [allQuadrats, initialQuadratId])

  // Apply client-side geographic + count filters
  const filteredQuadrats = useMemo(
    () => applyMapFilters(allQuadrats, filters),
    [allQuadrats, filters],
  )

  // Choropleth uses filtered counts so the heatmap reflects the active filter
  const countByProvince = useMemo(
    () =>
      filteredQuadrats.reduce<Record<string, number>>((acc, q) => {
        acc[q.provinceCode] = (acc[q.provinceCode] ?? 0) + 1
        return acc
      }, {}),
    [filteredQuadrats],
  )

  return (
    <div className="relative w-full h-screen bg-slate-950">
      {/* Back button — dashboard when logged in, landing page when not */}
      <Link
        href={authUser ? '/dashboard' : '/'}
        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
      >
        {authUser ? '← Dashboard' : '← BRITE-MAP'}
      </Link>

      {/* Top-center brand badge */}
      <Link
        href="/"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-lg hover:bg-slate-800 transition-colors"
      >
        <span className="text-emerald-400 font-bold text-sm tracking-wider">BRITE-MAP</span>
        <span className="w-px h-3.5 bg-slate-600 flex-shrink-0" />
        <span className="text-slate-400 text-xs whitespace-nowrap">Bamboo Distribution Survey</span>
      </Link>

      {/* Bottom-right attribution watermark — tucked left of MapLibre's nav control buttons */}
      <div className="absolute bottom-3 right-14 z-10 text-right pointer-events-none select-none">
        <p className="text-xs font-semibold text-slate-400 tracking-wide">BRITE-MAP</p>
        <p className="text-xs text-slate-600">UPLB · DOST-PCAARRD</p>
      </div>

      {/* Stats & filter panel */}
      <StatsFilterPanel
        allQuadrats={allQuadrats}
        filteredQuadrats={filteredQuadrats}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isLoading={isFetching && allQuadrats.length === 0}
        layerFilteredCount={layerFilteredCount}
      />

      <BritemapGL
        quadrats={filteredQuadrats}
        quadratCountByProvince={countByProvince}
        onQuadratClick={handleQuadratClick}
        onVisibleCountChange={setLayerFilteredCount}
        className="w-full h-full"
      />

      {/* Empty state — shown when filters exclude all loaded quadrats */}
      {!isFetching && allQuadrats.length > 0 && filteredQuadrats.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="pointer-events-auto bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl px-8 py-6 text-center max-w-xs">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-white font-semibold text-sm">No quadrats match your filters</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">
              Try broadening your search or adjusting the count thresholds.
            </p>
            <button
              onClick={() => handleFiltersChange(DEFAULT_MAP_FILTERS)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isFetching && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 rounded-full px-4 py-1.5 text-xs text-slate-300">
          Loading quadrats… ({allQuadrats.length} loaded)
        </div>
      )}

      {/* Selected quadrat panel */}
      {selectedQuadrat && (
        <div className="absolute bottom-6 left-6 w-72 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-4">
          <button
            onClick={handleCloseQuadrat}
            className="absolute top-3 right-3 text-slate-500 hover:text-white"
          >
            ✕
          </button>
          <h3 className="font-semibold text-white pr-6">{selectedQuadrat.barangay}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{selectedQuadrat.municipality}, {selectedQuadrat.province}</p>
          <p className="text-xs text-slate-500 mt-0.5">{selectedQuadrat.region}</p>
          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="text-slate-400">Clumps</span>
              <p className="font-semibold text-white">{selectedQuadrat.clumpCount}</p>
            </div>
            <div>
              <span className="text-slate-400">Photos</span>
              <p className="font-semibold text-white">{selectedQuadrat.photoCount}</p>
            </div>
            <div>
              <span className="text-slate-400">Approved</span>
              <p className="font-semibold text-white text-xs">
                {new Date(selectedQuadrat.approvedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link
            href={`/quadrats/${selectedQuadrat._id}`}
            className="mt-3 block text-center text-xs py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
          >
            View detail →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-slate-950 animate-pulse" />}>
      <MapPageContent />
    </Suspense>
  )
}
