import { jsPDF } from 'jspdf'
import type { PublicQuadrat, PublicClump } from '@/lib/types'
import type { MapFilters } from './StatsFilterPanel'
import { getSpeciesColor } from './deck-layers'

async function svgToDataURL(src: string, w: number, h: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function getImageDimensions(dataURL: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 16, h: 9 })
    img.src = dataURL
  })
}

function computeStats(quadrats: PublicQuadrat[], clumps: PublicClump[]) {
  const regions   = new Set(quadrats.map((q) => q.region))
  const provinces = new Set(quadrats.map((q) => q.province))
  const munis     = new Set(quadrats.map((q) => q.municipality))
  const barangays = new Set(quadrats.map((q) => q.barangay))

  const ts = quadrats.map((q) => q.approvedAt).filter(Boolean)
  const earliest = ts.length ? Math.min(...ts) : null
  const latest   = ts.length ? Math.max(...ts) : null

  const speciesMap: Record<string, number> = {}
  for (const c of clumps) speciesMap[c.scientificName] = (speciesMap[c.scientificName] ?? 0) + 1
  const speciesList = Object.entries(speciesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      pct: clumps.length > 0 ? (count / clumps.length) * 100 : 0,
    }))

  return {
    n:           quadrats.length,
    totalClumps: quadrats.reduce((s, q) => s + q.clumpCount, 0),
    totalPhotos: quadrats.reduce((s, q) => s + q.photoCount, 0),
    regions:     regions.size,
    provinces:   provinces.size,
    munis:       munis.size,
    barangays:   barangays.size,
    earliest,
    latest,
    speciesList,
  }
}

