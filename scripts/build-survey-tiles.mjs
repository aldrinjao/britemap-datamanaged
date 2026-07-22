#!/usr/bin/env node
/**
 * Rebuilds public/geodata/survey-maps.pmtiles from the raw survey shapefile
 * exports in map_assets/.
 *
 *   npm run build:survey-tiles
 *
 * map_assets/ is gitignored — the tiled archive is the tracked artifact, not its
 * inputs. You need a local copy of the raw exports to run this.
 *
 * Requires tippecanoe (`brew install tippecanoe`).
 *
 * Why tiles rather than the TopoJSON these replaced: the survey maps are
 * raster-derived, so a handful of features carry an enormous number of vertices
 * (Palawan is 18 municipalities and 1.38M points). Shipping them whole meant
 * downloading ~8 MB gzipped and triangulating ~2.9M vertices to paint provinces
 * a few hundred pixels wide at the map's default zoom. Tiled, the same view
 * costs 17-55 KB.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { feature } from 'topojson-client'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/geodata/survey-maps.pmtiles')

/**
 * Layer id → source file under map_assets/. The id becomes the vector-tile
 * source-layer name, so it must match the ids in SURVEY_MAPS
 * (src/components/map/overlay-config.ts).
 */
const SOURCES = {
  abra:    'CAR - Abra/Abra_SemifinalMap-Y3.topojson',
  camsur:  'Region V - Camarines Sur/Camsur_SemifinalMap-Y3.topojson',
  cavite:  'Region IV-A - Cavite/Cavite_SemifinalMap-Y1.topojson',
  palawan: 'Region IV-B - Palawan/Palawan_SemifinalMap-Y3.topojson',
  tarlac:  'Region III - Tarlac/Tarlac_SemifinalMap-Y3.topojson',
}

/**
 * --simplification=10 halves every tile with no loss of coverage: measured
 * against the default, it keeps the identical municipality count at every zoom
 * (71/77/79 of 81 at z6/z8/z10 — the shortfall is tippecanoe's default
 * tiny-polygon reduction, present either way).
 *
 * Do not add --tiny-polygon-size. At 6 it buys another 2x but silently drops 21
 * of 81 municipalities at z6, which on an extent map reads as "no bamboo here".
 */
const TIPPECANOE_ARGS = [
  '-Z4', '-z14',
  '--simplification=10',
  '--force',
  '--name=BRITEMAP bamboo survey maps',
]

function requireTippecanoe() {
  try {
    execFileSync('tippecanoe', ['--version'], { stdio: 'ignore' })
  } catch {
    console.error('tippecanoe not found. Install it with:\n\n  brew install tippecanoe\n')
    process.exit(1)
  }
}

/**
 * Expand a TopoJSON to GeoJSON, normalising the per-province property names.
 * The source exports disagree: Abra uses "Area (ha)", Camarines Sur "area_sq",
 * Palawan and Tarlac "area_sqm" alongside "area_ha". Only adm3_en and area_ha
 * are carried into the tiles.
 */
function toGeoJSON(srcPath) {
  const topo = JSON.parse(readFileSync(srcPath, 'utf8'))
  const key = Object.keys(topo.objects)[0]
  // The object is a GeometryCollection, so this returns a FeatureCollection at
  // runtime even though the typed overload narrows to Feature.
  const fc = feature(topo, topo.objects[key])

  for (const f of fc.features) {
    const p = f.properties ?? {}
    f.properties = {
      adm3_en: p.ADM3_EN ?? null,
      area_ha: p['Area (ha)'] ?? p.area_ha ?? null,
    }
  }
  return fc
}

function mb(path) {
  return (statSync(path).size / 1048576).toFixed(1) + ' MB'
}

requireTippecanoe()

const work = mkdtempSync(join(tmpdir(), 'survey-tiles-'))
try {
  const layerArgs = []

  for (const [id, rel] of Object.entries(SOURCES)) {
    const src = join(ROOT, 'map_assets', rel)
    try {
      statSync(src)
    } catch {
      console.error(`Missing source: map_assets/${rel}`)
      console.error('map_assets/ is gitignored — you need a local copy of the raw survey exports.')
      process.exit(1)
    }

    const dst = join(work, `${id}.geojson`)
    const fc = toGeoJSON(src)
    writeFileSync(dst, JSON.stringify(fc))
    console.log(`  ${id.padEnd(9)} ${String(fc.features.length).padStart(3)} municipalities  ${mb(dst)}`)
    layerArgs.push('-L', `${id}:${dst}`)
  }

  console.log('\ntiling...')
  execFileSync('tippecanoe', ['-o', OUT, ...TIPPECANOE_ARGS, ...layerArgs], { stdio: 'inherit' })
  console.log(`\nwrote public/geodata/survey-maps.pmtiles (${mb(OUT)})`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
