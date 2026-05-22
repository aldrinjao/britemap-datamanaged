'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Layer } from '@deck.gl/core'
import { DeckGLOverlay } from './DeckGLOverlay'
import { LayerPanel } from './LayerPanel'
import { useMapLayers } from './use-map-layers'
import {
  makeQuadratPointsLayer,
  makeHeatmapLayer,
  makeProvinceFillLayer,
  makeRegionOutlineLayer,
  makeMunicipalityOutlineLayer,
  makeBarangayOutlineLayer,
} from './deck-layers'
import type { PublicQuadrat } from '@/lib/types'

// ─── Basemap style URLs ───────────────────────────────────────────────────────

const MAP_STYLES = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  satellite: {
    version: 8 as const,
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        // ESRI World Imagery — free, attribution required
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'satellite-tiles', type: 'raster' as const, source: 'esri-satellite' }],
  },
}

// ─── GeoJSON boundary paths (must be placed in /public/geodata/) ──────────────
// Source: Convert PSA PSGC shapefiles to GeoJSON and place at these paths.
// Each feature needs: properties.PSGC (matches API provinceCode)

const GEODATA = {
  provinces: '/geodata/provinces.geojson',
  regions: '/geodata/regions.geojson',
  municipalities: '/geodata/municipalities.geojson',
  barangays: '/geodata/barangays.geojson',
}

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
  quadratCountByProvince?: Record<string, number>
  // Pass pre-fetched GeoJSON or leave undefined to skip that layer
  provincesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  regionsGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  municipalitiesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  barangaysGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  availableSpecies?: string[]
  onQuadratClick?: (quadrat: PublicQuadrat) => void
  onVisibleCountChange?: (count: number) => void
  // Show the layer panel (default true)
  showLayerPanel?: boolean
  className?: string
}

export function BritemapGL({
  quadrats,
  quadratCountByProvince = {},
  provincesGeoJSON,
  regionsGeoJSON,
  municipalitiesGeoJSON,
  barangaysGeoJSON,
  availableSpecies = [],
  onQuadratClick,
  onVisibleCountChange,
  showLayerPanel = true,
  className = 'w-full h-full',
}: BritemapGLProps) {
  const { layers, ...actions } = useMapLayers()
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

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

  // Apply species + date filters to quadrat data
  const filteredQuadrats = useMemo(() => {
    let result = quadrats
    if (layers.data.speciesFilter.length > 0) {
      // Species data is in the detail endpoint; for the list we can only filter
      // by what's available on the summary. Skip if no species data on items.
      result = result.filter((q) => {
        const qWithSpecies = q as PublicQuadrat & { speciesSummary?: Array<{ scientificName: string }> }
        if (!qWithSpecies.speciesSummary) return true
        return qWithSpecies.speciesSummary.some((s) => layers.data.speciesFilter.includes(s.scientificName))
      })
    }
    if (layers.dateRange.from) {
      const from = new Date(layers.dateRange.from).getTime()
      result = result.filter((q) => q.approvedAt >= from)
    }
    if (layers.dateRange.to) {
      const to = new Date(layers.dateRange.to).getTime() + 86_400_000 // inclusive end of day
      result = result.filter((q) => q.approvedAt <= to)
    }
    return result
  }, [quadrats, layers.data.speciesFilter, layers.dateRange])

  useEffect(() => {
    onVisibleCountChange?.(filteredQuadrats.length)
  }, [filteredQuadrats.length, onVisibleCountChange])

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
    if (layers.boundaries.barangays && barangaysGeoJSON) {
      result.push(makeBarangayOutlineLayer(barangaysGeoJSON as { type: 'FeatureCollection'; features: unknown[] }))
    }
    if (layers.data.heatmap) {
      result.push(makeHeatmapLayer(filteredQuadrats))
    }
    if (layers.data.quadratPoints) {
      result.push(
        makeQuadratPointsLayer(filteredQuadrats, layers.data, handleHover as Parameters<typeof makeQuadratPointsLayer>[2], handleClick as Parameters<typeof makeQuadratPointsLayer>[3]),
      )
    }

    return result
  }, [
    layers,
    filteredQuadrats,
    provincesGeoJSON,
    regionsGeoJSON,
    municipalitiesGeoJSON,
    barangaysGeoJSON,
    quadratCountByProvince,
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
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        <DeckGLOverlay layers={deckLayers} />
      </Map>

      {showLayerPanel && (
        <LayerPanel
          layers={layers}
          availableSpecies={availableSpecies}
          onSetBasemap={actions.setBasemap}
          onToggleHillshade={actions.toggleHillshade}
          onToggleBoundary={actions.toggleBoundary}
          onSetProvincesOpacity={actions.setProvincesOpacity}
          onToggleQuadratPoints={actions.toggleQuadratPoints}
          onSetClusterMode={actions.setClusterMode}
          onToggleHeatmap={actions.toggleHeatmap}
          onToggleColorByStatus={actions.toggleColorByStatus}
          onSetSpeciesFilter={actions.setSpeciesFilter}
          onSetDateRange={actions.setDateRange}
        />
      )}

      {tooltip && <MapTooltip info={tooltip} />}
    </div>
  )
}
