export interface DroneFlightConfig {
  id: string
  name: string
  /** XYZ tile URL template — empty string means not yet hosted */
  tiles: string
}

/**
 * Bamboo distribution raster from AI/ML model.
 * Set NEXT_PUBLIC_BAMBOO_DIST_TILES to an XYZ tile URL template, e.g.:
 *   https://tiles.example.com/bamboo-dist/{z}/{x}/{y}.png
 */
export const BAMBOO_DIST_TILES = process.env.NEXT_PUBLIC_BAMBOO_DIST_TILES ?? ''

/**
 * Drone orthophoto surveys. Each entry maps to a NEXT_PUBLIC env var.
 * Add entries here as new flights are processed and hosted.
 */
export const DRONE_FLIGHTS: DroneFlightConfig[] = [
  {
    id: 'nabua-camsur-2024',
    name: 'Nabua, Cam. Sur (Nov 2024)',
    tiles: process.env.NEXT_PUBLIC_DRONE_TILES_NABUA ?? '',
  },
  {
    id: 'sallapadan-abra-2024',
    name: 'Sallapadan, Abra (Dec 2024)',
    tiles: process.env.NEXT_PUBLIC_DRONE_TILES_ABRA ?? '',
  },
  {
    id: 'losbanios-laguna-2025',
    name: 'Los Baños, Laguna (Mar 2025)',
    tiles: process.env.NEXT_PUBLIC_DRONE_TILES_LB ?? '',
  },
]

export interface SurveyMapConfig {
  id: string
  name: string
  /** Path to a WGS84 TopoJSON in /public (expanded to GeoJSON in the browser). */
  path: string
}

/**
 * Bamboo survey maps (semifinal): per-municipality classification polygons,
 * converted from shapefiles to simplified TopoJSON. Loaded lazily — only when
 * a layer is toggled on.
 */
export const SURVEY_MAPS: SurveyMapConfig[] = [
  { id: 'abra',    name: 'Abra (Y3)',           path: '/geodata/survey-maps/abra.topojson' },
  { id: 'camsur',  name: 'Camarines Sur (Y3)',  path: '/geodata/survey-maps/camsur.topojson' },
  { id: 'cavite',  name: 'Cavite (Y1)',         path: '/geodata/survey-maps/cavite.topojson' },
  { id: 'palawan', name: 'Palawan (Y3)',        path: '/geodata/survey-maps/palawan.topojson' },
  { id: 'tarlac',  name: 'Tarlac (Y3)',         path: '/geodata/survey-maps/tarlac.topojson' },
]
