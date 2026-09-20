# Hemo Match Project Status

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Branch:** `main`
**Current Milestone:** Final GitHub & Portfolio Presentation Polish (COMPLETE)
**Production URL:** https://hemomatch.vercel.app
**Last Updated:** 2026-09-19

---

## 1. Current Project State

Nine milestones are complete. The application features a fully verified, privacy-safe, end-to-end Request → Match → Notify → Accept → Authorized Contact Reveal pipeline. Blood requests are persisted to PostgreSQL, matched via an authoritative server-only matching engine, and notified through an atomic database RPC with server-controlled revalidation and deterministic dispatch limits. Candidate donors receive in-app notifications in a private inbox without exposing phone numbers, names, or patient details, and can authoritatively record their Accept or Decline response with full database atomicity and strict revalidation. Once a donor accepts, the requester can explicitly initiate an authorized contact reveal, unlocking the minimum coordination contact details (name and phone) backed by database-enforced uniqueness, an atomic PostgreSQL authorization function, and zero PII audit logging.

Active user-facing flows:
1. **Request Blood & Match & Notify & Reveal** — `/ → /requests/new → POST /api/requests → /requests/matching-demo → POST/GET /api/requests/matches → POST /api/requests/notifications/dispatch → POST /api/requests/contact-reveal`
2. **Donor Registration & Inbox & Response** — `/ → /donors/register → POST /api/donors → /donors/profile → /donors/notifications → GET/PATCH /api/donors/notifications → POST /api/donors/responses`

> [!NOTE]
> All intake, matching, dispatch, inbox, response, and reveal operations persist to PostgreSQL via server-only Route Handlers.
> `localStorage` is used solely as a temporary demo view cache to bridge demo identities (`hemo_match_active_request`, `hemo_match_demo_donor`).
> Contact reveal is strictly gated behind verified donor acceptance and non-terminal request lifecycle states.

---

## 2. Active Flows & Response Pipeline

```
Landing Page (/)
│
├── "Request Blood" ──► /requests/new
│                         │
│                         ▼ (POST JSON)
│                       /api/requests [Route Handler]
│                         │ Server validation
│                         │ Slug -> district_id UUID resolution
│                         │ IST (UTC+05:30) -> TIMESTAMPTZ ISO conversion
│                         │ createBloodRequest() [server-only]
│                         ▼
│                       Supabase / PostgreSQL (public.blood_requests)
│                         │ Authoritative UUID generated
│                         ▼
│                       HTTP 201 Response (sanitized)
│                         │
│                         ▼ Local cache: hemo_match_active_request
│                       /requests/matching-demo (real matching page)
│                         │
│                         ▼ (POST JSON { requestId })
│                       /api/requests/matches [Route Handler]
│                         │ Validates RFC 4122 UUID
│                         │ Delegates to findAndCreateMatches() [server-only]
│                         │ Queries blood_requests & district donors
│                         │ Evaluates pure matching & interval rules
│                         │ Inserts candidate rows (INSERT-OR-IGNORE idempotency)
│                         ▼
│                       Supabase / PostgreSQL (public.matches)
│                         │ UNIQUE(request_id, donor_id) guard
│                         │ Non-PII match_metadata recorded
│                         ▼
│                       HTTP 200 Response (PublicMatchCandidate[])
│                         │ Anonymized refs: "Donor •••• [SUFFIX]"
│                         │ Factual match reasons & compatibility badge
│                         ▼
│                       Rendered Candidate Cards on /requests/matching-demo
│                         │
│                         ▼ "Notify Eligible Donors" (Requester Action)
│                       /api/requests/notifications/dispatch [Route Handler]
│                         │ Validates { requestId } UUID strictly
│                         │ Revalidates candidate eligibility & consent immediately prior to dispatch
│                         │ Filters donors with notification_preference = 'enabled'
│                         │ Enforces server dispatch limit (default 5)
│                         │ Calls PostgreSQL RPC claim_match_and_create_notification()
│                         ▼
│                       Supabase / PostgreSQL (public.notifications & public.matches)
│                         │ Transitions match status: 'candidate' -> 'notified'
│                         │ Inserts notification row (status: 'unread', type: 'match_found')
│                         │ Idempotency protected by partial unique index idx_notifications_match_found_unique
│                         │ Advances request status to 'notified'
│                         │ Writes aggregate non-PII audit record
│                         ▼
│                       HTTP 200 Response (aggregate count: "N eligible donors notified")
│
└── "Find Donors"   ──► /donors/register
                          │
                          ▼ (POST JSON)
                        /api/donors [Route Handler]
                          │ Server validation
                          │ Slug -> district_id UUID resolution
                          │ createDonor() [server-only]
                          ▼
                        Supabase / PostgreSQL (public.donors)
                          │ Authoritative UUID generated
                          ▼
                        HTTP 201 Response (omits phone_number)
                          │
                          ▼ Local cache: hemo_match_demo_donor
                        /donors/profile (masked phone display: ••••••4321)
                          │
                          ▼ "Notifications" Navigation Link
                        /donors/notifications (Donor Inbox)
                          │
                          ▼ (GET /api/donors/notifications?donorId=<uuid>)
                        Strict server-side ownership query
                          │ Omission of donor UUID, names, phones, and patient details
                          │ Displays urgency, blood group, component, hospital, requiredBy
                          │ Mark as read via PATCH /api/donors/notifications
                          │ Shows persistent response status ('accepted' | 'declined' | actionable)
                          │
                          ▼ "Accept" or "Decline" Action
                        /api/donors/responses [Route Handler]
                          │ Server-side input validation ({ donorId, notificationId, response })
                          │ Authoritative pre-response revalidation (consent, availability, district, compatibility, 120-day interval)
                          │ Calls atomic PostgreSQL RPC record_donor_response()
                          ▼
                        Supabase / PostgreSQL (public.matches & public.donor_responses)
                          │ Transitions match status: 'notified' -> 'accepted' | 'declined'
                          │ Inserts authoritative row in public.donor_responses
                          │ Enforces UNIQUE(request_id, donor_id) database constraint
                          │ Automatically marks notification as read
                          │ Writes non-PII audit log
                          ▼
                        HTTP 200 Response ({ success: true, response })
                          │ Zero contact details revealed (contact_reveals untouched)
```

