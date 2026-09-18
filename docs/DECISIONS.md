# Architecture & Technology Decisions (ADR)

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Phase:** Supabase Persistence Wiring (Step 5)

This document records the core architectural and technology choices locked for **Hemo Match**, along with the technical rationale for each decision.

---

## 1. Core Framework: Next.js (App Router)

* **Decision:** Use Next.js (latest App Router) with React 19.
* **Rationale:**
  * Unified full-stack framework offering Server Components for fast data rendering and Server Actions / Route Handlers for backend operations.
  * Eliminates separate frontend/backend repo overhead for hackathon delivery.
  * Standardized routing, built-in SEO metadata management, and optimal caching controls.

---

## 2. Programming Language: Strict TypeScript

* **Decision:** Enforce TypeScript with `"strict": true` across the entire codebase.
* **Rationale:**
  * Blood matching domains deal with strict categorical data (blood groups, urgency tiers, donation intervals, contact reveal statuses).
  * Compile-time type verification prevents silent runtime errors in critical matching queries and eligibility calculations.

---

## 3. Styling: Tailwind CSS (v4)

* **Decision:** Utilize Tailwind CSS for styling with a disciplined design token approach.
* **Rationale:**
  * Enables rapid component iteration with zero context switching.
  * Facilitates an Apple Health / modern fintech design aesthetic: soft rounded cards, spacious layouts, high contrast typography, and restrained crimson/red accents.
  * Out-of-the-box responsive utilities simplify mobile-first development.

---

## 4. Primary Database & Backend: Supabase (PostgreSQL)

* **Decision:** Use Supabase on PostgreSQL as the primary persistence layer.
* **Rationale:**
  * Relational data integrity is essential for donor profiles, blood requests, matches, and contact reveal audits.
  * Row Level Security (RLS) provides granular, privacy-first data controls out-of-the-box.
  * Fast provisioning and native integration with Next.js workflows.

---

## 5. Backend Logic: Next.js Route Handlers & Server Actions

* **Decision:** Implement API logic via Next.js Route Handlers (`app/api/`) and Server Actions.
* **Rationale:**
  * Keeps API endpoints colocated with data access logic.
  * Type-safe boundary between UI and data mutations.
  * No external microservice deployment or boilerplate setup required.

---

## 6. Authentication: Mock Authentication Initially

* **Decision:** Begin with mock authentication before integrating full third-party OAuth / OTP providers.
* **Rationale:**
  * Focuses initial engineering bandwidth on the core challenge: **district donor matching and privacy workflows**.
  * Prevents auth provider configuration/SMS gateway blockers during early prototype validation.
  * Allows switching cleanly to Supabase Auth or SMS OTP in later phases using defined session abstractions.

---

## 7. Notifications: In-App Alerts Initially

* **Decision:** Implement notifications through in-app alerts and status banners rather than external SMS/WhatsApp/Push gateways initially.
* **Rationale:**
  * External messaging gateways (SMS/WhatsApp) require carrier approvals, paid API credentials, and template verifications that introduce friction.
  * In-app notifications provide immediate, testable feedback loops within the browser.
  * Notification contracts are abstracted behind `sendInAppNotification` so external providers can be plugged in seamlessly later.

---

## 8. Proximity & Matching: District / Locality Tiers (No Real Maps Initially)

* **Decision:** Implement matching using structured district, block, and locality tier categorization instead of live GPS map SDKs (Google Maps/Mapbox).
* **Rationale:**
  * Eliminates heavyweight map SDK overhead, API token costs, and high GPS battery drain on donor devices.
  * Emergency blood donation in administrative districts is typically organized by district, taluk, or hospital clusters.
  * Keeps the matching algorithm deterministic, explainable, and fast.

---

## 9. Deployment Target: Vercel + Supabase

