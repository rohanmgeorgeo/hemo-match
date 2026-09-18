# Hemo Match System Architecture

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Status:** Request → Match → Notify Milestone Complete (Step 7)

---

## 1. High-Level System Overview

**Hemo Match** connects verified blood donors with urgent patient requirements at the district level. The architecture prioritizes rapid matching, strict preliminary eligibility safety, and privacy-first contact reveal protocols.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Web / Mobile-First)"]
        Landing["Landing Page (/)"]
        RequestNew["Request Blood (/requests/new)"]
        MatchingDemo["Matching Page (/requests/matching-demo)"]
        DonorRegister["Register as Donor (/donors/register)"]
        DonorProfile["Donor Profile (/donors/profile)"]
    end

    subgraph ServerBoundary ["Next.js App Server Layer (Route Handlers)"]
        ApiDonors["POST /api/donors"]
        ApiRequests["POST /api/requests"]
        ApiMatches["POST /api/requests/matches"]
    end

    subgraph ServerOnlyDb ["Server-Only Database Layer (src/lib/db/)"]
        DbDistricts["districts.ts (resolveDistrictId)"]
        DbDonors["donors.ts (createDonor)"]
        DbRequests["requests.ts (createBloodRequest)"]
        DbMatches["matches.ts (findAndCreateMatches)"]
        DbClient["database/index.ts (getServerClient)"]
    end

    subgraph DomainLogic ["Pure Domain Engine (Server & Test)"]
        Compat["compatibility.ts (RBC ABO/Rh Matrix)"]
        Intervals["intervals.ts (120-Day Policy Math)"]
        Engine["engine.ts (Multi-Factor Ranking)"]
    end

    subgraph Persistence ["Persistence Layer (Supabase / PostgreSQL)"]
        DB[(PostgreSQL Database)]
        TblDonors[("public.donors")]
        TblRequests[("public.blood_requests")]
        TblMatches[("public.matches")]
        RLS["Row-Level Security (Deny-All Data API)"]
    end

    RequestNew -->|"POST JSON"| ApiRequests
    DonorRegister -->|"POST JSON"| ApiDonors
    MatchingDemo -->|"POST JSON { requestId }"| ApiMatches

    ApiDonors --> DbDonors
    ApiDonors --> DbDistricts
    ApiRequests --> DbRequests
    ApiRequests --> DbDistricts

    ApiMatches --> DbMatches
    DbMatches --> Engine
    Engine --> Compat
    Engine --> Intervals

    DbDonors --> DbClient
    DbRequests --> DbClient
    DbDistricts --> DbClient
    DbMatches --> DbClient

    DbClient -->|"service_role (bypasses RLS)"| DB
    DB --> TblDonors
    DB --> TblRequests
    DB --> TblMatches
