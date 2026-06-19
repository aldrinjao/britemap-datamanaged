'use client'

import { useQuery } from '@tanstack/react-query'
import { publicApi, PHOTO_ORIGIN } from '@/lib/api'
import { SPECIES_COLORS } from './deck-layers'

interface Props {
  uuid: string
  onClose: () => void
}

function aspectLabel(deg: number | undefined): string {
  if (deg == null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 text-center">
      <p className="text-sm font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-700/50 rounded p-2 text-center">
      <p className="text-sm font-semibold text-white leading-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export function QuadratDetailDrawer({ uuid, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-quadrat', uuid],
    queryFn: () => publicApi.getQuadrat(uuid),
  })

  const hasTerrain = data && (
    data.elevationMeters != null || data.slopeDegrees != null || data.aspectDegrees != null
  )

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute top-0 right-0 h-full w-[420px] z-30 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <div>
            {data ? (
              <>
                <h2 className="font-semibold text-white leading-tight">{data.barangay}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{data.municipality}, {data.province}</p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="h-4 w-40 bg-slate-700 rounded animate-pulse" />
                <div className="h-3 w-28 bg-slate-800 rounded animate-pulse" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white ml-4 mt-0.5 flex-shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Loading…
          </div>
        )}

        {data && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat
                value={<span className="text-xl text-emerald-400">{data.clumps.length}</span>}
                label="Clumps"
              />
              <Stat
                value={<span className="text-xl text-purple-400">{data.clumps.reduce((s, c) => s + c.photos.length, 0)}</span>}
                label="Photos"
              />
              <Stat
                value={new Date(data.approvedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                label="Surveyed"
              />
            </div>

            {/* Terrain */}
            {hasTerrain && (
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  value={data.elevationMeters != null ? `${data.elevationMeters} m` : '—'}
                  label="Elevation"
                />
                <Stat
                  value={data.slopeDegrees != null ? `${data.slopeDegrees}°` : '—'}
                  label="Slope"
                />
                <Stat
                  value={data.aspectDegrees != null
                    ? `${aspectLabel(data.aspectDegrees)} ${data.aspectDegrees}°`
                    : '—'}
                  label="Aspect"
                />
              </div>
            )}

            {/* Species summary */}
            {data.speciesSummary.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Species</h3>
                <div className="space-y-1.5">
                  {data.speciesSummary.map((sp) => {
                    const [r, g, b] = SPECIES_COLORS[sp.scientificName] ?? [148, 163, 184, 200]
                    const total = data.speciesSummary.reduce((s, x) => s + x.clumpCount, 0)
                    return (
                      <div key={sp.scientificName} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                        />
                        <span className="text-sm italic text-slate-300 flex-1 truncate">{sp.scientificName}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {sp.clumpCount} ({Math.round((sp.clumpCount / total) * 100)}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Clump list */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Clumps ({data.clumps.length})
              </h3>
              <div className="space-y-3">
                {data.clumps.map((clump, i) => {
                  const [r, g, b] = SPECIES_COLORS[clump.scientificName] ?? [148, 163, 184, 200]
                  return (
                    <div
                      key={clump._id}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2.5"
                    >
                      {/* Species header */}
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm italic text-slate-200 truncate">{clump.scientificName}</p>
                          <p className="text-xs text-slate-500">{clump.commonName}</p>
                        </div>
                      </div>

                      {/* Measurements */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <Field label="culms"    value={clump.culmCount} />
                        <Field label="diam. cm" value={clump.averageDiameterCm} />
                        <Field label="height m" value={clump.averageHeightMeters} />
                        <Field label="bearing"  value={`${Math.round(clump.azimuth)}° / ${clump.distanceMeters}m`} />
                      </div>

                      {/* Photos */}
                      {clump.photos.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {clump.photos.map((photo) => (
                            <img
                              key={photo.photoId}
                              src={`${PHOTO_ORIGIN}${photo.photoUrl}`}
                              alt={`Clump ${i + 1} photo`}
                              className="h-20 w-20 object-cover rounded-md flex-shrink-0 bg-slate-700"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
