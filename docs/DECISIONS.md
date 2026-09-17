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
