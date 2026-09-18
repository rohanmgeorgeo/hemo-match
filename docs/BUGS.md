# Hemo Match Known Issues, Technical Tradeoffs & Bug Tracker

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Current Milestone:** Step 9 — Authorized Minimum Contact Reveal (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Active Blocking Bugs

**None.**
The Step 9 audit and controlled live verification confirmed zero blocking bugs across contact reveal authorization, atomic RPC reveal recording, minimum contact projection, database persistence, and user interface components. All 179 automated unit tests pass cleanly.

---

## 2. Resolved Issues (Steps 6, 7, 8 & 9)

| Issue | Resolution | Status |
|:------|:-----------|:-------|
| Duplicate match detection relied on string parsing (`error.message.includes('duplicate')`) | Switched to explicit PostgreSQL `UNIQUE(request_id, donor_id)` constraint via PostgREST `.upsert(..., { onConflict: 'request_id,donor_id', ignoreDuplicates: true })`. | **Resolved** (Step 6C-2) |
| Internal `tie_break_id` was persisted in `match_metadata` | Removed `tie_break_id` from persisted metadata. The donor UUID is already stored in `matches.donor_id`. Lexicographic tie-break remains strictly an in-memory comparator detail. | **Resolved** (Step 6C) |
| Duplicate notification vulnerability under concurrent dispatch | Authored migration `0002_notification_idempotency.sql` with partial unique index `idx_notifications_match_found_unique` on `(match_id, type) WHERE match_id IS NOT NULL AND type = 'match_found'`. | **Resolved** (Step 7B) |
| Non-atomic match status update and notification creation race condition | Authored migration `0003_atomic_notification_dispatch.sql` with PostgreSQL RPC `claim_match_and_create_notification` executing status transition (`candidate -> notified`) and notification insert within a single atomic transaction. | **Resolved** (Step 7C) |
| React 19 `set-state-in-effect` warning in donor notifications screen | Converted to derived loading state pattern with `fetchState` async updater, eliminating synchronous state setters in effect body. | **Resolved** (Step 7D) |
| Non-atomic match status transition and response insertion race condition | Authored migration `0004_atomic_donor_response.sql` with PostgreSQL RPC `record_donor_response` executing status transition (`notified -> accepted | declined`) and response insert within a single atomic transaction. | **Resolved** (Step 8A) |
| Cross-donor response tampering vulnerability | Enforced donor ownership check on notification linkage server-side before executing revalidation or RPC. | **Resolved** (Step 8C) |
| PL/pgSQL variable conflict in `record_contact_reveal` | Added `#variable_conflict use_column` and explicit constraint clause `ON CONFLICT ON CONSTRAINT contact_reveals_request_id_donor_id_key DO NOTHING` to prevent ambiguous column reference in `RETURNS TABLE` output variables. | **Resolved** (Step 9A) |
| Terminal request lifecycle exclusion on reveal | Updated authorization check in `record_contact_reveal` and pure revalidation to explicitly reject `fulfilled` requests alongside `cancelled` and `expired`. | **Resolved** (Step 9A/9B) |
| Requester match lifecycle status sync | Added `GET /api/requests/matches` via `getRequestMatches()` to safely expose updated match statuses (`accepted`, `declined`, `notified`) without re-running matching or overwriting existing states. | **Resolved** (Step 9C) |


---

## 3. Documented MVP Limitations & Technical Tradeoffs

The following items are intentional architectural tradeoffs for the hackathon MVP scope and will be addressed during production hardening:

1. **Plaintext Phone Number Storage**:
   - `public.donors.phone_number` is stored as plaintext in PostgreSQL.
   - Mitigated by database-level security: Data API grants deny `anon` and `authenticated` access; only server-only Route Handlers with `service_role` can access this table.
   - Production requirement: Encrypt at rest via `pgcrypto` column-level encryption or application-level AEAD.

2. **Conservative 120-Day Donation Interval Policy**:
   - The donor registration schema does not collect donor biological sex.
   - National guidelines (NBTC) prescribe 90 days for males and 120 days for females.
   - The engine applies a uniform 120-day policy as an application-level safety precaution.
   - Production requirement: Add sex/gender field to donor profile to support tailored 90-day intervals.

3. **Same-District Boundary (No GPS / Real-Time Map SDK)**:
   - Matching is strictly scoped to the same administrative district (`donor.district_id === request.district_id`).
   - Prevents inaccurate straight-line distance calculations and heavy client battery drain.
   - Production requirement: Integrate taluk/hospital cluster routing or GIS district bounding boxes.

4. **LocalStorage View Caching & Demo Identity**:
   - `hemo_match_active_request` and `hemo_match_demo_donor` are temporarily cached in browser `localStorage` to bridge view state between forms and confirmation/matching views without pseudo-auth.
   - Production requirement: Replace with real user sessions (Supabase Auth / SMS OTP).

5. **In-App Notifications & Responses Only**:
   - Outbound notifications and responses are stored in `public.notifications` and `public.donor_responses` and viewed in-app. No SMS, WhatsApp, or email messaging gateways are configured.

---

## 4. Environment & Tooling Notes

1. **Next.js Turbopack Root Warning**:
   - During `next build`, a warning may appear: `Next.js ignored package-lock.json in /Users/rohanmgeorgeo because it is outside the current Git repository`.
   - Impact: Benign build notice. Build exits with code 0 and all pages are generated correctly.

2. **Server-Only Execution**:
   - Modules under `src/lib/db/` import `server-only`. Standalone test runners or scripts must supply `--conditions=react-server` or execute within Next.js server runtime to satisfy this condition.

3. **Playwright Driver 404 in Testing Environment**:
   - The standalone browser subagent encountered an upstream CDN 404 downloading Playwright macOS arm64 drivers (`playwright-1.57.0-mac-arm64.zip`).
   - Impact: App pages render 200 OK locally; dev server and SSR output verified via curl and automated test suites.