```

---

## 2. Directory Structure & Modular Layout

```
Hemo Match/
├── docs/                      # Architectural & progress documentation
│   ├── PROJECT_STATUS.md      # Current milestone status, handoff, and tasks
│   ├── ARCHITECTURE.md        # System architecture & module contracts (this file)
│   ├── DECISIONS.md           # Architectural Decision Records (ADRs)
│   ├── TODO.md                # Task tracking across milestones
│   ├── BUGS.md                # Known issues, limitations, and mitigations
│   └── DEMO.md                # End-to-end demo script and verification flow
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql             # PostgreSQL schema + RLS + Data API privileges
│       ├── 0002_notification_idempotency.sql   # Partial unique index for match_found notifications
│       └── 0003_atomic_notification_dispatch.sql# Atomic RPC for match claim and notification creation
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # Dynamic Route Handlers (Server Boundary)
│   │   │   ├── donors/route.ts                    # POST /api/donors (donor intake)
│   │   │   ├── donors/notifications/route.ts      # GET /api/donors/notifications, PATCH mark read
│   │   │   ├── requests/route.ts                  # POST /api/requests (blood request intake)
│   │   │   ├── requests/matches/route.ts          # POST /api/requests/matches (match engine)
│   │   │   └── requests/notifications/dispatch/route.ts # POST /api/requests/notifications/dispatch
│   │   ├── requests/
│   │   │   ├── new/page.tsx             # Blood request intake form
│   │   │   └── matching-demo/page.tsx   # Request matching UI & "Notify Eligible Donors" CTA
│   │   └── donors/
│   │       ├── register/page.tsx        # Donor registration form
│   │       ├── profile/page.tsx         # Donor profile confirmation view (masked phone)
│   │       └── notifications/page.tsx   # Donor notification inbox screen
│   ├── lib/                   # Isolated subsystem contracts & utilities
│   │   ├── db/                # Server-only database helper modules ('server-only')
│   │   │   ├── districts.ts   # Slug-to-UUID resolver
│   │   │   ├── donors.ts      # createDonor() database helper
│   │   │   ├── requests.ts    # createBloodRequest() database helper
│   │   │   ├── matches.ts     # findAndCreateMatches() server-only coordinator
│   │   │   └── notifications.ts # dispatchNotificationsForRequest(), getDonorNotifications()
│   │   ├── database/index.ts  # Supabase client factory (server-only)
│   │   ├── validation/        # Schema validators, IST date parser, and UUID guards
│   │   │   ├── index.ts       # Donor & request form validators
│   │   │   ├── matches.ts     # Match body RFC 4122 UUID validator
│   │   │   └── notifications.ts # Dispatch & inbox request/query validators
│   │   ├── matching/          # Core matching engine & pure algorithms
│   │   │   ├── compatibility.ts # RBC ABO/Rh 64-pair biological matrix
│   │   │   ├── engine.ts        # Pure multi-factor ranking & exclusion engine
│   │   │   └── ui-helpers.ts    # Frontend storage validation & API response parsing
│   │   ├── notifications/     # Notification pre-dispatch revalidation & config
│   │   │   ├── config.ts      # Server-controlled dispatch limits
│   │   │   └── revalidation.ts# Pre-dispatch eligibility and preference revalidator
│   │   ├── eligibility/       # Preliminary donation interval subsystem
│   │   │   ├── intervals.ts   # Timezone-independent calendar math (120-day policy)
│   │   │   └── rules.ts       # Configurable interval rule definitions
│   │   └── privacy/           # Phone masking & 2-way contact reveal (Step 9)
│   └── types/
│       ├── index.ts           # Shared frontend domain types
│       ├── matches.ts         # Privacy-safe match candidates & API response types
│       └── database.ts        # Database row & insert types (server-side, snake_case)
└── tests/                     # 128 automated tests across domain, dispatch, and UI logic
    ├── compatibility.test.ts  # RBC 64-pair biological compatibility tests
    ├── intervals.test.ts      # Preliminary donation interval evaluation tests
    ├── engine.test.ts         # Pure matching engine, filters, ranking, and privacy tests
    ├── matches.route.test.ts  # Route validation & HTTP status mapping tests
    ├── matching-ui.test.ts    # Frontend UI helpers & privacy assertions
    ├── dispatch.test.ts       # Revalidation, ranking, and limit clamping tests
    └── inbox.test.ts          # Donor inbox query, read update, and projection privacy tests
```

---

## 3. End-to-End Request → Match → Notify Flow

The implemented pipeline executes across six discrete architectural stages:

```
1. Request Intake:
   User submits form at /requests/new
   → Validated server-side via POST /api/requests
   → Inserted into public.blood_requests (status='active')
   → Authoritative PostgreSQL UUID returned in HTTP 201 response
   → Cached in browser localStorage (hemo_match_active_request) for view handoff

2. Match Discovery Request:
   /requests/matching-demo reads cached request
   → Validates RFC 4122 UUID via validateStoredRequest()
   → Calls POST /api/requests/matches with { "requestId": "<uuid>" }

3. Server Matching Engine & Candidate Persistence:
   POST /api/requests/matches validates UUID format
   → Delegates to server-only findAndCreateMatches() in src/lib/db/matches.ts
   → Evaluates biological RBC ABO/Rh compatibility & 120-day preliminary recovery interval
   → Sorts candidates deterministically (homologous tier first, recovery time, donor UUID)
   → Inserts candidate records into public.matches (status='candidate')
   → Guarded by database UNIQUE(request_id, donor_id) constraint
   → Returns sanitized PublicMatchCandidate[] with anonymized references ("Donor •••• [SUFFIX]")

