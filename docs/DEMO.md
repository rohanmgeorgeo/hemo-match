# Hemo Match Demonstration Walkthrough & Verification Guide

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Milestone:** Step 6 — Request → Match (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Verified Live Demonstration Flow

The following sequence demonstrates the completed, privacy-safe **Request → Match** workflow:

```
Step 1: Donor Registration (/donors/register)
  │ Fill out donor profile (blood group, district, approximate area, last donation date, contact)
  │ Client validates inputs
  ▼
POST /api/donors
  │ Resolves district slug to UUID
  │ Privileged insert into public.donors (authoritative UUID created)
  │ Returns sanitized HTTP 201 response (omitting phone number)
  ▼
Donor Profile View (/donors/profile)
  │ Displays confirmed registration with masked phone number: ••••••4321

────────────────────────────────────────────────────────────────────────

Step 2: Blood Request Creation (/requests/new)
  │ Enter blood group requirement (e.g. A+, Red Blood Cells, 1 unit, district, required-by)
  │ Client validates input and clinical safety disclaimer
  ▼
POST /api/requests
  │ Resolves district slug to UUID
  │ Converts local IST (UTC+05:30) datetime to authoritative UTC TIMESTAMPTZ
  │ Privileged insert into public.blood_requests (authoritative UUID created)
  │ Returns sanitized HTTP 201 response
  ▼
Handoff to Matching Screen (/requests/matching-demo)
  │ Browser receives persisted request UUID via local view cache
  │ Validates RFC 4122 UUID format via validateStoredRequest()

────────────────────────────────────────────────────────────────────────

Step 3: Server Matching & Candidate Display (/requests/matching-demo)
  ▼
POST /api/requests/matches { "requestId": "<uuid>" }
  │ Server validates request state, component compatibility, and expiration
  │ Queries registered donors within the matching district
  │ Evaluates biological RBC ABO/Rh compatibility (homologous vs compatible)
  │ Evaluates 120-day preliminary recovery interval using UTC midnight normalization
  │ Enforces hard filters: availability, consent, district, known donation date
  │ Persists candidate matches to public.matches with UNIQUE(request_id, donor_id) guard
  │ Generates non-PII match_metadata
  ▼
HTTP 200 Response (PublicMatchCandidate[])
  │ Returned candidate cards display:
  │ • Anonymized Reference: "Donor •••• [SUFFIX]"
  │ • Compatibility Badge: "Exact blood-group match" or "Compatible blood-group match"
  │ • Factual Verified Reasons: Exact ABO/Rh, Interval satisfied, Same district
  │ • Status: "Candidate"
  │ • Contact Details: Strictly hidden and protected
```

---

## 2. Privacy & Security Guarantees Proven in Live Demo

- **Zero Donor PII Exposed**: Donor names, raw UUIDs, phone numbers, email addresses, and coordinates are never sent across the network or displayed in matching results.
- **Anonymized Reference Format**: Requesters see only `Donor •••• [SUFFIX]` (derived from the last 4 characters of the donor UUID).
- **Non-PII Metadata**: Match audit records in `matches.match_metadata` store biological matching facts only (compatibility tier, days elapsed, rule ID, evaluation timestamp).
- **Service-Role Isolation**: The browser makes standard JSON HTTP requests to Next.js Route Handlers; `SUPABASE_SERVICE_ROLE_KEY` is completely isolated in server-only modules.
- **Idempotent Matching**: Repeated calls or clicking "Re-evaluate Matches" will never create duplicate match rows or overwrite existing candidate statuses.

---

## 3. Controlled Verification Fixtures (Step 6E Live Audit)

During Step 6E live verification, controlled temporary test rows (Donors A–I and one temporary request) were created against the live Supabase database to verify all individual matching filters:

1. **Exact Homologous Match** (Donor A): Matched with `compatibilityType: 'homologous'`.
2. **Compatible Alternative Match** (Donor B): Matched with `compatibilityType: 'compatible'`.
3. **Incompatible Blood Group** (Donor C): Correctly excluded; 0 match rows created.
4. **Interval Too Short (119 days)** (Donor D): Correctly excluded; 0 match rows created.
5. **Exact 120-Day Boundary** (Donor E): Correctly approved and matched.
6. **Unknown Donation History (`NULL`)** (Donor F): Correctly excluded; 0 match rows created.
7. **Unavailable Donor (`paused`)** (Donor G): Correctly excluded; 0 match rows created.
8. **No Consent Given** (Donor H): Correctly excluded; 0 match rows created.
9. **Different District** (Donor I): Correctly excluded; 0 match rows created.
10. **Disabled Notification Preference**: Correctly matched at Step 6 (filter applies at Step 7 dispatch).

> [!NOTE]
> All temporary verification fixtures were deleted immediately after live testing. Pre-existing database records remained untouched.

---

## 4. Upcoming Subsystems (Not Yet Implemented)

The following stages belong to future milestones and are **not** active in Step 6:

- **Step 7 (Notify)**: Outbound dispatch of in-app/SMS alerts to candidate donors.
- **Step 8 (Accept)**: Donor response (accept/decline) interface and status transitions.
- **Step 9 (Reveal)**: Two-way contact reveal protocol (unmasking phone numbers only after mutual consent).
- **Step 10 (Auth)**: Full user authentication replacing demo view caches.
