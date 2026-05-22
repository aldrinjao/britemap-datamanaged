'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import type { PublicQuadrat } from '@/lib/types'

// ─── Public filter type ───────────────────────────────────────────────────────

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
  if (f.region) result = result.filter((q) => q.region === f.region)
  if (f.province) {
    const p = f.province.toLowerCase()
    result = result.filter((q) => q.province?.toLowerCase().includes(p))
  }
  if (f.municipality) {
    const m = f.municipality.toLowerCase()
    result = result.filter((q) => q.municipality?.toLowerCase().includes(m))
  }
  if (f.minClumps > 0) result = result.filter((q) => q.clumpCount >= f.minClumps)
  if (f.minPhotos > 0) result = result.filter((q) => q.photoCount >= f.minPhotos)
  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-700 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
      >
        {title}
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-2 text-center">
      <p className={clsx('text-lg font-bold leading-tight', color)}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function TextInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StatsFilterPanelProps {
  allQuadrats: PublicQuadrat[]
  filteredQuadrats: PublicQuadrat[]
  filters: MapFilters
  onFiltersChange: (f: MapFilters) => void
  isLoading?: boolean
  layerFilteredCount?: number
}

export function StatsFilterPanel({
  allQuadrats,
  filteredQuadrats,
  filters,
  onFiltersChange,
  isLoading,
  layerFilteredCount,
}: StatsFilterPanelProps) {
  const [open, setOpen] = useState(true)

  const set = (patch: Partial<MapFilters>) => onFiltersChange({ ...filters, ...patch })

  const hasActiveFilters =
    !!filters.search ||
    !!filters.region ||
    !!filters.province ||
    !!filters.municipality ||
    filters.minClumps > 0 ||
    filters.minPhotos > 0

  // Unique regions derived from the full (unfiltered) dataset for the dropdown
  const allRegions = useMemo(() => {
    const map: Record<string, number> = {}
    for (const q of allQuadrats) {
      map[q.region] = (map[q.region] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [allQuadrats])

  // Stats computed from the currently filtered set
  const stats = useMemo(() => {
    const totalClumps = filteredQuadrats.reduce((s, q) => s + q.clumpCount, 0)
    const totalPhotos = filteredQuadrats.reduce((s, q) => s + q.photoCount, 0)

    const byRegion: Record<string, number> = {}
    for (const q of filteredQuadrats) byRegion[q.region] = (byRegion[q.region] ?? 0) + 1
    const regionList = Object.entries(byRegion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    const maxRegionCount = regionList[0]?.[1] ?? 1

    const timestamps = filteredQuadrats.map((q) => q.approvedAt).filter(Boolean)
    const earliest = timestamps.length ? Math.min(...timestamps) : null
    const latest = timestamps.length ? Math.max(...timestamps) : null

    const avgClumps =
      filteredQuadrats.length > 0
        ? (totalClumps / filteredQuadrats.length).toFixed(1)
        : '0'

    return { totalClumps, totalPhotos, regionList, maxRegionCount, earliest, latest, avgClumps }
  }, [filteredQuadrats])

  const isFiltered = filteredQuadrats.length !== allQuadrats.length

  return (
    <div
      className={clsx(
        'absolute top-16 left-4 z-10 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 text-white transition-all',
        open ? 'w-64' : 'w-auto',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-semibold flex-1">Stats &amp; Filters</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Filters active" />
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-700"
        >
          {open ? '✕' : '⊞'}
        </button>
      </div>

      {open && (
        <div className="overflow-y-auto max-h-[calc(100vh-10rem)]">
          {/* ── Statistics ── */}
          <Section title="Statistics">
            <div className="grid grid-cols-3 gap-1.5">
              <Stat
                label={isFiltered ? `of ${allQuadrats.length}` : 'Quadrats'}
                value={isLoading ? '…' : filteredQuadrats.length.toLocaleString()}
                color="text-emerald-400"
              />
              <Stat
                label="Clumps"
                value={isLoading ? '…' : stats.totalClumps.toLocaleString()}
                color="text-blue-400"
              />
              <Stat
                label="Photos"
                value={isLoading ? '…' : stats.totalPhotos.toLocaleString()}
                color="text-purple-400"
              />
            </div>
            {layerFilteredCount !== undefined && layerFilteredCount < filteredQuadrats.length && (
              <p className="text-xs text-amber-400/90 text-center -mt-0.5">
                {layerFilteredCount.toLocaleString()} visible (date/species filters active)
              </p>
            )}

            {/* avg clumps per quadrat */}
            <div className="flex gap-1.5">
              <div className="flex-1 bg-slate-800 rounded-lg px-2 py-1.5 text-center">
                <p className="text-sm font-semibold text-slate-200">{isLoading ? '…' : stats.avgClumps}</p>
                <p className="text-xs text-slate-400">avg clumps/site</p>
              </div>
              {stats.earliest && stats.latest && (
                <div className="flex-1 bg-slate-800 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    {new Date(stats.earliest).getFullYear()}
                    {new Date(stats.earliest).getFullYear() !== new Date(stats.latest).getFullYear()
                      ? `–${new Date(stats.latest).getFullYear()}`
                      : ''}
                  </p>
                  <p className="text-xs text-slate-400">survey year(s)</p>
                </div>
              )}
            </div>

            {/* Region breakdown mini-chart */}
            {stats.regionList.length > 0 && (
              <div className="mt-1 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">By region</p>
                {stats.regionList.map(([region, count]) => (
                  <div key={region}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span
                        className="text-slate-400 truncate pr-2 leading-tight"
                        title={region}
                      >
                        {region}
                      </span>
                      <span className="text-slate-300 flex-shrink-0">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(count / stats.maxRegionCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Filters ── */}
          <Section title="Search &amp; Filters">
            {/* Full-text search */}
            <TextInput
              label="Search"
              placeholder="Barangay, municipality…"
              value={filters.search}
              onChange={(v) => set({ search: v })}
            />

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
                  <option key={r} value={r}>
                    {r} ({cnt})
                  </option>
                ))}
              </select>
            </div>

            {/* Province */}
            <TextInput
              label="Province"
              placeholder="e.g. Laguna"
              value={filters.province}
              onChange={(v) => set({ province: v })}
            />

            {/* Municipality */}
            <TextInput
              label="Municipality"
              placeholder="e.g. Santa Cruz"
              value={filters.municipality}
              onChange={(v) => set({ municipality: v })}
            />

            {/* Min clumps */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <label>Min clumps per site</label>
                <span className="text-slate-300">{filters.minClumps === 0 ? 'Any' : `≥ ${filters.minClumps}`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
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
                type="range"
                min={0}
                max={30}
                step={1}
                value={filters.minPhotos}
                onChange={(e) => set({ minPhotos: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={() => onFiltersChange(DEFAULT_MAP_FILTERS)}
                className="w-full py-1.5 rounded text-xs text-orange-400 border border-orange-500/40 hover:bg-orange-500/10 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