4. Explicit Requester Notify Action:
   Requester views candidate cards on /requests/matching-demo
   → Clicks "Notify Eligible Donors" button
   → Sends strictly { requestId: "<uuid>" } to POST /api/requests/notifications/dispatch
   → Browser sends zero donor IDs, match IDs, limits, or notification payloads

5. Server Revalidation, Deterministic Limit & Atomic RPC:
   POST /api/requests/notifications/dispatch verifies UUID
   → Delegates to server-only dispatchNotificationsForRequest()
   → Revalidates immediately prior to dispatch:
     - Request active, unexpired, supported component
     - Donor consent_given = true
     - Donor availability = 'available'
     - Donor notification_preference = 'enabled'
     - Donor 120-day interval rest & ABO/Rh compatibility satisfied
     - Excludes prior respondents and already-notified matches
   → Deterministically ranks and clamps candidates to server-controlled limit (DEFAULT_DISPATCH_LIMIT = 5)
   → Executes PostgreSQL RPC claim_match_and_create_notification() per candidate:
     - Atomically updates match status from 'candidate' to 'notified'
     - Inserts notification row (status: 'unread', type: 'match_found')
     - Protected by partial unique index idx_notifications_match_found_unique on (match_id, type)
   → Conditionally updates blood_requests status to 'notified' (if >= 1 dispatched)
   → Inserts non-PII aggregate audit log (action: 'notification.dispatch_completed')
   → Returns HTTP 200 aggregate response ("N eligible donors notified")

6. Privacy-Safe Donor Inbox:
   Candidate donor opens /donors/notifications
   → Calls GET /api/donors/notifications?donorId=<uuid>
   → Server-only DB query retrieves rows strictly belonging to the demo donor identity
   → Narrow projection returns logistical request context (blood group, component, units, district, hospital, urgency, requiredBy)
   → Prohibits donor UUID, donor name, donor phone, requester contact, and patient name
   → Donor can mark notification read via PATCH /api/donors/notifications (verified ownership)
   → Shows non-functioning placeholder: "Response available in the next step" (Step 8)
```

---

## 4. Security & Privacy Architecture

### A. Secret & Database Isolation
- **Service-Role Client**: Authenticated via `SUPABASE_SERVICE_ROLE_KEY` solely inside server-only modules guarded by `import 'server-only'`.
- **Zero Client Credential Leakage**: The browser never receives, requests, or uses `SUPABASE_SERVICE_ROLE_KEY`.
- **Zero Direct Browser Queries**: The client never queries Supabase tables directly; all operations pass through Next.js Route Handlers.
- **Data API Least Privilege**: `anon` and `authenticated` PostgREST roles are granted `SELECT` on `public.districts` only. Data API access to `donors`, `blood_requests`, and `matches` is completely denied by table-level RLS and privilege revocations.

### B. Donor Privacy in Public Matching
- **No Donor Identification Before Acceptance**: Donor full names, phone numbers, email addresses, and raw donor UUIDs are strictly stripped from all matching projections.
- **Anonymized References**: Candidate cards display non-identifying identifiers derived from the UUID suffix (e.g. `Donor •••• 9B4F`).
- **Internal Tie-Break Only**: The internal tie-break donor UUID is used strictly in-memory during sorting and is never persisted in `match_metadata` or returned to API consumers.
- **Internal Exclusions Protected**: Disqualification codes (e.g., `EXCLUDE_INTERVAL_TOO_SHORT`, `EXCLUDE_NO_CONSENT`) are internal to the engine and never returned over public endpoints.

---

## 5. Clinical Safety Boundary

> [!WARNING]
> **Preliminary Donor Discovery Only**:
> Hemo Match performs preliminary algorithmic donor discovery and coordination only.
> It does **NOT** determine final clinical eligibility, transfusion compatibility, or medical clearance.
> All blood collection, donor screening, deferral determination, and crossmatching must be conducted by qualified medical officers and licensed blood-bank personnel in accordance with national transfusion guidelines.