* **Decision:** Deploy frontend and serverless API handlers to Vercel, paired with Supabase cloud PostgreSQL.
* **Rationale:**
  * Zero-config continuous deployment for Next.js with automatic preview branches.
  * High-availability edge network with minimal cold-start times.

---

## 10. Database Enum Strategy: PostgreSQL Native Enums

* **Decision:** Use PostgreSQL `CREATE TYPE ... AS ENUM` for categorical blood domain values.
* **Rationale:**
  * Blood groups, urgency levels, availability states, and lifecycle statuses are closed sets.
  * Native enums provide database-level constraint enforcement — invalid values are rejected at the DB layer, not just the application layer.
  * TypeScript enum types in `src/types/database.ts` mirror each PostgreSQL enum exactly to catch mismatches at compile time.
  * When a new value is needed, both the migration (new `ALTER TYPE ... ADD VALUE`) and the TypeScript types must be updated together.

---

## 11. Separate Frontend & Database Type Files

* **Decision:** Maintain two separate TypeScript type files:
  - `src/types/index.ts` — frontend domain types (camelCase, form state, localStorage)
  - `src/types/database.ts` — database row types (snake_case, server-side only, mirrors DB columns)
* **Rationale:**
  * Frontend types evolve with UI concerns (validation shapes, optional fields, localStorage compatibility).
  * Database types evolve with schema concerns (column names, null constraints, join projections).
  * Keeping them separate prevents implicit coupling and makes server-side privacy guarantees explicit. `DonorPublicRow` (which omits `phone_number`) exists only as a DB-layer type, not a frontend type.

---

## 12. RLS Strategy: Deny All for Protected Tables (Mock Auth Phase)

* **Decision:** Enable RLS on all application tables. Grant anon SELECT only on `districts`. All other tables are inaccessible via the anon key until real authentication is integrated.
* **Rationale:**
  * Prevents accidental exposure of `donors.phone_number` through unrestricted public queries.
  * Anon key is used safely in public reference data reads (districts list) without risk.
  * Service-role key is used server-side for all protected reads/writes.
  * When Supabase Auth is integrated, anon policies will be replaced with `auth.uid()` row-scoped policies.

---

## 13. Two-Client Database Architecture

* **Decision:** Implement two distinct Supabase client functions: `getServerClient()` (service role) and `getAnonClient()` (anon key), both in `src/lib/database/index.ts`.
* **Rationale:**
  * Clearly separates trusted server-side mutations (which bypass RLS and can access phone_number) from public reads (which respect RLS).
  * Makes the security boundary obvious at the call site — callers explicitly choose which trust level they need.
  * `getServerClient()` returns null when `SUPABASE_SERVICE_ROLE_KEY` is not configured, preventing silent failures.

---

## 14. `contact_reveals` as Immutable Append-Only Log

* **Decision:** The `contact_reveals` table has `Update: never` in the TypeScript `Database` interface, and no UPDATE policy in RLS.
* **Rationale:**
  * Contact reveal events are high-significance privacy actions. Once a reveal occurs, the record must be preserved for audit purposes.
  * Immutability ensures that the audit trail cannot be silently modified or deleted by application bugs.
  * Same principle applies to `audit_logs`.

---

## 15. Donor Medical Eligibility Is NOT Stored in the Database

* **Decision:** The `donor_availability` enum does not include `medically_ineligible`. Donation interval calculation and eligibility assessment are exclusively runtime matching-stage concerns.
* **Rationale:**
  * Medical eligibility changes over time (a donor who donated 3 months ago may become eligible again). Storing it as a persistent DB flag would require continuous background updates to stay accurate.
  * Eligibility is calculated at match time using `src/lib/eligibility/` rules against the donor's `last_donation_date`.
  * Permanently flagging a donor as `medically_ineligible` in the DB would risk incorrect exclusion without ongoing updates.
  * Availability (`available`, `temporarily_unavailable`, `paused`) reflects the donor's voluntary status, not a clinical determination.

