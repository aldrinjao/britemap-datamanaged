'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { publicApi } from '@/lib/api'

export default function QuadratDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-quadrat', uuid],
    queryFn: () => publicApi.getQuadrat(uuid),
  })

  if (isLoading) return (
    <div className="p-8 text-slate-400 dark:text-slate-500 min-h-screen bg-white dark:bg-slate-950">Loading…</div>
  )
  if (error || !data) return (
    <div className="p-8 text-red-500 dark:text-red-400 min-h-screen bg-white dark:bg-slate-950">Not found.</div>
  )

  const q = data

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-8 max-w-3xl mx-auto space-y-8">
      <Link href="/map" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm">
        ← Back to map
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{q.barangay}</h1>
        <p className="text-slate-500 dark:text-slate-400">{q.municipality}, {q.province}</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm">{q.region}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.clumps.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Clumps</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.clumps.reduce((s, c) => s + c.photos.length, 0)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Photos</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {new Date(q.approvedAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Approved</p>
        </div>
      </div>

      {q.speciesSummary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Species Summary</h2>
          <div className="space-y-2">
            {q.speciesSummary.map((sp) => (
              <div key={sp.scientificName} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 rounded-lg px-4 py-2">
                <span className="italic text-slate-700 dark:text-slate-200">{sp.scientificName}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">{sp.clumpCount} clumps</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Clumps</h2>
        <div className="space-y-4">
          {data.clumps.map((clump) => (
            <div key={clump._id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium italic text-slate-800 dark:text-slate-200">{clump.scientificName}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{clump.commonName}</p>
                </div>
                <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                  <p>{clump.culmCount} culms</p>
                  <p>Ø {clump.averageDiameterCm}cm · {clump.averageHeightMeters}m</p>
                </div>
              </div>
              {clump.photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {clump.photos.map((photo) => (
                    <img
                      key={photo.photoId}
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${photo.photoUrl}`}
                      alt=""
                      className="h-24 w-24 object-cover rounded-lg flex-shrink-0 bg-slate-200 dark:bg-slate-800"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
