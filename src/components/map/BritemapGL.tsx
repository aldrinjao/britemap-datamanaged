'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { NavigationControl, ScaleControl, Source, Layer as MapLayer, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Layer } from '@deck.gl/core'
import { DeckGLOverlay } from './DeckGLOverlay'
import { LayerPanel } from './LayerPanel'
import { useMapLayers } from './use-map-layers'
import {
  makeQuadratDotsLayer,
  makeQuadratSquaresLayer,
  makeClumpPointsLayer,
  makeHeatmapLayer,
  makeProvinceFillLayer,
  makeRegionOutlineLayer,
  makeMunicipalityOutlineLayer,
  makeRegionHighlightLayer,
  makeProvinceHighlightLayer,
  makeMunicipalityHighlightLayer,
  getSpeciesColor,
} from './deck-layers'
import type { PublicClump, PublicQuadrat } from '@/lib/types'
import type { DateRange } from './StatsFilterPanel'

// ─── Basemap style URLs ───────────────────────────────────────────────────────

const MAP_STYLES = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  satellite: {
    version: 8 as const,
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'satellite-tiles', type: 'raster' as const, source: 'esri-satellite' }],
  },
}

// ─── GeoJSON boundary paths ───────────────────────────────────────────────────

const GEODATA = {
  provinces: '/geodata/provinces.geojson',
  regions: '/geodata/regions.geojson',
  municipalities: '/geodata/municipalities.geojson',
  barangays: '/geodata/barangays.geojson',
}
void GEODATA // referenced for future use

// ─── Zoom thresholds for level-of-detail switching ───────────────────────────
const SQUARE_ZOOM_THRESHOLD = 16   // below: centroid dots; at/above: quadrat squares (~12 px at zoom 16)
const CLUMP_ZOOM_THRESHOLD  = 18   // at/above: individual clump dots

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipInfo {
  x: number
  y: number
  object: PublicQuadrat
}