---

## 3. Completed Milestones

### Step 1: Foundation (complete)
- Next.js App Router, strict TypeScript, Tailwind CSS, lib module stubs, docs, `.env.example`.

### Step 2: Request Blood Flow (complete)
- Blood request form with client-side validation (`validateBloodRequest`).
- Clinical safety disclaimer.
- Matching demo page foundation at `/requests/matching-demo`.

### Step 3: Donor Registration Flow (complete)
- Donor registration form with client-side validation (`validateDonorProfile`).
- Profile view page with masked phone number (`maskPhone`).
- Privacy notice cards on both pages.

### Step 4: Supabase/PostgreSQL Database Foundation (complete)
- Full relational schema in `supabase/migrations/0001_initial_schema.sql` (8 tables, 10 custom enums, indexes, triggers).
- RLS enabled on all application tables.
- Server-side DB row types in `src/types/database.ts`.
- Two-client architecture in `src/lib/database/index.ts` (`getServerClient()` and `getAnonClient()`).

### Step 5: Supabase Persistence Wiring (complete)
- Installed `server-only` guard across all database helpers.
- District resolver (`src/lib/db/districts.ts`) for frontend slug to PostgreSQL UUID mapping.
- Data API least-privilege grants enforced in migration Section 13.
- Donor persistence via `src/lib/db/donors.ts` and `POST /api/donors`.
- Request persistence via `src/lib/db/requests.ts` and `POST /api/requests`.
- Deterministic IST (UTC+05:30) datetime parsing and timezone conversion.

### Step 6: Request → Match Milestone (complete)
- Pure RBC ABO/Rh Compatibility Engine (`src/lib/matching/compatibility.ts`).
- Configurable Preliminary Donation Interval Evaluation (`src/lib/eligibility/intervals.ts`).
- Deterministic Multi-Factor Ranking (`src/lib/matching/engine.ts`).
- Server-Only Database Matching Helper (`src/lib/db/matches.ts`).
- HTTP Boundary `POST /api/requests/matches`.
- Real Matching UI Integration (`src/app/requests/matching-demo/page.tsx`).

### Step 7: Request → Match → Notify Milestone (complete)
- Database integrity & idempotency foundation with partial unique index `idx_notifications_match_found_unique`.
- Atomic dispatch RPC `claim_match_and_create_notification()` with server-controlled dispatch limit.
- Privacy-safe donor inbox API (`GET /api/donors/notifications`) and mark read (`PATCH`).
- Donor notification screen at `/donors/notifications` and matching page "Notify Eligible Donors" CTA.

