# Hemo Match Technical Architecture

## 1. System Overview

Hemo Match is a privacy-first emergency blood donor matching and coordination platform designed for the Kerala State district health ecosystem.

The system enforces a strict seven-stage pipeline:
```
Request Intake → Match Engine → Requester Notify Action → Donor Inbox → Donor Response (Accept / Decline) → Authorized Contact Reveal → Fulfillment
```

Key Architectural Tenets:
1. **Server-Authoritative**: All matching, eligibility filtering, notification dispatch, response processing, and contact reveal boundaries execute server-side only.
2. **Zero-PII Public Projections**: Donor phone numbers, names, exact locations, and patient identifiers are never exposed through matching, notification, or response APIs.
3. **Clinical Non-Interference**: Algorithmic suitability coordinates discovery only; final donor qualification is determined by qualified clinical/blood-centre personnel.
4. **Database-Enforced Atomicity & Idempotency**: Concurrency protection, dispatch limits, response transitions, and contact reveals are enforced through database constraints and atomic PostgreSQL RPC functions.

---

## 2. Directory Structure

```
hemo-match/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── donors/
│   │   │   │   ├── route.ts                       # POST /api/donors (donor intake)
│   │   │   │   ├── notifications/route.ts         # GET/PATCH /api/donors/notifications (inbox)
│   │   │   │   └── responses/route.ts             # POST /api/donors/responses (Accept/Decline)
│   │   │   ├── requests/
│   │   │   │   ├── route.ts                       # POST /api/requests (request intake)
│   │   │   │   ├── matches/route.ts               # POST/GET /api/requests/matches (match engine & status)
│   │   │   │   ├── contact-reveal/route.ts        # POST /api/requests/contact-reveal (Step 9)
│   │   │   │   └── notifications/dispatch/route.ts # POST /api/requests/notifications/dispatch
│   │   ├── requests/
│   │   │   ├── new/page.tsx             # Blood request intake form
│   │   │   └── matching-demo/page.tsx   # Request matching UI, status sync, & Contact Reveal CTA
│   │   └── donors/
│   │       ├── register/page.tsx        # Donor registration form
│   │       ├── profile/page.tsx         # Donor profile confirmation view (masked phone)
│   │       └── notifications/page.tsx   # Donor notification inbox & Accept/Decline screen
│   ├── lib/                   # Isolated subsystem contracts & utilities
│   │   ├── db/                # Server-only database helper modules ('server-only')
│   │   │   ├── districts.ts   # Slug-to-UUID resolver
│   │   │   ├── donors.ts      # createDonor() database helper
│   │   │   ├── requests.ts    # createBloodRequest() database helper
│   │   │   ├── matches.ts     # findAndCreateMatches() server-only coordinator
│   │   │   ├── notifications.ts # dispatchNotificationsForRequest(), getDonorNotifications()
│   │   │   ├── responses.ts   # submitDonorResponse() server-only coordinator
│   │   │   └── reveal.ts      # requestContactReveal(), getRequestMatches() coordinator
│   │   ├── database/index.ts  # Supabase client factory (server-only)
│   │   ├── validation/        # Schema validators, IST date parser, and UUID guards
│   │   │   ├── index.ts       # Donor & request form validators
│   │   │   ├── matches.ts     # Match body RFC 4122 UUID validator
│   │   │   ├── notifications.ts # Dispatch & inbox request/query validators
│   │   │   ├── responses.ts   # Donor response body validator
│   │   │   └── reveal.ts      # Contact reveal body validator
│   │   ├── matching/          # Core matching engine & pure algorithms
│   │   │   ├── compatibility.ts # RBC ABO/Rh 64-pair biological matrix
│   │   │   ├── engine.ts        # Pure multi-factor ranking & exclusion engine
│   │   │   └── ui-helpers.ts    # Frontend storage validation & API response parsing
│   │   ├── notifications/     # Notification pre-dispatch revalidation & config
│   │   │   ├── config.ts      # Server-controlled dispatch limits
│   │   │   └── revalidation.ts# Pre-dispatch eligibility and preference revalidator
│   │   ├── responses/         # Donor response revalidation
│   │   │   └── revalidation.ts# Authoritative pre-response suitability revalidator
│   │   ├── reveal/            # Contact reveal authorization & projection
│   │   │   └── revalidation.ts# Pre-reveal authorization checks & minimum projection
│   │   ├── eligibility/       # Preliminary donation interval subsystem
│   │   │   ├── intervals.ts   # Timezone-independent calendar math (120-day policy)
│   │   │   └── rules.ts       # Configurable interval rule definitions
│   │   └── privacy/           # Phone masking utilities
│   └── types/
│       ├── index.ts           # Shared frontend domain types
│       ├── matches.ts         # Privacy-safe match candidates & API response types
│       └── database.ts        # Database row & insert types (server-side, snake_case)
├── supabase/migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_notification_idempotency.sql
│   ├── 0003_atomic_notification_dispatch.sql
│   ├── 0004_atomic_donor_response.sql
│   └── 0005_contact_reveal_authorization.sql
└── tests/                     # 179 automated tests across domain, dispatch, response, and reveal logic
    ├── compatibility.test.ts  # RBC 64-pair biological compatibility tests
    ├── intervals.test.ts      # Preliminary donation interval evaluation tests
    ├── engine.test.ts         # Pure matching engine, filters, ranking, and privacy tests
    ├── matches.route.test.ts  # Route validation & HTTP status mapping tests
    ├── matching-ui.test.ts    # Frontend UI helpers & privacy assertions
    ├── dispatch.test.ts       # Revalidation, ranking, and limit clamping tests
    ├── inbox.test.ts          # Donor inbox query, read update, and projection privacy tests
    ├── responses.test.ts      # Donor Accept/Decline revalidation and payload validation tests
    └── reveal.test.ts         # Step 9 contact reveal authorization & projection tests
```

