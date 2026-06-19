// ─── Auth & Roles ────────────────────────────────────────────────────────────

export type Role = 'admin' | 'verifier' | 'user'

export type VerificationScope = { provinces: string[] } | '*'

// ─── Entity States ───────────────────────────────────────────────────────────

export type QuadratState =
  | 'submitted'
  | 'under_review'
  | 'returned_for_revisions'
  | 'approved'
  | 'abandoned'

export type ClumpState = QuadratState

// ─── Users ───────────────────────────────────────────────────────────────────

export interface UserDTO {
  firebaseUid: string
  email: string
  emailLower?: string
  displayName: string
  role: Role
  verificationScope?: VerificationScope
  isActive: boolean
  notificationPreferences: { returnPush: boolean; emailDigest: boolean }
  notes?: string // only visible to admin callers
  activeDeviceId?: string
  createdAt: number
  updatedAt: number
  deactivatedAt?: number
  deactivatedBy?: string
}

// ─── Geographic Divisions ────────────────────────────────────────────────────

export type DivisionType = 'region' | 'province' | 'municipality' | 'barangay'

export interface GeographicDivision {
  code: string
  name: string
  type: DivisionType
  parentCode: string | null
  regionCode: string
  hasData?: boolean // only on authenticated endpoint
}

export interface GeographicDivisionsResponse {
  serverTimestamp: number
  divisions: GeographicDivision[]
}

// ─── Sync entities (read via admin — endpoint TBD) ───────────────────────────

export interface RevisionEntry {
  revisionId: string
  fromState: string
  toState: string
  reviewerDisplay: string
  comment: string
  at: number
}

export interface Quadrat {
  _id: string
  serverId: number
  provinceCode: string
  province: string
  regionCode: string
  region?: string
  municipalityCode?: string
  municipality?: string
  barangayCode?: string
  barangay?: string
  quadratNumber?: string
  typeOfOwnership?: 'Public' | 'Private'
  standClass?: 'Natural' | 'Plantation'
  surveyorName?: string
  surveyDate?: string
  latitude?: number
  longitude?: number
  altitude?: number
  notes?: string
  state: QuadratState
  revisionCount: number
  latestReviewerComment?: string
  latestRevisions: RevisionEntry[]
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}

export interface Clump {
  _id: string
  serverId: number
  quadratUuid: string
  clumpName?: string
  scientificName?: string
  commonName?: string
  culmCount?: number
  averageDiameterCm?: number
  averageHeightMeters?: number
  state: ClumpState
  revisionCount: number
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}

// ─── Public (PII-scrubbed) ───────────────────────────────────────────────────

export interface PublicQuadrat {
  _id: string
  serverId: number
  regionCode: string
  region: string
  provinceCode: string
  province: string
  municipalityCode: string
  municipality: string
  barangayCode: string
  barangay: string
  latitude?: number
  longitude?: number
  clumpCount: number
  photoCount: number
  approvedAt: number
  dominantSpecies?: string
}

export interface SpeciesSummary {
  scientificName: string
  clumpCount: number
}

export interface PublicPhoto {
  photoId: string
  photoUrl: string
  capturedAt: number
}

export interface PublicClump {
  _id: string
  quadratId: string
  scientificName: string
  commonName: string
  culmCount: number
  averageDiameterCm: number
  averageHeightMeters: number
  approvedAt: number
  photos: PublicPhoto[]
  // Survey measurement fields (from API)
  azimuth: number         // degrees from north, clockwise
  distanceMeters: number  // distance from quadrat centroid
  // Computed client-side from quadrat centroid + azimuth/distance
  latitude?: number
  longitude?: number
}

export interface PublicQuadratDetail extends PublicQuadrat {
  elevationMeters?: number
  slopeDegrees?: number
  aspectDegrees?: number
  speciesSummary: SpeciesSummary[]
  clumps: PublicClump[]
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface VerifyQueueItem {
  entityType: 'quadrat' | 'clump'
  uuid: string
  state: QuadratState
  provinceCode: string
  surveyorUid: string
  createdAt: number
  updatedAt: number
  revisionCount: number
  pendingClumpUuids: string[]
  escalated: boolean
}

export interface VerifyQueueResponse {
  items: VerifyQueueItem[]
  nextCursor: string | null
  serverTimestamp: number
}

export interface VerifyActionResponse {
  entity: Quadrat | Clump
  revisionRowId: string
  affectedClumpCount?: number // return action only
  publicPromotion?: {          // approve action only
    quadratPromoted: boolean
    clumpCount: number
    photoCount: number
  }
}

// ─── Admin: Users ────────────────────────────────────────────────────────────

export interface AdminUsersResponse {
  items: UserDTO[]
  nextCursor: string | null
}

export interface CreateUserBody {
  email: string
  displayName: string
  role: Role
  verificationScope?: VerificationScope
  notes?: string
}

export interface UpdateUserBody {
  role?: Role
  verificationScope?: VerificationScope
  displayName?: string
  isActive?: boolean
  notes?: string
}

// ─── Admin: Audit ────────────────────────────────────────────────────────────

export type AuditAction =
  | 'verification.open'
  | 'verification.approve'
  | 'verification.return'
  | 'verification.escalated'
  | 'verification.abandoned'
  | 'user.created'
  | 'user.patched'
  | 'user.deactivated'
  | 'user.reactivated'
  | 'batch.run.started'
  | 'batch.run.succeeded'
  | 'batch.run.failed'
  | 'sync.soft_delete_cascade'

export interface AuditEvent {
  eventId: string
  at: number
  actor: { uid: string; role: string }
  subject: { type: string; id: string; provinceCode: string }
  action: AuditAction
  fromState: string | null
  toState: string | null
  comment: string | null
  reason: string | null
  requestId: string
}

export interface AuditLogResponse {
  events: AuditEvent[]
  nextCursor: string | null
}

// ─── Admin: Batch ─────────────────────────────────────────────────────────────

export type BatchStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface BatchRun {
  runId: string
  startedAt: number
  finishedAt: number | null
  status: BatchStatus
  scheduledDay: number
  timeZone: string
  triggeredBy: string
  staleUnderReviewEscalated: number
  staleReturnedAbandoned: number
  sampleEventIds?: string[]
  errorMessage: string | null
}

export interface BatchRunsResponse {
  runs: BatchRun[]
  nextCursor: string | null
}

// ─── Error envelope ───────────────────────────────────────────────────────────

export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    requestId: string
    details?: Record<string, unknown>
  }
}

// ─── Paginated helpers ────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  items: T[]
  nextCursor: string | null
}
