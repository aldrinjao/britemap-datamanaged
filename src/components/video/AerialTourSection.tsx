'use client'

import { useState } from 'react'
import { DRONE_VIDEOS, posterFor, type DroneVideo } from './drone-videos'
import { VideoLightbox } from './VideoLightbox'

function PlayBadge() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
        <svg className="w-6 h-6 text-emerald-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  )
}

function VideoCard({ video, onPlay }: { video: DroneVideo; onPlay: (v: DroneVideo) => void }) {
  const poster = posterFor(video)
  const available = video.youtubeId !== ''

  return (
    <button
      onClick={() => onPlay(video)}
      className="group text-left bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative h-44 bg-gradient-to-br from-emerald-800 to-slate-900 overflow-hidden">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        {/* Darkening scrim for play-button contrast */}
        <span className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        <PlayBadge />
        {video.lng != null && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-semibold uppercase tracking-wide">
            On map
          </span>
        )}
        {!available && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 text-[10px] font-semibold uppercase tracking-wide">
            Coming soon
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{video.title}</h3>
        <p className="text-xs text-slate-500">{video.location} · {video.date}</p>
      </div>
    </button>
  )
}

export function AerialTourSection() {
  const [active, setActive] = useState<DroneVideo | null>(null)

  return (
    <section id="aerial" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-slate-800 mb-3 text-center">
          Aerial Tour
          <div className="mt-3 mx-auto w-16 h-1 bg-emerald-500 rounded-full" />
        </h2>
        <p className="text-slate-500 text-center max-w-2xl mx-auto mb-8 leading-relaxed">
          Drone footage from BRITEMAP field surveys across the Philippines. Click any clip to watch —
          flights tagged <span className="font-semibold text-emerald-700">On map</span> can also be
          opened from their location in the interactive map.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DRONE_VIDEOS.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={setActive} />
          ))}
        </div>
      </div>

      <VideoLightbox video={active} onClose={() => setActive(null)} />
    </section>
  )
}
