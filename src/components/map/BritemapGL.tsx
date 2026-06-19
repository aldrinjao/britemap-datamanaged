'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
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
const SQUARE_ZOOM_THRESHOLD = 12   // below: centroid dots; at/above: 30m squares
const CLUMP_ZOOM_THRESHOLD  = 14   // at/above: individual clump dots

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
  showLayerPanel?: boolean
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
  showLayerPanel = true,
  className = 'w-full h-full',
}: BritemapGLProps) {
  const { layers, ...actions } = useMapLayers()
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [zoom, setZoom] = useState(5.5)

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
        initialViewState={{ longitude: 122.0, latitude: 12.5, zoom: 5.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle as string}
        attributionControl={false}
        minZoom={5}
        onMove={handleMove}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        <DeckGLOverlay layers={deckLayers} />
      </Map>

      {showLayerPanel && (
        <LayerPanel
          layers={layers}
          onSetBasemap={actions.setBasemap}
          onToggleHillshade={actions.toggleHillshade}
          onToggleBoundary={actions.toggleBoundary}
          onSetProvincesOpacity={actions.setProvincesOpacity}
          onToggleQuadratPoints={actions.toggleQuadratPoints}
          onSetClusterMode={actions.setClusterMode}
          onToggleHeatmap={actions.toggleHeatmap}
          onSetClumpSizeMetric={actions.setClumpSizeMetric}
        />
      )}

      {tooltip && <MapTooltip info={tooltip} />}
    </div>
  )
}
