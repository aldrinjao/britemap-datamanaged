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
  // Coordinates taken from each clip's YouTube description (lat lng).
  {
    id: 'nabua-camsur-1',
    title: 'Nabua, CamSur 1',
    location: 'Nabua, Camarines Sur',
    date: '',
    youtubeId: 'xpUtZsegT6U',
    lat: 13.3804,
    lng: 123.3433,
  },
  {
    id: 'nabua-camsur-2',
    title: 'Nabua, CamSur 2',
    location: 'Nabua, Camarines Sur',
    date: '',
    youtubeId: 'ikBIKd28Alo',
    lat: 13.3822,
    lng: 123.3389,
  },
  {
    id: 'bula-camsur-1',
    title: 'Bula, CamSur 1',
    location: 'Bula, Camarines Sur',
    date: '',
    youtubeId: 'xrSkBLbLPMU',
    lat: 13.4625,
    lng: 123.2379,
  },
  {
    id: 'maragondon-cavite-1',
    title: 'Maragondon, Cavite 1',
    location: 'Maragondon, Cavite',
    date: '',
    youtubeId: 'Gvt7pb9TWkk',
    lat: 14.2193,
    lng: 120.7818,
  },
  {
    id: 'maragondon-cavite-2',
    title: 'Maragondon, Cavite 2',
    location: 'Maragondon, Cavite',
    date: '',
    youtubeId: 'z_bH0Bjvcco',
    lat: 14.2244,
    lng: 120.7804,
  },
  {
    id: 'tabango-leyte-1',
    title: 'Tabango, Leyte 1',
    location: 'Tabango, Leyte',
    date: '',
    youtubeId: 'C8z7DzJqufg',
    lat: 11.2513,
    lng: 124.4532,
  },
  {
    id: 'tabango-leyte-2',
    title: 'Tabango, Leyte 2',
    location: 'Tabango, Leyte',
    date: '',
    youtubeId: 'Rj_qeyNKBCU',
    lat: 11.2508,
    lng: 124.4564,
  },

  // ── General showreel (homepage gallery only — no map marker) ──
  {
    id: 'abra-1',
    title: 'Abra 1',
    location: 'Abra',
    date: '',
    youtubeId: 'NyP8ytwxwsw',
  },
  {
    id: 'abra-2',
    title: 'Abra 2',
    location: 'Abra',
    date: '',
    youtubeId: 'HOtiU6sNfMk',
  },
  {
    id: 'abra-3',
    title: 'Abra 3',
    location: 'Abra',
    date: '',
    youtubeId: 'C8m7hfZfJ7A',
  },
  {
    id: 'abra-4',
    title: 'Abra 4',
    location: 'Abra',
    date: '',
    youtubeId: 'r-R0EBVz5No',
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
