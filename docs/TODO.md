# Hemo Match Milestone Task List

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Current Branch:** `feature/donor-response`
**Current Milestone:** Step 8 — Donor Response & Acceptance (COMPLETE)
**Next Milestone:** Step 9 — Two-Way Contact Reveal Protocol (ACTIVE NEXT)

---

## Milestone Progress

- [x] **Step 1: Project Foundation & Baseline Architecture**
  - [x] Initialize Next.js App Router, TypeScript, Tailwind CSS
  - [x] Configure strict compile-time type checking
  - [x] Set up documentation and environment variables

- [x] **Step 2: Request Blood Intake Flow**
  - [x] Blood request intake form (`/requests/new`)
  - [x] Client validation and IST timezone coordination
  - [x] Matching demo screen foundation (`/requests/matching-demo`)

- [x] **Step 3: Donor Registration Flow**
  - [x] Donor registration intake form (`/donors/register`)
  - [x] Client validation and privacy notices
  - [x] Donor profile view with masked phone number (`/donors/profile`)

- [x] **Step 4: Supabase / PostgreSQL Database Foundation**
  - [x] Full relational schema (`0001_initial_schema.sql`) with 8 tables, 10 enums, indexes, and triggers
  - [x] Table-level Row Level Security (RLS) enabled on all tables
  - [x] Server-side typed database interfaces (`src/types/database.ts`)
  - [x] Server-only vs anon client factory (`src/lib/database/index.ts`)

- [x] **Step 5: Supabase Persistence Wiring**
  - [x] Install and enforce `server-only` guards across all database modules
  - [x] Enforce least-privilege Data API grants (deny-all on protected tables)
  - [x] Server-side district slug-to-UUID resolver (`src/lib/db/districts.ts`)
  - [x] Persist donors via `POST /api/donors` and `createDonor()`
  - [x] Persist blood requests via `POST /api/requests` and `createBloodRequest()`
  - [x] Deterministic IST-to-UTC conversion for `required_by` `TIMESTAMPTZ`

- [x] **Step 6: District Donor Matching Engine & Clinical Eligibility**
  - [x] **Step 6A**: Matching and eligibility architecture inspection and locked design
  - [x] **Step 6B**: Pure RBC ABO/Rh compatibility engine (`src/lib/matching/compatibility.ts`)
  - [x] **Step 6B**: Configurable preliminary donation interval evaluation (`src/lib/eligibility/intervals.ts`, `rules.ts`)
  - [x] **Step 6B**: Pure multi-factor ranking and exclusion engine (`src/lib/matching/engine.ts`)
  - [x] **Step 6C**: Server-only matching database coordinator (`src/lib/db/matches.ts`)
  - [x] **Step 6C-2**: Idempotent match insertion via `UNIQUE(request_id, donor_id)` and PostgREST `.upsert()`
  - [x] **Step 6D**: POST `/api/requests/matches` Route Handler with RFC 4122 UUID validation (`src/app/api/requests/matches/route.ts`)
  - [x] **Step 6E**: Controlled live Supabase verification proving real end-to-end matching, filters, idempotency, and non-PII metadata
  - [x] **Step 6F**: Connect `/requests/matching-demo` to real `POST /api/requests/matches` endpoint with polished UI states
  - [x] **Step 6G**: Final audit, documentation, handoff, and git commit/push

- [x] **Step 7: Notifications Dispatch & Privacy-Safe Donor Inbox**
  - [x] **Step 7A**: Notification subsystem audit and architecture design
  - [x] **Step 7B**: Migration `0002_notification_idempotency.sql` with partial unique index `idx_notifications_match_found_unique`
  - [x] **Step 7C**: Migration `0003_atomic_notification_dispatch.sql` with atomic RPC `claim_match_and_create_notification`
  - [x] **Step 7C**: Pure pre-dispatch revalidation (`revalidation.ts`) enforcing consent, availability, preferences, interval, and limits
  - [x] **Step 7C**: Server-only dispatch coordinator (`dispatchNotificationsForRequest`) and POST `/api/requests/notifications/dispatch`
  - [x] **Step 7D**: Donor notification inbox API (`GET/PATCH /api/donors/notifications`) with strict server-side ownership verification
  - [x] **Step 7D**: Donor notification inbox screen (`/donors/notifications`) with read/unread distinctions, privacy notices, and Step 8 placeholder
  - [x] **Step 7D**: Donor profile navigation integration ("Notifications" header badge and action CTA)
  - [x] **Step 7D**: Matching demo page explicit requester action ("Notify Eligible Donors" CTA)
  - [x] **Step 7E**: Controlled live Supabase verification proving full Request → Match → Notify flow, idempotency, inbox isolation, and 100% baseline restoration
  - [x] **Step 7F**: 128 automated tests passing across 31 suites

- [x] **Step 8: Donor Response & Acceptance Flow (COMPLETE)**
  - [x] **Step 8A**: Migration `0004_atomic_donor_response.sql` with atomic RPC `record_donor_response()`
  - [x] **Step 8B**: Pure pre-response revalidation (`revalidation.ts`) enforcing consent, availability, district, compatibility, and 120-day interval
  - [x] **Step 8C**: Server-only response coordinator (`submitDonorResponse()`) and POST `/api/donors/responses`
  - [x] **Step 8D**: Donor inbox UI real `Accept` and `Decline` controls with confirmation modals and safety notices
  - [x] **Step 8E**: Persistent response derivation in donor inbox projection (`PublicDonorNotification.response`)
  - [x] **Step 8F**: Controlled live Supabase verification proving Accept, Decline, stale rejection, idempotency, and zero contact reveals
  - [x] **Step 8G**: 153 automated tests passing across 38 suites

---

## Upcoming Milestones

- [ ] **Step 9: Two-Way Contact Reveal Protocol**
  - [ ] Requester reveal request after donor acceptance
  - [ ] Unmask contact details only when both parties have consented
  - [ ] Strict append-only audit trail in `contact_reveals` table
- [ ] **Step 10: Real Authentication & Production Hardening**
  - [ ] Supabase Auth (SMS OTP / phone authentication)
  - [ ] Column-level encryption for `donors.phone_number` at rest
  - [ ] Replace `localStorage` demo caches with authenticated session queries
