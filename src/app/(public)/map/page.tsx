'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/api'
import type { PublicQuadrat } from '@/lib/types'
import { QuadratDetailDrawer } from '@/components/map/QuadratDetailDrawer'
import Link from 'next/link'
import {
  StatsFilterPanel,
  DEFAULT_MAP_FILTERS,
  applyMapFilters,
  type MapFilters,
  type DateRange,
} from '@/components/map/StatsFilterPanel'
import { useAuth } from '@/lib/auth-context'
import { getSpeciesColor } from '@/components/map/deck-layers'

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
  const [detailUuid, setDetailUuid] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapFilters>(() => filtersFromParams(searchParams))
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
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
    setDetailUuid(null)
    const qs = filtersToParams(filters)
    const qsStr = qs.toString()
    router.replace(qsStr ? `/map?${qsStr}` : '/map', { scroll: false })
  }, [filters, router])

  // Static boundary GeoJSON — served from /public/geodata/
  const fetchGeoJSON = (path: string) =>
    fetch(path).then((r) => r.json() as Promise<{ type: 'FeatureCollection'; features: unknown[] }>)

  const { data: regionsGeoJSON }       = useQuery({ queryKey: ['geodata-regions'],       queryFn: () => fetchGeoJSON('/geodata/regions.geojson'),       staleTime: Infinity })
  const { data: provincesGeoJSON }     = useQuery({ queryKey: ['geodata-provinces'],     queryFn: () => fetchGeoJSON('/geodata/provinces.geojson'),     staleTime: Infinity })
  const { data: municipalitiesGeoJSON }= useQuery({ queryKey: ['geodata-municipalities'],queryFn: () => fetchGeoJSON('/geodata/municipalities.geojson'), staleTime: Infinity })

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

  // Fetch all quadrat details in parallel once the list is fully loaded.
  // Gives us clumps (for map dots/heatmap) and speciesSummary (for square colours)
  // without needing a dedicated /public/clumps endpoint that isn't in the API spec.
  const detailQueries = useQueries({
    queries: allQuadrats.map((q) => ({
      queryKey: ['public-quadrat', q._id] as const,
      queryFn: () => publicApi.getQuadrat(q._id),
      staleTime: Infinity,
      enabled: !hasNextPage && allQuadrats.length > 0,
    })),
  })

  const allClumps = useMemo(
    () => detailQueries.flatMap((dq) => dq.data?.clumps ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailQueries.map((dq) => dq.dataUpdatedAt).join()],
  )

  // Pre-select quadrat from URL on initial load (once data is available)
  useEffect(() => {
    if (initialSelectionDone.current || !initialQuadratId || !allQuadrats.length) return
    const q = allQuadrats.find((q) => q._id === initialQuadratId)
    if (q) {
      setSelectedQuadrat(q)
      initialSelectionDone.current = true
    }
  }, [allQuadrats, initialQuadratId])

  // Merge dominantSpecies from detail speciesSummary into the list items.
  // The list endpoint doesn't return this field; we derive it client-side.
  const quadratsWithSpecies = useMemo(() => {
    const detailMap: Record<string, string> = {}
    detailQueries.forEach((dq) => {
      if (dq.data?.speciesSummary.length) {
        detailMap[dq.data._id] = dq.data.speciesSummary[0].scientificName
      }
    })
    return allQuadrats.map((q) =>
      detailMap[q._id] ? { ...q, dominantSpecies: detailMap[q._id] } : q,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQuadrats, detailQueries.map((dq) => dq.dataUpdatedAt).join()])

  // Apply client-side geographic + count filters
  const filteredQuadrats = useMemo(
    () => applyMapFilters(quadratsWithSpecies, filters),
    [quadratsWithSpecies, filters],
  )

  // Selected quadrat keyboard / button navigation
  const selectedIdx = selectedQuadrat
    ? filteredQuadrats.findIndex((q) => q._id === selectedQuadrat._id)
    : -1

  const navigateQuadrat = useCallback((delta: 1 | -1) => {
    if (selectedIdx === -1 || filteredQuadrats.length === 0) return
    const next = filteredQuadrats[(selectedIdx + delta + filteredQuadrats.length) % filteredQuadrats.length]
    handleQuadratClick(next)
  }, [selectedIdx, filteredQuadrats, handleQuadratClick])

  useEffect(() => {
    if (!selectedQuadrat) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  navigateQuadrat(-1)
      if (e.key === 'ArrowRight') navigateQuadrat(1)
      if (e.key === 'Escape')     handleCloseQuadrat()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedQuadrat, navigateQuadrat, handleCloseQuadrat])

  // Clumps belonging to the currently filtered quadrats, with species filter applied.
  // Passed to StatsFilterPanel for clump-level statistics.
  const displayedClumps = useMemo(() => {
    const ids = new Set(filteredQuadrats.map((q) => q._id))
    const byQuadrat = allClumps.filter((c) => ids.has(c.quadratId))
    return speciesFilter.length > 0
      ? byQuadrat.filter((c) => speciesFilter.includes(c.scientificName))
      : byQuadrat
  }, [allClumps, filteredQuadrats, speciesFilter])

  // Clumps for the currently selected quadrat — used to enrich the selection panel
  const selectedQuadratClumps = useMemo(
    () => selectedQuadrat ? allClumps.filter((c) => c.quadratId === selectedQuadrat._id) : [],
    [allClumps, selectedQuadrat],
  )
  const selectedTotalCulms = selectedQuadratClumps.reduce((s, c) => s + (c.culmCount ?? 0), 0)
  const selectedDominantSpecies = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of selectedQuadratClumps) map[c.scientificName] = (map[c.scientificName] ?? 0) + 1
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [selectedQuadratClumps])

  // Scientific name → common name lookup built from all loaded clumps
  const speciesCommonName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of allClumps) if (c.commonName) map[c.scientificName] = c.commonName
    return map
  }, [allClumps])

  // Clump count per species among displayed clumps — shown as badge in legend
  const speciesCount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of displayedClumps) map[c.scientificName] = (map[c.scientificName] ?? 0) + 1
    return map
  }, [displayedClumps])

  // Unique species visible on map — sorted by clump count descending so dominant species appear first
  const visibleSpecies = useMemo(() => {
    const seen = new Set<string>()
    for (const c of displayedClumps) seen.add(c.scientificName)
    for (const q of filteredQuadrats) if (q.dominantSpecies) seen.add(q.dominantSpecies)
    return [...seen].sort((a, b) => {
      const diff = (speciesCount[b] ?? 0) - (speciesCount[a] ?? 0)
      return diff !== 0 ? diff : a.localeCompare(b)
    })
  }, [displayedClumps, filteredQuadrats, speciesCount])

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
      {/* Brand badge + back nav — sits directly above the Survey data panel */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 w-64">
        <Link
          href={authUser ? '/dashboard' : '/'}
          className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg whitespace-nowrap"
        >
          {authUser ? '← Dashboard' : '← Home'}
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 shadow-lg hover:bg-slate-800 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-4 h-4 shrink-0" style={{ display: 'block' }} />
          <span className="text-emerald-400 font-bold text-sm tracking-wider leading-none">BRITEMAP</span>
        </Link>
      </div>

      {/* Bottom-right attribution watermark — tucked left of MapLibre's nav control buttons */}
      <div className="absolute bottom-3 right-14 z-10 text-right pointer-events-none select-none">
        <p className="text-xs font-semibold text-slate-400 tracking-wide">BRITEMAP</p>
        <p className="text-xs text-slate-600">UPLB · DOST-PCAARRD</p>
      </div>

      {/* Stats & filter panel */}
      <StatsFilterPanel
        allQuadrats={allQuadrats}
        filteredQuadrats={filteredQuadrats}
        displayedClumps={displayedClumps}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        speciesFilter={speciesFilter}
        onSpeciesFilterChange={setSpeciesFilter}
        dateRange={dateRange}
        onDateRangeChange={(patch) => setDateRange((d) => ({ ...d, ...patch }))}
        isLoading={isFetching && allQuadrats.length === 0}
        layerFilteredCount={layerFilteredCount}
      />

      <BritemapGL
        quadrats={filteredQuadrats}
        clumps={allClumps}
        speciesFilter={speciesFilter}
        dateRange={dateRange}
        quadratCountByProvince={countByProvince}
        regionsGeoJSON={regionsGeoJSON}
        provincesGeoJSON={provincesGeoJSON}
        municipalitiesGeoJSON={municipalitiesGeoJSON}
        activeRegion={filters.region || undefined}
        activeProvince={filters.province || undefined}
        activeMunicipality={filters.municipality || undefined}
        onQuadratClick={handleQuadratClick}
        onVisibleCountChange={setLayerFilteredCount}
        flyToTarget={selectedQuadrat?.latitude != null ? { latitude: selectedQuadrat.latitude!, longitude: selectedQuadrat.longitude! } : undefined}
        showLayerPanel={detailUuid === null}
        visibleSpecies={visibleSpecies}
        speciesCommonName={speciesCommonName}
        speciesCount={speciesCount}
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

      {/* Quadrat detail drawer — opens in-place, map view is preserved */}
      {detailUuid && (
        <QuadratDetailDrawer
          uuid={detailUuid}
          onClose={() => setDetailUuid(null)}
        />
      )}

      {/* Loading indicator */}
      {isFetching && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 border border-slate-700 rounded-full px-4 py-1.5 text-xs text-slate-300">
          Loading quadrats… ({allQuadrats.length} loaded)
        </div>
      )}

      {/* Selected quadrat panel */}
      {selectedQuadrat && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-76 z-10 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-4">
          {/* Header row: prev / counter / next / close */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => navigateQuadrat(-1)} className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 text-sm" title="Previous site (←)">‹</button>
            <span className="flex-1 text-center text-xs text-slate-500">{selectedIdx + 1} / {filteredQuadrats.length}</span>
            <button onClick={() => navigateQuadrat(1)} className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 text-sm" title="Next site (→)">›</button>
            <button onClick={handleCloseQuadrat} className="text-slate-500 hover:text-white ml-1" title="Close (Esc)">✕</button>
          </div>

          {/* Location */}
          <h3 className="font-semibold text-white leading-tight">{selectedQuadrat.barangay}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{selectedQuadrat.municipality}, {selectedQuadrat.province}</p>
          <p className="text-xs text-slate-500">{selectedQuadrat.region}</p>

          {/* Dominant species chips */}
          {selectedDominantSpecies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedDominantSpecies.slice(0, 3).map((name) => {
                const [r, g, b] = getSpeciesColor(name)
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs italic text-white/90"
                    style={{ backgroundColor: `rgba(${r},${g},${b},0.35)`, border: `1px solid rgba(${r},${g},${b},0.6)` }}
                  >
                    {name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Key metrics */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800 rounded p-1.5">
              <p className="text-sm font-bold text-white">{selectedQuadrat.clumpCount}</p>
              <p className="text-xs text-slate-500">clumps</p>
            </div>
            <div className="bg-slate-800 rounded p-1.5">
              <p className="text-sm font-bold text-white">{selectedTotalCulms > 0 ? selectedTotalCulms.toLocaleString() : '—'}</p>
              <p className="text-xs text-slate-500">culms</p>
            </div>
            <div className="bg-slate-800 rounded p-1.5">
              <p className="text-sm font-bold text-white">{selectedQuadrat.photoCount}</p>
              <p className="text-xs text-slate-500">photos</p>
            </div>
          </div>

          <button
            onClick={() => setDetailUuid(selectedQuadrat._id)}
            className="mt-3 w-full text-center text-sm py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            View detail →
          </button>
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
