import type {
  AdminUsersResponse,
  AuditLogResponse,
  BatchRun,
  BatchRunsResponse,
  CreateUserBody,
  GeographicDivisionsResponse,
  PublicClump,
  PublicQuadrat,
  PublicQuadratDetail,
  SpeciesSummary,
  UpdateUserBody,
  UserDTO,
  VerifyActionResponse,
  VerifyQueueResponse,
} from './types'

// ─── Error class ──────────────────────────────────────────────────────────────

export class BritemapApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, requestId: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'BritemapApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
  }
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === 'true'

// photoUrl in API responses is a full root-relative path (e.g. /api/v1/public/photos/...).
// Prepending the full BASE would double the /api/v1 segment, so we use the origin only.
export const PHOTO_ORIGIN = BASE.startsWith('http') ? new URL(BASE).origin : ''

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  token?: string
  headers?: Record<string, string>
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers = {}, ...rest } = opts

  const reqHeaders: Record<string, string> = {
    ...headers,
  }
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`
  if (rest.body && typeof rest.body === 'string') reqHeaders['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, { ...rest, headers: reqHeaders })

  if (res.status === 204) return undefined as T
  if (res.status === 304) return undefined as T

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const env = body as { error?: { code?: string; message?: string; requestId?: string; details?: Record<string, unknown> } } | null
    const apiError = new BritemapApiError(
      res.status,
      env?.error?.code ?? 'UNKNOWN',
      env?.error?.message ?? res.statusText,
      env?.error?.requestId ?? '',
      env?.error?.details,
    )
    // Expired or revoked token — redirect to login (skip in mock mode and on the login page itself)
    if (
      res.status === 401 &&
      !MOCK_MODE &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login'
    }
    throw apiError
  }

  return body as T
}

// ─── Clump position helper ────────────────────────────────────────────────────

function clumpLatLon(
  centLat: number,
  centLon: number,
  azimuthDeg: number,
  distanceMeters: number,
): { latitude: number; longitude: number } {
  const R = 6_371_000
  const az = (azimuthDeg * Math.PI) / 180
  const dLat = (distanceMeters * Math.cos(az)) / R
  const dLon = (distanceMeters * Math.sin(az)) / (R * Math.cos((centLat * Math.PI) / 180))
  return {
    latitude: centLat + (dLat * 180) / Math.PI,
    longitude: centLon + (dLon * 180) / Math.PI,
  }
}

// ─── Photo blob helper (Bearer on img src isn't possible) ────────────────────

export async function fetchPhotoBlob(url: string, token: string): Promise<string> {
  const res = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// ─── Health ───────────────────────────────────────────────────────────────────

export const health = {
  liveness: () => apiFetch<{ status: string }>('/healthz'),
  readiness: () => apiFetch<{ status: string }>('/readyz'),
}

// ─── Geographic divisions ─────────────────────────────────────────────────────

export const geo = {
  divisions: (token: string) =>
    apiFetch<GeographicDivisionsResponse>('/geographic-divisions', { token }),

  publicDivisions: () =>
    apiFetch<Omit<GeographicDivisionsResponse, 'hasData'>>('/public/geographic/divisions'),
}

// ─── Public quadrats ──────────────────────────────────────────────────────────

export interface PublicQuadratFilters {
  provinceCode?: string
  municipalityCode?: string
  regionCode?: string
  limit?: number
  cursor?: string
}

export const publicApi = {
  listQuadrats: (filters: PublicQuadratFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.provinceCode) params.set('provinceCode', filters.provinceCode)
    if (filters.municipalityCode) params.set('municipalityCode', filters.municipalityCode)
    if (filters.regionCode) params.set('regionCode', filters.regionCode)
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.cursor) params.set('cursor', filters.cursor)
    const qs = params.toString()
    return apiFetch<{ items: PublicQuadrat[]; nextCursor: string | null; hasMore: boolean; serverTimestamp: number }>(
      `/public/quadrats${qs ? `?${qs}` : ''}`,
    )
  },

  // Spec shape: { quadrat: {..., speciesSummary}, clumps: [...] }
  // Clumps carry azimuth + distanceMeters; we compute absolute lat/lon here
  // so map layers receive positioned clumps without knowing about the centroid.
  getQuadrat: async (uuid: string): Promise<PublicQuadratDetail> => {
    const res = await apiFetch<{
      quadrat: Omit<PublicQuadratDetail, 'clumps'> & { speciesSummary: SpeciesSummary[] }
      clumps: PublicClump[]
    }>(`/public/quadrats/${uuid}`)
    const { latitude: centLat, longitude: centLon } = res.quadrat
    const clumps = res.clumps.map((c) => ({
      ...c,
      ...(centLat != null && centLon != null
        ? clumpLatLon(centLat, centLon, c.azimuth, c.distanceMeters)
        : {}),
    }))
    return { ...res.quadrat, clumps }
  },
}

// ─── User self-service ────────────────────────────────────────────────────────

export const me = {
  get: (token: string) => apiFetch<UserDTO>('/me', { token }),

  patch: (token: string, body: { displayName?: string; notificationPreferences?: { returnPush: boolean; emailDigest: boolean } }) =>
    apiFetch<UserDTO>('/me', { method: 'PATCH', token, body: JSON.stringify(body) }),
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export interface AdminUserFilters {
  role?: string
  isActive?: boolean
  q?: string
  limit?: number
  cursor?: string
}

export const adminUsers = {
  list: (token: string, filters: AdminUserFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.role) params.set('role', filters.role)
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive))
    if (filters.q) params.set('q', filters.q)
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.cursor) params.set('cursor', filters.cursor)
    const qs = params.toString()
    return apiFetch<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ''}`, { token })
  },

  get: (token: string, uid: string) =>
    apiFetch<{ user: UserDTO }>(`/admin/users/${uid}`, { token }),

  create: (token: string, body: CreateUserBody) =>
    apiFetch<{ user: UserDTO }>('/admin/users', { method: 'POST', token, body: JSON.stringify(body) }),

  update: (token: string, uid: string, body: UpdateUserBody) =>
    apiFetch<UserDTO>(`/admin/users/${uid}`, { method: 'PATCH', token, body: JSON.stringify(body) }),

  deactivate: (token: string, uid: string) =>
    apiFetch<UserDTO>(`/admin/users/${uid}/deactivate`, { method: 'POST', token }),
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface VerifyQueueFilters {
  provinceCode?: string
  state?: string
  entityType?: 'quadrat' | 'clump'
  limit?: number
  cursor?: string
}