---

## 16. Route Handlers Chosen as the Persistence Boundary

* **Decision:** Use Next.js Route Handlers (`POST /api/donors` and `POST /api/requests`) rather than Server Actions as the persistence boundary for existing client forms.
* **Rationale:**
  * Provides a clear REST contract decoupled from Next.js server-action bundling internals.
  * Enables straightforward HTTP status code mapping (201 Created, 400 Validation Error, 500 Server Error, 503 Unavailable).
  * Makes network failure and retry boundaries completely explicit in client fetch handlers.

---

## 17. Authoritative PostgreSQL UUID Generation

* **Decision:** Database primary keys (`id`) are exclusively generated by PostgreSQL via `DEFAULT gen_random_uuid()`. Client forms never submit or control IDs.
* **Rationale:**
  * Guarantees global uniqueness and avoids client clock collision or predictability issues.
  * Prevents malicious or duplicate primary key overrides from client requests.
  * Authoritative UUID returned from HTTP 201 response is used downstream for client display state.

---

## 18. LocalStorage Retained Temporarily as Post-Persistence Demo Cache

* **Decision:** Retain `hemo_match_demo_donor` and `hemo_match_active_request` in browser `localStorage`, populated strictly *after* successful HTTP 201 database insertion.
* **Rationale:**
  * Preserves the existing interactive demonstration flow (`/donors/profile` and `/requests/matching-demo`) without requiring immediate implementation of full session management or pseudo-auth.
  * Never written on API or network failure, guaranteeing demo views reflect only confirmed persistent records.
  * Recognised as a temporary MVP bridge that will be replaced by authenticated user queries in production.

---

## 19. Deterministic IST (UTC+05:30) Blood-Request Timezone Contract

* **Decision:** Interpret all blood-request date and time intake inputs as India Standard Time (`Asia/Kolkata`, UTC+05:30), converting to UTC ISO timestamps on the server.
* **Rationale:**
  * The challenge problem and initial deployment focus on administrative districts in Kerala, India.
  * Browser `<input type="date">` and `<input type="time">` do not include timezone offsets.
  * Explicitly appending `+05:30` via `parseIstDateTime()` ensures deterministic conversion to PostgreSQL `TIMESTAMPTZ` regardless of whether the server runs in UTC, IST, or any other runtime timezone.

---

## 20. Server-Only Protection for Service-Role Database Code

* **Decision:** Enforce `import 'server-only'` across `src/lib/database/index.ts` and all database helpers (`src/lib/db/*`).
* **Rationale:**
  * Protects `SUPABASE_SERVICE_ROLE_KEY` and privileged database queries from ever being bundled into client JavaScript.
  * Triggers hard compile-time build errors if any developer accidentally imports a database helper into a `'use client'` component.

---

## 21. Explicit Least-Privilege Data API Grants

* **Decision:** Explicitly revoke default Supabase Data API grants and grant back only minimal required privileges in Section 13 of `0001_initial_schema.sql`:
  - `anon` and `authenticated`: `SELECT` on `public.districts` only.
  - `service_role`: `SELECT, INSERT, UPDATE, DELETE` on all 8 application tables (no TRUNCATE, REFERENCES, or TRIGGER).
* **Rationale:**
  * Prevents default permissive table access or inherited grants from exposing private donor or request records over PostgREST / Data API.
  * Locks down table structure changes to administrative migrations.

---

## 22. Donor Phone-at-Rest Stored in Plaintext (Documented MVP Limitation)

* **Decision:** Donor phone numbers are stored as plaintext in `public.donors.phone_number` in PostgreSQL. No application-level hashing or encryption currently exists.
* **Rationale:**
  * For this hackathon MVP milestone, privacy is enforced via architecture: RLS denies all public access, Route Handlers strictly project public columns excluding phone, and client UI renders phone in masked form.
  * Storing phone in plaintext is explicitly documented as a known MVP limitation and technical tradeoff to be addressed during production compliance hardening (e.g. via pgcrypto or application-layer AEAD), not represented as a completed security feature.