### Step 8: Donor Response (Accept / Decline) Milestone (complete)

#### What Was Implemented:
1. **Atomic Donor Response RPC (Step 8 Migration)**:
   - Migration `supabase/migrations/0004_atomic_donor_response.sql`.
   - PostgreSQL function `record_donor_response(p_donor_id, p_request_id, p_match_id, p_response)`.
   - `SECURITY INVOKER` with fixed `search_path = public, pg_temp`.
   - Privilege lockdown: execution revoked from `PUBLIC`/`anon`/`authenticated`; granted exclusively to `service_role`.
   - Atomically updates `matches.status` from `'notified'` to `'accepted'` or `'declined'` and inserts row into `donor_responses`.
   - Backed by database constraint `UNIQUE (request_id, donor_id)` on `public.donor_responses`.
2. **Pure Pre-Response Revalidation (`src/lib/responses/revalidation.ts`)**:
   - For `Accept`: verifies notification ownership, match status (`'notified'`), request actionability (not terminal/expired), supported component (Whole Blood / RBC), donor consent (`true`), donor availability (`'available'`), donor district consistency, ABO/Rh biological compatibility, and 120-day preliminary donation interval rest.
   - For `Decline`: verifies notification ownership, match status (`'notified'`), and non-terminal request lifecycle.
   - Rejects duplicate responses, cross-state overwrites (Accept after Decline, Decline after Accept), and expired requests.
3. **Server-Side Response Processing & Route Handler**:
   - Route handler `POST /api/donors/responses` (`src/app/api/donors/responses/route.ts`).
   - Server-only DB orchestrator `submitDonorResponse()` (`src/lib/db/responses.ts`).
   - Input validator `validateResponseInput` (`src/lib/validation/responses.ts`).
   - Marks associated notification as `'read'` automatically upon response.
   - Writes non-PII audit record (`donor_response.accepted` or `donor_response.declined`).
   - Preserves blood request status in non-terminal `'notified'` state (requests are not prematurely marked fulfilled).
   - Zero contact reveal code executed; `contact_reveals` table untouched.
4. **Donor Inbox Response Experience (`src/app/donors/notifications/page.tsx`)**:
   - Replaced Step 8 placeholder with actionable `Accept` and `Decline` controls.
   - Added `Confirm Intent to Donate` modal detailing request, clinical disclaimer, and contact privacy guarantee.
   - Added calm `Decline Request` confirmation modal with zero pressure.
   - Displays persistent response badges: `Accepted` (green badge with privacy note) and `Declined` (muted neutral badge).
   - Prevents duplicate clicks, manages submitting spinner states, and provides sanitized error handling.
5. **Controlled Live Verification**:
   - Verified Flow A (Accept): transitions match to `'accepted'`, creates response row, updates inbox to reflect accepted state, preserves request status as `'notified'`, 0 contact reveals created.
   - Verified Flow B (Decline): transitions match to `'declined'`, creates response row, updates inbox to reflect declined state.
   - Verified Flow C (Stale Rejection): changes donor availability to `'temporarily_unavailable'`, asserts authoritative revalidation rejection (`revalidation_failed`), leaves match in `'notified'`.
   - Verified Flow D (Idempotency & Guards): repeated Accept rejected (`already_responded`), Decline after Accept rejected (`already_responded`), cross-donor response rejected (`not_found`).
   - 100% cleanup of temporary rows with baseline counts fully restored.
6. **Automated Test Suite**:
   - 153 automated tests passing across 38 suites (25 new tests in `tests/responses.test.ts`).

---

### Step 9: Authorized Minimum Contact Reveal Protocol (complete)

#### What Was Implemented:
1. **Atomic Contact Reveal Authorization RPC & Migration**:
   - Migration `supabase/migrations/0005_contact_reveal_authorization.sql`.
   - Unique constraint `contact_reveals_request_id_donor_id_key` on `public.contact_reveals(request_id, donor_id)`.
   - PostgreSQL function `record_contact_reveal(p_request_id, p_match_id)`.
   - Configured with `#variable_conflict use_column` to prevent plpgsql column-variable ambiguity.
   - Strict authorization check: validates match status is `'accepted'`, request status is not `'cancelled'`, `'expired'`, or `'fulfilled'`, and donor response is `'accepted'`.
   - Idempotent insertion using `ON CONFLICT ON CONSTRAINT contact_reveals_request_id_donor_id_key DO NOTHING`.
   - `SECURITY INVOKER` with fixed `search_path = public, pg_temp`.
   - Privilege lockdown: execution revoked from `PUBLIC`/`anon`/`authenticated`; granted exclusively to `service_role`.
