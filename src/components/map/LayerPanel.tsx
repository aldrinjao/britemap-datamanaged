'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { LayerState, BasemapStyle, ClumpSizeMetric } from './use-map-layers'
import { BAMBOO_DIST_TILES, DRONE_FLIGHTS } from './overlay-config'
import { mapVideos } from '@/components/video/drone-videos'

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
  onToggleBambooDist: () => void
  onSetBamboDistOpacity: (v: number) => void
  onSetDroneId: (id: string | null) => void
  onSetDroneOpacity: (v: number) => void
  onToggleDroneVideos: () => void
  onToggleSurveyExtent: () => void
}

type Tab = 'map' | 'boundaries' | 'data' | 'overlays'

function Toggle({
  label, checked, onChange, disabled = false, note,
}: {
  label: string; checked: boolean; onChange: () => void; disabled?: boolean; note?: string
}) {
  return (
    <div>
      <label className={clsx('flex items-center gap-2 group', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="w-4 h-4 rounded accent-emerald-500"
        />
        <span className={clsx('text-sm text-slate-300', !disabled && 'group-hover:text-white')}>{label}</span>
      </label>
      {note && <p className="text-xs text-slate-600 mt-0.5 pl-6">{note}</p>}
    </div>
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

function OpacitySlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
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
  onToggleBambooDist,
  onSetBamboDistOpacity,
  onSetDroneId,
  onSetDroneOpacity,
  onToggleDroneVideos,
  onToggleSurveyExtent,
}: LayerPanelProps) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('map')

  const bambooReady = BAMBOO_DIST_TILES !== ''
  const availableDroneFlights = DRONE_FLIGHTS.filter((f) => f.tiles !== '')
  const videoCount = mapVideos().length

  const tabs: { id: Tab; label: string }[] = [
    { id: 'map',        label: 'Map'      },
    { id: 'boundaries', label: 'Bounds'   },
    { id: 'data',       label: 'Data'     },
    { id: 'overlays',   label: 'Overlays' },
  ]

  return (
    <div className={clsx(
      'bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 text-white transition-all',
      open ? 'w-56' : 'w-auto',
    )}>
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
        <>
          {/* Tab bar */}
          <div className="flex border-b border-slate-700">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex-1 py-1.5 text-[11px] font-medium transition-colors',
                  tab === t.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-3 space-y-3">

            {tab === 'map' && (
              <>
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
                  note={layers.roads && layers.basemap === 'streets' ? 'Visible on satellite mode' : undefined}
                />
              </>
            )}

            {tab === 'boundaries' && (
              <>
                {(Object.keys(layers.boundaries) as Array<keyof LayerState['boundaries']>).map((k) => (
                  <Toggle
                    key={k}
                    label={k.charAt(0).toUpperCase() + k.slice(1)}
                    checked={layers.boundaries[k]}
                    onChange={() => onToggleBoundary(k)}
                  />
                ))}
                {layers.boundaries.provinces && (
                  <OpacitySlider
                    label="Province fill opacity"
                    value={layers.provincesOpacity}
                    onChange={onSetProvincesOpacity}
                  />
                )}
              </>
            )}

            {tab === 'data' && (
              <>
                <Toggle label="Quadrat points"  checked={layers.data.quadratPoints} onChange={onToggleQuadratPoints} />
                <Toggle label="Density heatmap" checked={layers.data.heatmap}       onChange={onToggleHeatmap} />
                <div className="pt-1">
                  <p className="text-xs text-slate-500 mb-1.5">Clump point size</p>
                  <div className="space-y-1">
                    <Radio label="Diameter" value="diameter" current={layers.data.clumpSizeMetric} onChange={onSetClumpSizeMetric} />
                    <Radio label="Height"   value="height"   current={layers.data.clumpSizeMetric} onChange={onSetClumpSizeMetric} />
                  </div>
                </div>
              </>
            )}

            {tab === 'overlays' && (
              <>
                {/* Survey extent */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Survey extent</p>
                  <Toggle label="Tarlac (Y1)" checked={layers.overlays.surveyExtent} onChange={onToggleSurveyExtent} />
                </div>

                {/* Drone video markers */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Drone footage</p>
                  <Toggle
                    label="Video markers"
                    checked={layers.overlays.droneVideos}
                    onChange={onToggleDroneVideos}
                    disabled={videoCount === 0}
                    note={
                      videoCount === 0
                        ? 'No geolocated videos yet'
                        : `${videoCount} clip${videoCount === 1 ? '' : 's'} · click a ▶ pin to watch`
                    }
                  />
                </div>

                {/* Bamboo distribution */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Bamboo distribution</p>
                  <Toggle
                    label="AI/ML model"
                    checked={layers.overlays.bambooDist}
                    onChange={onToggleBambooDist}
                    disabled={!bambooReady}
                    note={!bambooReady ? 'Tile URL not configured' : undefined}
                  />
                  {layers.overlays.bambooDist && bambooReady && (
                    <OpacitySlider
                      label="Opacity"
                      value={layers.overlays.bamboDistOpacity}
                      onChange={onSetBamboDistOpacity}
                    />
                  )}
                </div>

                {/* Drone imagery */}
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-500">Drone imagery</p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={layers.overlays.droneId === null}
                        onChange={() => onSetDroneId(null)}
                        className="accent-emerald-500"
                      />
                      <span className="text-sm text-slate-400">None</span>
                    </label>
                    {DRONE_FLIGHTS.map((f) => {
                      const ready = f.tiles !== ''
                      return (
                        <label
                          key={f.id}
                          className={clsx(
                            'flex items-start gap-2',
                            ready ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                          )}
                        >
                          <input
                            type="radio"
                            checked={layers.overlays.droneId === f.id}
                            onChange={() => ready && onSetDroneId(f.id)}
                            disabled={!ready}
                            className="accent-emerald-500 mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-sm text-slate-300 leading-tight block">{f.name}</span>
                            {!ready && <span className="text-[10px] text-slate-600">Not yet hosted</span>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {layers.overlays.droneId !== null && availableDroneFlights.length > 0 && (
                    <OpacitySlider
                      label="Opacity"
                      value={layers.overlays.droneOpacity}
                      onChange={onSetDroneOpacity}
                    />
                  )}
                </div>
              </>
            )}

          </div>
        </>
      )}
    </div>
  )
}