---

## 23. No GET-by-Client-ID or Pseudo-Auth Before Real Authentication

* **Decision:** Do not create unauthenticated `GET /api/donors/[id]` endpoints or cookie-based pseudo-auth mechanisms for donor retrieval.
* **Rationale:**
  * Exposing GET endpoints by ID without real authentication would create an enumeration/data leakage vector for private donor information.
  * Protected record retrieval should wait for real authentication (Supabase Auth / SMS OTP) with proper `auth.uid()` security boundaries.

---

## 24. Biological RBC ABO/Rh Compatibility Matrix

* **Decision:** Enforce Red Blood Cell (RBC) ABO/Rh compatibility using an immutable, typed 64-combination matrix in `src/lib/matching/compatibility.ts`. Classify matches into `homologous` (exact ABO/Rh match) and `compatible` (safe alternative donor, e.g., O- for A+).
* **Rationale:**
  * Transfusion compatibility follows strict immunological rules; hardcoding a locked matrix eliminates runtime lookup ambiguity.
  * Explicitly distinguishing homologous from compatible alternatives enables optimal medical prioritization during ranking.

---

## 25. Supported Matching Components Limited to Whole Blood and Red Blood Cells

* **Decision:** Restrict Step 6 preliminary matching to requests for `'Whole Blood'` and `'Red Blood Cells'`. Requests for `'Platelets'` or `'Plasma'` are explicitly rejected with `UNSUPPORTED_COMPONENT_FOR_MATCHING`.
* **Rationale:**
  * Platelets and plasma follow different biological compatibility dynamics (including reverse ABO/isohemagglutinin considerations) and separate recovery interval standards.
  * Rejecting unsupported components at the domain boundary prevents dangerous misapplication of RBC rules to other blood fractions.

---

## 26. Conservative 120-Day Donation Interval Policy as Application Safeguard

* **Decision:** Apply a uniform preliminary recovery threshold of 120 calendar days (`RULE_IN_CONSERVATIVE_INTERVAL_120D`) across all Whole Blood and RBC donors.
* **Rationale:**
  * Official Indian transfusion guidelines (Drugs & Cosmetics Rules / NBTC) specify a 90-day interval for male donors and a 120-day interval for female donors.
  * The current Hemo Match donor schema does not collect donor biological sex.
  * Adopting the longer 120-day threshold is an application-level safeguard to avoid discovering donors who may still be deferred, while clearly documenting that this is an MVP matching policy and not a universal clinical rule.

---

## 27. Missing Donation History (NULL) Excluded Conservatively

* **Decision:** A `NULL`, empty, or unparseable `donor.last_donation_date` is conservatively excluded with `EXCLUDE_DONATION_HISTORY_UNKNOWN`. It is never inferred to mean "first-time donor".
* **Rationale:**
  * The intake schema cannot distinguish between a donor who has never donated and a donor whose history was unrecorded.
  * Making clinical assumptions about missing medical history introduces safety risks; requiring known donation history ensures only verifiable candidates are matched.

---

## 28. Same-District Matching Scope (No Fake Proximity or GPS)

* **Decision:** Restrict matching strictly to donors registered in the same administrative district as the blood request (`donor.district_id === request.district_id`).
* **Rationale:**
  * Emergency blood donation in administrative districts is coordinated regionally around district hospitals and blood banks.
  * Avoids heavyweight map SDKs, battery drain, and inaccurate straight-line GPS distance estimations.
  * Keeps the matching algorithm fully explainable, deterministic, and fast.

---

## 29. Deterministic Multi-Factor Ranking Without Arbitrary Clinical Scoring

