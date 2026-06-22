import { http, HttpResponse, delay } from 'msw'
import {
  PUBLIC_QUADRATS,
  PUBLIC_QUADRAT_DETAIL,
  QUEUE_ITEMS,
  MOCK_USERS,
  CURRENT_USER,
  AUDIT_EVENTS,
  BATCH_RUNS,
} from './data'
import type { UserDTO, BatchRun, VerifyQueueItem } from '@/lib/types'

// ─── In-memory mutable stores ─────────────────────────────────────────────────
// MSW runs in the browser so these reset on page reload — that's fine for testing.

let users: UserDTO[] = [...MOCK_USERS]
let queueItems: VerifyQueueItem[] = [...QUEUE_ITEMS]
let batchRuns: BatchRun[] = [...BATCH_RUNS]

// ─── Pagination helper ────────────────────────────────────────────────────────
// Cursor is base64 of the next index.

function paginate<T>(items: T[], cursor: string | null, limit: number) {
  const start = cursor ? parseInt(atob(cursor), 10) : 0
  const slice = items.slice(start, start + limit)
  const end = start + limit
  const nextCursor = end < items.length ? btoa(String(end)) : null
  return { slice, nextCursor }
}

// ─── Simulated network delay (ms) ─────────────────────────────────────────────
const DELAY = 250

// ─── Match any base URL: */api/v1/<path> ──────────────────────────────────────
const api = (path: string) => new RegExp(`/api/v1${path.replace(/:[^/]+/g, '[^/]+')}$`)

