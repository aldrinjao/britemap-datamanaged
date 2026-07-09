'use client'

import { useEffect } from 'react'
import { type DroneVideo, youtubeEmbedUrl } from './drone-videos'

interface Props {
  video: DroneVideo | null
  onClose: () => void
}

/**
 * Fullscreen video overlay. Uses the "facade" pattern: the YouTube iframe is only
 * mounted while a video is selected, so the heavy player never loads until a user
 * clicks play. Fixed to the viewport, so it works from both the homepage and the
 * interactive map.
 */
export function VideoLightbox({ video, onClose }: Props) {
  useEffect(() => {
    if (!video) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [video, onClose])

  if (!video) return null

  const available = video.youtubeId !== ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption + close */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-lg leading-tight truncate">{video.title}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{video.location} · {video.date}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close video"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 16:9 player */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '16 / 9' }}>
          {available ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={youtubeEmbedUrl(video.youtubeId)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="text-4xl mb-3">🎬</span>
              <p className="text-white font-semibold">Footage coming soon</p>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                This flight has been recorded but is not yet published. Check back shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
