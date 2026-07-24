# BRITE-MAP Dashboard

Web dashboard for the **Bamboo Resources Inventory and Tracking through Enhanced Mapping (BRITE-MAP)** system — a national bamboo distribution survey platform developed by UPLB in partnership with DOST-PCAARRD.

This repository contains the Next.js frontend. It covers the public-facing map, the verification workflow for field surveyors, and the admin console for managing users, audit logs, and batch processing.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routes & Access Control](#routes--access-control)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Mock Mode](#mock-mode)
- [Authentication & Roles](#authentication--roles)
- [API Layer](#api-layer)
- [Map Architecture](#map-architecture)
- [Building for Production](#building-for-production)

---

## Features

**Public**
- Interactive bamboo distribution map (MapLibre GL + deck.gl)
- Choropleth province density layer, heatmap, clustered/individual points
- Stats & filter panel — search by barangay/municipality/province, region dropdown, min-clumps/min-photos sliders
- Deep-linkable selected quadrat via `?quadrat=uuid` URL param
- URL-persisted map filters (shareable links)
- Quadrat detail page — species summary, clump measurements, photo gallery

**Verification (admin + verifier)**
- Verification queue with state filter (`submitted`, `under_review`, `returned_for_revisions`)
- Province scope enforcement — verifiers see only their assigned provinces
- Open → Review → Approve / Return for Revisions workflow
- Auto-redirect with countdown after action

**Admin**
- User management — create, edit roles/scope, deactivate
- Audit log with actor/action/subject filtering
- Batch run management — trigger, list, inspect run details
- Dashboard overview — live queue counts, approved quadrat map

**General**
- Dark / light mode (Tailwind `darkMode: 'class'`)
- Table loading skeletons, confirmation dialogs (no `window.confirm`)
- Session expiry → auto-redirect to `/login` on 401
- Forgot password flow via Firebase `sendPasswordResetEmail`

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 3 |
| State / Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth | Firebase Auth v10 (email/password, custom claims) |
| Map | MapLibre GL v4 + react-map-gl v8 |
| Map layers | deck.gl v9 (ScatterplotLayer, HeatmapLayer, GeoJsonLayer) |
| Mock API | MSW v2 (browser service worker) |
| Language | TypeScript 5 |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Landing page (public)
│   ├── layout.tsx                      # Root layout (ThemeProvider, QueryClient, MSW)
│   ├── (auth)/
│   │   └── login/page.tsx              # Login + forgot password
│   ├── (public)/
│   │   ├── map/page.tsx                # Interactive map (no auth required)
│   │   └── quadrats/[uuid]/page.tsx    # Quadrat detail
│   ├── (verify)/
│   │   ├── layout.tsx                  # Guard: admin or verifier only
│   │   ├── queue/page.tsx              # Verification queue
│   │   └── [entityType]/[uuid]/page.tsx # Review + approve/return
│   └── (admin)/
│       ├── layout.tsx                  # Guard: admin only
│       ├── dashboard/page.tsx          # Overview + mini map
│       ├── users/
│       │   ├── page.tsx                # User list
│       │   ├── new/page.tsx            # Create user
│       │   └── [uid]/page.tsx          # Edit user
│       ├── audit/page.tsx              # Audit log
│       ├── batch/
│       │   ├── page.tsx                # Batch run list + trigger
│       │   └── [runId]/page.tsx        # Batch run detail
│       └── settings/page.tsx           # Profile settings
├── components/
│   ├── layout/AppShell.tsx             # Sidebar + top bar
│   ├── map/
│   │   ├── BritemapGL.tsx              # Main map component
│   │   ├── DeckGLOverlay.tsx           # deck.gl ↔ MapLibre bridge
│   │   ├── LayerPanel.tsx              # Right-side layer/style controls
│   │   ├── StatsFilterPanel.tsx        # Left-side stats + geographic filters
│   │   ├── deck-layers.ts              # Layer factory functions
│   │   └── use-map-layers.ts           # Layer state hook
│   └── ui/
│       ├── ConfirmDialog.tsx           # Modal confirmation dialog
│       ├── StatusBadge.tsx             # Quadrat state pill
│       └── TableSkeleton.tsx           # Animated shimmer rows
├── lib/
│   ├── api.ts                          # All API functions (typed)
│   ├── auth-context.tsx                # Firebase auth + mock auth provider
│   ├── firebase.ts                     # Firebase app init (skipped in mock mode)
│   ├── theme-context.tsx               # Dark/light mode toggle
│   └── types.ts                        # Shared TypeScript types
└── mocks/
    ├── browser.ts                      # MSW service worker setup
    ├── handlers.ts                     # Mock request handlers
    └── data.ts                         # Seed data (quadrats, users, queue, etc.)
```

---

## Routes & Access Control

| Path | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/map` | Public | Interactive bamboo distribution map |
| `/quadrats/:uuid` | Public | Quadrat detail |
| `/login` | Public | Email/password login, forgot password |
| `/queue` | Admin, Verifier | Verification queue |
| `/:entityType/:uuid` | Admin, Verifier | Review entity (approve / return) |
| `/dashboard` | Admin | Overview stats + mini map |
| `/users` | Admin | User list |
| `/users/new` | Admin | Create user |
| `/users/:uid` | Admin | Edit user role / scope |
| `/audit` | Admin | Audit event log |
| `/batch` | Admin | Batch run list + manual trigger |
| `/batch/:runId` | Admin | Batch run detail |
| `/settings` | Admin | Profile settings |

Route guards live in `(admin)/layout.tsx` (admin-only) and `(verify)/layout.tsx` (admin or verifier). Unauthenticated users are redirected to `/login`; users without sufficient role are redirected to `/queue` or `/login`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project (for production) — not required for mock mode

### Install

```bash
git clone git@github.com:aldrinjao/britemap-datamanaged.git
cd britemap-datamanaged
npm install
```

### Run in mock mode (no backend or Firebase needed)

```bash
npm run dev:mock
```

Open [http://localhost:3000](http://localhost:3000).

Log in with any of these mock credentials (password can be anything):

| Email | Role | Notes |
|---|---|---|
| `admin@example.com` | Admin | Full access |
| `verifier@example.com` | Verifier | Scoped to LAG, BTG provinces |
| `user@example.com` | User | No dashboard access |

### Run against a real backend

1. Copy the env file and fill in values:

```bash
cp .env.local.example .env.local
```

2. Start the dev server:

```bash
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_MOCK_API` | — | Set to `true` to enable MSW mock mode (no backend or Firebase needed) |
| `NEXT_PUBLIC_API_BASE_URL` | Yes (real) | Backend base URL, e.g. `https://api.britemap.example.com/api/v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes (real) | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes (real) | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes (real) | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes (real) | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes (real) | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes (real) | Firebase app ID |

All Firebase variables are ignored when `NEXT_PUBLIC_MOCK_API=true`.

---

## Mock Mode

Mock mode uses [MSW v2](https://mswjs.io/) to intercept all API calls in the browser via a service worker. No backend or Firebase project is needed.

**How it works:**

1. `npm run dev:mock` sets `NEXT_PUBLIC_MOCK_API=true`
2. `MSWProvider` in `app/layout.tsx` starts the service worker on mount
3. All `fetch` calls to `*/api/v1/*` are intercepted by the handlers in `src/mocks/handlers.ts`
4. Auth is simulated — the role is derived from the email prefix (`admin`, `verifier`, or `user`)
5. Mock session persists across page refreshes via `localStorage`

**In-memory state:** Users, queue items, and batch runs are mutable during a session (create user, approve queue item, trigger batch run all work). State resets on page reload.

**MSW service worker:** The file `public/mockServiceWorker.js` is the pre-built MSW worker. If you upgrade MSW, regenerate it with:

```bash
npm run msw:init
```

---

## Authentication & Roles

Authentication uses **Firebase Auth** with custom ID token claims set by the backend.

| Claim | Type | Description |
|---|---|---|
| `role` | `'admin' \| 'verifier' \| 'user'` | User's role |
| `scope` | `string[] \| '*'` | Verification scope — province codes for verifiers, `'*'` for admins |

The `AuthProvider` (`src/lib/auth-context.tsx`) reads these claims from `getIdTokenResult()` on sign-in and on `onAuthStateChanged`. The token is refreshed automatically before expiry.

**Verification scope** controls which provinces a verifier can see in the queue. If `scope` is `['LAG', 'BTG']`, the queue page restricts the province filter dropdown to those two provinces and shows a scope notice banner.

---

## API Layer

All API calls go through `src/lib/api.ts`. It exports namespaced function groups:

| Export | Description |
|---|---|
| `publicApi` | Public quadrat list + detail (no auth) |
| `geo` | Geographic divisions (authenticated + public variants) |
| `me` | Self-profile read + update |
| `adminUsers` | List, get, create, update, deactivate users |
| `verify` | Queue, open, approve, return actions |
| `audit` | Audit event log |
| `batch` | Batch run list, detail, manual trigger |
| `health` | Liveness + readiness probes |

All functions return typed promises. On a non-OK response, `apiFetch` throws a `BritemapApiError` with `status`, `code`, `message`, `requestId`, and optional `details`. On a `401` (outside of `/login` and mock mode), it redirects to `/login` automatically.

---

## Map Architecture

The map is built on **MapLibre GL** (basemap rendering) with **deck.gl** overlaid via a custom `DeckGLOverlay` component that bridges the two libraries.

### Layers (deck.gl)

| Layer | Condition |
|---|---|
| `ProvinceFillLayer` | Choropleth — province polygon fill, intensity = survey density |
| `RegionOutlineLayer` | Region boundary lines |
| `MunicipalityOutlineLayer` | Municipality boundary lines |
| `BarangayOutlineLayer` | Barangay boundary lines |
| `HeatmapLayer` | Survey density heatmap |
| `ScatterplotLayer` | Individual quadrat points (clustered or individual mode) |

Boundary layers require GeoJSON files placed in `public/geodata/`:

```
public/geodata/
├── provinces.geojson     # PSA PSGC — each feature needs properties.PSGC matching provinceCode
├── regions.geojson
├── municipalities.geojson
└── barangays.geojson
```

### Survey map tiles

The per-municipality bamboo classification polygons are a single PMTiles archive,
read over HTTP range requests — the browser fetches the header plus the tiles in
view rather than the whole file. They are raster-derived, so a few features carry
a very large number of vertices (Palawan: 18 municipalities, 1.38M points);
served whole they cost ~8 MB gzipped for a view that renders each province a few
hundred pixels wide.

Each province is its own vector-tile layer, named to match the ids in
`SURVEY_MAPS` (`src/components/map/overlay-config.ts`). Simplification affects
only the drawn outline — `area_ha` is carried as a tile attribute and still
reflects the surveyed figure.

**Hosting.** The archive is served from **Vercel Blob** (store `britemap-blob`),
not the deployment bundle — it is neither committed nor shipped in `public/`.
`NEXT_PUBLIC_SURVEY_MAPS_PMTILES` holds the Blob URL and is set in all Vercel
environments plus local `.env.local`. `overlay-config.ts` falls back to the local
`/geodata/survey-maps.pmtiles` path when that var is unset, so a locally built
archive still works without Blob. Any host is fine as long as it supports range
requests (Blob does).

**Rebuilding.** From the raw exports in `map_assets/` (gitignored), with
tippecanoe installed:

```bash
brew install tippecanoe
npm run build:survey-tiles   # writes public/geodata/survey-maps.pmtiles (gitignored)
```

The script prints the `vercel blob put … --allow-overwrite` command to publish the
result. Reusing the same pathname keeps the URL stable, so no env change is needed
on re-upload.

### Filter pipeline

Geographic and count filters (Stats & Filters panel, left side) are applied in `map/page.tsx` via `applyMapFilters()` before the data reaches deck.gl. Date range and species filters (Layers panel, right side) are applied inside `BritemapGL` via `use-map-layers`. Both filter sets stack. When the layer filters reduce the visible count below the geographic filter count, the Stats panel shows an amber note.

### Basemap styles

| Style | Source |
|---|---|
| Streets | OpenFreeMap Liberty (free, no key required) |
| Satellite | ESRI World Imagery (free, attribution required) |

---

## Building for Production

```bash
npm run build
npm run start
```

Ensure all `NEXT_PUBLIC_*` environment variables are set before building. The build will succeed without Firebase variables only if `NEXT_PUBLIC_MOCK_API=true` — do not deploy with mock mode enabled.

### Type checking

```bash
npm run typecheck
```

---

## Credits

Developed by the UPLB Bamboo Research Team in partnership with DOST-PCAARRD.