export const handlers = [

  // ── Health ──────────────────────────────────────────────────────────────────

  http.get('*/healthz', async () => {
    await delay(50)
    return HttpResponse.json({ status: 'ok' })
  }),

  http.get('*/readyz', async () => {
    await delay(50)
    return HttpResponse.json({ status: 'ok' })
  }),

  // ── Geographic divisions (authenticated) ────────────────────────────────────

  http.get('*/api/v1/geographic-divisions', async () => {
    await delay(DELAY)
    return HttpResponse.json({
      serverTimestamp: Date.now(),
      divisions: [
        { code: '05',       name: 'Region V (Bicol Region)',              type: 'region',       parentCode: null,     regionCode: '05', hasData: true },
        { code: '0517',     name: 'Camarines Sur',                        type: 'province',     parentCode: '05',     regionCode: '05', hasData: true },
        { code: '051723',   name: 'Nabua',                                type: 'municipality', parentCode: '0517',   regionCode: '05', hasData: true },
        { code: '051703',   name: 'Bula',                                 type: 'municipality', parentCode: '0517',   regionCode: '05', hasData: true },
        { code: '051701',   name: 'Bato',                                 type: 'municipality', parentCode: '0517',   regionCode: '05', hasData: true },
        { code: '14',       name: 'CAR (Cordillera Administrative Region)', type: 'region',     parentCode: null,     regionCode: '14',  hasData: true },
        { code: '14001',    name: 'Abra',                                 type: 'province',     parentCode: '14',     regionCode: '14',  hasData: true },
        { code: '140010',   name: 'Licuan-Baay',                          type: 'municipality', parentCode: '14001',  regionCode: '14',  hasData: true },
        { code: '140011',   name: 'Lagangilang',                          type: 'municipality', parentCode: '14001',  regionCode: '14',  hasData: true },
        { code: '140012',   name: 'Sallapadan',                           type: 'municipality', parentCode: '14001',  regionCode: '14',  hasData: true },
        { code: '04A',      name: 'CALABARZON',                           type: 'region',       parentCode: null,     regionCode: '04A', hasData: true },
        { code: '1648',     name: 'Laguna',                               type: 'province',     parentCode: '04A',    regionCode: '04A', hasData: true },
        { code: '164807',   name: 'Los Baños',                            type: 'municipality', parentCode: '1648',   regionCode: '04A', hasData: true },
        // Cagayan Valley — Region II
        { code: '02',       name: 'Region II (Cagayan Valley)',           type: 'region',       parentCode: null,     regionCode: '02',  hasData: true },
        { code: '021500000',name: 'Cagayan',                              type: 'province',     parentCode: '02',     regionCode: '02',  hasData: true },
        { code: '02150600', name: 'Baggao',                               type: 'municipality', parentCode: '021500000', regionCode: '02', hasData: true },
        { code: '02150800', name: 'Tuguegarao City',                      type: 'municipality', parentCode: '021500000', regionCode: '02', hasData: true },
        { code: '02150100', name: 'Amulung',                              type: 'municipality', parentCode: '021500000', regionCode: '02', hasData: true },
        // Tarlac — Region III
        { code: '03',       name: 'Region III (Central Luzon)',           type: 'region',       parentCode: null,     regionCode: '03',  hasData: true },
        { code: '031400000',name: 'Tarlac',                               type: 'province',     parentCode: '03',     regionCode: '03',  hasData: true },
        { code: '03141100', name: 'Mayantoc',                             type: 'municipality', parentCode: '031400000', regionCode: '03', hasData: true },
        { code: '03140500', name: 'Capas',                                type: 'municipality', parentCode: '031400000', regionCode: '03', hasData: true },
        { code: '03142200', name: 'San Jose',                             type: 'municipality', parentCode: '031400000', regionCode: '03', hasData: true },
        // Cavite — Region IV-A
        { code: '042100000',name: 'Cavite',                               type: 'province',     parentCode: '04A',    regionCode: '04A', hasData: true },
        { code: '04211100', name: 'Indang',                               type: 'municipality', parentCode: '042100000', regionCode: '04A', hasData: true },
        { code: '04211300', name: 'Magallanes',                           type: 'municipality', parentCode: '042100000', regionCode: '04A', hasData: true },
        { code: '04211500', name: 'Maragondon',                           type: 'municipality', parentCode: '042100000', regionCode: '04A', hasData: true },
        // Palawan — Region IV-B
        { code: '04B',      name: 'Region IV-B (MIMAROPA)',               type: 'region',       parentCode: null,     regionCode: '04B', hasData: true },
        { code: '175800000',name: 'Palawan',                              type: 'province',     parentCode: '04B',    regionCode: '04B', hasData: true },
        { code: '17580800', name: 'El Nido',                              type: 'municipality', parentCode: '175800000', regionCode: '04B', hasData: true },
        { code: '17581100', name: 'Puerto Princesa City',                 type: 'municipality', parentCode: '175800000', regionCode: '04B', hasData: true },
        { code: '17582400', name: 'Taytay',                               type: 'municipality', parentCode: '175800000', regionCode: '04B', hasData: true },
        // Cebu — Region VII
        { code: '07',       name: 'Region VII (Central Visayas)',         type: 'region',       parentCode: null,     regionCode: '07',  hasData: true },
        { code: '072200000',name: 'Cebu',                                 type: 'province',     parentCode: '07',     regionCode: '07',  hasData: true },
        { code: '07222500', name: 'Tuburan',                              type: 'municipality', parentCode: '072200000', regionCode: '07', hasData: true },
        { code: '07220200', name: 'Balamban',                             type: 'municipality', parentCode: '072200000', regionCode: '07', hasData: true },
        { code: '07222000', name: 'Pinamungahan',                         type: 'municipality', parentCode: '072200000', regionCode: '07', hasData: true },
      ],
    })
  }),

  // ── Public: geographic divisions (anonymous) ─────────────────────────────────

  http.get('*/api/v1/public/geographic/divisions', async () => {
    await delay(DELAY)
    return HttpResponse.json({
      serverTimestamp: Date.now(),
      divisions: [
        { code: '05',       name: 'Region V (Bicol Region)',              type: 'region',       parentCode: null,    regionCode: '05' },
        { code: '0517',     name: 'Camarines Sur',                        type: 'province',     parentCode: '05',    regionCode: '05' },
        { code: '051723',   name: 'Nabua',                                type: 'municipality', parentCode: '0517',  regionCode: '05' },
        { code: '051703',   name: 'Bula',                                 type: 'municipality', parentCode: '0517',  regionCode: '05' },
        { code: '051701',   name: 'Bato',                                 type: 'municipality', parentCode: '0517',  regionCode: '05' },
        { code: '14',       name: 'CAR (Cordillera Administrative Region)', type: 'region',     parentCode: null,    regionCode: '14'  },
        { code: '14001',    name: 'Abra',                                 type: 'province',     parentCode: '14',    regionCode: '14'  },
        { code: '140010',   name: 'Licuan-Baay',                          type: 'municipality', parentCode: '14001', regionCode: '14'  },
        { code: '140011',   name: 'Lagangilang',                          type: 'municipality', parentCode: '14001', regionCode: '14'  },
        { code: '140012',   name: 'Sallapadan',                           type: 'municipality', parentCode: '14001', regionCode: '14'  },
        { code: '04A',      name: 'CALABARZON',                           type: 'region',       parentCode: null,    regionCode: '04A' },
        { code: '1648',     name: 'Laguna',                               type: 'province',     parentCode: '04A',   regionCode: '04A' },
        { code: '164807',   name: 'Los Baños',                            type: 'municipality', parentCode: '1648',  regionCode: '04A' },
        // Cagayan Valley — Region II
        { code: '02',       name: 'Region II (Cagayan Valley)',           type: 'region',       parentCode: null,    regionCode: '02'  },
        { code: '021500000',name: 'Cagayan',                              type: 'province',     parentCode: '02',    regionCode: '02'  },
        { code: '02150600', name: 'Baggao',                               type: 'municipality', parentCode: '021500000', regionCode: '02' },
        { code: '02150800', name: 'Tuguegarao City',                      type: 'municipality', parentCode: '021500000', regionCode: '02' },
        { code: '02150100', name: 'Amulung',                              type: 'municipality', parentCode: '021500000', regionCode: '02' },
        // Tarlac — Region III
        { code: '03',       name: 'Region III (Central Luzon)',           type: 'region',       parentCode: null,    regionCode: '03'  },
        { code: '031400000',name: 'Tarlac',                               type: 'province',     parentCode: '03',    regionCode: '03'  },
        { code: '03141100', name: 'Mayantoc',                             type: 'municipality', parentCode: '031400000', regionCode: '03' },
        { code: '03140500', name: 'Capas',                                type: 'municipality', parentCode: '031400000', regionCode: '03' },
        { code: '03142200', name: 'San Jose',                             type: 'municipality', parentCode: '031400000', regionCode: '03' },
        // Cavite — Region IV-A
        { code: '042100000',name: 'Cavite',                               type: 'province',     parentCode: '04A',   regionCode: '04A' },
        { code: '04211100', name: 'Indang',                               type: 'municipality', parentCode: '042100000', regionCode: '04A' },
        { code: '04211300', name: 'Magallanes',                           type: 'municipality', parentCode: '042100000', regionCode: '04A' },
        { code: '04211500', name: 'Maragondon',                           type: 'municipality', parentCode: '042100000', regionCode: '04A' },
        // Palawan — Region IV-B
        { code: '04B',      name: 'Region IV-B (MIMAROPA)',               type: 'region',       parentCode: null,    regionCode: '04B' },
        { code: '175800000',name: 'Palawan',                              type: 'province',     parentCode: '04B',   regionCode: '04B' },
        { code: '17580800', name: 'El Nido',                              type: 'municipality', parentCode: '175800000', regionCode: '04B' },
        { code: '17581100', name: 'Puerto Princesa City',                 type: 'municipality', parentCode: '175800000', regionCode: '04B' },
        { code: '17582400', name: 'Taytay',                               type: 'municipality', parentCode: '175800000', regionCode: '04B' },
        // Cebu — Region VII
        { code: '07',       name: 'Region VII (Central Visayas)',         type: 'region',       parentCode: null,    regionCode: '07'  },
        { code: '072200000',name: 'Cebu',                                 type: 'province',     parentCode: '07',    regionCode: '07'  },
        { code: '07222500', name: 'Tuburan',                              type: 'municipality', parentCode: '072200000', regionCode: '07' },
        { code: '07220200', name: 'Balamban',                             type: 'municipality', parentCode: '072200000', regionCode: '07' },
        { code: '07222000', name: 'Pinamungahan',                         type: 'municipality', parentCode: '072200000', regionCode: '07' },
      ],
    })
  }),

  // ── Public: stats ──────────────────────────────────────────────────────────

  http.get('*/api/v1/public/stats', async () => {
    await delay(DELAY)
    const species = new Set<string>()
    Object.values(PUBLIC_QUADRAT_DETAIL).forEach((d) => {
      d.speciesSummary.forEach((s) => species.add(s.scientificName))
    })
    const regions = new Set(PUBLIC_QUADRATS.map((q) => q.regionCode))
    const provinces = new Set(PUBLIC_QUADRATS.map((q) => q.provinceCode))
    return HttpResponse.json({
      quadratCount: PUBLIC_QUADRATS.length,
      clumpCount: Object.values(PUBLIC_QUADRAT_DETAIL).reduce((n, d) => n + d.clumps.length, 0),
      speciesCount: species.size,
      regionCount: regions.size,
      provinceCount: provinces.size,
      serverTimestamp: Date.now(),
    })
  }),

  // ── Public: quadrat list ────────────────────────────────────────────────────

  http.get('*/api/v1/public/quadrats', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const provinceCode = url.searchParams.get('provinceCode')
    const regionCode = url.searchParams.get('regionCode')
    const municipalityCode = url.searchParams.get('municipalityCode')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const cursor = url.searchParams.get('cursor')

    let filtered = PUBLIC_QUADRATS
    if (provinceCode) filtered = filtered.filter((q) => q.provinceCode === provinceCode)
    if (regionCode) filtered = filtered.filter((q) => q.regionCode === regionCode)
    if (municipalityCode) filtered = filtered.filter((q) => q.municipalityCode === municipalityCode)

    const { slice, nextCursor } = paginate(filtered, cursor, limit)
    return HttpResponse.json({
      items: slice,
      nextCursor,
      hasMore: nextCursor !== null,
      serverTimestamp: Date.now(),
    })
  }),

  // ── Public: quadrat detail ──────────────────────────────────────────────────
  // Response shape matches spec §5.9 endpoint 25: { quadrat: {...}, clumps: [...] }

  http.get('*/api/v1/public/quadrats/:uuid', async ({ params }) => {
    await delay(DELAY)
    const detail = PUBLIC_QUADRAT_DETAIL[params.uuid as string]
    if (!detail) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Quadrat not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    const { clumps, ...quadrat } = detail
    return HttpResponse.json({ quadrat, clumps })
  }),

  // ── Public: photo serve (return a placeholder JPEG) ─────────────────────────

  http.get('*/api/v1/public/photos/:quadratId/:clumpId/:photoId', async () => {
    await delay(100)
    // Return a 1×1 transparent JPEG as a placeholder
    const placeholder = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k='
    const bytes = Uint8Array.from(atob(placeholder.split(',')[1]), (c) => c.charCodeAt(0))
    return new HttpResponse(bytes, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
    })
  }),

  // ── Me: self-profile ─────────────────────────────────────────────────────────

  http.get('*/api/v1/me', async () => {
    await delay(DELAY)
    return HttpResponse.json(CURRENT_USER)
  }),

  http.patch('*/api/v1/me', async ({ request }) => {
    await delay(DELAY)
    const body = await request.json() as Partial<UserDTO>
    const updated = { ...CURRENT_USER, ...body, updatedAt: Date.now() }
    return HttpResponse.json(updated)
  }),

  // ── Admin: list users ────────────────────────────────────────────────────────

  http.get('*/api/v1/admin/users', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const role = url.searchParams.get('role')
    const isActive = url.searchParams.get('isActive')
    const q = url.searchParams.get('q')?.toLowerCase()
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
    const cursor = url.searchParams.get('cursor')

    let filtered = users
    if (role) filtered = filtered.filter((u) => u.role === role)
    if (isActive !== null) filtered = filtered.filter((u) => String(u.isActive) === isActive)
    if (q) filtered = filtered.filter((u) => u.emailLower?.includes(q) || u.displayName.toLowerCase().includes(q))

    const { slice, nextCursor } = paginate(filtered, cursor, limit)
    return HttpResponse.json({ items: slice, nextCursor })
  }),

  // ── Admin: create user ───────────────────────────────────────────────────────

  http.post('*/api/v1/admin/users', async ({ request }) => {
    await delay(DELAY)
    const body = await request.json() as { email: string; displayName: string; role: string; verificationScope?: unknown; notes?: string }

    if (users.some((u) => u.emailLower === body.email.toLowerCase())) {
      return HttpResponse.json(
        { error: { code: 'USER_EMAIL_CONFLICT', message: 'Email already in use', requestId: 'mock-req' } },
        { status: 409 },
      )
    }

    const newUser: UserDTO = {
      firebaseUid: `mock-uid-${Date.now()}`,
      email: body.email,
      emailLower: body.email.toLowerCase(),
      displayName: body.displayName,
      role: body.role as UserDTO['role'],
      verificationScope: body.verificationScope as UserDTO['verificationScope'],
      isActive: true,
      notificationPreferences: { returnPush: false, emailDigest: false },
      notes: body.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    users = [newUser, ...users]
    return HttpResponse.json({ user: newUser }, { status: 201 })
  }),

  // ── Admin: get single user ──────────────────────────────────────────────────

  http.get(api('/admin/users/:uid'), async ({ params }) => {
    await delay(DELAY)
    const user = users.find((u) => u.firebaseUid === params.uid)
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ user })
  }),

  // ── Admin: update user ───────────────────────────────────────────────────────

  http.patch('*/api/v1/admin/users/:uid', async ({ params, request }) => {
    await delay(DELAY)
    const idx = users.findIndex((u) => u.firebaseUid === params.uid)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    const body = await request.json() as Partial<UserDTO>
    const updated = { ...users[idx], ...body, updatedAt: Date.now() }
    users = users.map((u, i) => (i === idx ? updated : u))
    return HttpResponse.json(updated)
  }),

  // ── Admin: deactivate user ───────────────────────────────────────────────────

  http.post('*/api/v1/admin/users/:uid/deactivate', async ({ params }) => {
    await delay(DELAY)
    const idx = users.findIndex((u) => u.firebaseUid === params.uid)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    if (!users[idx].isActive) {
      return HttpResponse.json(
        { error: { code: 'ALREADY_DEACTIVATED', message: 'User already deactivated', requestId: 'mock-req' } },
        { status: 409 },
      )
    }
    const updated = { ...users[idx], isActive: false, deactivatedAt: Date.now(), deactivatedBy: 'admin-uid-001', updatedAt: Date.now() }
    users = users.map((u, i) => (i === idx ? updated : u))
    return HttpResponse.json(updated)
  }),

  // ── Verification: queue ──────────────────────────────────────────────────────

  http.get('*/api/v1/verify/queue', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const state = url.searchParams.get('state')
    const provinceCode = url.searchParams.get('provinceCode')
    const entityType = url.searchParams.get('entityType')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
    const cursor = url.searchParams.get('cursor')

    let filtered = queueItems
    if (state) {
      const states = state.split(',')
      filtered = filtered.filter((i) => states.includes(i.state))
    }
    if (provinceCode) filtered = filtered.filter((i) => i.provinceCode === provinceCode)
    if (entityType) filtered = filtered.filter((i) => i.entityType === entityType)

    const { slice, nextCursor } = paginate(filtered, cursor, limit)
    return HttpResponse.json({ items: slice, nextCursor, serverTimestamp: Date.now() })
  }),

  // ── Verification: open for review ────────────────────────────────────────────

  http.post('*/api/v1/verify/:entityType/:uuid/open', async ({ params }) => {
    await delay(DELAY)
    const item = queueItems.find((i) => i.uuid === params.uuid)
    if (!item) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Entity not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    if (item.state !== 'submitted') {
      return HttpResponse.json(
        { error: { code: 'INVALID_STATE_TRANSITION', message: `Cannot open from state: ${item.state}`, requestId: 'mock-req' } },
        { status: 409 },
      )
    }
    queueItems = queueItems.map((i) =>
      i.uuid === params.uuid ? { ...i, state: 'under_review' as const, updatedAt: Date.now() } : i,
    )
    return HttpResponse.json({
      entity: { _id: params.uuid, state: 'under_review', updatedAt: Date.now() },
      revisionRowId: `rev-mock-${Date.now()}`,
    })
  }),

  // ── Verification: return ─────────────────────────────────────────────────────

  http.post('*/api/v1/verify/quadrat/:uuid/return', async ({ params, request }) => {
    await delay(DELAY)
    const body = await request.json() as { reviewerComment: string }
    if (!body.reviewerComment?.trim()) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'reviewerComment is required', requestId: 'mock-req' } },
        { status: 400 },
      )
    }
    queueItems = queueItems.map((i) =>
      i.uuid === params.uuid
        ? { ...i, state: 'returned_for_revisions' as const, revisionCount: i.revisionCount + 1, updatedAt: Date.now() }
        : i,
    )
    return HttpResponse.json({
      entity: { _id: params.uuid, state: 'returned_for_revisions', updatedAt: Date.now() },
      revisionRowId: `rev-mock-${Date.now()}`,
      affectedClumpCount: 2,
    })
  }),

  // ── Verification: approve ────────────────────────────────────────────────────

  http.post('*/api/v1/verify/quadrat/:uuid/approve', async ({ params }) => {
    await delay(DELAY)
    queueItems = queueItems.filter((i) => i.uuid !== params.uuid)
    return HttpResponse.json({
      entity: { _id: params.uuid, state: 'approved', updatedAt: Date.now() },
      revisionRowId: `rev-mock-${Date.now()}`,
      publicPromotion: { quadratPromoted: true, clumpCount: 4, photoCount: 16 },
    })
  }),

  // ── Admin: audit log ─────────────────────────────────────────────────────────

  http.get('*/api/v1/admin/audit', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const cursor = url.searchParams.get('cursor')

    let filtered = AUDIT_EVENTS
    if (action) filtered = filtered.filter((e) => e.action === action)

    const { slice, nextCursor } = paginate(filtered, cursor, limit)
    return HttpResponse.json({ events: slice, nextCursor })
  }),

  // ── Admin: trigger batch run ─────────────────────────────────────────────────

  http.post('*/api/v1/admin/batch/verify/run', async () => {
    await delay(DELAY)
    const newRun: BatchRun = {
      runId: `run-mock-${Date.now()}`,
      startedAt: Date.now(),
      finishedAt: null,
      status: 'queued',
      scheduledDay: 0,
      timeZone: 'Asia/Manila',
      triggeredBy: 'admin:admin-uid-001',
      staleUnderReviewEscalated: 0,
      staleReturnedAbandoned: 0,
      errorMessage: null,
    }
    batchRuns = [newRun, ...batchRuns]
    return HttpResponse.json({ runId: newRun.runId, status: 'queued', triggeredBy: newRun.triggeredBy, startedAt: newRun.startedAt })
  }),

  // ── Admin: list batch runs ────────────────────────────────────────────────────

  http.get('*/api/v1/admin/batch/runs', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const cursor = url.searchParams.get('cursor')

    let filtered = batchRuns
    if (status) filtered = filtered.filter((r) => r.status === status)

    const { slice, nextCursor } = paginate(filtered, cursor, limit)
    return HttpResponse.json({ runs: slice, nextCursor })
  }),

  // ── Admin: batch run detail ───────────────────────────────────────────────────

  http.get('*/api/v1/admin/batch/runs/:runId', async ({ params }) => {
    await delay(DELAY)
    const run = batchRuns.find((r) => r.runId === params.runId)
    if (!run) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Run not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    return HttpResponse.json(run)
  }),
]
