'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Map, { NavigationControl, ScaleControl, Source, Layer as MapLayer, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import type { Layer } from '@deck.gl/core'
import { DeckGLOverlay } from './DeckGLOverlay'
import { LayerPanel } from './LayerPanel'
import { useMapLayers } from './use-map-layers'
import { BAMBOO_DIST_TILES, DRONE_FLIGHTS, SURVEY_MAPS, SURVEY_MAPS_PMTILES } from './overlay-config'
import {
  makeQuadratDotsLayer,
  makeQuadratSquaresLayer,
  makeClumpPointsLayer,
  makeHeatmapLayer,
  makeProvinceFillLayer,
  makeRegionOutlineLayer,
  makeMunicipalityOutlineLayer,

  makeDroneVideoLayer,
  getSpeciesColor,
} from './deck-layers'
import type { PublicClump, PublicQuadrat } from '@/lib/types'
import type { DateRange } from './StatsFilterPanel'
import { mapVideos, type DroneVideo } from '@/components/video/drone-videos'
import { VideoLightbox } from '@/components/video/VideoLightbox'

// ─── Basemap style URLs ───────────────────────────────────────────────────────

const MAP_STYLES = {
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  // Muted light-grey minimal style — keeps data overlays (survey maps) prominent.
  plain: 'https://tiles.openfreemap.org/styles/positron',
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

// The OSM streets basemap (OpenFreeMap Liberty) renders a "South China Sea" marine
// label from the OpenMapTiles `water_name` layer. We suppress just that one label,
// keeping every lake and other sea name intact.
const HIDDEN_SEA_LABEL = 'South China Sea'
const SEA_LABEL_LAYER = 'water_name_point_label'
// Original geometry filter, AND-ed with "name is not the hidden label".
const SEA_LABEL_FILTER = [
  'all',
  ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
  ['!=', ['coalesce', ['get', 'name_en'], ['get', 'name'], ['get', 'name:latin'], ''], HIDDEN_SEA_LABEL],
] as unknown as import('maplibre-gl').FilterSpecification

// Replacement label placed where the hidden "South China Sea" name used to sit —
// in the Philippines' exclusive economic zone west of Luzon.
const WPS_SOURCE = 'wps-label'
const WPS_LAYER_ID = 'wps-label-symbol'
const WPS_LABEL_GEOJSON: import('geojson').FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [117.2, 15.2] }, properties: {} },
  ],
}
// Styled to mirror the OpenMapTiles marine label it replaces (italic slate-blue).
const WPS_LAYER: import('maplibre-gl').LayerSpecification = {
  id: WPS_LAYER_ID,
  type: 'symbol',
  source: WPS_SOURCE,
  layout: {
    'text-field': 'West Philippine Sea',
    'text-font': ['Noto Sans Italic'],
    'text-letter-spacing': 0.2,
    'text-max-width': 6,
    'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 8, 15],
  },
  paint: {
    'text-color': '#495e91',
    'text-halo-color': 'rgba(255,255,255,0.7)',
    'text-halo-width': 1.5,
  },
} as unknown as import('maplibre-gl').LayerSpecification

// ─── Survey map styling ──────────────────────────────────────────────────────

const SURVEY_SOURCE = 'survey-maps'
// Emerald fill matching the deck.gl layer this replaced. The old layer combined a
// 160/255 fill alpha with the opacity slider, so fold that constant in here to
// keep the slider's range looking the same.
const SURVEY_FILL_ALPHA = 160 / 255

