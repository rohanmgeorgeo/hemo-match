# Hemo Match Project Status

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Branch:** `main`
**Current Milestone:** Step 13.5: Signature Experience Polish & Global Ambient Pointer Light (COMPLETE)
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
- **Status & Next Steps**: Step 13.5 complete and approved. Step 14 (Interactive Demo Mode / Scenario Runner) has NOT started.