* **Decision:** Order eligible candidate matches using a strict three-tier deterministic comparator:
  1. Homologous exact ABO/Rh matches rank before compatible alternative matches.
  2. Within the same compatibility tier, donors with greater elapsed days since last donation rank ahead.
  3. Ties are broken deterministically using lexicographic comparison of donor UUIDs.
  * Do **not** compute arbitrary 0–100 clinical suitability scores.
* **Rationale:**
  * Clinical suitability cannot be represented by a synthetic numerical score.
  * Factual medical hierarchy (exact before compatible, well-rested before recently-eligible) is transparent, deterministic, and medically sound.

---

## 30. Notification Preference Filter Deferred to Dispatch Milestone (Step 7)

* **Decision:** A donor whose `notification_preference` is `'disabled'` is **not** excluded at the Match stage. Such donors are identified and persisted as candidates in `matches`.
* **Rationale:**
  * Matching evaluates biological and geographic alignment between a patient requirement and donor pool.
  * Communication preferences govern whether an outbound dispatch (SMS/in-app) should be sent in Step 7, not whether the donor is biologically compatible.

---

## 31. Anonymized Identifiers & Strict Privacy Before Acceptance

* **Decision:** The matching API and matching-demo UI surface candidates solely through anonymized references (`Donor •••• [SUFFIX]`), omitting donor UUIDs, full names, phone numbers, and coordinates.
* **Rationale:**
  * Requesters have no legitimate need for donor contact information during initial discovery.
  * Prevents requester harassment or uncoordinated private outreach before a donor explicitly accepts.

---

## 32. Non-PII Match Metadata (Tie-Break Excluded from Persistence)

* **Decision:** Persist only non-identifying matching facts in `matches.match_metadata` (`compatibility_type`, blood groups, elapsed days, minimum interval, rule ID, evaluated timestamp, and rank factors). Do not persist the donor UUID tie-break.
* **Rationale:**
  * The donor UUID is already stored in `matches.donor_id`; duplicating it inside JSON metadata creates redundant data and violates metadata sanitization rules.
  * Prevents internal algorithm artifacts from polluting audit records.

---

## 33. Database-Level Idempotency via PostgREST INSERT-OR-IGNORE

* **Decision:** Enforce match persistence idempotency through Supabase `.upsert(payloads, { onConflict: 'request_id,donor_id', ignoreDuplicates: true })` backed by PostgreSQL `UNIQUE(request_id, donor_id)`.
* **Rationale:**
  * Avoids fragile client-side string inspection of database error messages (e.g. `error.message.includes('duplicate')`).
  * Concurrently safe: multiple matching calls for the same request will never insert duplicate rows or overwrite existing candidate statuses.

---

## 34. Existing Matches Treated as Historical Records in Step 6

* **Decision:** Existing candidate rows in `matches` are preserved unconditionally as historical discovery records; Step 6 does not automatically withdraw or revalidate existing matches if a donor's profile later changes.
* **Rationale:**
  * Discovery reflects the system state at match evaluation time.
  * Revalidation before dispatch belongs to Step 7 (Notification Dispatch), and final revalidation belongs to Step 8/9 (Acceptance and Contact Reveal).

---

## 35. DB-Enforced Uniqueness: One match_found Notification per Match

* **Decision:** Enforce database-level uniqueness for `match_found` notifications via a partial unique index on `(match_id, type)` in `supabase/migrations/0002_notification_idempotency.sql`.
* **Rationale:**
  * Application-level pre-checks are necessary but insufficient under high concurrency; the database must serve as the authoritative final backstop.
  * Ensures that a given match record produces at most one discovery notification, preventing duplicate alerts to candidate donors.

---

## 36. Partial Unique Index Rationale for notifications Table

