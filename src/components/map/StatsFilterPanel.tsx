'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import type { PublicQuadrat, PublicClump } from '@/lib/types'
import { getSpeciesColor, SPECIES_ORDER } from './deck-layers'

// ─── Public filter types ──────────────────────────────────────────────────────

export interface MapFilters {
  search: string
  region: string
  province: string
  municipality: string
  minClumps: number
  minPhotos: number
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  search: '',
  region: '',
  province: '',
  municipality: '',
  minClumps: 0,
  minPhotos: 0,
}

export interface DateRange {
  from: string | null
  to: string | null
}

export function applyMapFilters(quadrats: PublicQuadrat[], f: MapFilters): PublicQuadrat[] {
  let result = quadrats
  if (f.search) {
    const q = f.search.toLowerCase()
    result = result.filter(
      (quad) =>
        quad.barangay?.toLowerCase().includes(q) ||
        quad.municipality?.toLowerCase().includes(q) ||
        quad.province?.toLowerCase().includes(q),
    )
  }
  if (f.region)       result = result.filter((q) => q.region === f.region)
  if (f.province)     result = result.filter((q) => q.province?.toLowerCase().includes(f.province.toLowerCase()))
  if (f.municipality) result = result.filter((q) => q.municipality?.toLowerCase().includes(f.municipality.toLowerCase()))
  if (f.minClumps > 0) result = result.filter((q) => q.clumpCount >= f.minClumps)
  if (f.minPhotos > 0) result = result.filter((q) => q.photoCount >= f.minPhotos)
  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('en-PH', { maximumFractionDigits: decimals })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-200 text-right">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded p-2 text-center flex-1">
      <p className="text-sm font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</p>
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StatsFilterPanelProps {
  allQuadrats: PublicQuadrat[]
  filteredQuadrats: PublicQuadrat[]
  displayedClumps: PublicClump[]
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  speciesFilter: string[]
  onSpeciesFilterChange: (v: string[]) => void
  dateRange: DateRange
  onDateRangeChange: (patch: Partial<DateRange>) => void
  isLoading?: boolean
  layerFilteredCount?: number
}

type Tab = 'stats' | 'filters'

export function StatsFilterPanel({
  allQuadrats,
  filteredQuadrats,
  displayedClumps,
  filters,
  onFiltersChange,
  speciesFilter,
  onSpeciesFilterChange,
  dateRange,
  onDateRangeChange,
  isLoading,
  layerFilteredCount,
}: StatsFilterPanelProps) {
  const [open, setOpen]           = useState(true)
  const [tab, setTab]             = useState<Tab>('stats')
  const [showAllSpecies, setShowAllSpecies] = useState(false)
  const [speciesSearch, setSpeciesSearch]   = useState('')

  const set = (patch: Partial<MapFilters>) => onFiltersChange({ ...filters, ...patch })

  const activeFilterCount =
    (filters.search       ? 1 : 0) +
    (filters.region       ? 1 : 0) +
    (filters.province     ? 1 : 0) +
    (filters.municipality ? 1 : 0) +
    (filters.minClumps > 0            ? 1 : 0) +
    (filters.minPhotos > 0            ? 1 : 0) +
    (speciesFilter.length > 0         ? 1 : 0) +
    (dateRange.from || dateRange.to   ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0

  const allRegions = useMemo(() => {
    const map: Record<string, number> = {}
    for (const q of allQuadrats) map[q.region] = (map[q.region] ?? 0) + 1
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [allQuadrats])

  // All observed species (from clumps), sorted by frequency then name
  const allObservedSpecies = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of displayedClumps.length > 0 ? displayedClumps : []) map[c.scientificName] = (map[c.scientificName] ?? 0) + 1
    // Fall back to SPECIES_ORDER if no clumps loaded yet
    const fromClumps = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([n]) => n)
    return fromClumps.length > 0 ? fromClumps : SPECIES_ORDER
  }, [displayedClumps])

  const stats = useMemo(() => {
    const n = filteredQuadrats.length
    if (n === 0) return null

    // ── Quadrat-level ──────────────────────────────────────────────────────────
    const clumpCounts = filteredQuadrats.map((q) => q.clumpCount)
    const photoCounts = filteredQuadrats.map((q) => q.photoCount)
    const totalClumps = clumpCounts.reduce((s, v) => s + v, 0)
    const totalPhotos = photoCounts.reduce((s, v) => s + v, 0)
    const meanClumps  = totalClumps / n
    const minClumps   = Math.min(...clumpCounts)
    const maxClumps   = Math.max(...clumpCounts)
    const sorted      = [...clumpCounts].sort((a, b) => a - b)
    const medianClumps = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)]

    // ── Geographic coverage ────────────────────────────────────────────────────
    const regions  = new Set(filteredQuadrats.map((q) => q.region))
    const provinces = new Set(filteredQuadrats.map((q) => q.province))
    const munis    = new Set(filteredQuadrats.map((q) => q.municipality))
    const barangays = new Set(filteredQuadrats.map((q) => q.barangay))

    // ── Survey dates ───────────────────────────────────────────────────────────
    const ts = filteredQuadrats.map((q) => q.approvedAt).filter(Boolean)
    const earliest = ts.length ? Math.min(...ts) : null
    const latest   = ts.length ? Math.max(...ts) : null

    // ── Clump-level ────────────────────────────────────────────────────────────
    const nc = displayedClumps.length
    const totalCulms = displayedClumps.reduce((s, c) => s + (c.culmCount ?? 0), 0)
    const diameters  = displayedClumps.map((c) => c.averageDiameterCm).filter((v) => v != null) as number[]
    const heights    = displayedClumps.map((c) => c.averageHeightMeters).filter((v) => v != null) as number[]
    const meanDiam   = diameters.length ? diameters.reduce((s, v) => s + v, 0) / diameters.length : null
    const minDiam    = diameters.length ? Math.min(...diameters) : null
    const maxDiam    = diameters.length ? Math.max(...diameters) : null
    const meanHt     = heights.length   ? heights.reduce((s, v) => s + v, 0) / heights.length   : null
    const minHt      = heights.length   ? Math.min(...heights)   : null
    const maxHt      = heights.length   ? Math.max(...heights)   : null

    // Species breakdown from displayed clumps — count + avg culm diameter per species
    const speciesMap: Record<string, { count: number; diamSum: number; diamN: number }> = {}
    for (const c of displayedClumps) {
      const entry = speciesMap[c.scientificName] ?? { count: 0, diamSum: 0, diamN: 0 }
      entry.count++
      if (c.averageDiameterCm != null) { entry.diamSum += c.averageDiameterCm; entry.diamN++ }
      speciesMap[c.scientificName] = entry
    }
    const speciesList = Object.entries(speciesMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { count, diamSum, diamN }]) => ({
        name, count,
        pct: nc > 0 ? (count / nc) * 100 : 0,
        avgDiam: diamN > 0 ? diamSum / diamN : null,
      }))
    const maxSpeciesCount = speciesList[0]?.count ?? 1

    return {
      n, totalClumps, totalPhotos, meanClumps, minClumps, maxClumps, medianClumps,
      regions: regions.size, provinces: provinces.size, munis: munis.size, barangays: barangays.size,
      earliest, latest,
      nc, totalCulms,
      meanDiam, minDiam, maxDiam,
      meanHt, minHt, maxHt,
      speciesList, maxSpeciesCount,
    }
  }, [filteredQuadrats, displayedClumps])

  const isFiltered = filteredQuadrats.length !== allQuadrats.length

  return (
    <div
      className={clsx(
        'absolute top-[4.5rem] left-4 z-10 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 text-white transition-all',
        open ? 'w-64' : 'w-auto',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-semibold flex-1">Survey data</span>
        {activeFilterCount > 0 && (
          <span className="text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {activeFilterCount}
          </span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-700"
        >
          {open ? '✕' : '⊞'}
        </button>
      </div>

      {open && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-slate-700">
            {(['stats', 'filters'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-medium capitalize transition-colors relative',
                  tab === t ? 'text-emerald-400 bg-slate-800/60' : 'text-slate-400 hover:text-white',
                )}
              >
                {t}
                {t === 'filters' && hasActiveFilters && (
                  <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">

            {/* ── STATS tab ── */}
            {tab === 'stats' && (
              <>
                {isLoading && (
                  <div className="space-y-3 py-1 animate-pulse">
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex-1 h-12 rounded bg-slate-800" />
                      ))}
                    </div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-3 rounded bg-slate-800" style={{ width: `${80 - i * 12}%` }} />
                    ))}
                  </div>
                )}

                {!isLoading && !stats && (
                  <p className="text-xs text-slate-500 text-center py-4">No quadrats match current filters.</p>
                )}

                {!isLoading && stats && (
                  <>
                    {/* Primary counts */}
                    <div className="flex gap-1.5">
                      <MiniStat
                        label={isFiltered ? `of ${allQuadrats.length} sites` : 'sites'}
                        value={<span className="text-emerald-400">{stats.n.toLocaleString()}</span>}
                      />
                      <MiniStat
                        label="clumps"
                        value={<span className="text-blue-400">{stats.totalClumps.toLocaleString()}</span>}
                      />
                      <MiniStat
                        label="photos"
                        value={<span className="text-purple-400">{stats.totalPhotos.toLocaleString()}</span>}
                      />
                    </div>

                    {layerFilteredCount !== undefined && layerFilteredCount < filteredQuadrats.length && (
                      <p className="text-xs text-amber-400/90 text-center -mt-1">
                        {layerFilteredCount.toLocaleString()} visible after date/species filter
                      </p>
                    )}

                    {/* Clumps per site */}
                    <div className="space-y-1.5">
                      <SectionLabel>Clumps per site</SectionLabel>
                      <div className="flex gap-1.5">
                        <MiniStat label="mean"   value={fmt(stats.meanClumps)} />
                        <MiniStat label="median" value={fmt(stats.medianClumps)} />
                        <MiniStat label="min"    value={stats.minClumps} />
                        <MiniStat label="max"    value={stats.maxClumps} />
                      </div>
                    </div>

                    {/* Culm measurements */}
                    {stats.nc > 0 && (
                      <div className="space-y-1.5">
                        <SectionLabel>Culm measurements ({stats.nc.toLocaleString()} clumps)</SectionLabel>
                        <div className="space-y-1">
                          <Row label="Total culms" value={stats.totalCulms.toLocaleString()} />
                          {stats.meanDiam != null && (
                            <Row
                              label="Avg diameter"
                              value={`${fmt(stats.meanDiam)} cm  (${fmt(stats.minDiam!)}–${fmt(stats.maxDiam!)})`}
                            />
                          )}
                          {stats.meanHt != null && (
                            <Row
                              label="Avg height"
                              value={`${fmt(stats.meanHt)} m  (${fmt(stats.minHt!)}–${fmt(stats.maxHt!)})`}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Species distribution */}
                    {stats.speciesList.length > 0 && (
                      <div className="space-y-1.5">
                        <SectionLabel>Species distribution</SectionLabel>
                        <div className="space-y-1.5">
                          {(showAllSpecies ? stats.speciesList : stats.speciesList.slice(0, 8)).map(({ name, count, pct, avgDiam }) => {
                            const [r, g, b] = getSpeciesColor(name)
                            return (
                              <div key={name}>
                                <div className="flex items-center justify-between mb-0.5 gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-sm flex-shrink-0"
                                      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                                    />
                                    <span className="text-xs text-slate-300 italic truncate" title={name}>{name}</span>
                                  </div>
                                  <span className="text-xs text-slate-400 flex-shrink-0">
                                    {count} <span className="text-slate-600">({fmt(pct, 0)}%)</span>
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${(count / stats.maxSpeciesCount) * 100}%`,
                                      backgroundColor: `rgb(${r},${g},${b})`,
                                    }}
                                  />
                                </div>
                                {avgDiam != null && (
                                  <p className="text-right text-slate-600 mt-0.5" style={{ fontSize: '10px' }}>
                                    avg ⌀ {fmt(avgDiam)} cm
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {stats.speciesList.length > 8 && (
                          <button
                            onClick={() => setShowAllSpecies((v) => !v)}
                            className="text-xs text-slate-500 hover:text-slate-300 w-full text-center"
                          >
                            {showAllSpecies
                              ? '↑ show less'
                              : `+ ${stats.speciesList.length - 8} more species`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Geographic coverage */}
                    <div className="space-y-1.5">
                      <SectionLabel>Coverage</SectionLabel>
                      <div className="space-y-1">
                        <Row label="Regions"       value={stats.regions} />
                        <Row label="Provinces"     value={stats.provinces} />
                        <Row label="Municipalities" value={stats.munis} />
                        <Row label="Barangays"     value={stats.barangays} />
                      </div>
                    </div>

                    {/* Survey period */}
                    {stats.earliest && stats.latest && (
                      <div className="space-y-1.5">
                        <SectionLabel>Survey period</SectionLabel>
                        <div className="space-y-1">
                          <Row
                            label="From"
                            value={new Date(stats.earliest).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          />
                          <Row
                            label="To"
                            value={new Date(stats.latest).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── FILTERS tab ── */}
            {tab === 'filters' && (
              <>
                {/* Search */}
                <div>
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    type="text"
                    placeholder="Barangay, municipality…"
                    value={filters.search}
                    onChange={(e) => set({ search: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="text-xs text-slate-400">Region</label>
                  <select
                    value={filters.region}
                    onChange={(e) => set({ region: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All regions</option>
                    {allRegions.map(([r, cnt]) => (
                      <option key={r} value={r}>{r} ({cnt})</option>
                    ))}
                  </select>
                </div>

                {/* Province */}
                <div>
                  <label className="text-xs text-slate-400">Province</label>
                  <input
                    type="text"
                    placeholder="e.g. Abra"
                    value={filters.province}
                    onChange={(e) => set({ province: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Municipality */}
                <div>
                  <label className="text-xs text-slate-400">Municipality</label>
                  <input
                    type="text"
                    placeholder="e.g. Licuan-Baay"
                    value={filters.municipality}
                    onChange={(e) => set({ municipality: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Min clumps */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <label>Min clumps per site</label>
                    <span className="text-slate-300">{filters.minClumps === 0 ? 'Any' : `≥ ${filters.minClumps}`}</span>
                  </div>
                  <input
                    type="range" min={0} max={50} step={1}
                    value={filters.minClumps}
                    onChange={(e) => set({ minClumps: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Min photos */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <label>Min photos per site</label>
                    <span className="text-slate-300">{filters.minPhotos === 0 ? 'Any' : `≥ ${filters.minPhotos}`}</span>
                  </div>
                  <input
                    type="range" min={0} max={30} step={1}
                    value={filters.minPhotos}
                    onChange={(e) => set({ minPhotos: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Species */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      Species {allObservedSpecies.length > 0 && <span className="text-slate-600">({allObservedSpecies.length})</span>}
                    </label>
                    {speciesFilter.length > 0 && (
                      <button onClick={() => onSpeciesFilterChange([])} className="text-xs text-slate-500 hover:text-white">
                        all
                      </button>
                    )}
                  </div>
                  {allObservedSpecies.length > 6 && (
                    <input
                      type="text"
                      placeholder="Search species…"
                      value={speciesSearch}
                      onChange={(e) => setSpeciesSearch(e.target.value)}
                      className="w-full mb-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {allObservedSpecies
                      .filter((sp) => !speciesSearch || sp.toLowerCase().includes(speciesSearch.toLowerCase()))
                      .map((sp) => {
                        const [r, g, b] = getSpeciesColor(sp)
                        const active = speciesFilter.length === 0 || speciesFilter.includes(sp)
                        return (
                          <label key={sp} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => {
                                const total = allObservedSpecies.length
                                if (speciesFilter.length === 0) {
                                  onSpeciesFilterChange(allObservedSpecies.filter((s) => s !== sp))
                                } else if (speciesFilter.includes(sp)) {
                                  const next = speciesFilter.filter((s) => s !== sp)
                                  onSpeciesFilterChange(next.length === total - 1 ? [] : next)
                                } else {
                                  const next = [...speciesFilter, sp]
                                  onSpeciesFilterChange(next.length === total ? [] : next)
                                }
                              }}
                              className="w-3.5 h-3.5 rounded accent-emerald-500 flex-shrink-0"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-white/20"
                              style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                            />
                            <span className="text-xs italic text-slate-300 truncate group-hover:text-white">{sp}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="text-xs text-slate-400">Survey date range</label>
                  <div className="mt-1 space-y-1">
                    <input
                      type="date"
                      value={dateRange.from ?? ''}
                      onChange={(e) => onDateRangeChange({ from: e.target.value || null })}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs text-white"
                    />
                    <input
                      type="date"
                      value={dateRange.to ?? ''}
                      onChange={(e) => onDateRangeChange({ to: e.target.value || null })}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Clear */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onFiltersChange(DEFAULT_MAP_FILTERS)
                      onSpeciesFilterChange([])
                      onDateRangeChange({ from: null, to: null })
                    }}
                    className="w-full py-1.5 rounded text-xs text-orange-400 border border-orange-500/40 hover:bg-orange-500/10 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </>
            )}

          </div>
        </>
      )}
    </div>
  )
}