2. **Pure Pre-Reveal Authorization Logic (`src/lib/reveal/revalidation.ts`)**:
   - Enforces the 4-point authorization policy: match accepted, donor response accepted, notification linkage valid, and request non-terminal.
   - Rejects non-accepted, declined, candidate, cross-request, cancelled, expired, or fulfilled requests.
   - Implements strict minimum projection filter: extracts only `name` (`donors.full_name`) and `phone` (`donors.phone_number`).
3. **Server-Side Reveal Orchestrator & Route Handler**:
   - Route handler `POST /api/requests/contact-reveal` (`src/app/api/requests/contact-reveal/route.ts`).
   - Server-only DB orchestrator `requestContactReveal()` (`src/lib/db/reveal.ts`).
   - Input validator `validateRevealRequest` (`src/lib/validation/reveal.ts`).
   - Safe requester matches projection helper `getRequestMatches()` and route `GET /api/requests/matches`.
   - Writes non-PII audit record (`contact_reveal.authorized`) with zero phone, name, or PII in metadata.
   - Zero contact leaks through any other endpoint or pre-reveal projections.
4. **Requester Matching UI Privacy Boundary (`src/app/requests/matching-demo/page.tsx`)**:
   - Displays clear privacy boundary cards on candidate cards before reveal ("Phone hidden until donor accepts request").
   - Added "Refresh Status" CTA allowing requesters to observe donor acceptance without re-running matching.
   - Displays prominent "Reveal Contact" action button strictly for accepted donors.
   - Revealed contact card displays unmasked full name and phone number with emergency coordination banner.
   - Declined and notified non-accepted donors remain strictly contact-masked.
5. **Controlled Live Verification**:
   - Verified Flow 1: Pre-acceptance projection contains 0 phone numbers/names.
   - Verified Flow 2: Requester observes match lifecycle (`accepted`, `declined`, `notified`) without PII leaks.
   - Verified Flow 3: First reveal succeeds, returns minimum contact, persists 1 `contact_reveals` row, writes non-PII audit record.
   - Verified Flow 4: Repeated reveal succeeds idempotently without duplicate row or audit spam.
   - Verified Flow 5: Notified non-accepted donor rejected (`unauthorized_or_not_accepted`).
   - Verified Flow 6: Declined donor rejected (`unauthorized_or_not_accepted`).
   - Verified Flow 7: Cross-request attempt safely rejected (`unauthorized_or_not_accepted`).
   - Verified Flow 8: Request status remains `notified` (not prematurely marked fulfilled).
   - Confirmed 100% cleanup of test rows and exact baseline restoration.
6. **Automated Test Suite**:
   - 179 automated tests passing across 44 suites (26 new tests in `tests/reveal.test.ts`).

---

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `npm test` | ✅ 199 tests passing (0 failing, 57 suites) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ All routes compiled / prerendered cleanly |
| `git diff --check` | ✅ 0 formatting/whitespace issues |
| Production Smoke Test | ✅ Full live pipeline verified at https://hemomatch.vercel.app |
| Live Supabase Verification | ✅ Proved real Contact Reveal, idempotency, rejection of non-accepted/declined, non-PII audit logging, and 100% cleanup |
| Service-Role Secret Isolation | ✅ Server-only; 0 client leaks |
| Direct Supabase Queries in UI | ✅ 0 occurrences |
| Sensitive Fields in Public UI/API | ✅ 0 occurrences (`phone_number`, `full_name`, `email`, coordinates, patient info) |
| Minimum Contact Projection | ✅ Only `name` and `phone` released upon authorized reveal |
| Unsafe TypeScript Bypasses | ✅ 0 occurrences (`as any`, `as never`, `@ts-ignore`, `@ts-expect-error`) |

---

## 5. Security Architecture & Demo Auth Limitations

> [!IMPORTANT]
> The following security and architectural boundaries are active:

1. **Demo Identity vs Production Authorization**:
   - User authentication is not yet integrated (Mock Auth stage).
   - `requestId` and `donorId` represent demo identification, NOT cryptographically verified authorization.
   - Production will require Supabase Auth JWT / session verification to assert requester/donor ownership.
2. **Strict Minimum Contact Reveal Boundary**:
   - Contact reveal is strictly gated behind verified donor acceptance and non-terminal request lifecycle.
   - Only `name` and `phone` are unmasked. No physical address, coordinates, email, or medical data are released.
