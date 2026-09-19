# Hemo Match Milestone Task List

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Current Branch:** `feature/github-portfolio-polish`
**Current Milestone:** Final GitHub & Portfolio Presentation Polish
**Status:** 259 tests / 76 suites passing (0 regressions)

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

- [x] **Step 9: Authorized Minimum Contact Reveal Protocol (COMPLETE)**
  - [x] **Step 9A**: Migration `0005_contact_reveal_authorization.sql` with unique constraint and atomic RPC `record_contact_reveal()`
  - [x] **Step 9B**: Pure pre-reveal authorization logic (`src/lib/reveal/revalidation.ts`) and minimum projection policy
  - [x] **Step 9C**: Server-only reveal orchestrator (`src/lib/db/reveal.ts`), safe status projection, and POST `/api/requests/contact-reveal`
  - [x] **Step 9D**: Matching demo UI privacy boundary cards, status refresh CTA, and authorized "Reveal Contact" action
  - [x] **Step 9E**: Controlled live Supabase verification proving authorized reveal, idempotency, rejections, non-PII audit logging, and 100% cleanup
  - [x] **Step 9F**: 179 automated tests passing across 44 suites (26 new tests in `tests/reveal.test.ts`)

---


- [x] **Step 14: Coordinate-First Proximity Matching & District Fallback (COMPLETE)**
  - [x] Migration `0006_proximity_matching_coordinates.sql` adding coordinates to requests and donors
  - [x] High-precision Haversine straight-line distance calculation (`src/lib/geo/distance.ts`)
  - [x] 5 km application matching radius (`MATCH_RADIUS_KM = 5`)
  - [x] Graceful same-district fallback when coordinates are omitted on either side
  - [x] Deterministic 4-tier candidate ranking with physical proximity tier
  - [x] Browser geolocation capture component (`LocationCapture.tsx`)

- [x] **Step 15: Evaluation Selection Dataset & Infrastructure (COMPLETE)**
  - [x] 5 deterministic RFC 4122 v4 evaluation donors in Ernakulam district (`src/lib/selection/data.ts`)
  - [x] Idempotent developer seed CLI (`npm run seed:selection`) and scoped reset (`npm run seed:selection:reset`)
  - [x] Zero public UI demo footprint; fully authentic application paths

- [x] **Step 16: Coordinator Operations Dashboard (COMPLETE)**
  - [x] Operations overview screen (`/coordinator`) with live metric summary cards
  - [x] Request lifecycle detail screen (`/coordinator/requests/[id]`) with 4-stage pipeline cards and 5-step timeline
  - [x] Server-only route handlers (`GET /api/coordinator/overview`, `GET /api/coordinator/requests/[id]`)
  - [x] Deterministic Needs Attention alerts and active request definitions
  - [x] Zero mutation actions (read-only monitoring MVP) and anonymized projections (`Donor •••• XXXX`)

- [x] **Step 17: Final QA & Evaluator Experience (COMPLETE)**
  - [x] Comprehensive review across all desktop and mobile flows
  - [x] Medical wording alignment (authoritative 120-day donation interval policy framing)
  - [x] 259 automated unit and integration tests passing across 76 suites

- [x] **Step 17.5: Remote Selection Audit, Seed & Production Walkthrough (COMPLETE)**
  - [x] Remote Supabase database audit and clean removal of developer test records
  - [x] Controlled seeding of the 5 selection donors in Ernakulam
  - [x] Live production evaluation walkthrough on `https://hemomatch.vercel.app/`
  - [x] Coordinator visual consistency polish

- [x] **Step 18: Final GitHub & Portfolio Polish (COMPLETE)**
  - [x] Professional, recruiter-ready main `README.md`
  - [x] Complete architectural diagrams, workflow documentation, and verified test results
  - [x] Repository hygiene audit (.gitignore `!.env.example`, zero committed secrets)
  - [x] Documentation synchronization across all `docs/` guides

## Upcoming Production Hardening Roadmap

- [ ] **Step 10: Real Authentication & Production Hardening**
  - [ ] Supabase Auth (SMS OTP / phone authentication)
  - [ ] Column-level encryption for `donors.phone_number` at rest
  - [ ] Replace `localStorage` demo caches with authenticated session queries