function MapTooltip({ info }: { info: TooltipInfo }) {
  const q = info.object
  return (
    <div
      className="absolute z-20 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl p-3 text-sm text-white pointer-events-none max-w-xs"
      style={{ left: info.x + 12, top: info.y + 12 }}
    >
      <p className="font-semibold">{q.barangay}, {q.municipality}</p>
      <p className="text-slate-400 text-xs">{q.province} · {q.region}</p>
      {q.dominantSpecies && (
        <p className="text-slate-300 text-xs mt-1 italic">{q.dominantSpecies}</p>
      )}
      <div className="mt-2 flex gap-3 text-xs">
        <span>{q.clumpCount} clumps</span>
        <span>{q.photoCount} photos</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface BritemapGLProps {
  quadrats: PublicQuadrat[]
  clumps?: PublicClump[]
  speciesFilter?: string[]
  dateRange?: DateRange
  quadratCountByProvince?: Record<string, number>
  provincesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  regionsGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  municipalitiesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  activeRegion?: string
  activeProvince?: string
  activeMunicipality?: string
  onQuadratClick?: (quadrat: PublicQuadrat) => void
  onVisibleCountChange?: (count: number) => void
  flyToTarget?: { latitude: number; longitude: number }
  showLayerPanel?: boolean
  visibleSpecies?: string[]
  speciesCommonName?: Record<string, string>
  speciesCount?: Record<string, number>
  className?: string
}

export function BritemapGL({
  quadrats,
  clumps = [],
  speciesFilter = [],
  dateRange = { from: null, to: null },
  quadratCountByProvince = {},
  provincesGeoJSON,
  regionsGeoJSON,
  municipalitiesGeoJSON,
  activeRegion,
  activeProvince,
  activeMunicipality,
  onQuadratClick,
  onVisibleCountChange,
  flyToTarget,
  showLayerPanel = true,
  visibleSpecies = [],
  speciesCommonName = {},
  speciesCount = {},
  className = 'w-full h-full',
}: BritemapGLProps) {
  const { layers, ...actions } = useMapLayers()
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [zoom, setZoom] = useState(5.5)
  const mapRef = useRef<MapRef | null>(null)

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo({
      center: [flyToTarget.longitude, flyToTarget.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 900,
      essential: true,
    })
  }, [flyToTarget])

  const handleHover = useCallback((info: { object?: PublicQuadrat | null; x: number; y: number }) => {
    if (info.object) {
      setTooltip({ x: info.x, y: info.y, object: info.object })
    } else {
      setTooltip(null)
    }
  }, [])

  const handleClick = useCallback(
    (info: { object?: PublicQuadrat | null }) => {
      if (info.object) onQuadratClick?.(info.object)
    },
    [onQuadratClick],
  )

  const handleMove = useCallback((evt: { viewState: { zoom: number } }) => {
    setZoom(evt.viewState.zoom)
  }, [])

  // Quadrat squares only respond to date range — species filter does not hide squares
  const dateFilteredQuadrats = useMemo(() => {
    let result = quadrats
    if (dateRange.from) {
      const from = new Date(dateRange.from).getTime()
      result = result.filter((q) => q.approvedAt >= from)
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to).getTime() + 86_400_000
      result = result.filter((q) => q.approvedAt <= to)
    }
    return result
  }, [quadrats, dateRange])

  // Species filter only affects clump dots and the heatmap
  const filteredClumps = useMemo(() => {
    if (speciesFilter.length === 0) return clumps
    return clumps.filter((c) => speciesFilter.includes(c.scientificName))
  }, [clumps, speciesFilter])

  useEffect(() => {
    onVisibleCountChange?.(dateFilteredQuadrats.length)
  }, [dateFilteredQuadrats.length, onVisibleCountChange])

  // Build deck.gl layer array
  const deckLayers = useMemo(() => {
    const result: Layer[] = []

    if (layers.boundaries.provinces && provincesGeoJSON) {
      result.push(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeProvinceFillLayer(provincesGeoJSON as any, layers.provincesOpacity, quadratCountByProvince),
      )
    }
    if (layers.boundaries.regions && regionsGeoJSON) {
      result.push(makeRegionOutlineLayer(regionsGeoJSON as { type: 'FeatureCollection'; features: unknown[] }))
    }
    if (layers.boundaries.municipalities && municipalitiesGeoJSON) {
      result.push(makeMunicipalityOutlineLayer(municipalitiesGeoJSON as { type: 'FeatureCollection'; features: unknown[] }))
    }
    // Active-filter highlights — always shown when a filter is set, regardless of layer toggles
    if (activeRegion && regionsGeoJSON) {
      result.push(makeRegionHighlightLayer(regionsGeoJSON as { type: 'FeatureCollection'; features: unknown[] }, activeRegion))
    }
    if (activeProvince && provincesGeoJSON) {
      result.push(makeProvinceHighlightLayer(provincesGeoJSON as { type: 'FeatureCollection'; features: unknown[] }, activeProvince))
    }
    if (activeMunicipality && municipalitiesGeoJSON) {
      result.push(makeMunicipalityHighlightLayer(municipalitiesGeoJSON as { type: 'FeatureCollection'; features: unknown[] }, activeMunicipality))
    }
    if (layers.data.heatmap) {
      result.push(makeHeatmapLayer(filteredClumps))
    }
    if (layers.data.quadratPoints) {
      if (zoom < SQUARE_ZOOM_THRESHOLD) {
        // National / regional scale — centroid dots, pickable for hover/click
        result.push(makeQuadratDotsLayer(dateFilteredQuadrats))
      } else {
        // Local scale — full 30m squares with hover/click
        result.push(
          makeQuadratSquaresLayer(
            dateFilteredQuadrats,
            handleHover as Parameters<typeof makeQuadratSquaresLayer>[1],
            handleClick as Parameters<typeof makeQuadratSquaresLayer>[2],
          ),
        )
        // Individual clumps only at high zoom
        if (zoom >= CLUMP_ZOOM_THRESHOLD && filteredClumps.length > 0) {
          result.push(makeClumpPointsLayer(filteredClumps, layers.data.clumpSizeMetric))
        }
      }
    }

    return result
  }, [
    layers,
    dateFilteredQuadrats,
    filteredClumps,
    zoom,
    provincesGeoJSON,
    regionsGeoJSON,
    municipalitiesGeoJSON,
    quadratCountByProvince,
    activeRegion,
    activeProvince,
    activeMunicipality,
    handleHover,
    handleClick,
  ])

  const mapStyle = layers.basemap === 'streets' ? MAP_STYLES.streets : MAP_STYLES.satellite

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 122.0, latitude: 12.5, zoom: 5.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle as string}
        attributionControl={false}
        minZoom={5}
        onMove={handleMove}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        {layers.roads && layers.basemap === 'satellite' && (
          <Source
            type="raster"
            tiles={['https://tile.openstreetmap.org/{z}/{x}/{y}.png']}
            tileSize={256}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          >
            <MapLayer type="raster" paint={{ 'raster-opacity': 0.55 }} />
          </Source>
        )}
        <DeckGLOverlay layers={deckLayers} />
      </Map>

      {/* Right-side panel column — LayerPanel + fit button + species legend share the same width and anchor */}
      {showLayerPanel && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {quadrats.length > 0 && (
            <button
              onClick={() => {
                if (!mapRef.current) return
                const lons = quadrats.map((q) => q.longitude).filter((v): v is number => v != null)
                const lats = quadrats.map((q) => q.latitude).filter((v): v is number => v != null)
                if (!lons.length) return
                mapRef.current.fitBounds(
                  [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
                  { padding: 80, duration: 800, maxZoom: 14 },
                )
              }}
              className="w-56 py-1.5 rounded-lg bg-slate-900/95 backdrop-blur-sm border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg transition-colors"
            >
              Fit to results ({quadrats.length})
            </button>
          )}
          <LayerPanel
            layers={layers}
            onSetBasemap={actions.setBasemap}
            onToggleHillshade={actions.toggleHillshade}
            onToggleRoads={actions.toggleRoads}
            onToggleBoundary={actions.toggleBoundary}
            onSetProvincesOpacity={actions.setProvincesOpacity}
            onToggleQuadratPoints={actions.toggleQuadratPoints}
            onToggleHeatmap={actions.toggleHeatmap}
            onSetClumpSizeMetric={actions.setClumpSizeMetric}
          />
          {visibleSpecies.length > 0 && (
            <div className="w-56 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl px-3 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Species</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {visibleSpecies.map((name) => {
                  const [r, g, b] = getSpeciesColor(name)
                  const common = speciesCommonName[name]
                  return (
                    <div key={name} className="flex items-start gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs italic text-slate-300 truncate leading-tight" title={name}>{name}</p>
                        {common && <p className="text-xs text-slate-500 truncate leading-tight">{common}</p>}
                      </div>
                      {speciesCount[name] != null && (
                        <span className="flex-shrink-0 text-[10px] font-medium text-slate-400 bg-slate-800 rounded px-1 py-0.5 leading-none mt-0.5">
                          {speciesCount[name]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tooltip && <MapTooltip info={tooltip} />}
    </div>
  )
}