3. **Database-Enforced Atomicity & Idempotency**:
   - Contact reveals are recorded via PostgreSQL RPC `record_contact_reveal()`, protected by `UNIQUE(request_id, donor_id)`.
   - Re-revealing the same donor is completely idempotent and produces zero duplicate database rows or audit events.
4. **Authoritative Server Revalidation**:
   - Revalidation and authorization checks execute on the server and in the database, never trusting client parameters.

---

## 6. Milestones 10–13 Summary

### Step 10: Integrated Demo + UX Hardening (complete, merged)
- Requester / Donor two-role workflow clarity on landing page (`/`) with explicit pathway cards and navigation.
- Elevated "Refresh Status" CTA on matching dashboard.
- Raw enum values (`candidate`, `notified`) replaced with user-friendly, polished status badges.
- Post-dispatch next-step guidance bridging the Requester dispatch action directly to the Donor Notifications inbox.
- High-contrast accessible "Reveal Contact" button and unmistakable privacy hero transition.
- Stale/developer copy removed across the entire primary demo path.
- 90-day whole blood cycle contradiction fixed to state the conservative 120-day application matching interval.
- Merged cleanly into `main` (`7497fd5`).

### Step 11: Production Deployment on Vercel (complete, live verified)
- Production URL: `https://hemomatch.vercel.app`
- Successfully deployed Next.js App Router full-stack build to Vercel connected to Supabase production PostgreSQL.
- Manual production smoke test passed completely:
  `Request → Match → Notify → Accept → Reveal Contact`
- Verified privacy boundary: donor phone number remained strictly hidden before explicit Reveal Contact.
- Production configuration incident: `SUPABASE_SERVICE_ROLE_KEY` initially had an incorrect value in Vercel settings. Setting the correct service-role secret resolved request creation immediately.

### Step 12: Production Closure + Small Correctness/Copy Fixes (complete)
- **Expired-Request Handling**: Backend enforcement (`400 Bad Request`, `request_expired`) preserved; frontend UI updated with calm, actionable copy: `"This blood request has expired. Create a new request with a future required-by time."` and an immediate `"Create New Request"` CTA link.
- **Copy Audit**: Audited public and demo copy to align strictly with MVP realities:
  - Removed claims of medically "verified" or "certified" donors; clarified self-registered volunteer donors.
  - Corrected "hospital cluster" and "search radius" wording to accurate same-district matching.
  - Eliminated "mutual acceptance" and "automatic reveal" wording; clarified that contact reveal requires explicit requester action following donor acceptance.
- **Automated Tests**: 183 tests passing across 44 suites (added test coverage for structured error mappings).

### Step 13: Premium UI/UX Redesign (complete, merged)
- **Pass 1: Premium UI Foundation**: Design tokens, real light/dark theme, `AppHeader`, `Card`, `Badge`, `Button`, `BloodGroupPicker`, and `EmergencyBanner`.
- **Pass 2: Requester Experience**: High-trust emergency coordination layout, calm urgency states, 5-stage lifecycle progression, and signature contact reveal card.
- **Pass 3: Donor Experience**: Volunteer onboarding registration (`/donors/register`), volunteer donor identity profile with safe 120-day interval evaluation (`/donors/profile`), emergency coordination notification inbox with accessible confirmation dialogs (`/donors/notifications`).
- **Baseline before this status update**: `e26b8d4a8196eed3f1657e87aa2ab48d59576f47`.
- **Verification**: 199 tests / 57 suites passing, typecheck clean, lint clean, production build clean.
- **Git / Vercel Author Identity**: Corrected commit author configuration (`Rohan M George <rohanmgeorgeo@gmail.com>`) to resolve Vercel deployment blocker.

