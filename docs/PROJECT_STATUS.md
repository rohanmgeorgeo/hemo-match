# Hemo Match Project Status

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Branch:** `feature/matching-engine`
**Current Milestone:** Step 6: Request → Match (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Current Project State

Six milestones are complete. The application features a fully verified, privacy-safe, end-to-end Request → Match pipeline. Blood requests are persisted to PostgreSQL and matched via an authoritative server-only matching engine backed by deterministic RBC biological compatibility and configurable donation interval rules, persisting candidate matches with database-enforced idempotency, and rendering privacy-safe candidate cards in the matching UI.

Active user-facing flows:
1. **Request Blood & Match** — `/ → /requests/new → POST /api/requests → /requests/matching-demo → POST /api/requests/matches`
2. **Donor Registration** — `/ → /donors/register → POST /api/donors → /donors/profile`

> [!NOTE]
> All intake and matching operations persist to PostgreSQL via server-only Route Handlers.
> `localStorage` is used solely as a temporary post-persistence demo view cache to bridge the request UUID to `/requests/matching-demo`.
> Notification dispatch, donor response/acceptance, and two-way contact reveal belong to subsequent milestones (Step 7+).

---

## 2. Active Flows & Matching Pipeline

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

#### What Was Implemented:
1. **Pure RBC ABO/Rh Compatibility Engine** (`src/lib/matching/compatibility.ts`):
   - Exhaustive 64-combination matrix for Whole Blood and Red Blood Cells.
   - Classification into `homologous` (exact ABO/Rh) and `compatible` (safe alternative donor).
   - Strict rejection of unsupported components (Platelets, Plasma).
2. **Configurable Preliminary Donation Interval Evaluation** (`src/lib/eligibility/intervals.ts`, `src/lib/eligibility/rules.ts`):
   - Conservative 120-calendar-day application matching policy (`RULE_IN_CONSERVATIVE_INTERVAL_120D`) due to schema not collecting donor sex.
   - Deterministic, timezone-independent calendar-day math via UTC midnight normalization.
   - Safe exclusion of missing/unknown donation history (`EXCLUDE_DONATION_HISTORY_UNKNOWN`).
3. **Deterministic Multi-Factor Ranking** (`src/lib/matching/engine.ts`):
   - Homologous exact matches rank ahead of compatible alternative matches.
   - Greater elapsed recovery time ranks ahead within the same compatibility tier.
   - Deterministic lexicographic donor UUID tie-break used internally only (never exposed or persisted in metadata).
   - Absolute prohibition of arbitrary 0–100 clinical scoring.
4. **Server-Only Database Matching Helper** (`src/lib/db/matches.ts`):
   - `findAndCreateMatches()` runs exclusively server-side via `getServerClient()`.
   - Idempotent match insertion using PostgreSQL `UNIQUE(request_id, donor_id)` and PostgREST `.upsert(..., { onConflict: 'request_id,donor_id', ignoreDuplicates: true })`.
   - Non-PII structured `match_metadata` recording matching facts only.
5. **HTTP Boundary** (`src/app/api/requests/matches/route.ts`):
   - Thin POST route handler validating RFC 4122 UUID in `requestId`.
   - Returns sanitized `PublicMatchCandidate[]` with anonymized references (`Donor •••• [SUFFIX]`).
6. **Controlled Live Supabase Verification** (Step 6E):
   - Proved end-to-end flow with controlled test fixtures (Donors A–I proving exact match, compatible match, incompatible blood group, 119-day interval rejection, 120-day interval approval, unknown history rejection, unavailable rejection, consent rejection, and different district rejection).
   - Verified idempotency, non-PII metadata, error status mapping, and 100% cleanup of test rows without modifying pre-existing data.
7. **Real Matching UI Integration** (`src/app/requests/matching-demo/page.tsx`):
   - Connected `/requests/matching-demo` to real `POST /api/requests/matches`.
   - Clean UI states for loading (calm pulse), candidate cards, zero-matches, error/retry, and missing request.
   - Prominent privacy card ("Contact details stay private") and clinical safety disclaimer.
8. **Automated Test Suite**:
   - 90 automated tests passing across 25 suites covering compatibility, interval math, matching engine, route validation, and UI state parsing.

---

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `npm test` | ✅ 90 tests passing (0 failing, 25 suites) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ All routes compiled (`/api/requests/matches` dynamic) |
| `git diff --check` | ✅ 0 formatting/whitespace issues |
| Live Supabase Verification | ✅ Proved real DB matching, idempotency, and non-PII metadata |
| Service-Role Secret Isolation | ✅ Server-only; 0 client leaks |
| Direct Supabase Queries in UI | ✅ 0 occurrences |
| Sensitive Fields in Public UI/API | ✅ 0 occurrences (`phone_number`, `full_name`, `donor_id`, etc.) |
| Unsafe TypeScript Bypasses | ✅ 0 occurrences (`as any`, `as never`, `@ts-ignore`, `@ts-expect-error`) |

---

## 5. Security Architecture & Current MVP Limitations

> [!IMPORTANT]
> The following security, clinical, and architectural boundaries are locked for this milestone:

1. **Donor Phone Storage (Plaintext at Rest)**:
   - Stored plaintext in PostgreSQL `public.donors.phone_number`. Protected via RLS deny-all on Data API and server-only service-role queries.
2. **Preliminary Discovery Only (No Clinical Clearance)**:
   - Algorithmic matching performs preliminary donor discovery only. Final donor eligibility, crossmatching, and transfusion compatibility are determined by qualified blood-bank/clinical personnel.
3. **Application Interval Policy (120 Days)**:
   - 120 calendar days is an MVP application matching policy applied because the current schema does not record donor sex. It is not a universal clinical rule.
4. **Same-District Scope**:
   - Matching evaluates donors within the same administrative district only. No real GPS/distance calculations are performed.
5. **Supported Components**:
   - Whole Blood and Red Blood Cells only. Platelets and Plasma are unsupported.
6. **Notification Preference Deferred**:
   - Donors with notification preference `disabled` are matched and returned as candidates in Step 6; preference filtering is evaluated during notification dispatch (Step 7).
7. **Historical Match Rows**:
   - Existing candidate rows in `matches` are treated as historical records; donor revalidation belongs to later notification/acceptance workflows.
8. **Unimplemented Subsystems (Next Milestones)**:
   - **Step 7: Notifications Dispatch** (in-app alerts, notification feed).
   - **Step 8: Donor Response & Acceptance**.
   - **Step 9: Two-Way Contact Reveal Protocol**.
   - **User Authentication** (Supabase Auth / SMS OTP).

---

## 6. Next Active Milestone

**Step 7: Notification Dispatch Subsystem (Notify)**

- Implement notification generation for matched candidate donors (`public.notifications`).
- Respect `notification_preference` during dispatch.
- Implement in-app notification inbox / alert polling for candidate donors.
- Prepare notification acknowledgement workflow without exposing requester contact details prematurely.
