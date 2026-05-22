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
        { code: '04A',    name: 'CALABARZON',    type: 'region',       parentCode: null,    regionCode: '04A',    hasData: true },
        { code: 'LAG',    name: 'Laguna',         type: 'province',     parentCode: '04A',   regionCode: '04A',    hasData: true },
        { code: 'BTG',    name: 'Batangas',       type: 'province',     parentCode: '04A',   regionCode: '04A',    hasData: true },
        { code: 'CAV',    name: 'Cavite',         type: 'province',     parentCode: '04A',   regionCode: '04A',    hasData: true },
        { code: 'RIZ',    name: 'Rizal',          type: 'province',     parentCode: '04A',   regionCode: '04A',    hasData: true },
        { code: 'QUE',    name: 'Quezon',         type: 'province',     parentCode: '04A',   regionCode: '04A',    hasData: true },
        { code: 'LAG01',  name: 'Biñan',          type: 'municipality', parentCode: 'LAG',   regionCode: '04A',    hasData: true },
        { code: 'LAG02',  name: 'Santa Rosa',     type: 'municipality', parentCode: 'LAG',   regionCode: '04A',    hasData: true },
        { code: 'LAG03',  name: 'Calamba',        type: 'municipality', parentCode: 'LAG',   regionCode: '04A',    hasData: true },
        { code: 'LAG04',  name: 'Los Baños',      type: 'municipality', parentCode: 'LAG',   regionCode: '04A',    hasData: true },
      ],
    })
  }),

  // ── Public: geographic divisions (anonymous) ─────────────────────────────────

  http.get('*/api/v1/public/geographic/divisions', async () => {
    await delay(DELAY)
    return HttpResponse.json({
      serverTimestamp: Date.now(),
      divisions: [
        { code: '04A',  name: 'CALABARZON', type: 'region',   parentCode: null,  regionCode: '04A' },
        { code: 'LAG',  name: 'Laguna',      type: 'province', parentCode: '04A', regionCode: '04A' },
        { code: 'BTG',  name: 'Batangas',    type: 'province', parentCode: '04A', regionCode: '04A' },
        { code: 'CAV',  name: 'Cavite',      type: 'province', parentCode: '04A', regionCode: '04A' },
        { code: 'RIZ',  name: 'Rizal',       type: 'province', parentCode: '04A', regionCode: '04A' },
        { code: 'QUE',  name: 'Quezon',      type: 'province', parentCode: '04A', regionCode: '04A' },
      ],
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

  http.get('*/api/v1/public/quadrats/:uuid', async ({ params }) => {
    await delay(DELAY)
    const detail = PUBLIC_QUADRAT_DETAIL[params.uuid as string]
    if (!detail) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Quadrat not found', requestId: 'mock-req' } },
        { status: 404 },
      )
    }
    return HttpResponse.json(detail)
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