### Step 13.5: Signature Experience Polish & Global Ambient Pointer Light (complete, merged)
- **Glass Specularity & Material Refinement**: Replaced flat translucency with physical glass refraction (`blur(20px)–blur(24px) saturate(180%–190%)`), crisp specular top highlights (`inset 0 1px 0 0 rgba(255,255,255,...)`), and deep elevation shadows on floating controls, mobile bottom navigation, dialogs, and headers.
- **Unified Global Ambient Pointer Light**: Implemented single, high-performance root-level ambient light (`AmbientPointerLight`) positioned at `z-0` behind application content (`relative z-1`). Translucent glass surfaces naturally refract and catch this subtle light as the pointer moves across the application.
- **Fine-Pointer Only & Zero-Jank Performance**: Scoped strictly to `@media (hover: hover) and (pointer: fine)`. Zero React state updates on pointermove; updates coalesced via `requestAnimationFrame` directly to CSS custom properties (`--global-pointer-x`, `--global-pointer-y`, `--global-pointer-active`). Touch devices and `prefers-reduced-motion: reduce` completely suppress the effect (`display: none !important`).
- **Retired Local Card Spotlights**: Removed redundant per-card mousemove handlers to prevent double-glows and competing hotspots, leaving ONE unified global lighting system.
- **Navigation Purity**: Removed redundant "Home" / "Return to Home" buttons from the donor notifications inbox and profile; streamlined mobile bottom navigation to the 4 canonical workflow destinations (`Request`, `Matches`, `Inbox`, `Profile`). Global `Hemo Match` branding remains the clean home route.
- **Verification**: 199 tests / 57 suites passing, typecheck clean, lint clean, production build clean, diff-check clean.
- **Git Milestone Closure**: Merged `feature/signature-experience-polish` into `main` via merge commit (`9069f1a5f28ed5d572b87235bcf2690a9e568e50`).
- **Status & Next Steps**: Step 13.5 complete and approved.

### Step 14: Privacy-Safe Proximity Matching + Location Capture (complete, merged)
- **Goal**: Replace same-district-only matching with real coordinate-based proximity matching while preserving district as an authoritative fallback for records without coordinates.
- **Privacy Boundary**: Donor coordinates are server-side private matching data. Completely omitted from `DonorPublicRow`, `PublicMatchCandidate`, notifications, accepted-state projections, and contact reveal.
- **Geospatial Engine**: Implemented pure server-side Haversine geodesic distance utility (`src/lib/geo/distance.ts`) with `-90 <= lat <= 90` and `-180 <= lon <= 180` boundary checks and `formatDistanceKm`. Internal calculation is exact; presentation is safely rounded (e.g. `~1.8 km away`).
- **Application Matching Radius**: `MATCH_RADIUS_KM = 5` configured as an application matching parameter in `src/lib/matching/constants.ts` (explicitly documented as non-medical coordination policy).
- **Physical Proximity Policy**: When both request and donor coordinates exist, proximity radius (`<= 5 km`) is authoritative across administrative district borders.
- **Backwards Compatibility & Fallback**: When coordinates are missing on either side, the system falls back to same-district matching. No synthetic or fabricated distance is produced (`distanceKm: null`, UI shows `Same district`).
- **Deterministic 4-Tier Ranking**:
  1. Exact homologous ABO/Rh match first
  2. Nearest straight-line distance (`a.distanceKm - b.distanceKm`) when real distance exists (measured proximity candidates precede district fallback candidates)
  3. Greater elapsed calendar days since last donation
  4. Donor UUID lexicographic tie-breaker
- **Location Capture UX**: Reusable `LocationCapture` component integrated into `/requests/new` and `/donors/register` with explicit "Use current location" button, graceful handling of permission denied, timeouts, or unavailable location, and manual district/approximate area fallback.
- **Donor Profile Indicator**: `/donors/profile` clearly informs registered donors: `"Location available for private nearby matching"` alongside approximate area and district, with zero raw coordinates rendered.
- **Schema Migration**: Created additive migration `0006_proximity_matching_coordinates.sql` adding `location_latitude` and `location_longitude` (`DOUBLE PRECISION`, range check constraints, partial spatial indexes) to `blood_requests` and `donors`.
- **Remote Migration Status**: Verified and applied remotely to Supabase production PostgreSQL. Confirmed with runtime API success (`POST /api/requests` → 201, `POST /api/donors` → 201, `GET /api/donors/notifications` → 200, `GET/POST /api/requests/matches` → 200).
- **Google Maps/Places Preparation**: Architecture accepts `{ latitude, longitude }` payloads cleanly, enabling future Google Places autocomplete or map selection without altering matching engine logic.
- **Verification Baseline**: 231 tests / 67 suites passing, typecheck clean (0 errors), lint clean (0 warnings), production build clean.
- **Git Milestone Closure**: Merged `feature/proximity-matching` into `main` via merge commit (`716a891f1c79e604ec22da33d2e9e2ef80235a96`).

