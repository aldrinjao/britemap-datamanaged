// ─── Drone video catalogue ────────────────────────────────────────────────────
//
// Free hosting model: all footage lives on YouTube (unlisted or a public project
// channel). Set `youtubeId` to the 11-char video ID from the share URL, e.g.
//   https://youtu.be/dQw4w9WgXcQ  →  youtubeId: 'dQw4w9WgXcQ'
//
// An empty `youtubeId` means "not yet uploaded" — the video still shows in the
// homepage gallery as a greyed-out "Coming soon" card, and is skipped on the map.
//
// Add `lng`/`lat` to place a clickable marker on the interactive map. Omit them
// for general showreel footage that should only appear in the homepage gallery.

export interface DroneVideo {
  id: string
  title: string
  location: string
  date: string
  /** 11-char YouTube video ID. Empty string = not yet uploaded. */
  youtubeId: string
  /** Optional custom poster. Falls back to YouTube's thumbnail when omitted. */
  posterUrl?: string
  /** Map coordinates. Present → clickable marker on the interactive map. */
  lng?: number
  lat?: number
}

export const DRONE_VIDEOS: DroneVideo[] = [
  // ── Geolocated site footage (map marker + homepage gallery) ──
  {
    id: 'nabua-camsur-2024',
    title: 'Bamboo stands along the Bicol River',
    location: 'Nabua, Camarines Sur',
    date: 'November 2024',
    youtubeId: '',            // TODO: paste YouTube ID
    lng: 123.371,             // TODO: real flight coordinates
    lat: 13.409,
  },
  {
    id: 'sallapadan-abra-2024',
    title: 'Upland bamboo cover survey',
    location: 'Sallapadan, Abra',
    date: 'December 2024',
    youtubeId: '',            // TODO: paste YouTube ID
    lng: 120.755,             // TODO: real flight coordinates
    lat: 17.483,
  },
  {
    id: 'capas-tarlac-2024',
    title: 'Riparian bamboo, Tarlac field inventory',
    location: 'Capas, Tarlac',
    date: 'September 2024',
    youtubeId: '',            // TODO: paste YouTube ID
    lng: 120.592,             // TODO: real flight coordinates
    lat: 15.334,
  },

  // ── General showreel (homepage gallery only — no map marker) ──
  {
    id: 'program-overview-2025',
    title: 'BRITEMAP — Program Overview',
    location: 'Philippines',
    date: '2025',
    youtubeId: '',            // TODO: paste YouTube ID
  },
  {
    id: 'field-training-tarlac-2024',
    title: 'Community inventory training, Region III',
    location: 'Tarlac Capitol Center',
    date: 'September 2024',
    youtubeId: '',            // TODO: paste YouTube ID
  },
]

/** Videos that have a location AND are actually uploaded — these get map markers. */
export function mapVideos(): DroneVideo[] {
  return DRONE_VIDEOS.filter((v) => v.lng != null && v.lat != null && v.youtubeId !== '')
}

/** Poster image for a card: custom poster → YouTube thumbnail → '' (gradient placeholder). */
export function posterFor(v: DroneVideo): string {
  if (v.posterUrl) return v.posterUrl
  if (v.youtubeId) return `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`
  return ''
}

/** Privacy-friendly no-cookie embed URL with autoplay. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
}
