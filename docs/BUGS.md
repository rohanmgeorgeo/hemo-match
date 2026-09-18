# Hemo Match Known Issues, Technical Tradeoffs & Bug Tracker

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Current Milestone:** Step 6 — Request → Match (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Active Blocking Bugs

**None.**
The Step 6 final audit confirmed zero blocking bugs across matching algorithms, database persistence, API endpoints, and user interface components. All 90 automated unit tests pass cleanly.

---

## 2. Resolved Issues (Step 6)

| Issue | Resolution | Status |
|:------|:-----------|:-------|
| Duplicate match detection relied on string parsing (`error.message.includes('duplicate')`) | Switched to explicit PostgreSQL `UNIQUE(request_id, donor_id)` constraint via PostgREST `.upsert(..., { onConflict: 'request_id,donor_id', ignoreDuplicates: true })`. | **Resolved** (Step 6C-2) |
| Internal `tie_break_id` was persisted in `match_metadata` | Removed `tie_break_id` from persisted metadata. The donor UUID is already stored in `matches.donor_id`. Lexicographic tie-break remains strictly an in-memory comparator detail. | **Resolved** (Step 6C) |
| Synchronous `setState` in React effect flagged by React 19 linter | Refactored matching page state to use `useMemo` for storage parsing and an idiomatic derived loading state pattern with `useEffect` async fetching. | **Resolved** (Step 6F) |
| Overly absolute zero-match public wording ("strictly enforces biological compatibility") | Replaced with neutral application-level wording: *"Matching applies preliminary blood-group compatibility, availability, district, consent, and configured donation-interval rules."* | **Resolved** (Step 6G) |

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

4. **LocalStorage View Caching**:
   - `hemo_match_active_request` and `hemo_match_demo_donor` are temporarily cached in browser `localStorage` to bridge view state between forms and confirmation/matching views without pseudo-auth.
   - Production requirement: Replace with real user sessions (Supabase Auth / SMS OTP).

---

## 4. Environment & Tooling Notes

1. **Next.js Turbopack Root Warning**:
   - During `next build`, a warning may appear: `Next.js ignored package-lock.json in /Users/rohanmgeorgeo because it is outside the current Git repository`.
   - Impact: Benign build notice. Build exits with code 0 and all pages are generated correctly.

2. **Server-Only Execution**:
   - Modules under `src/lib/db/` import `server-only`. Standalone test runners or scripts must supply `--conditions=react-server` or execute within Next.js server runtime to satisfy this condition.