export const verify = {
  queue: (token: string, filters: VerifyQueueFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.provinceCode) params.set('provinceCode', filters.provinceCode)
    if (filters.state) params.set('state', filters.state)
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.cursor) params.set('cursor', filters.cursor)
    const qs = params.toString()
    return apiFetch<VerifyQueueResponse>(`/verify/queue${qs ? `?${qs}` : ''}`, { token })
  },

  open: (token: string, entityType: string, uuid: string) =>
    apiFetch<VerifyActionResponse>(`/verify/${entityType}/${uuid}/open`, { method: 'POST', token }),

  return: (token: string, uuid: string, reviewerComment: string) =>
    apiFetch<VerifyActionResponse>(`/verify/quadrat/${uuid}/return`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reviewerComment }),
    }),

  approve: (token: string, uuid: string, approvalRemarks?: string) =>
    apiFetch<VerifyActionResponse>(`/verify/quadrat/${uuid}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify({ approvalRemarks }),
    }),
}

// ─── Admin: Audit log ─────────────────────────────────────────────────────────

export interface AuditFilters {
  actor?: string
  action?: string
  subjectType?: string
  subjectId?: string
  since?: number
  until?: number
  limit?: number
  cursor?: string
}

export const audit = {
  list: (token: string, filters: AuditFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.actor) params.set('actor', filters.actor)
    if (filters.action) params.set('action', filters.action)
    if (filters.subjectType) params.set('subjectType', filters.subjectType)
    if (filters.subjectId) params.set('subjectId', filters.subjectId)
    if (filters.since) params.set('since', String(filters.since))
    if (filters.until) params.set('until', String(filters.until))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.cursor) params.set('cursor', filters.cursor)
    const qs = params.toString()
    return apiFetch<AuditLogResponse>(`/admin/audit${qs ? `?${qs}` : ''}`, { token })
  },
}

// ─── Admin: Batch ─────────────────────────────────────────────────────────────

export interface BatchFilters {
  status?: string
  since?: number
  limit?: number
  cursor?: string
}

export const batch = {
  list: (token: string, filters: BatchFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.since) params.set('since', String(filters.since))
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.cursor) params.set('cursor', filters.cursor)
    const qs = params.toString()
    return apiFetch<BatchRunsResponse>(`/admin/batch/runs${qs ? `?${qs}` : ''}`, { token })
  },

  get: (token: string, runId: string) =>
    apiFetch<BatchRun>(`/admin/batch/runs/${runId}`, { token }),

  trigger: (token: string, callerUid: string) =>
    apiFetch<{ runId: string; status: string; triggeredBy: string; startedAt: number }>(
      '/admin/batch/verify/run',
      { method: 'POST', token, body: JSON.stringify({ triggeredBy: `admin:${callerUid}` }) },
    ),
}