// PMTiles serves MVT over range requests via a custom MapLibre protocol, which is
// global rather than per-map — registering it twice throws, so guard it.
let pmtilesRegistered = false
function registerPMTilesProtocol() {
  if (pmtilesRegistered) return
  maplibregl.addProtocol('pmtiles', new Protocol().tile)
  pmtilesRegistered = true
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

export interface BritemapGLHandle {
  getMapImage: () => string | null
}

export interface BritemapGLProps {
  quadrats: PublicQuadrat[]
  clumps?: PublicClump[]
  speciesFilter?: string[]
  dateRange?: DateRange
  quadratCountByProvince?: Record<string, number>
  provincesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  regionsGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  municipalitiesGeoJSON?: { type: 'FeatureCollection'; features: unknown[] }
  onQuadratClick?: (quadrat: PublicQuadrat) => void
  onVisibleCountChange?: (count: number) => void
  flyToTarget?: { latitude: number; longitude: number }
  showLayerPanel?: boolean
  visibleSpecies?: string[]
  speciesCommonName?: Record<string, string>
  speciesCount?: Record<string, number>
  className?: string
}

export const BritemapGL = forwardRef<BritemapGLHandle, BritemapGLProps>(function BritemapGL({
  quadrats,
  clumps = [],
  speciesFilter = [],
  dateRange = { from: null, to: null },
  quadratCountByProvince = {},
  provincesGeoJSON,
  regionsGeoJSON,
  municipalitiesGeoJSON,
  onQuadratClick,
  onVisibleCountChange,
  flyToTarget,
  showLayerPanel = true,
  visibleSpecies = [],
  speciesCommonName = {},
  speciesCount = {},
  className = 'w-full h-full',
}: BritemapGLProps, ref) {
  const { layers, ...actions } = useMapLayers()
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [zoom, setZoom] = useState(5.5)
  const [activeVideo, setActiveVideo] = useState<DroneVideo | null>(null)
  const mapRef = useRef<MapRef | null>(null)

  // Geolocated, uploaded videos — static config, computed once
  const videoMarkers = useMemo(() => mapVideos(), [])

  // Must run before the map requests any pmtiles:// URL.
  registerPMTilesProtocol()

  const anySurveyMapOn = SURVEY_MAPS.some((m) => layers.overlays.surveyMaps[m.id])

  useImperativeHandle(ref, () => ({
    getMapImage: () => mapRef.current?.getCanvas()?.toDataURL('image/png') ?? null,
  }))

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo({
      center: [flyToTarget.longitude, flyToTarget.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 900,
      essential: true,
    })
  }, [flyToTarget])

  // On the OSM vector basemaps (streets / plain), hide the OSM "South China Sea"
  // label and drop in a "West Philippine Sea" label in its place. Re-applied on
  // every styledata event because switching basemaps calls setStyle(), which
  // resets the style (and any runtime override) back to the shipped default.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || (layers.basemap !== 'streets' && layers.basemap !== 'plain')) return

    const apply = () => {
      // Wait until the streets style (which owns the marine label layer) is loaded.
      if (!map.getLayer(SEA_LABEL_LAYER)) return

      // Hide "South China Sea". The equality guard matters because setFilter/addLayer
      // themselves fire styledata — without it this handler would loop forever.
      if (JSON.stringify(map.getFilter(SEA_LABEL_LAYER)) !== JSON.stringify(SEA_LABEL_FILTER)) {
        map.setFilter(SEA_LABEL_LAYER, SEA_LABEL_FILTER)
      }

      // Add the replacement "West Philippine Sea" label once per style load.
      if (!map.getSource(WPS_SOURCE)) {
        map.addSource(WPS_SOURCE, { type: 'geojson', data: WPS_LABEL_GEOJSON })
      }
      if (!map.getLayer(WPS_LAYER_ID)) {
        map.addLayer(WPS_LAYER)
      }
    }

    apply()
    map.on('styledata', apply)
    return () => { map.off('styledata', apply) }
  }, [layers.basemap])

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
    // Survey maps are MapLibre vector layers now — see the <Source> below.
    if (layers.boundaries.regions && regionsGeoJSON) {
      result.push(makeRegionOutlineLayer(regionsGeoJSON as { type: 'FeatureCollection'; features: unknown[] }))
    }
    if (layers.boundaries.municipalities && municipalitiesGeoJSON) {
      result.push(makeMunicipalityOutlineLayer(municipalitiesGeoJSON as { type: 'FeatureCollection'; features: unknown[] }))
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

    // Drone video markers — always on top so the ▶ pins stay clickable
    if (layers.overlays.droneVideos && videoMarkers.length > 0) {
      result.push(makeDroneVideoLayer(videoMarkers, setActiveVideo))
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
    handleHover,
    handleClick,
    videoMarkers,
  ])

  const mapStyle = MAP_STYLES[layers.basemap]

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
        preserveDrawingBuffer
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        {/* Hillshade — raster-dem from AWS Terrarium tiles */}
        {layers.hillshade && (
          <>
            <Source
              id="hillshade-dem"
              type="raster-dem"
              tiles={['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']}
              tileSize={256}
              encoding="terrarium"
              maxzoom={15}
            />
            <MapLayer
              id="hillshade-layer"
              type="hillshade"
              source="hillshade-dem"
              paint={{
                'hillshade-exaggeration': 0.4,
                'hillshade-shadow-color': '#000000',
                'hillshade-highlight-color': '#ffffff',
                'hillshade-accent-color': '#000000',
              }}
            />
          </>
        )}

        {/* Bamboo survey maps — vector tiles read from a PMTiles archive over range
            requests. One source-layer per province; toggling a province mounts its
            fill layer rather than downloading anything province-specific. */}
        {anySurveyMapOn && (
          <Source id={SURVEY_SOURCE} type="vector" url={`pmtiles://${SURVEY_MAPS_PMTILES}`}>
            {SURVEY_MAPS.filter((m) => layers.overlays.surveyMaps[m.id]).map((m) => (
              <MapLayer
                key={m.id}
                id={`survey-map-${m.id}`}
                type="fill"
                source={SURVEY_SOURCE}
                source-layer={m.id}
                paint={{
                  'fill-color': '#10b981',
                  'fill-opacity': layers.overlays.surveyMapsOpacity * SURVEY_FILL_ALPHA,
                  'fill-outline-color': '#057857',
                }}
              />
            ))}
          </Source>
        )}

        {/* Bamboo distribution — AI/ML raster tiles (below data, above basemap) */}
        {layers.overlays.bambooDist && BAMBOO_DIST_TILES && (
          <Source type="raster" tiles={[BAMBOO_DIST_TILES]} tileSize={256}>
            <MapLayer type="raster" paint={{ 'raster-opacity': layers.overlays.bamboDistOpacity }} />
          </Source>
        )}

        {/* Drone orthophoto — selected flight tiles */}
        {layers.overlays.droneId && (() => {
          const flight = DRONE_FLIGHTS.find((f) => f.id === layers.overlays.droneId && f.tiles)
          return flight ? (
            <Source type="raster" tiles={[flight.tiles]} tileSize={256}>
              <MapLayer type="raster" paint={{ 'raster-opacity': layers.overlays.droneOpacity }} />
            </Source>
          ) : null
        })()}

        {/* Roads overlay — OSM on satellite only */}
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
            onToggleBambooDist={actions.toggleBambooDist}
            onSetBamboDistOpacity={actions.setBamboDistOpacity}
            onSetDroneId={actions.setDroneId}
            onSetDroneOpacity={actions.setDroneOpacity}
            onToggleDroneVideos={actions.toggleDroneVideos}
            onToggleSurveyMap={actions.toggleSurveyMap}
            onSetSurveyMapsOpacity={actions.setSurveyMapsOpacity}
          />
          {visibleSpecies.length > 0 && (
            <div className="w-56 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl px-3 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Species</p>
              <div className="relative">
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5" id="species-legend-scroll">
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
                {visibleSpecies.length > 6 && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/95 to-transparent rounded-b flex items-end justify-center pb-0.5">
                    <span className="text-[10px] text-slate-500">↕ scroll</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tooltip && <MapTooltip info={tooltip} />}

      {/* Drone video player — opens when a ▶ marker is clicked */}
      <VideoLightbox video={activeVideo} onClose={() => setActiveVideo(null)} />
    </div>
  )
})
