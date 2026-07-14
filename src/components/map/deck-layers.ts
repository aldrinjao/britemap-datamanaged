import { PolygonLayer, ScatterplotLayer, GeoJsonLayer, IconLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { Layer } from '@deck.gl/core'
import type { FeatureCollection } from 'geojson'
import type { PublicClump, PublicQuadrat } from '@/lib/types'
import type { ClumpSizeMetric, LayerState } from './use-map-layers'
import type { DroneVideo } from '@/components/video/drone-videos'

// ─── Species palette ──────────────────────────────────────────────────────────

export const SPECIES_COLORS: Record<string, [number, number, number, number]> = {
  'Bambusa spinosa':    [34,  197,  94, 220],   // green
  'Bambusa vulgaris':   [245, 158,  11, 220],   // amber
  'Bambusa merrilliana':[99,  102, 241, 220],   // indigo
  'Gigantochloa levis': [244,  63,  94, 220],   // rose
  'Cyrtochloa puser':   [20,  184, 166, 220],   // teal
}

export const SPECIES_ORDER = [
  'Bambusa spinosa',
  'Bambusa vulgaris',
  'Bambusa merrilliana',
  'Gigantochloa levis',
  'Cyrtochloa puser',
]

const UNKNOWN_COLOR: [number, number, number, number] = [148, 163, 184, 200]

// Overflow palette for species beyond SPECIES_COLORS — assigned by stable name hash
const OVERFLOW_PALETTE: [number, number, number, number][] = [
  [249, 115,  22, 220], // orange
  [236,  72, 153, 220], // pink
  [139,  92, 246, 220], // violet
  [  6, 182, 212, 220], // cyan
  [239,  68,  68, 220], // red
  [168,  85, 247, 220], // purple
  [251, 191,  36, 220], // yellow
  [ 14, 165, 233, 220], // sky
  [ 52, 211, 153, 220], // emerald-light
  [248, 113, 113, 220], // rose
]

export function getSpeciesColor(name: string): [number, number, number, number] {
  if (SPECIES_COLORS[name]) return SPECIES_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return OVERFLOW_PALETTE[Math.abs(h) % OVERFLOW_PALETTE.length]
}

function speciesColor(name: string | undefined): [number, number, number, number] {
  if (!name) return UNKNOWN_COLOR
  return getSpeciesColor(name)
}

// ─── Quadrat centroid dots (low-zoom fallback) ────────────────────────────────

export function makeQuadratDotsLayer(data: PublicQuadrat[]): Layer {
  const visible = data.filter((q) => q.latitude != null && q.longitude != null)

  return new ScatterplotLayer<PublicQuadrat>({
    id: 'quadrat-dots',
    data: visible,
    getPosition: (d) => [d.longitude!, d.latitude!],
    getFillColor: (d) => speciesColor(d.dominantSpecies),
    getRadius: 8,
    radiusUnits: 'pixels',
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    pickable: false,
    updateTriggers: {
      getFillColor: [data.map((d) => d.dominantSpecies).join()],
    },
  })
}

// ─── 30 m × 30 m quadrat squares ─────────────────────────────────────────────

// Half-side of the 30 m × 30 m survey quadrat in meters.
const HALF_M = 15

function quadratPolygon(lat: number, lon: number): [number, number][] {
  const dLat = HALF_M / 111_111
  const dLon = HALF_M / (111_111 * Math.cos((lat * Math.PI) / 180))
  return [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
  ]
}

export function makeQuadratSquaresLayer(
  data: PublicQuadrat[],
  onHover: (info: { object?: PublicQuadrat | null; x: number; y: number }) => void,
  onClick: (info: { object?: PublicQuadrat | null }) => void,
): Layer {
  const visible = data.filter((q) => q.latitude != null && q.longitude != null)

  return new PolygonLayer<PublicQuadrat>({
    id: 'quadrat-squares',
    data: visible,
    getPolygon: (d) => quadratPolygon(d.latitude!, d.longitude!),
    getFillColor: (d) => {
      const [r, g, b] = speciesColor(d.dominantSpecies)
      return [r, g, b, 90]  // semi-transparent fill
    },
    getLineColor: (d) => speciesColor(d.dominantSpecies),
    getLineWidth: 2,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 4,
    filled: true,
    stroked: true,
    pickable: true,
    onHover: onHover as (info: object) => void,
    onClick: onClick as (info: object) => void,
    updateTriggers: {
      getFillColor: [data.map((d) => d.dominantSpecies).join()],
      getLineColor: [data.map((d) => d.dominantSpecies).join()],
    },
  })
}

// ─── Individual clump dots ────────────────────────────────────────────────────

export function makeClumpPointsLayer(clumps: PublicClump[], sizeMetric: ClumpSizeMetric = 'diameter'): Layer {
  const visible = clumps.filter((c) => c.latitude != null && c.longitude != null)

  // Both metrics use a 0.3× multiplier so the circle approximates the clump footprint radius in metres.
  // Diameter (cm DBH) and height (m) are on different scales: height is divided by 10 first.
  const getRadius = sizeMetric === 'diameter'
    ? (d: PublicClump) => (d.averageDiameterCm ?? 5) * 0.3
    : (d: PublicClump) => (d.averageHeightMeters ?? 5) / 10 * 3

  return new ScatterplotLayer<PublicClump>({
    id: 'clump-points',
    data: visible,
    getPosition: (d) => [d.longitude!, d.latitude!],
    getColor: (d) => speciesColor(d.scientificName),
    getRadius,
    radiusUnits: 'meters',
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
    pickable: false,
    updateTriggers: {
      getRadius: [sizeMetric, clumps.map((c) => c.averageDiameterCm).join(), clumps.map((c) => c.averageHeightMeters).join()],
    },
  })
}

// ─── Heatmap (per-clump, not per-centroid) ────────────────────────────────────

export function makeHeatmapLayer(data: PublicClump[]): Layer {
  const visible = data.filter((c) => c.latitude != null && c.longitude != null)

  return new HeatmapLayer<PublicClump>({
    id: 'quadrat-heatmap',
    data: visible,
    getPosition: (d) => [d.longitude!, d.latitude!],
    getWeight: 1,
    radiusPixels: 50,
    intensity: 1,
    threshold: 0.05,
    colorRange: [
      [65,  182, 196, 255],
      [127, 205, 187, 255],
      [199, 233, 180, 255],
      [255, 237, 160, 255],
      [253, 141,  60, 255],
      [227,  26,  28, 255],
    ],
  })
}

// ─── Province choropleth ──────────────────────────────────────────────────────

export interface ProvinceProperties {
  PSGC: string
  name: string
  quadratCount?: number
}

export interface ProvinceFeature {
  type: 'Feature'
  properties: ProvinceProperties
  geometry: { type: string; coordinates: unknown }
}

// Provinces deliberately excluded from the choropleth highlight (geojson PSGC).
// Rendered as no-data so they blend in with the rest of the country.
const PROVINCE_FILL_EXCLUDED = new Set<string>([
  '501700000', // Camarines Sur
  '306900000', // Tarlac
  '1400100000', // Abra
])

export function makeProvinceFillLayer(
  geojson: { type: 'FeatureCollection'; features: ProvinceFeature[] },
  opacity: number,
  quadratCountByProvince: Record<string, number>,
): Layer {
  const maxCount = Math.max(1, ...Object.values(quadratCountByProvince))

  return new GeoJsonLayer<ProvinceProperties>({
    id: 'province-fill',
    data: geojson as unknown as FeatureCollection,
    filled: true,
    stroked: true,
    getFillColor: (f) => {
      const count = PROVINCE_FILL_EXCLUDED.has(f.properties.PSGC)
        ? 0
        : quadratCountByProvince[f.properties.PSGC] ?? 0
      const t = count / maxCount
      return [
        Math.round(255 - t * 180),
        Math.round(255 - t * 130),
        255,
        Math.round(opacity * 255),
      ]
    },
    getLineColor: [100, 116, 139, 200],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    pickable: true,
    updateTriggers: {
      getFillColor: [quadratCountByProvince, opacity],
    },
  })
}

export function makeRegionOutlineLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
): Layer {
  return new GeoJsonLayer({
    id: 'region-outline',
    data: geojson as unknown as FeatureCollection,
    filled: false,
    stroked: true,
    getLineColor: [30, 58, 138, 255],
    getLineWidth: 2,
    lineWidthMinPixels: 2,
  })
}

export function makeMunicipalityOutlineLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
): Layer {
  return new GeoJsonLayer({
    id: 'municipality-outline',
    data: geojson as unknown as FeatureCollection,
    filled: false,
    stroked: true,
    getLineColor: [148, 163, 184, 180],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
  })
}

// ─── Active-filter highlight layers ──────────────────────────────────────────

const HIGHLIGHT: [number, number, number] = [16, 185, 129] // emerald-500

function highlightLayer(
  id: string,
  features: unknown[],
  fillAlpha: number,
): Layer {
  return new GeoJsonLayer({
    id,
    data: { type: 'FeatureCollection', features } as unknown as FeatureCollection,
    filled: true,
    stroked: true,
    getFillColor: [...HIGHLIGHT, fillAlpha] as [number, number, number, number],
    getLineColor: [...HIGHLIGHT, 230] as [number, number, number, number],
    getLineWidth: 3,
    lineWidthMinPixels: 2,
  })
}

export function makeRegionHighlightLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
  name: string,
): Layer {
  const features = (geojson.features as { properties: Record<string, unknown> }[])
    .filter((f) => f.properties.adm1_en === name)
  return highlightLayer('region-highlight', features, 30)
}

export function makeProvinceHighlightLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
  name: string,
): Layer {
  const lower = name.toLowerCase()
  const features = (geojson.features as { properties: Record<string, unknown> }[])
    .filter((f) => String(f.properties.adm2_en).toLowerCase().includes(lower))
  return highlightLayer('province-highlight', features, 50)
}

export function makeMunicipalityHighlightLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
  name: string,
): Layer {
  const lower = name.toLowerCase()
  const features = (geojson.features as { properties: Record<string, unknown> }[])
    .filter((f) => String(f.properties.adm3_en).toLowerCase().includes(lower))
  return highlightLayer('municipality-highlight', features, 60)
}

// ─── Bamboo survey maps (semifinal classification polygons) ──────────────────

export function makeSurveyMapLayer(id: string, geojson: FeatureCollection, opacity: number): Layer {
  return new GeoJsonLayer({
    id: `survey-map-${id}`,
    data: geojson,
    filled: true,
    stroked: true,
    getFillColor: [16, 185, 129, 160],   // emerald — layer opacity scales this
    getLineColor: [5, 120, 87, 230],
    getLineWidth: 1,
    lineWidthMinPixels: 0.4,
    opacity,
    pickable: false,
  })
}

// ─── Drone video markers ──────────────────────────────────────────────────────

// Red teardrop pin with a white play triangle — reads instantly as "video here".
// encodeURIComponent (not btoa) keeps this SSR-safe.
const VIDEO_MARKER_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">` +
  `<path d="M24 0C10.7 0 0 10.7 0 24c0 16.6 24 36 24 36s24-19.4 24-36C48 10.7 37.3 0 24 0z" fill="#dc2626"/>` +
  `<circle cx="24" cy="24" r="14" fill="#ffffff"/>` +
  `<path d="M20 16l12 8-12 8z" fill="#dc2626"/>` +
  `</svg>`

const VIDEO_ICON_URL = `data:image/svg+xml,${encodeURIComponent(VIDEO_MARKER_SVG)}`

export function makeDroneVideoLayer(
  videos: DroneVideo[],
  onClick: (video: DroneVideo) => void,
): Layer {
  return new IconLayer<DroneVideo>({
    id: 'drone-videos',
    data: videos,
    getPosition: (d) => [d.lng!, d.lat!],
    getIcon: () => ({ url: VIDEO_ICON_URL, width: 48, height: 60, anchorY: 60 }),
    getSize: 42,
    sizeUnits: 'pixels',
    pickable: true,
    onClick: (info) => {
      if (info.object) onClick(info.object as DroneVideo)
    },
  })
}
