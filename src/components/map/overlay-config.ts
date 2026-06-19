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
