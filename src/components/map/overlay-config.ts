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
  /** Also the vector-tile source-layer name inside the PMTiles archive. */
  id: string
  name: string
}

/**
 * PMTiles archive holding every survey map as its own vector-tile layer.
 * Defaults to the copy in /public; point this at Blob/S3 to keep it out of the
 * deployment bundle. Range requests are required — the client reads the header
 * and only the tiles in view rather than the whole 17 MB file.
 */
export const SURVEY_MAPS_PMTILES =
  process.env.NEXT_PUBLIC_SURVEY_MAPS_PMTILES ?? '/geodata/survey-maps.pmtiles'

/**
 * Bamboo survey maps: per-municipality classification polygons, tiled from the
 * source shapefiles with tippecanoe (z4–z14, --simplification=10). Simplification
 * only affects the drawn outline — `area_ha` rides along as a tile attribute and
 * still reflects the surveyed figure.
 */
export const SURVEY_MAPS: SurveyMapConfig[] = [
  { id: 'abra',    name: 'Abra (Y3)' },
  { id: 'camsur',  name: 'Camarines Sur (Y3)' },
  { id: 'cavite',  name: 'Cavite (Y1)' },
  { id: 'palawan', name: 'Palawan (Y3)' },
  { id: 'tarlac',  name: 'Tarlac (Y3)' },
]
