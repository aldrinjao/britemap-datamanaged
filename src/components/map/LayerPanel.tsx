'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { LayerState, BasemapStyle, ClumpSizeMetric } from './use-map-layers'

interface LayerPanelProps {
  layers: LayerState
  onSetBasemap: (v: BasemapStyle) => void
  onToggleHillshade: () => void
  onToggleRoads: () => void
  onToggleBoundary: (k: keyof LayerState['boundaries']) => void
  onSetProvincesOpacity: (v: number) => void
  onToggleQuadratPoints: () => void
  onToggleHeatmap: () => void
  onSetClumpSizeMetric: (v: ClumpSizeMetric) => void
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded accent-emerald-500" />
      <span className="text-sm text-slate-300 group-hover:text-white">{label}</span>
    </label>
  )
}

function Radio<T extends string>({
  label, value, current, onChange,
}: {
  label: string; value: T; current: T; onChange: (v: T) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="accent-emerald-500" />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  )
}

export function LayerPanel({
  layers,
  onSetBasemap,
  onToggleHillshade,
  onToggleRoads,
  onToggleBoundary,
  onSetProvincesOpacity,
  onToggleQuadratPoints,
  onToggleHeatmap,
  onSetClumpSizeMetric,
}: LayerPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className={clsx(
        'bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 text-white transition-all',
        open ? 'w-56' : 'w-auto',
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
        <div className="p-3 space-y-3">

          {/* Basemap */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Basemap</p>
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
          </div>

          <Toggle label="Hillshade" checked={layers.hillshade} onChange={onToggleHillshade} />
          <Toggle
            label={layers.basemap === 'satellite' ? 'Roads overlay' : 'Road network'}
            checked={layers.roads}
            onChange={onToggleRoads}
          />
          {layers.roads && layers.basemap === 'streets' && (
            <p className="text-xs text-slate-600 -mt-1 pl-6">Visible on satellite mode</p>
          )}

          {/* Boundaries */}
          <div className="border-t border-slate-700 pt-3 space-y-1.5">
            <p className="text-xs text-slate-500 mb-1.5">Boundaries</p>
            {(Object.keys(layers.boundaries) as Array<keyof LayerState['boundaries']>).map((k) => (
              <Toggle
                key={k}
                label={k.charAt(0).toUpperCase() + k.slice(1)}
                checked={layers.boundaries[k]}
                onChange={() => onToggleBoundary(k)}
              />
            ))}
            {layers.boundaries.provinces && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Province fill opacity</span>
                  <span>{Math.round(layers.provincesOpacity * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={layers.provincesOpacity}
                  onChange={(e) => onSetProvincesOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Data */}
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <p className="text-xs text-slate-500 mb-1.5">Data</p>
            <Toggle label="Quadrat points" checked={layers.data.quadratPoints} onChange={onToggleQuadratPoints} />
            <Toggle label="Density heatmap" checked={layers.data.heatmap} onChange={onToggleHeatmap} />
            <div className="pt-1">
              <p className="text-xs text-slate-500 mb-1.5">Clump point size</p>
              <div className="space-y-1">
                <Radio label="Diameter" value="diameter" current={layers.data.clumpSizeMetric} onChange={onSetClumpSizeMetric} />
                <Radio label="Height"   value="height"   current={layers.data.clumpSizeMetric} onChange={onSetClumpSizeMetric} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