* **Decision:** Implement uniqueness as `CREATE UNIQUE INDEX idx_notifications_match_found_unique ON notifications (match_id, type) WHERE match_id IS NOT NULL AND type = 'match_found';` rather than a broad table-level unique constraint across `(donor_id, request_id, type)`.
* **Rationale:**
  * `matches` already guarantees `UNIQUE(request_id, donor_id)`, so `match_id` directly identifies the candidate pair.
  * Other notification types (e.g. `system`, `request_fulfilled`, `request_expired`) or notifications with null `match_id` must not be artificially restricted.

---

## 37. Atomic Dispatch Requirement (Notification Creation + Match Status Transition)

* **Decision:** The upcoming Step 7C notification dispatch workflow must guarantee that creating the notification row and transitioning `matches.status` from `'candidate'` to `'notified'` cannot leave a partial state.
* **Rationale:**
  * A sequence of independent PostgREST calls is not atomic and could fail mid-way, leaving a match marked as candidate despite notification or vice versa.
  * Step 7C must employ a PostgreSQL transaction, RPC function, or single atomic database boundary. The partial unique index provides the ultimate concurrency defense.

---

## 38. Server-Controlled Dispatch Limit & Explicit User Action

* **Decision:**
  * Dispatch limit is an internal, server-controlled application configuration (default 5, maximum cap 10).
  * Clients must not choose or override this limit; no `limit` field will exist in public dispatch request payloads.
  * Notification dispatch is triggered by an explicit user action ("Notify Candidates") rather than an implicit side-effect of querying matches.
* **Rationale:**
  * Dispatch limits are operational anti-fatigue safeguards, not clinical scores or requester preferences.
  * Explicit triggers give requesters visibility and control over outbound communications.

---

## 39. Request Status Advancement Gated on Successful Notification

* **Decision:** `blood_requests.status` advances from `'active'` to `'notified'` if and only if at least one candidate notification is successfully created.
* **Rationale:**
  * If zero candidates are eligible or notified, the request remains `'active'` for future matching runs.
  * Marking a request as `'notified'` with 0 outbound notifications would create a false representation of discovery progress.

---

## 40. Strict Terminology Boundary: Step 8 Accept, Step 9 Reveal

* **Decision:** Enforce precise lifecycle terminology across documentation and code:
  * **Step 7**: Notification Dispatch (in-app notification to donor).
  * **Step 8**: Donor Response (donor explicitly Accepts or Declines).
  * **Step 9**: Authorized Minimum Contact Reveal (requester obtains donor phone number after donor acceptance).
* **Rationale:**
  * Matching or notifying never reveals donor contact information.
  * Contact reveal is an authorized, audited workflow triggered by donor acceptance, not a "mutual acceptance" broadcast.

---

## 41. Atomic Dispatch RPC & Server-Only Privilege Boundary

* **Decision:** Implement atomic candidate notification dispatch via the PostgreSQL function `claim_match_and_create_notification` in `supabase/migrations/0003_atomic_notification_dispatch.sql`. Explicitly revoke default execution privileges from `PUBLIC`, `anon`, and `authenticated`, granting execution exclusively to `service_role`.
* **Rationale:**
  * PostgreSQL grants `PUBLIC` execute on new functions by default, which would expose the RPC to unauthenticated PostgREST callers if not revoked.
  * Executing within a single function boundary guarantees that `matches.status` transition (`'candidate' → 'notified'`) and `notifications` insertion succeed or fail atomically.
  * `SECURITY INVOKER` with fixed `search_path = public, pg_temp` prevents privilege elevation and search_path poisoning.

---

## 42. Demo Authorization Boundary for Dispatch API

* **Decision:** `POST /api/requests/notifications/dispatch` accepts and validates `requestId` as a well-formed UUID for demo coordination, but explicitly documents that UUID validation is identification, not production authorization.
* **Rationale:**
  * Until Supabase Auth (SMS OTP / user sessions) is integrated, real user credentials do not exist.
  * Faking authorization with cookies or tokens would create an illusion of security. The endpoint is explicitly scoped as a hackathon demo boundary while preserving all underlying RLS and service-role protections.

