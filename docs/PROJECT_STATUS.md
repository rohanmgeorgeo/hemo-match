# Hemo Match Project Status

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Branch:** `feature/notifications`
**Current Milestone:** Step 7: Notify (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Current Project State

Seven milestones are complete. The application features a fully verified, privacy-safe, end-to-end Request → Match → Notify pipeline. Blood requests are persisted to PostgreSQL, matched via an authoritative server-only matching engine, and notified through an atomic database RPC with server-controlled revalidation and deterministic dispatch limits. Candidate donors receive in-app notifications in a private inbox without exposing phone numbers, names, or patient details.

Active user-facing flows:
1. **Request Blood & Match & Notify** — `/ → /requests/new → POST /api/requests → /requests/matching-demo → POST /api/requests/matches → POST /api/requests/notifications/dispatch`
2. **Donor Registration & Inbox** — `/ → /donors/register → POST /api/donors → /donors/profile → /donors/notifications → GET/PATCH /api/donors/notifications`

> [!NOTE]
> All intake, matching, dispatch, and inbox operations persist to PostgreSQL via server-only Route Handlers.
> `localStorage` is used solely as a temporary demo view cache to bridge demo identities (`hemo_match_active_request`, `hemo_match_demo_donor`).
> Donor response/acceptance (Step 8) and two-way contact reveal (Step 9) belong to subsequent milestones.

---

## 2. Active Flows & Notification Pipeline

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
                          │ Clear placeholder: "Response available in the next step"
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

#### What Was Implemented:
1. **Database Integrity & Idempotency Foundation (Step 7B)**:
   - Migration `supabase/migrations/0002_notification_idempotency.sql`.
   - Partial unique index `idx_notifications_match_found_unique` on `(match_id, type) WHERE match_id IS NOT NULL AND type = 'match_found'`.
   - Prevents duplicate notification creation per candidate match at the database constraint level.
2. **Atomic Dispatch RPC (Step 7C)**:
   - Migration `supabase/migrations/0003_atomic_notification_dispatch.sql`.
   - PostgreSQL function `claim_match_and_create_notification()` with `SECURITY INVOKER` and fixed `search_path`.
   - Execution revoked from `PUBLIC`/`anon`/`authenticated`; granted exclusively to `service_role`.
   - Pure pre-dispatch revalidation (`src/lib/notifications/revalidation.ts`) verifying donor consent, availability, notification preference (`enabled`), biological compatibility, and 120-day interval rest.
   - Server-controlled dispatch limit (`DEFAULT_DISPATCH_LIMIT = 5`, `MAX_DISPATCH_LIMIT = 10` in `src/lib/notifications/config.ts`).
   - Server-only DB orchestrator (`src/lib/db/notifications.ts`) and HTTP route `POST /api/requests/notifications/dispatch`.
3. **Privacy-Safe Donor Inbox API & Screen (Step 7D)**:
   - `GET /api/donors/notifications?donorId=<uuid>` returns narrow public notification projections.
   - `PATCH /api/donors/notifications` marks notifications as read with strict server-side donor ownership verification.
   - Donor notification screen at `/donors/notifications` displaying urgency, hospital, district, approximate area, units, component, compatibility badge, and "Your contact details are still private" card.
   - Non-functioning placeholder for Step 8: "Response available in the next step".
   - Integrated navigation from donor profile header and action list.
4. **Matching Page Notify Action**:
   - Updated `/requests/matching-demo` with explicit requester action "Notify Eligible Donors".
   - Displays aggregate result only (e.g. "3 eligible donors notified • In-app notifications sent").
   - Preserves displayed candidate match cards without failing re-query when request status advances to `'notified'`.
5. **Controlled Live Verification**:
   - 14-point live verification against configured Supabase project using disposable fixtures.
   - Verified: exact match notified, compatible match notified, preference-disabled skipped, stale/unavailable skipped, match status updated to `'notified'`, request status updated to `'notified'`, repeated dispatch idempotent (0 duplicates), donor inbox isolation verified, read state update verified, cross-donor read rejected (`not_found`), payload and audit privacy verified.
   - 100% cleanup of temporary rows with baseline counts fully restored.
6. **Automated Test Suite**:
   - 128 automated tests passing across 31 suites covering revalidation, ranking, interval math, dispatch limits, UUID validation, inbox queries, read status updates, and UI response parsing.

---

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `npm test` | ✅ 128 tests passing (0 failing, 31 suites) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ All routes compiled (`/api/donors/notifications`, `/api/requests/notifications/dispatch` dynamic) |
| `git diff --check` | ✅ 0 formatting/whitespace issues |
| Live Supabase Verification | ✅ Proved real dispatch, atomic RPC, idempotency, inbox isolation, and 100% cleanup |
| Service-Role Secret Isolation | ✅ Server-only; 0 client leaks |
| Direct Supabase Queries in UI | ✅ 0 occurrences |
| Sensitive Fields in Public UI/API | ✅ 0 occurrences (`phone_number`, `full_name`, `donor_id`, `match_id`, patient info) |
| Unsafe TypeScript Bypasses | ✅ 0 occurrences (`as any`, `as never`, `@ts-ignore`, `@ts-expect-error`) |

---

## 5. Security Architecture & Demo Auth Limitations

> [!IMPORTANT]
> The following security and architectural boundaries are active:

1. **Demo Identity vs Production Authorization**:
   - User authentication is not yet integrated (Mock Auth stage).
   - `donorId` in queries and bodies represents demo identification, NOT cryptographically verified authorization.
   - Production will require Supabase Auth JWT / session verification to assert donor ownership.
2. **In-App Notifications Only**:
   - Notifications are stored in `public.notifications` and viewed in-app.
   - No external SMS, WhatsApp, or email messaging is implemented.
3. **Strict Public Projection Isolation**:
   - Donor notification payloads and public projections strictly omit donor UUID, phone number, full name, requester contact, patient name, and match ID.
4. **Authoritative Server Revalidation**:
   - Dispatch limit, donor availability, and communication preferences are revalidated on the server immediately before creating notifications.

---

## 6. Next Milestone: Step 8 — Accept / Decline

The next planned milestone is **Step 8: Donor Response (Accept / Decline)**:
- Donor response model in `public.donor_responses`.
- Donor action on `/donors/notifications` to accept or decline matching requests.
- Transition candidate match states based on donor response.
- Step 9 (Two-Way Contact Reveal Protocol) follows mutual acceptance.
