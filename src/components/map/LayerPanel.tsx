'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { LayerState, BasemapStyle, ClusterMode } from './use-map-layers'

interface LayerPanelProps {
  layers: LayerState
  availableSpecies: string[]
  onSetBasemap: (v: BasemapStyle) => void
  onToggleHillshade: () => void
  onToggleBoundary: (k: keyof LayerState['boundaries']) => void
  onSetProvincesOpacity: (v: number) => void
  onToggleQuadratPoints: () => void
  onSetClusterMode: (v: ClusterMode) => void
  onToggleHeatmap: () => void
  onToggleColorByStatus: () => void
  onSetSpeciesFilter: (v: string[]) => void
  onSetDateRange: (v: Partial<LayerState['dateRange']>) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded accent-emerald-500"
      />
      <span className="text-sm text-slate-300 group-hover:text-white">{label}</span>
    </label>
  )
}

function Radio<T extends string>({
  label,
  value,
  current,
  onChange,
}: {
  label: string
  value: T
  current: T
  onChange: (v: T) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        checked={current === value}
        onChange={() => onChange(value)}
        className="accent-emerald-500"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  )
}

export function LayerPanel({
  layers,
  availableSpecies,
  onSetBasemap,
  onToggleHillshade,
  onToggleBoundary,
  onSetProvincesOpacity,
  onToggleQuadratPoints,
  onSetClusterMode,
  onToggleHeatmap,
  onToggleColorByStatus,
  onSetSpeciesFilter,
  onSetDateRange,
}: LayerPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className={clsx(
        'absolute top-3 right-3 z-10 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 text-white transition-all',
        open ? 'w-60' : 'w-auto',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-semibold">Layers</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-700"
        >
          {open ? '✕' : '⊞'}
        </button>
      </div>

      {open && (
        <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
          {/* Basemap */}
          <Section title="Basemap">
            <div className="flex gap-2">
              {(['streets', 'satellite'] as BasemapStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onSetBasemap(s)}
                  className={clsx(
                    'flex-1 py-1 rounded text-xs capitalize border',
                    layers.basemap === s
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-400',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Toggle label="Hillshade" checked={layers.hillshade} onChange={onToggleHillshade} />
          </Section>

          {/* Admin boundaries */}
          <Section title="Boundaries">
            {(Object.keys(layers.boundaries) as Array<keyof LayerState['boundaries']>).map((k) => (
              <Toggle
                key={k}
                label={k.charAt(0).toUpperCase() + k.slice(1)}
                checked={layers.boundaries[k]}
                onChange={() => onToggleBoundary(k)}
              />
            ))}
            {layers.boundaries.provinces && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Province fill opacity</span>
                  <span>{Math.round(layers.provincesOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layers.provincesOpacity}
                  onChange={(e) => onSetProvincesOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
          </Section>

          {/* Data layers */}
          <Section title="Data">
            <Toggle
              label="Quadrat points"
              checked={layers.data.quadratPoints}
              onChange={onToggleQuadratPoints}
            />
            {layers.data.quadratPoints && (
              <div className="pl-4 space-y-1">
                <Radio
                  label="Clustered"
                  value="clustered"
                  current={layers.data.clusterMode}
                  onChange={onSetClusterMode}
                />
                <Radio
                  label="Individual"
                  value="individual"
                  current={layers.data.clusterMode}
                  onChange={onSetClusterMode}
                />
              </div>
            )}
            <Toggle
              label="Density heatmap"
              checked={layers.data.heatmap}
              onChange={onToggleHeatmap}
            />
            <Toggle
              label="Color by status"
              checked={layers.data.colorByStatus}
              onChange={onToggleColorByStatus}
            />
          </Section>

          {/* Species filter */}
          {availableSpecies.length > 0 && (
            <Section title="Species filter">
              <p className="text-xs text-slate-500 mb-1">Empty = all species shown</p>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {availableSpecies.map((sp) => (
                  <Toggle
                    key={sp}
                    label={sp}
                    checked={
                      layers.data.speciesFilter.length === 0 ||
                      layers.data.speciesFilter.includes(sp)
                    }
                    onChange={() => {
                      const current = layers.data.speciesFilter
                      if (current.length === 0) {
                        // Switching from "all" to explicit: exclude this one
                        onSetSpeciesFilter(availableSpecies.filter((s) => s !== sp))
                      } else if (current.includes(sp)) {
                        const next = current.filter((s) => s !== sp)
                        onSetSpeciesFilter(next.length === availableSpecies.length - 1 ? [] : next)
                      } else {
                        const next = [...current, sp]
                        onSetSpeciesFilter(next.length === availableSpecies.length ? [] : next)
                      }
                    }}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Date range */}
          <Section title="Date range">
            <div className="space-y-1.5">
              <div>
                <label className="text-xs text-slate-400">From</label>
                <input
                  type="date"
                  value={layers.dateRange.from ?? ''}
                  onChange={(e) => onSetDateRange({ from: e.target.value || null })}
                  className="w-full mt-0.5 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">To</label>
                <input
                  type="date"
                  value={layers.dateRange.to ?? ''}
                  onChange={(e) => onSetDateRange({ to: e.target.value || null })}
                  className="w-full mt-0.5 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-white"
                />
              </div>
            </div>
          </Section>

          {/* Status legend */}
          <Section title="Status legend">
            {[
              ['submitted', '#EAB308'],
              ['under_review', '#3B82F6'],
              ['returned', '#F97316'],
              ['approved', '#22C55E'],
              ['abandoned', '#6B7280'],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-300 capitalize">{label.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}
