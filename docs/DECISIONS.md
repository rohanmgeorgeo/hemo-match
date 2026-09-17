# Architecture & Technology Decisions (ADR)

**Project:** Hemo Match  
**Challenge:** SC-12 — District Blood Donor Matching  
**Phase:** Database Foundation Milestone (Step 4)

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
