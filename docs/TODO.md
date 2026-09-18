# Hemo Match Milestone Task List

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Current Branch:** `feature/matching-engine`
**Current Milestone:** Step 6 — Request → Match (COMPLETE)
**Next Milestone:** Step 7 — Notifications Dispatch (ACTIVE NEXT)

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

---

## Active Next Milestone: Step 7 — Notifications Dispatch Subsystem

- [ ] **Step 7A**: Notification architecture inspection and data model review (`public.notifications`)
- [ ] **Step 7B**: Notification dispatch generator querying candidate matches for active blood requests
- [ ] **Step 7C**: Enforce `notification_preference` filter (skip outbound dispatch for `disabled` preference)
- [ ] **Step 7D**: Server-only notification queue helper and API endpoint
- [ ] **Step 7E**: Controlled live verification of notification generation
- [ ] **Step 7F**: In-app notification UI component / donor alert drawer
- [ ] **Step 7G**: Milestone documentation and handoff

---

## Upcoming Milestones

- [ ] **Step 8: Donor Response & Acceptance Flow**
  - [ ] Accept/decline actions via secure server Route Handler
  - [ ] Update `matches.status` and record `donor_responses`
  - [ ] Donor revalidation before acceptance confirmation
- [ ] **Step 9: Two-Way Contact Reveal Protocol**
  - [ ] Requester reveal request after donor acceptance
  - [ ] Unmask contact details only when both parties have consented
  - [ ] Audit trail in `contact_reveals` table
- [ ] **Step 10: Real Authentication & Production Hardening**
  - [ ] Supabase Auth (SMS OTP / phone authentication)
  - [ ] Column-level encryption for `donors.phone_number` at rest
  - [ ] Replace `localStorage` demo caches with authenticated session queries