---

## 3. End-to-End Request → Match → Notify → Accept / Decline Flow

The implemented pipeline executes across seven discrete architectural stages:

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
   → Revalidates immediately prior to dispatch (consent, availability, preference, interval, ABO/Rh)
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
   → Derives recorded response state ('accepted' | 'declined' | null) from public.donor_responses
   → Prohibits donor UUID, donor name, donor phone, requester contact, and patient name
   → Donor can mark notification read via PATCH /api/donors/notifications (verified ownership)

7. Donor Response (Accept or Decline):
   Donor clicks "Accept" or "Decline" on actionable notification
   → Confirmation modal displays voluntary coordination scope, clinical disclaimer, and contact privacy assurance
   → Calls POST /api/donors/responses with { donorId, notificationId, response }
   → Server-only submitDonorResponse() validates input and executes authoritative revalidation:
     - For Accept: verifies active consent, availability='available', district consistency, ABO/Rh compatibility, and 120-day interval rest
     - For Decline: verifies notification linkage and non-terminal request lifecycle
   → Executes PostgreSQL RPC record_donor_response():
     - Atomically transitions match status: 'notified' -> 'accepted' | 'declined'
     - Inserts authoritative response record into public.donor_responses
     - Guarded by UNIQUE(request_id, donor_id) database constraint
   → Automatically updates notification status to 'read'
   → Preserves blood_requests status in 'notified' state (does NOT prematurely mark fulfilled)
   → Writes non-PII audit record (action: 'donor_response.accepted' | 'donor_response.declined')
   → Returns HTTP 200 response ({ success: true, response })
   → Zero contact reveals executed (contact_reveals table untouched; deferred strictly to Step 9)

8. Authorized Minimum Contact Reveal (Step 9):
   Requester refreshes / observes updated candidate status on /requests/matching-demo
   → GET /api/requests/matches?requestId=<uuid> retrieves live match states without re-running matching
   → Cards update to show "Donor Accepted" badge and "Reveal Contact" action button
   → Requester clicks "Reveal Contact"
   → Calls POST /api/requests/contact-reveal with { "requestId": "<uuid>", "matchId": "<uuid>" }
   → Server-only requestContactReveal() coordinates:
     - Pure revalidation validates match is 'accepted', donor response is 'accepted', and request is not cancelled/expired/fulfilled
     - Executes PostgreSQL RPC record_contact_reveal(p_request_id, p_match_id)
     - RPC verifies prerequisites within PostgreSQL and performs INSERT INTO contact_reveals ... ON CONFLICT DO NOTHING
     - Protected by UNIQUE(request_id, donor_id) database constraint
     - Inserts non-PII audit record (action: 'contact_reveal.authorized') with 0 phone/name/PII in metadata
     - Strips all non-permitted donor fields, projecting ONLY { name, phone }
   → Returns HTTP 200 response ({ success: true, contact: { name, phone } })
   → UI unmasks name and phone number on the accepted candidate card with emergency coordination banner
   → Re-clicking reveal is completely idempotent (0 duplicate rows, 0 duplicate audit entries)
   → Non-accepted and declined donors remain strictly contact-masked
```

---

## 4. Security & Privacy Architecture

### A. Secret & Database Isolation
- **Service-Role Client**: Authenticated via `SUPABASE_SERVICE_ROLE_KEY` solely inside server-only modules guarded by `import 'server-only'`.
- **Zero Client Credential Leakage**: The browser never receives, requests, or uses `SUPABASE_SERVICE_ROLE_KEY`.
- **Zero Direct Browser Queries**: The client never queries Supabase tables directly; all operations pass through Next.js Route Handlers.
- **Data API Least Privilege**: `anon` and `authenticated` PostgREST roles are granted `SELECT` on `public.districts` only. Data API access to `donors`, `blood_requests`, `matches`, `notifications`, `donor_responses`, and `contact_reveals` is completely denied by table-level RLS and privilege revocations.

### B. Donor Privacy in Public Matching & Response
- **No Donor Identification Before Authorized Reveal**: Donor full names, phone numbers, email addresses, and raw donor UUIDs are strictly stripped from all matching and notification projections.
- **Anonymized References**: Candidate cards display non-identifying identifiers derived from the UUID suffix (e.g. `Donor •••• 9B4F`).
- **Response Privacy**: Accepting a request expresses willingness to donate under clinical coordination; it does NOT broadcast contact details.
- **Minimum Contact Reveal Boundary**: Contact reveal is strictly gated behind verified donor acceptance. Only minimum coordination details (`name` and `phone`) are unmasked. No physical address, coordinates, email, or medical data are released.
- **Audit Non-PII Invariant**: Audit log events for contact reveals record structural IDs only (`request_id`, `donor_id`, `match_id`); no phone numbers or names are stored in audit metadata.

---

## 5. Clinical Safety Boundary

> [!WARNING]
> **Preliminary Donor Discovery Only**:
> Hemo Match performs preliminary algorithmic donor discovery and coordination only.
> It does **NOT** determine final clinical eligibility, transfusion compatibility, or medical clearance.
> All blood collection, donor screening, deferral determination, and crossmatching must be conducted by qualified medical officers and licensed blood-bank personnel in accordance with national transfusion guidelines.
