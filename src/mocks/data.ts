import type {
  UserDTO,
  PublicQuadrat,
  PublicQuadratDetail,
  VerifyQueueItem,
  AuditEvent,
  BatchRun,
} from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function daysAgo(n: number) {
  return Date.now() - n * 86_400_000
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const MOCK_USERS: UserDTO[] = [
  {
    firebaseUid: 'admin-uid-001',
    email: 'admin@britemap.ph',
    emailLower: 'admin@britemap.ph',
    displayName: 'Maria Santos',
    role: 'admin',
    isActive: true,
    notificationPreferences: { returnPush: true, emailDigest: true },
    notes: 'System administrator, UPLB-CFNR',
    createdAt: daysAgo(365),
    updatedAt: daysAgo(10),
  },
  {
    firebaseUid: 'verifier-uid-001',
    email: 'jdelacruz@britemap.ph',
    emailLower: 'jdelacruz@britemap.ph',
    displayName: 'Juan Dela Cruz',
    role: 'verifier',
    verificationScope: { provinces: ['LAG', 'BTG', 'CAV'] },
    isActive: true,
    notificationPreferences: { returnPush: true, emailDigest: false },
    createdAt: daysAgo(300),
    updatedAt: daysAgo(5),
  },
  {
    firebaseUid: 'verifier-uid-002',
    email: 'alopez@britemap.ph',
    emailLower: 'alopez@britemap.ph',
    displayName: 'Ana Lopez',
    role: 'verifier',
    verificationScope: { provinces: ['RIZ', 'QUE'] },
    isActive: true,
    notificationPreferences: { returnPush: false, emailDigest: true },
    createdAt: daysAgo(280),
    updatedAt: daysAgo(20),
  },
  {
    firebaseUid: 'user-uid-001',
    email: 'pbautista@uplb.edu.ph',
    emailLower: 'pbautista@uplb.edu.ph',
    displayName: 'Pedro Bautista',
    role: 'user',
    isActive: true,
    notificationPreferences: { returnPush: true, emailDigest: false },
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },
  {
    firebaseUid: 'user-uid-002',
    email: 'lreyes@uplb.edu.ph',
    emailLower: 'lreyes@uplb.edu.ph',
    displayName: 'Lina Reyes',
    role: 'user',
    isActive: true,
    notificationPreferences: { returnPush: false, emailDigest: false },
    createdAt: daysAgo(180),
    updatedAt: daysAgo(7),
  },
  {
    firebaseUid: 'user-uid-003',
    email: 'mgarcia@uplb.edu.ph',
    emailLower: 'mgarcia@uplb.edu.ph',
    displayName: 'Miguel Garcia',
    role: 'user',
    isActive: false,
    notificationPreferences: { returnPush: false, emailDigest: false },
    createdAt: daysAgo(150),
    updatedAt: daysAgo(60),
    deactivatedAt: daysAgo(60),
    deactivatedBy: 'admin-uid-001',
  },
]

export const CURRENT_USER = MOCK_USERS[0]

// ─── Public quadrats (approved, PII-scrubbed) ─────────────────────────────────

export const PUBLIC_QUADRATS: PublicQuadrat[] = [
  // Laguna
  { _id: uid(1),  serverId: 1001, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG01', municipality: 'Biñan',      barangayCode: 'LAG0101', barangay: 'Dela Paz',         latitude: 14.1234, longitude: 121.0823, clumpCount: 8,  photoCount: 32, approvedAt: daysAgo(45) },
  { _id: uid(2),  serverId: 1002, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG02', municipality: 'Santa Rosa', barangayCode: 'LAG0201', barangay: 'Aplaya',           latitude: 14.1678, longitude: 121.1112, clumpCount: 5,  photoCount: 20, approvedAt: daysAgo(38) },
  { _id: uid(3),  serverId: 1003, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG03', municipality: 'Calamba',    barangayCode: 'LAG0301', barangay: 'Bucal',            latitude: 14.2124, longitude: 121.1645, clumpCount: 12, photoCount: 48, approvedAt: daysAgo(22) },
  { _id: uid(4),  serverId: 1004, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG04', municipality: 'Los Baños',  barangayCode: 'LAG0401', barangay: 'Batong Malake',    latitude: 14.1667, longitude: 121.2353, clumpCount: 7,  photoCount: 28, approvedAt: daysAgo(60) },
  { _id: uid(5),  serverId: 1005, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG05', municipality: 'Bay',        barangayCode: 'LAG0501', barangay: 'Masaya',           latitude: 14.0987, longitude: 121.2856, clumpCount: 9,  photoCount: 36, approvedAt: daysAgo(15) },
  { _id: uid(6),  serverId: 1006, regionCode: '04A', region: 'CALABARZON', provinceCode: 'LAG', province: 'Laguna',    municipalityCode: 'LAG06', municipality: 'Pagsanjan',  barangayCode: 'LAG0601', barangay: 'Anibong',          latitude: 14.2678, longitude: 121.4567, clumpCount: 6,  photoCount: 24, approvedAt: daysAgo(90) },
  // Batangas
  { _id: uid(7),  serverId: 1007, regionCode: '04A', region: 'CALABARZON', provinceCode: 'BTG', province: 'Batangas',  municipalityCode: 'BTG01', municipality: 'Batangas City', barangayCode: 'BTG0101', barangay: 'Kumintang Ibaba', latitude: 13.7566, longitude: 121.0584, clumpCount: 11, photoCount: 44, approvedAt: daysAgo(30) },
  { _id: uid(8),  serverId: 1008, regionCode: '04A', region: 'CALABARZON', provinceCode: 'BTG', province: 'Batangas',  municipalityCode: 'BTG02', municipality: 'Lipa',       barangayCode: 'BTG0201', barangay: 'Marauoy',          latitude: 13.9412, longitude: 121.1634, clumpCount: 4,  photoCount: 16, approvedAt: daysAgo(55) },
  { _id: uid(9),  serverId: 1009, regionCode: '04A', region: 'CALABARZON', provinceCode: 'BTG', province: 'Batangas',  municipalityCode: 'BTG03', municipality: 'Tanauan',    barangayCode: 'BTG0301', barangay: 'Bagbag',           latitude: 13.9895, longitude: 121.0023, clumpCount: 8,  photoCount: 32, approvedAt: daysAgo(40) },
  { _id: uid(10), serverId: 1010, regionCode: '04A', region: 'CALABARZON', provinceCode: 'BTG', province: 'Batangas',  municipalityCode: 'BTG04', municipality: 'Santo Tomas', barangayCode: 'BTG0401', barangay: 'San Roque',       latitude: 14.1034, longitude: 121.1456, clumpCount: 6,  photoCount: 24, approvedAt: daysAgo(18) },
  // Cavite
  { _id: uid(11), serverId: 1011, regionCode: '04A', region: 'CALABARZON', provinceCode: 'CAV', province: 'Cavite',    municipalityCode: 'CAV01', municipality: 'Dasmariñas', barangayCode: 'CAV0101', barangay: 'San Agustin I',   latitude: 14.3294, longitude: 120.9367, clumpCount: 5,  photoCount: 20, approvedAt: daysAgo(70) },
  { _id: uid(12), serverId: 1012, regionCode: '04A', region: 'CALABARZON', provinceCode: 'CAV', province: 'Cavite',    municipalityCode: 'CAV02', municipality: 'General Trias', barangayCode: 'CAV0201', barangay: 'Buenavista',  latitude: 14.3867, longitude: 120.8823, clumpCount: 7,  photoCount: 28, approvedAt: daysAgo(25) },
  { _id: uid(13), serverId: 1013, regionCode: '04A', region: 'CALABARZON', provinceCode: 'CAV', province: 'Cavite',    municipalityCode: 'CAV03', municipality: 'Silang',     barangayCode: 'CAV0301', barangay: 'Puting Kahoy',    latitude: 14.2289, longitude: 120.9734, clumpCount: 9,  photoCount: 36, approvedAt: daysAgo(50) },
  // Rizal
  { _id: uid(14), serverId: 1014, regionCode: '04A', region: 'CALABARZON', provinceCode: 'RIZ', province: 'Rizal',     municipalityCode: 'RIZ01', municipality: 'Antipolo',   barangayCode: 'RIZ0101', barangay: 'San Jose',        latitude: 14.5890, longitude: 121.1760, clumpCount: 10, photoCount: 40, approvedAt: daysAgo(12) },
  { _id: uid(15), serverId: 1015, regionCode: '04A', region: 'CALABARZON', provinceCode: 'RIZ', province: 'Rizal',     municipalityCode: 'RIZ02', municipality: 'Tanay',      barangayCode: 'RIZ0201', barangay: 'Daraitan',        latitude: 14.5023, longitude: 121.2945, clumpCount: 14, photoCount: 56, approvedAt: daysAgo(80) },
  { _id: uid(16), serverId: 1016, regionCode: '04A', region: 'CALABARZON', provinceCode: 'RIZ', province: 'Rizal',     municipalityCode: 'RIZ03', municipality: 'Baras',      barangayCode: 'RIZ0301', barangay: 'Concepcion',      latitude: 14.5134, longitude: 121.2456, clumpCount: 6,  photoCount: 24, approvedAt: daysAgo(35) },
  // Quezon
  { _id: uid(17), serverId: 1017, regionCode: '04A', region: 'CALABARZON', provinceCode: 'QUE', province: 'Quezon',    municipalityCode: 'QUE01', municipality: 'Lucena',     barangayCode: 'QUE0101', barangay: 'Isabang',         latitude: 13.9302, longitude: 121.6170, clumpCount: 8,  photoCount: 32, approvedAt: daysAgo(42) },
  { _id: uid(18), serverId: 1018, regionCode: '04A', region: 'CALABARZON', provinceCode: 'QUE', province: 'Quezon',    municipalityCode: 'QUE02', municipality: 'Tayabas',    barangayCode: 'QUE0201', barangay: 'Alitao',          latitude: 14.0234, longitude: 121.5923, clumpCount: 5,  photoCount: 20, approvedAt: daysAgo(65) },
  { _id: uid(19), serverId: 1019, regionCode: '04A', region: 'CALABARZON', provinceCode: 'QUE', province: 'Quezon',    municipalityCode: 'QUE03', municipality: 'Candelaria', barangayCode: 'QUE0301', barangay: 'Mangilag Norte',  latitude: 13.9289, longitude: 121.4234, clumpCount: 7,  photoCount: 28, approvedAt: daysAgo(28) },
  { _id: uid(20), serverId: 1020, regionCode: '04A', region: 'CALABARZON', provinceCode: 'QUE', province: 'Quezon',    municipalityCode: 'QUE04', municipality: 'Sariaya',    barangayCode: 'QUE0401', barangay: 'Sampaloc',        latitude: 13.9567, longitude: 121.5345, clumpCount: 3,  photoCount: 12, approvedAt: daysAgo(95) },
]

// ─── Public quadrat detail ────────────────────────────────────────────────────

export const PUBLIC_QUADRAT_DETAIL: Record<string, PublicQuadratDetail> = {}

const SPECIES = [
  { scientific: 'Bambusa blumeana',         common: 'Kawayan tinik' },
  { scientific: 'Dendrocalamus asper',       common: 'Giant bamboo' },
  { scientific: 'Schizostachyum lumampao',   common: 'Buho' },
  { scientific: 'Gigantochloa levis',        common: 'Bayog' },
  { scientific: 'Bambusa vulgaris',          common: 'Kawayan torong' },
]

PUBLIC_QUADRATS.forEach((q, qi) => {
  const clumpCount = q.clumpCount
  const speciesA = SPECIES[qi % SPECIES.length]
  const speciesB = SPECIES[(qi + 1) % SPECIES.length]

  const clumps = Array.from({ length: clumpCount }, (_, ci) => {
    const sp = ci % 3 === 0 ? speciesB : speciesA
    const photoCount = Math.floor(q.photoCount / clumpCount)
    return {
      _id: uid(1000 + qi * 20 + ci),
      quadratId: q._id,
      scientificName: sp.scientific,
      commonName: sp.common,
      culmCount: 12 + ci * 3,
      averageDiameterCm: 5.2 + ci * 0.4,
      averageHeightMeters: 8.5 + ci * 0.8,
      approvedAt: q.approvedAt,
      photos: Array.from({ length: photoCount }, (_, pi) => ({
        photoId: uid(5000 + qi * 100 + ci * 10 + pi),
        // Public photo URL — served by the API
        photoUrl: `/api/v1/public/photos/${q._id}/${uid(1000 + qi * 20 + ci)}/${uid(5000 + qi * 100 + ci * 10 + pi)}.jpg`,
        capturedAt: q.approvedAt - 7 * 86_400_000,
      })),
    }
  })

  const speciesSummary = [
    { scientificName: speciesA.scientific, clumpCount: Math.floor(clumpCount * 0.7) },
    { scientificName: speciesB.scientific, clumpCount: clumpCount - Math.floor(clumpCount * 0.7) },
  ]

  PUBLIC_QUADRAT_DETAIL[q._id] = {
    ...q,
    elevationMeters: 80 + qi * 15,
    slopeDegrees: 3 + qi * 0.8,
    aspectDegrees: (qi * 40) % 360,
    speciesSummary,
    clumps,
  }
})

// ─── Verification queue items ─────────────────────────────────────────────────
// These are NOT in the public dataset (they're still pending)

export const QUEUE_ITEMS: VerifyQueueItem[] = [
  // submitted
  { entityType: 'quadrat', uuid: uid(101), state: 'submitted', provinceCode: 'LAG', surveyorUid: 'user-uid-001', createdAt: daysAgo(3),  updatedAt: daysAgo(2),  revisionCount: 0, pendingClumpUuids: [uid(201), uid(202)],       escalated: false },
  { entityType: 'quadrat', uuid: uid(102), state: 'submitted', provinceCode: 'BTG', surveyorUid: 'user-uid-002', createdAt: daysAgo(5),  updatedAt: daysAgo(4),  revisionCount: 0, pendingClumpUuids: [uid(203), uid(204), uid(205)], escalated: false },
  { entityType: 'quadrat', uuid: uid(103), state: 'submitted', provinceCode: 'CAV', surveyorUid: 'user-uid-001', createdAt: daysAgo(2),  updatedAt: daysAgo(1),  revisionCount: 0, pendingClumpUuids: [uid(206)],                 escalated: false },
  { entityType: 'quadrat', uuid: uid(104), state: 'submitted', provinceCode: 'LAG', surveyorUid: 'user-uid-002', createdAt: daysAgo(7),  updatedAt: daysAgo(6),  revisionCount: 0, pendingClumpUuids: [uid(207), uid(208)],       escalated: false },
  { entityType: 'quadrat', uuid: uid(105), state: 'submitted', provinceCode: 'RIZ', surveyorUid: 'user-uid-001', createdAt: daysAgo(4),  updatedAt: daysAgo(3),  revisionCount: 1, pendingClumpUuids: [uid(209)],                 escalated: false },
  // under_review
  { entityType: 'quadrat', uuid: uid(106), state: 'under_review', provinceCode: 'LAG', surveyorUid: 'user-uid-001', createdAt: daysAgo(10), updatedAt: daysAgo(1), revisionCount: 0, pendingClumpUuids: [uid(210), uid(211)],      escalated: false },
  { entityType: 'quadrat', uuid: uid(107), state: 'under_review', provinceCode: 'BTG', surveyorUid: 'user-uid-002', createdAt: daysAgo(8),  updatedAt: daysAgo(2), revisionCount: 1, pendingClumpUuids: [uid(212)],                escalated: false },
  { entityType: 'quadrat', uuid: uid(108), state: 'under_review', provinceCode: 'QUE', surveyorUid: 'user-uid-001', createdAt: daysAgo(15), updatedAt: daysAgo(3), revisionCount: 0, pendingClumpUuids: [uid(213), uid(214), uid(215)], escalated: true },
  // returned_for_revisions
  { entityType: 'quadrat', uuid: uid(109), state: 'returned_for_revisions', provinceCode: 'LAG', surveyorUid: 'user-uid-002', createdAt: daysAgo(20), updatedAt: daysAgo(5), revisionCount: 1, pendingClumpUuids: [], escalated: false },
  { entityType: 'quadrat', uuid: uid(110), state: 'returned_for_revisions', provinceCode: 'RIZ', surveyorUid: 'user-uid-001', createdAt: daysAgo(18), updatedAt: daysAgo(7), revisionCount: 2, pendingClumpUuids: [], escalated: false },
]

// ─── Audit events ─────────────────────────────────────────────────────────────

export const AUDIT_EVENTS: AuditEvent[] = [
  { eventId: 'evt001', at: daysAgo(1),  actor: { uid: 'verifier-uid-001', role: 'verifier' }, subject: { type: 'quadrat', id: uid(106), provinceCode: 'LAG' }, action: 'verification.open',    fromState: 'submitted',    toState: 'under_review',           comment: null, reason: null, requestId: 'req-001' },
  { eventId: 'evt002', at: daysAgo(2),  actor: { uid: 'verifier-uid-001', role: 'verifier' }, subject: { type: 'quadrat', id: uid(3),   provinceCode: 'LAG' }, action: 'verification.approve', fromState: 'under_review', toState: 'approved',               comment: null, reason: null, requestId: 'req-002' },
  { eventId: 'evt003', at: daysAgo(3),  actor: { uid: 'verifier-uid-002', role: 'verifier' }, subject: { type: 'quadrat', id: uid(109), provinceCode: 'LAG' }, action: 'verification.return',  fromState: 'under_review', toState: 'returned_for_revisions',  comment: 'Please re-measure clump #2 DBH.', reason: null, requestId: 'req-003' },
  { eventId: 'evt004', at: daysAgo(5),  actor: { uid: 'admin-uid-001',    role: 'admin' },    subject: { type: 'user',    id: 'user-uid-003', provinceCode: '' }, action: 'user.deactivated',   fromState: null,           toState: null,                     comment: null, reason: 'Inactive for 90 days', requestId: 'req-004' },
  { eventId: 'evt005', at: daysAgo(7),  actor: { uid: 'verifier-uid-001', role: 'verifier' }, subject: { type: 'quadrat', id: uid(14),  provinceCode: 'RIZ' }, action: 'verification.approve', fromState: 'under_review', toState: 'approved',               comment: null, reason: null, requestId: 'req-005' },
  { eventId: 'evt006', at: daysAgo(8),  actor: { uid: 'verifier-uid-002', role: 'verifier' }, subject: { type: 'quadrat', id: uid(107), provinceCode: 'BTG' }, action: 'verification.open',    fromState: 'submitted',    toState: 'under_review',           comment: null, reason: null, requestId: 'req-006' },
  { eventId: 'evt007', at: daysAgo(10), actor: { uid: 'admin-uid-001',    role: 'admin' },    subject: { type: 'batch',   id: 'run-002',      provinceCode: '' }, action: 'batch.run.succeeded', fromState: null,          toState: null,                     comment: null, reason: null, requestId: 'req-007' },
  { eventId: 'evt008', at: daysAgo(12), actor: { uid: 'verifier-uid-001', role: 'verifier' }, subject: { type: 'quadrat', id: uid(108), provinceCode: 'QUE' }, action: 'verification.escalated', fromState: 'under_review', toState: 'under_review',           comment: null, reason: 'Stale for 14 days', requestId: 'req-008' },
  { eventId: 'evt009', at: daysAgo(15), actor: { uid: 'admin-uid-001',    role: 'admin' },    subject: { type: 'user',    id: 'verifier-uid-002', provinceCode: '' }, action: 'user.created', fromState: null,          toState: null,                     comment: null, reason: null, requestId: 'req-009' },
  { eventId: 'evt010', at: daysAgo(20), actor: { uid: 'admin-uid-001',    role: 'admin' },    subject: { type: 'batch',   id: 'run-001',      provinceCode: '' }, action: 'batch.run.succeeded', fromState: null,          toState: null,                     comment: null, reason: null, requestId: 'req-010' },
]

// ─── Batch runs ───────────────────────────────────────────────────────────────

export const BATCH_RUNS: BatchRun[] = [
  {
    runId: 'run-003',
    startedAt: daysAgo(0),
    finishedAt: null,
    status: 'running',
    scheduledDay: 0,
    timeZone: 'Asia/Manila',
    triggeredBy: 'admin:admin-uid-001',
    staleUnderReviewEscalated: 0,
    staleReturnedAbandoned: 0,
    errorMessage: null,
  },
  {
    runId: 'run-002',
    startedAt: daysAgo(10),
    finishedAt: daysAgo(10) + 47_000,
    status: 'succeeded',
    scheduledDay: 15,
    timeZone: 'Asia/Manila',
    triggeredBy: 'scheduler',
    staleUnderReviewEscalated: 2,
    staleReturnedAbandoned: 1,
    sampleEventIds: ['evt007', 'evt008'],
    errorMessage: null,
  },
  {
    runId: 'run-001',
    startedAt: daysAgo(25),
    finishedAt: daysAgo(25) + 38_000,
    status: 'succeeded',
    scheduledDay: 1,
    timeZone: 'Asia/Manila',
    triggeredBy: 'scheduler',
    staleUnderReviewEscalated: 4,
    staleReturnedAbandoned: 2,
    sampleEventIds: ['evt010'],
    errorMessage: null,
  },
  {
    runId: 'run-000',
    startedAt: daysAgo(40),
    finishedAt: daysAgo(40) + 5_000,
    status: 'failed',
    scheduledDay: 15,
    timeZone: 'Asia/Manila',
    triggeredBy: 'scheduler',
    staleUnderReviewEscalated: 0,
    staleReturnedAbandoned: 0,
    errorMessage: 'Firebase Admin SDK timeout after 5s',
  },
]
