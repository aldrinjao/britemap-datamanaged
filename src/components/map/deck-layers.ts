import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { Layer } from '@deck.gl/core'
import type { FeatureCollection } from 'geojson'
import type { PublicQuadrat } from '@/lib/types'
import type { LayerState } from './use-map-layers'

// RGBA tuples for each verification state
const STATE_COLOR: Record<string, [number, number, number, number]> = {
  submitted: [234, 179, 8, 210],
  under_review: [59, 130, 246, 210],
  returned_for_revisions: [249, 115, 22, 210],
  approved: [34, 197, 94, 210],
  abandoned: [107, 114, 128, 180],
}
const DEFAULT_COLOR: [number, number, number, number] = [34, 197, 94, 210]

// ─── Quadrat scatter ──────────────────────────────────────────────────────────

export function makeQuadratPointsLayer(
  data: PublicQuadrat[],
  layerState: LayerState['data'],
  onHover: (info: { object?: PublicQuadrat | null }) => void,
  onClick: (info: { object?: PublicQuadrat | null }) => void,
): Layer {
  const visible = data.filter((q) => q.latitude != null && q.longitude != null)

  return new ScatterplotLayer<PublicQuadrat>({
    id: 'quadrat-points',
    data: visible,
    getPosition: (d) => [d.longitude!, d.latitude!],
    getColor: layerState.colorByStatus
      ? (d) => STATE_COLOR[(d as PublicQuadrat & { state?: string }).state ?? 'approved'] ?? DEFAULT_COLOR
      : DEFAULT_COLOR,
    getRadius: 400,
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
    onHover: onHover as (info: object) => void,
    onClick: onClick as (info: object) => void,
    updateTriggers: {
      getColor: layerState.colorByStatus,
    },
  })
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export function makeHeatmapLayer(data: PublicQuadrat[]): Layer {
  const visible = data.filter((q) => q.latitude != null && q.longitude != null)

  return new HeatmapLayer<PublicQuadrat>({
    id: 'quadrat-heatmap',
    data: visible,
    getPosition: (d) => [d.longitude!, d.latitude!],
    getWeight: 1,
    radiusPixels: 50,
    intensity: 1,
    threshold: 0.05,
    colorRange: [
      [65, 182, 196, 255],
      [127, 205, 187, 255],
      [199, 233, 180, 255],
      [255, 237, 160, 255],
      [253, 141, 60, 255],
      [227, 26, 28, 255],
    ],
  })
}

// ─── Province choropleth ──────────────────────────────────────────────────────
// Data comes from a local GeoJSON file that must be placed at:
//   public/geodata/provinces.geojson
//
// Source: Philippine Statistics Authority PSGC shapefiles converted to GeoJSON.
// Each feature must have a `properties.PSGC` (or `properties.provinceCode`) field
// that matches the API's provinceCode values.

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
      const count = quadratCountByProvince[f.properties.PSGC] ?? 0
      const t = count / maxCount
      // Blue choropleth: white → dark blue
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

export function makeBarangayOutlineLayer(
  geojson: { type: 'FeatureCollection'; features: unknown[] },
): Layer {
  return new GeoJsonLayer({
    id: 'barangay-outline',
    data: geojson as unknown as FeatureCollection,
    filled: false,
    stroked: true,
    getLineColor: [203, 213, 225, 150],
    getLineWidth: 0.5,
    lineWidthMinPixels: 1,
  })
}