export async function exportMapPDF(opts: {
  mapImage: string | null
  filteredQuadrats: PublicQuadrat[]
  displayedClumps: PublicClump[]
  filters: MapFilters
  speciesFilter: string[]
}) {
  const { mapImage, filteredQuadrats, displayedClumps, filters, speciesFilter } = opts
  const stats = computeStats(filteredQuadrats, displayedClumps)

  const [logoDataURL, pcaLogoURL, upLogoURL, imgDims] = await Promise.all([
    svgToDataURL('/logo.svg',           96, 96),
    svgToDataURL('/PCAARRD.svg',        96, 96),
    svgToDataURL('/UP_System_Logo.svg', 96, 96),
    mapImage ? getImageDimensions(mapImage) : Promise.resolve({ w: 16, h: 9 }),
  ])

  // Portrait A4
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const M  = 11

  type RGB = [number, number, number]
  const BG:      RGB = [248, 250, 252]
  const PANEL:   RGB = [255, 255, 255]
  const BORDER:  RGB = [203, 213, 225]
  const EMERALD: RGB = [5,   150, 105]
  const INK:     RGB = [15,  23,  42]
  const MUTED:   RGB = [71,  85,  105]
  const DIM:     RGB = [148, 163, 184]
  const ACCENT:  RGB = [236, 253, 245]

  const fill   = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const color  = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])

  // ── Page background ───────────────────────────────────────────────────────────
  fill(BG)
  doc.rect(0, 0, PW, PH, 'F')

  // ── Header ───────────────────────────────────────────────────────────────────
  const HDR_H = 34
  fill(PANEL)
  doc.rect(0, 0, PW, HDR_H, 'F')
  fill(EMERALD)
  doc.rect(0, 0, PW, 2.5, 'F')
  stroke(BORDER)
  doc.setLineWidth(0.25)
  doc.line(0, HDR_H, PW, HDR_H)

  const LOGO_SIZE = 20
  const LOGO_Y    = (HDR_H - LOGO_SIZE) / 2 + 1.5
  let   logoX     = M

  if (logoDataURL) {
    doc.addImage(logoDataURL, 'PNG', logoX, LOGO_Y, LOGO_SIZE, LOGO_SIZE)
    logoX += LOGO_SIZE + 3
  }

  // Institution logos (right side)
  const INST_SIZE = 16
  const INST_Y    = (HDR_H - INST_SIZE) / 2 + 1.5
  let   instX     = PW - M - INST_SIZE
  if (upLogoURL) {
    doc.addImage(upLogoURL, 'PNG', instX, INST_Y, INST_SIZE, INST_SIZE)
    instX -= INST_SIZE + 3
  }
  if (pcaLogoURL) {
    doc.addImage(pcaLogoURL, 'PNG', instX, INST_Y, INST_SIZE, INST_SIZE)
    instX -= 4
  }

  // Wordmark
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  color(INK)
  doc.text('BRITE', logoX, 17)
  color(EMERALD)
  doc.text('MAP', logoX + doc.getTextWidth('BRITE'), 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  color(MUTED)
  doc.text('Bamboo Resources Inventory & Technology-Enabled Mapping', logoX, 25)

  const dateStr = new Date().toLocaleDateString('en-PH', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFontSize(7.5)
  color(DIM)
  doc.text(dateStr, instX - 2, 30, { align: 'right' })

  const filterParts: string[] = []
  if (filters.region)       filterParts.push(filters.region)
  if (filters.province)     filterParts.push(filters.province)
  if (filters.municipality) filterParts.push(filters.municipality)
  if (speciesFilter.length) filterParts.push(`${speciesFilter.length} species filter`)
  const filterLabel = filterParts.length ? filterParts.join(' › ') : 'All survey data'

  doc.setFontSize(8)
  color(MUTED)
  doc.text(`Filter: ${filterLabel}`, logoX, 30)

  // ── Layout: full-width map, two-column stats below ────────────────────────────
  const TOP    = HDR_H + 5
  const BOT    = PH - 12
  const CONTENT_W = PW - 2 * M   // 188 mm

  // Map height derived from actual image aspect ratio, capped so stats have room
  const imgAspect = imgDims.w / imgDims.h
  const MAX_MAP_H = 130
  const MAP_W = CONTENT_W
  const MAP_H = Math.min(MAX_MAP_H, MAP_W / imgAspect)
  const MAP_X = M
  const MAP_Y = TOP

  // ── Map panel ─────────────────────────────────────────────────────────────────
  fill(PANEL)
  stroke(BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(MAP_X, MAP_Y, MAP_W, MAP_H, 2, 2, 'FD')

  if (mapImage) {
    doc.addImage(mapImage, 'PNG', MAP_X, MAP_Y, MAP_W, MAP_H)
    stroke(BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(MAP_X, MAP_Y, MAP_W, MAP_H, 2, 2)
  }

  // ── Two-column stats area below map ──────────────────────────────────────────
  const STATS_Y   = MAP_Y + MAP_H + 6
  const STATS_H   = BOT - STATS_Y
  const COL_GAP   = 6
  const COL_W     = (CONTENT_W - COL_GAP) / 2   // ~91 mm each
  const COL1_X    = M
  const COL2_X    = M + COL_W + COL_GAP

  let sy1 = STATS_Y   // left column cursor
  let sy2 = STATS_Y   // right column cursor

  // ── Helper functions ──────────────────────────────────────────────────────────
  function sectionHeader(label: string, x: number, w: number, sy: number): number {
    fill(ACCENT)
    doc.roundedRect(x, sy - 3.5, w, 8, 1, 1, 'F')
    fill(EMERALD)
    doc.roundedRect(x, sy - 3.5, 2, 8, 0.5, 0.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    color(EMERALD)
    doc.text(label, x + 4.5, sy + 1)
    return sy + 9
  }

  function statRow(label: string, value: string, x: number, w: number, sy: number): number {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    color(MUTED)
    doc.text(label, x, sy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    color(INK)
    doc.text(value, x + w, sy, { align: 'right' })
    // Dotted leader
    stroke(BORDER)
    doc.setLineWidth(0.15)
    doc.setLineDashPattern([0.5, 1], 0)
    const lw = doc.getTextWidth(label)
    const vw = doc.getTextWidth(value)
    doc.line(x + lw + 2, sy - 1, x + w - vw - 2, sy - 1)
    doc.setLineDashPattern([], 0)
    return sy + 7
  }

  // ── Left column: Summary + Coverage + Survey Period ───────────────────────────
  const SECT_GAP = 5

  sy1 = sectionHeader('SUMMARY', COL1_X, COL_W, sy1)
  sy1 = statRow('Survey sites',  stats.n.toLocaleString(),           COL1_X, COL_W, sy1)
  sy1 = statRow('Bamboo clumps', stats.totalClumps.toLocaleString(), COL1_X, COL_W, sy1)
  sy1 = statRow('Photos',        stats.totalPhotos.toLocaleString(), COL1_X, COL_W, sy1)
  sy1 += SECT_GAP

  sy1 = sectionHeader('COVERAGE', COL1_X, COL_W, sy1)
  sy1 = statRow('Regions',        String(stats.regions),   COL1_X, COL_W, sy1)
  sy1 = statRow('Provinces',      String(stats.provinces), COL1_X, COL_W, sy1)
  sy1 = statRow('Municipalities', String(stats.munis),     COL1_X, COL_W, sy1)
  sy1 = statRow('Barangays',      String(stats.barangays), COL1_X, COL_W, sy1)
  sy1 += SECT_GAP

  if (stats.earliest && stats.latest) {
    const fmtD = (ts: number) =>
      new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    sy1 = sectionHeader('SURVEY PERIOD', COL1_X, COL_W, sy1)
    sy1 = statRow('Earliest', fmtD(stats.earliest), COL1_X, COL_W, sy1)
    sy1 = statRow('Latest',   fmtD(stats.latest),   COL1_X, COL_W, sy1)
  }

  // ── Right column: Species distribution ───────────────────────────────────────
  const SPE_MAX = 14
  const spe = stats.speciesList.slice(0, SPE_MAX)

  if (spe.length > 0) {
    sy2 = sectionHeader('SPECIES DISTRIBUTION', COL2_X, COL_W, sy2)

    const remaining = BOT - sy2 - 2
    const rowH = Math.min(11, remaining / spe.length)
    const maxCount = spe[0].count

    spe.forEach(({ name, count, pct }, i) => {
      const ry = sy2 + i * rowH
      const [r, g, b] = getSpeciesColor(name)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      color(MUTED)
      const label = name.length > 22 ? name.slice(0, 21) + '…' : name
      doc.text(label, COL2_X, ry + rowH * 0.42)

      const BAR_Y = ry + rowH - 4
      doc.setFillColor(226, 232, 240)
      doc.roundedRect(COL2_X, BAR_Y, COL_W, 3, 0.6, 0.6, 'F')

      doc.setFillColor(r, g, b)
      const fillW = Math.max(0.5, (count / maxCount) * COL_W)
      doc.roundedRect(COL2_X, BAR_Y, fillW, 3, 0.6, 0.6, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(r, g, b)
      doc.text(`${Math.round(pct)}%`, COL2_X + COL_W, ry + rowH * 0.42, { align: 'right' })
    })

    if (stats.speciesList.length > SPE_MAX) {
      const moreY = sy2 + spe.length * rowH + 3
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      color(DIM)
      doc.text(`+ ${stats.speciesList.length - SPE_MAX} more species`, COL2_X, moreY)
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  fill(PANEL)
  doc.rect(0, BOT, PW, PH - BOT, 'F')
  stroke(BORDER)
  doc.setLineWidth(0.2)
  doc.line(0, BOT, PW, BOT)
  fill(EMERALD)
  doc.rect(0, PH - 2, PW, 2, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  color(MUTED)
  doc.text('BRITEMAP · DOST-PCAARRD / UPLB · For research use only', M, BOT + 7)
  color(DIM)
  doc.text(
    `${stats.n} sites · ${stats.totalClumps.toLocaleString()} clumps · ${filterLabel}`,
    PW - M, BOT + 7, { align: 'right' },
  )

  doc.save(`britemap-export-${new Date().toISOString().slice(0, 10)}.pdf`)
}
