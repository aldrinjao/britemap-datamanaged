'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { LayerState, BasemapStyle, ClumpSizeMetric } from './use-map-layers'
import { BAMBOO_DIST_TILES, DRONE_FLIGHTS, SURVEY_MAPS } from './overlay-config'
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
  onToggleSurveyMap: (id: string) => void
  onSetSurveyMapsOpacity: (v: number) => void
  /** Per-survey-map id → currently fetching/expanding its TopoJSON. */
  surveyMapsLoading: Record<string, boolean>
}

type Tab = 'map' | 'boundaries' | 'data' | 'overlays'

function Spinner() {
  return (
    <span
      className="inline-block w-3 h-3 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin"
      role="status"
      aria-label="Loading"
    />
  )
}

function Toggle({
  label, checked, onChange, disabled = false, note, loading = false,
}: {
  label: string; checked: boolean; onChange: () => void; disabled?: boolean; note?: string; loading?: boolean
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
        {loading && <Spinner />}
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

/** Collapsible group used to keep the Overlays tab compact. */
function Section({
  title, activeCount = 0, defaultOpen = false, children,
}: {
  title: string; activeCount?: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-slate-700 pt-2 first:border-t-0 first:pt-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">{title}</span>
          {activeCount > 0 && (
            <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-slate-500 text-[10px] group-hover:text-slate-300">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
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
  onToggleSurveyMap,
  onSetSurveyMapsOpacity,
  surveyMapsLoading,
}: LayerPanelProps) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('map')

  const bambooReady = BAMBOO_DIST_TILES !== ''
  const availableDroneFlights = DRONE_FLIGHTS.filter((f) => f.tiles !== '')
  const videoCount = mapVideos().length
  const activeSurveyMaps = SURVEY_MAPS.filter((m) => layers.overlays.surveyMaps[m.id]).length

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
                    {(['streets', 'plain', 'satellite'] as BasemapStyle[]).map((s) => (
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
              <div className="space-y-2">
                {/* Bamboo survey maps */}
                <Section title="Survey maps" activeCount={activeSurveyMaps} defaultOpen>
                  {SURVEY_MAPS.map((m) => (
                    <Toggle
                      key={m.id}
                      label={m.name}
                      checked={!!layers.overlays.surveyMaps[m.id]}
                      onChange={() => onToggleSurveyMap(m.id)}
                      loading={!!surveyMapsLoading[m.id]}
                    />
                  ))}
                  {activeSurveyMaps > 0 && (
                    <OpacitySlider
                      label="Opacity"
                      value={layers.overlays.surveyMapsOpacity}
                      onChange={onSetSurveyMapsOpacity}
                    />
                  )}
                </Section>

                {/* Drone imagery — orthophoto flights (single-select dropdown) */}
                <Section title="Drone imagery" activeCount={layers.overlays.droneId ? 1 : 0}>
                  <select
                    value={layers.overlays.droneId ?? ''}
                    onChange={(e) => onSetDroneId(e.target.value || null)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None</option>
                    {DRONE_FLIGHTS.map((f) => (
                      <option key={f.id} value={f.id} disabled={f.tiles === ''}>
                        {f.name}{f.tiles === '' ? ' — not hosted' : ''}
                      </option>
                    ))}
                  </select>
                  {layers.overlays.droneId !== null && availableDroneFlights.length > 0 && (
                    <OpacitySlider
                      label="Opacity"
                      value={layers.overlays.droneOpacity}
                      onChange={onSetDroneOpacity}
                    />
                  )}
                </Section>

                {/* Bamboo distribution model raster */}
                <Section title="Bamboo distribution" activeCount={layers.overlays.bambooDist ? 1 : 0}>
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
                </Section>

                {/* Drone footage markers */}
                <Section title="Drone footage" activeCount={layers.overlays.droneVideos && videoCount > 0 ? 1 : 0}>
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
                </Section>

              </div>
            )}

          </div>
        </>
      )}
    </div>
  )
}