### Step 15: Selection Dataset & Evaluation Reliability (COMPLETE)
- **Goal**: Provide a reliable, reproducible evaluation dataset and developer-side seed tooling for independent evaluation without altering the product's real public behavior or creating fake/demo UI.
- **Explicit Invariant**: Selection dataset is internal evaluation infrastructure and does not alter Hemo Match matching behavior.
- **Scenario Definition**: Centered on Ernakulam District (`dist-ekm`, `General Hospital, Ernakulam` / `Marine Drive`) for an A+ Whole Blood request.
- **Deterministic 5-Donor Evaluation Pool**:
  - **Donor A** (`a0000000-0000-4000-8000-000000000001`): A+, ~1.4 km (Kaloor), 160 days rest, enabled. Exact homologous match, ranks #1.
  - **Donor B** (`a0000000-0000-4000-8000-000000000002`): O+, ~2.2 km (Panampilly Nagar), 150 days rest, enabled. Universal compatible alternative, ranks #2.
  - **Donor C** (`a0000000-0000-4000-8000-000000000003`): A+, ~0.9 km (Ernakulam North), 40 days rest. Excluded by conservative 120-day application matching interval policy despite proximity (not a universal clinical rule; final eligibility determined by blood bank).
  - **Donor D** (`a0000000-0000-4000-8000-000000000004`): A+, ~1.8 km (Marine Drive West), 170 days rest, notifications disabled. Eligible for matching, safely skipped during notification dispatch.
  - **Donor E** (`a0000000-0000-4000-8000-000000000005`): A+, ~13.4 km (Aluva), 180 days rest, enabled. Excluded by 5 km radius when coordinates exist; matches via district fallback when coordinates are omitted.
- **Developer Tooling**:
  - `npm run seed:selection` — Idempotently upserts the 5 deterministic selection donors and resets prior evaluation matches/notifications.
  - `npm run seed:selection:reset` — Safely removes only the 5 selection donor records and their related test data.
  - Non-destructive: Never truncates tables or deletes unrelated user records.
- **Verification Baseline**: 245 tests / 71 suites passing, typecheck clean, lint clean, production build clean.
- **Git Milestone Closure**: Merged `feature/selection-dataset` into `main` via merge commit (`998f88ffe19c54f8b372d161d243e777da32ba9a`).

### Step 16: Coordinator Operations Dashboard (COMPLETE)
- **Goal**: Add a focused, read-only Coordinator Operations Dashboard that makes Hemo Match's existing district blood-request workflow visible at a system level using real PostgreSQL data.
- **Routes Added**:
  - `/coordinator` — Operations Overview (metric summary cards, searchable/filterable request list, deterministic attention alerts).
  - `/coordinator/requests/[id]` — Request Detail & Workflow Lifecycle View (4-stage operational pipeline cards: Discovery → Dispatched → Responses → Privacy Reveal; anonymized candidate roster; 5-step operational audit timeline: Created → Matching → Notification → Response → Reveal).
  - `GET /api/coordinator/overview` — Server-only route handler returning real aggregate metrics and request summaries.
  - `GET /api/coordinator/requests/[id]` — Server-only route handler returning operational lifecycle detail.
- **Privacy Boundary**:
  - Strictly omits donor phone numbers, emails, exact coordinates (latitude/longitude), and exact home addresses.
  - Candidates projected solely via anonymized references (`Donor •••• XXXX`).
  - Contact reveal authorization remains strictly between requesters and accepted donors via explicit authorization action.
- **Deterministic Needs Attention & Metric Definitions**:
  - Active Requests: Aggregates real persisted open workflow statuses (`status IN ('active', 'notified')`).
  - Zero eligible candidates discovered for open requests (`status === 'active' && matchCount === 0`).
  - Awaiting donor acceptance on notified requests (`status === 'notified' && acceptedCount === 0`).
  - Past required deadline without fulfillment (`status IN ('active', 'notified') && requiredBy < now`).
  - Request expired unfulfilled (`status === 'expired'`).
- **Read-Only Scope**: Deliberately excludes mutation actions (no deleting records, editing donor data, or forcing reveals).
- **Authentication Note**: Prototype operational view for hackathon MVP; production deployment would require authenticated, authorized coordinator access (RBAC / SSO).
- **Git Milestone Closure**: Merged `feature/coordinator-dashboard` into `main` via merge commit (`84572921a97d4c98f82da8aa551cbfe69a7c36fc`).