---

## 43. Narrow Public Notification Projections for Donor Inbox

* **Decision:** Implement `GET /api/donors/notifications?donorId=<uuid>` returning a strictly limited projection of logistical fields (`bloodGroup`, `component`, `unitsNeeded`, `districtName`, `approximateArea`, `hospitalName`, `urgency`, `requiredBy`, `compatibilityType`, `createdAt`, `readAt`). Donor UUID, donor name, donor phone, requester contact, patient name, and match ID are explicitly prohibited from public responses.
* **Rationale:**
  * Candidate donors need sufficient logistical facts to decide whether to respond (urgency, facility, component), but must not receive requester contact details or patient PII.
  * Stripping donor UUID and match ID prevents clients from attempting cross-entity correlation or unauthorized state mutation.

---

## 44. Server-Side Donor Ownership Enforcement for Notification Read Status

* **Decision:** `PATCH /api/donors/notifications` requires `{ notificationId, donorId }` and executes a server-side update where `id = notificationId AND donor_id = donorId`. If the notification does not exist or does not belong to the supplied donor identity, the update fails and returns `404 Not Found`.
* **Rationale:**
  * Prevents cross-donor state tampering where one demo identity could mark another donor's notifications as read.
  * Enforces ownership validation at the SQL query boundary via `getServerClient()`.

---

## 45. Atomic Donor Response RPC & Match Transition

* **Decision:** Implement atomic response recording and match status transition via the PostgreSQL function `record_donor_response(p_donor_id, p_request_id, p_match_id, p_response)` in `supabase/migrations/0004_atomic_donor_response.sql`. Explicitly revoke default execution privileges from `PUBLIC`, `anon`, and `authenticated`, granting execution exclusively to `service_role`.
* **Rationale:**
  * Executing within a single atomic PostgreSQL transaction guarantees that transitioning `matches.status` from `'notified'` to `'accepted'` or `'declined'` and inserting into `public.donor_responses` cannot leave partial state.
  * `SECURITY INVOKER` with fixed `search_path = public, pg_temp` prevents privilege elevation and search_path hijacking.

---

## 46. Authoritative Server-Side Pre-Accept Revalidation

* **Decision:** Immediately before recording an Accept response, the server revalidates that:
  1. The request remains active, unexpired, and supported (Whole Blood / RBC).
  2. The donor consent remains `true`.
  3. The donor availability remains `'available'`.
  4. The donor district matches the request district.
  5. The donor ABO/Rh blood group remains compatible with the request.
  6. The donor's preliminary 120-day donation interval rest is satisfied with known donation history.
* **Rationale:**
  * Circumstances may change between notification dispatch and donor response (e.g. donor paused availability, donated elsewhere, or request expired).
  * The server must act as the authoritative clinical/logistical gatekeeper, never trusting client state.

---

## 47. Decline Semantics & Non-Clinical Scope

* **Decision:** Declining a match notification does NOT require or assert medical or interval eligibility. Decline validates only:
  1. Real donor/request/match/notification linkage.
  2. Match is currently in `'notified'` status.
  3. Request has not reached a terminal state (`'expired'`, `'cancelled'`, `'fulfilled'`).
  4. Donor has not already responded.
* **Rationale:**
  * A donor may choose to decline for personal, scheduling, or logistical reasons without having their medical suitability evaluated or questioned.
  * Decline is non-judgmental and voluntary.

---

## 48. Immutable Single Response per Match Pair

* **Decision:** Enforce that at most one response can be recorded for any `(request_id, donor_id)` pair via the database uniqueness constraint `UNIQUE (request_id, donor_id)` on `public.donor_responses` and conditional match updates (`status = 'notified'`).
* **Rationale:**
  * Prevents double-response races, Accept after Decline overwrites, and Decline after Accept overwrites.
  * Ensures a deterministic, immutable audit trail for clinical coordination.

---

