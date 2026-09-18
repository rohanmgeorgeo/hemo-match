# Hemo Match Project Status

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Branch:** `feature/donor-response`
**Current Milestone:** Step 8: Donor Response (Accept / Decline) (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Current Project State

Eight milestones are complete. The application features a fully verified, privacy-safe, end-to-end Request → Match → Notify → Accept / Decline pipeline. Blood requests are persisted to PostgreSQL, matched via an authoritative server-only matching engine, and notified through an atomic database RPC with server-controlled revalidation and deterministic dispatch limits. Candidate donors receive in-app notifications in a private inbox without exposing phone numbers, names, or patient details, and can authoritatively record their Accept or Decline response with full database atomicity and strict revalidation.

Active user-facing flows:
1. **Request Blood & Match & Notify** — `/ → /requests/new → POST /api/requests → /requests/matching-demo → POST /api/requests/matches → POST /api/requests/notifications/dispatch`
2. **Donor Registration & Inbox & Response** — `/ → /donors/register → POST /api/donors → /donors/profile → /donors/notifications → GET/PATCH /api/donors/notifications → POST /api/donors/responses`

> [!NOTE]
> All intake, matching, dispatch, inbox, and response operations persist to PostgreSQL via server-only Route Handlers.
> `localStorage` is used solely as a temporary demo view cache to bridge demo identities (`hemo_match_active_request`, `hemo_match_demo_donor`).
> Donor contact reveal (Step 9) belongs strictly to the subsequent milestone upon authorized mutual coordination.

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

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `npm test` | ✅ 153 tests passing (0 failing, 38 suites) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ All routes compiled (`/api/donors/responses` dynamic) |
| `git diff --check` | ✅ 0 formatting/whitespace issues |
| Live Supabase Verification | ✅ Proved real Accept, Decline, stale rejection, idempotency, inbox derivation, zero contact reveals, and 100% cleanup |
| Service-Role Secret Isolation | ✅ Server-only; 0 client leaks |
| Direct Supabase Queries in UI | ✅ 0 occurrences |
| Sensitive Fields in Public UI/API | ✅ 0 occurrences (`phone_number`, `full_name`, `donor_id`, `match_id`, patient info) |
| Contact Reveal Isolation | ✅ `contact_reveals` untouched; deferred strictly to Step 9 |
| Unsafe TypeScript Bypasses | ✅ 0 occurrences (`as any`, `as never`, `@ts-ignore`, `@ts-expect-error`) |

---

## 5. Security Architecture & Demo Auth Limitations

> [!IMPORTANT]
> The following security and architectural boundaries are active:

1. **Demo Identity vs Production Authorization**:
   - User authentication is not yet integrated (Mock Auth stage).
   - `donorId` in queries and bodies represents demo identification, NOT cryptographically verified authorization.
   - Production will require Supabase Auth JWT / session verification to assert donor ownership.
2. **Strict Contact Privacy Boundary**:
   - Donor Accept records intent to donate only.
   - Accept does NOT reveal donor phone numbers or requester contact details.
   - Contact reveal is strictly isolated to Step 9 upon authorized mutual coordination.
3. **Atomic Database Transitions**:
   - Responses are committed via PostgreSQL RPC `record_donor_response()`, preventing partial state transitions or concurrent race conditions.
4. **Authoritative Server Revalidation**:
   - Donor availability, consent, district, blood compatibility, and 120-day interval are revalidated on the server immediately before recording an acceptance.

---

## 6. Next Milestone: Step 9 — Authorized Two-Way Contact Reveal Protocol

The next planned milestone is **Step 9: Authorized Two-Way Contact Reveal Protocol**:
- Authorized release of minimum required contact coordinates (donor phone number and blood bank/requester contact).
- Strict append-only audit trail in `public.contact_reveals`.
- Two-way authorization protocol triggered by verified donor acceptance.