### Step 17: Final QA + Evaluator Experience (COMPLETE)
- **Goal**: Final quality-assurance audit, evaluator experience hardening, medical terminology consistency, and production readiness review.
- **Audited Areas**:
  - Landing page (`/`), blood request flow (`/requests/new`), matching dashboard (`/requests/matching-demo`), donor registration (`/donors/register`), donor profile (`/donors/profile`), donor inbox (`/donors/notifications`), coordinator overview (`/coordinator`), coordinator request detail (`/coordinator/requests/[id]`), shared desktop navigation (`AppHeader`), mobile bottom navigation (`AppBottomNav`), dark/light themes, and error boundaries.
- **Defects Found & Corrected**:
  1. *Landing Page Medical Wording*: Corrected Pillar 2 heading from `120-Day Recovery Rule` to `120-Day Matching Policy` and updated body text to the authoritative framing: *"Applies Hemo Match's conservative 120-day application matching policy for this MVP. Final donor eligibility is determined by qualified blood-bank/clinical personnel."*
  2. *Matching Demo Subtitle*: Replaced `recovery intervals` with `120-day donation interval policy`.
  3. *Matching Engine Comments*: Removed legacy references to `physiological recovery` in `src/lib/matching/engine.ts`, replacing with `rest interval` / `interval rest`.
- **Core Workflow Regression**:
  - Requester flow: Validated request creation, candidate matching, 4-tier ranking, and notification dispatch.
  - Donor flow: Validated volunteer intake, 120-day interval evaluation, notification inbox, and atomic Accept / Decline response RPC.
  - Contact Reveal flow: Validated locked state on acceptance, explicit requester-authorized reveal, non-PII audit logging, and minimum projection (name + phone only).
  - Coordinator flow: Validated read-only system monitoring, 4-stage pipeline cards, 5-step lifecycle timeline, deterministic Needs Attention alerts, and zero PII exposure.
- **Privacy & Security Verification**:
  - Verified zero donor phone numbers, emails, or raw coordinates exposed in API responses, matching candidates, or coordinator views.
  - Confirmed all database operations with `SUPABASE_SERVICE_ROLE_KEY` are strictly isolated behind `server-only` server boundaries.
  - Confirmed error responses return sanitized user messages without stack traces or internal schema details.
- **Automated Verification**:
  - `npm test`: 280 tests passing across 81 suites (0 failures).
  - `npm run typecheck`: TypeScript clean (0 errors).
  - `npm run lint`: ESLint clean (0 warnings).
  - `npm run build`: Turbopack production build clean.
  - `git diff --check`: Clean (0 whitespace/formatting errors).
- **Runtime & Production Verification**:
  - Production Deployment (`https://hemomatch.vercel.app/`): Verified HTTP 200 availability across `/`, `/requests/new`, `/requests/matching-demo`, `/donors/register`, `/donors/notifications`, and `/coordinator`.
  - Browser Automation: Disclosed Playwright driver CDN 404 (`playwright.azureedge.net/builds/driver/playwright-1.57.0-mac-arm64.zip`); runtime HTTP verification passed completely.
- **Evaluation Dataset Status**:
  - Step 15 remote selection dataset was **NOT** seeded. Remote Supabase database state remains intact and unmutated.
- **Git Milestone Closure**:
  - Merged `feature/final-qa` into `main` via merge commit (`4b33698d28a38ea5f72ea98c366ff4820980cf65`).
  - Next milestone is final selection preparation.

### Step 17.5: Remote Selection Audit, Controlled Seed & Production Walkthrough (COMPLETE)
- **Goal**: Audit remote Supabase database, safely clean development test records, seed the controlled 5-donor selection dataset, and verify the live production deployment.
- **Audit & Cleanup (17.5A & 17.5B)**:
  - Read-only audit verified remote environment state.
  - Safely removed only approved developer test donor UUIDs without affecting reference data.
  - Successfully seeded the 5 controlled RFC 4122 v4 evaluation donors in Ernakulam district via `seed-selection.ts`.
- **Production Walkthrough (17.5C)**:
  - Verified live deployment at `https://hemomatch.vercel.app/`.
  - Validated emergency request creation, deterministic ranking, notification dispatch, and donor response flow.
- **Coordinator Visual Consistency**:
  - Unified coordinator views (`/coordinator`, `/coordinator/requests/[id]`) with Hemo Match design tokens, glow surfaces, and responsive light/dark themes.
  - Merged into `main` via commit `8b5c450044b96bbbf32bbd20eae495878cac605a`.
- **Verification Baseline**: 280 tests / 81 suites passing, typecheck clean, lint clean, build clean.