## 49. Request Lifecycle Preservation upon Donor Acceptance

* **Decision:** Recording a donor's acceptance does NOT automatically mark the blood request as `'fulfilled'`. The request remains in status `'notified'`.
* **Rationale:**
  * A single acceptance does not mean blood has been collected, tested, or transfused.
  * Requests often require multiple units from multiple donors.
  * Premature fulfillment would prematurely close discovery for remaining needed units.

---

## 50. Strict Contact Privacy Isolation at Response Stage

* **Decision:** Donor acceptance expresses willingness to donate under clinical coordination, but strictly does NOT reveal donor phone numbers, emails, or requester contact information.
* **Rationale:**
  * Two-way contact reveal is an authorized, audited workflow deferred strictly to Step 9.
  * Premature contact exposure exposes donors to uncoordinated direct calls before clinical routing is confirmed.

---

## 51. Gated Authorized Contact Reveal on Verified Donor Acceptance

* **Decision:** Release of donor contact details is strictly gated behind verified donor acceptance (`matches.status = 'accepted'` and `donor_responses.response = 'accepted'`).
* **Rationale:**
  * Candidates, notified donors who have not yet responded, and donors who have declined must never have their contact information disclosed.
  * Explicit donor opt-in is a foundational privacy principle of Hemo Match.

---

## 52. Minimum Contact Projection Policy

* **Decision:** The contact reveal endpoint projects strictly two fields: `name` (`donors.full_name`) and `phone` (`donors.phone_number`). All other fields (email, physical address, coordinates, raw donor UUID, medical eligibility history) are stripped from the response.
* **Rationale:**
  * Adheres to the principle of data minimization. Emergency coordination between requester/hospital and donor requires only direct verbal communication capability.
  * Revealing location coordinates or emails increases attack surface and privacy intrusion without clinical benefit.

---

## 53. Explicit Requester Reveal Action (No Automatic Unmasking)

* **Decision:** When a donor accepts, contact details are NOT automatically unmasked in the requester's UI or pushed in notifications. The requester must perform an explicit "Reveal Contact" action.
* **Rationale:**
  * Avoids passive data leakage (e.g. if the requester screen is visible to bystanders or multiple coordinators).
  * Forces intentional retrieval, enabling precise audit logging of the moment contact details were accessed.

---

## 54. Request Lifecycle Protection on Reveal

* **Decision:** Contact reveal authorization requires that the blood request is in an actionable, non-terminal state. Reveal is explicitly rejected if `blood_requests.status` is `'cancelled'`, `'expired'`, or `'fulfilled'`.
* **Rationale:**
  * If a request is fulfilled, expired, or cancelled, emergency coordination is no longer valid.
  * Preventing reveal on fulfilled or closed requests protects donors from unnecessary outreach after clinical need has ceased.

---

## 55. Database Atomicity & Idempotency via `record_contact_reveal` RPC

* **Decision:** Contact reveals are recorded via an atomic PostgreSQL function `record_contact_reveal(p_request_id, p_match_id)` backed by table constraint `UNIQUE (request_id, donor_id)` on `public.contact_reveals` with `ON CONFLICT DO NOTHING`.
* **Rationale:**
  * Guarantees at most one contact reveal record per donor-request pair, preventing duplicate audit records or race conditions under concurrent requests.
  * The RPC validates match status and request lifecycle within the database transaction before writing to `contact_reveals`.

---

## 56. Zero PII in Audit Log Metadata for Contact Reveals

* **Decision:** Audit records for `contact_reveal.authorized` store structural IDs only (`request_id`, `donor_id`, `match_id`, and `actor_type: 'requester'`). Zero phone numbers, names, or contact data are written to `audit_logs.metadata`.
* **Rationale:**
  * Audit logs must demonstrate compliance and traceability without becoming secondary repositories of PII.
  * Observers or log analytics tools must not gain access to private contact details via audit inspection.
