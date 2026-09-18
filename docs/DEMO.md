# Hemo Match Demonstration Walkthrough & Verification Guide

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Milestone:** Step 8 — Donor Response & Acceptance (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Verified Live Demonstration Flow (Request → Match → Notify → Accept)

The following sequence demonstrates the completed, privacy-safe **Request → Match → Notify → Accept / Decline** workflow:

```
Step 1: Register Demo Donor (/donors/register)
  │ Fill out donor profile (blood group, district, approximate area, last donation date, contact)
  │ Notification preference set to "Enabled"
  │ Client validates inputs
  ▼
POST /api/donors
  │ Resolves district slug to UUID
  │ Privileged insert into public.donors (authoritative UUID created)
  │ Returns sanitized HTTP 201 response (omitting phone number)
  ▼
Donor Profile View (/donors/profile)
  │ Displays confirmed registration with masked phone number: ••••••4321
  │ Features "Notifications" button in header and profile action cards

────────────────────────────────────────────────────────────────────────

Step 2: Create Blood Request (/requests/new)
  │ Enter blood group requirement (e.g. B+, Whole Blood, 2 units, district, required-by)
  │ Client validates input and clinical safety disclaimer
  ▼
POST /api/requests
  │ Resolves district slug to UUID
  │ Converts local IST (UTC+05:30) datetime to authoritative UTC TIMESTAMPTZ
  │ Privileged insert into public.blood_requests (authoritative UUID created, status='active')
  │ Returns sanitized HTTP 201 response
  ▼
Handoff to Matching Screen (/requests/matching-demo)
  │ Browser receives persisted request UUID via local view cache
  │ Validates RFC 4122 UUID format via validateStoredRequest()

────────────────────────────────────────────────────────────────────────

Step 3: Generate Eligible Matches (/requests/matching-demo)
  ▼
POST /api/requests/matches { "requestId": "<uuid>" }
  │ Server evaluates biological RBC ABO/Rh compatibility & 120-day interval rule
  │ Sorts candidates deterministically (homologous tier first, recovery time, donor UUID)
  │ Inserts candidate matches to public.matches with UNIQUE(request_id, donor_id) guard
  ▼
HTTP 200 Response (PublicMatchCandidate[])
  │ Displays candidate cards with anonymized references: "Donor •••• [SUFFIX]"
  │ Shows verified criteria (compatibility, rest period, district locality)
  │ Donor names, phone numbers, and raw UUIDs remain strictly hidden

────────────────────────────────────────────────────────────────────────

Step 4: Click "Notify Eligible Donors"
  │ Requester reviews eligible candidate cards
  │ Clicks "Notify Eligible Donors" button
  ▼
POST /api/requests/notifications/dispatch { "requestId": "<uuid>" }
  │ Browser sends strictly requestId (no donor IDs, limits, or payloads)
  │ Server revalidates candidate availability, consent, and notification_preference = 'enabled'
  │ Clamps dispatch to server limit (default 5)
  │ Executes atomic PostgreSQL RPC claim_match_and_create_notification()

────────────────────────────────────────────────────────────────────────

Step 5: Show Aggregate Notification Success
  │ UI transitions cleanly without refetching matches
  │ Displays aggregate outcome: "N eligible donors notified • In-app notifications sent"
  │ Matches preserve visual candidate cards; status advanced to 'notified'
  │ Repeated clicks are prevented (idempotent; 0 duplicates)

────────────────────────────────────────────────────────────────────────

Step 6: Open Donor Notifications (/donors/notifications)
  │ User navigates to /donors/notifications (or clicks Notifications from Donor Profile)
  │ Automatically detects demo donor identity
  ▼
GET /api/donors/notifications?donorId=<uuid>
  │ Server queries notifications scoped strictly to donor_id = donorId
  │ Derives recorded response state ('accepted' | 'declined' | null) from public.donor_responses
  │ Returns narrow public notification projection

────────────────────────────────────────────────────────────────────────

Step 7: Show Privacy-Safe In-App Request Notification
  │ Donor inbox displays request notification card:
  │ • Urgency level ("CRITICAL" / "URGENT")
  │ • Blood group, component, units needed
  │ • District and hospital / blood centre facility
  │ • Compatibility badge ("Exact ABO/Rh" or "Compatible Match")
  │ • Required-by timestamp
  │ • "Mark as Read" action button (triggers PATCH /api/donors/notifications)
  │ • Actionable "Accept" (primary red) and "Decline" (subtle outline) controls

────────────────────────────────────────────────────────────────────────

Step 8: Click "Accept" (or "Decline")
  │ Donor clicks "Accept"
  │ Confirmation modal appears:
  │ • Logistical summary (units, component, facility, urgency)
  │ • Explanation that accepting expresses willingness to donate under coordination
  │ • Clear notice: NOT a determination of medical eligibility (clinical personnel decide)
  │ • Assurance: Contact details remain 100% private at this stage
  │ Donor clicks "Confirm Acceptance"
  ▼
POST /api/donors/responses { donorId, notificationId, response: "accepted" }
  │ Server-side input validation and authoritative pre-response revalidation
  │ Executes atomic PostgreSQL RPC record_donor_response()
  │ Transitions match status: 'notified' -> 'accepted'
  │ Inserts row into public.donor_responses with UNIQUE(request_id, donor_id) guard
  │ Automatically marks notification as 'read'
  │ Blood request remains in 'notified' state (not prematurely fulfilled)
  │ Writes non-PII audit record
  │ Zero contact reveals executed (contact_reveals table untouched)

────────────────────────────────────────────────────────────────────────

Step 9: Visibly Show "Accepted" State & Protected Contact
  │ Modal closes and notification card updates immediately to persistent "Accepted" state:
  │ • Green badge: "Accepted"
  │ • Privacy assurance: "Your contact details are still private until Step 9 coordination."
  │ Action buttons are disabled / replaced with persistent status badge
  │ Reopening inbox reliably loads response state derived from the database

────────────────────────────────────────────────────────────────────────

Step 10: Explain Step 9 Two-Way Contact Reveal
  │ Accepting does NOT automatically reveal contact information.
  │ Step 9 (Authorized Two-Way Contact Reveal Protocol) introduces the explicit
  │ clinical contact exchange and audit trail.
```

---

## 2. Privacy & Security Guarantees Proven in Live Demo

- **Zero Donor PII Exposed**: Donor names, raw UUIDs, phone numbers, email addresses, and coordinates are never sent across the network or displayed in matching results, notifications, or response projections.
- **Anonymized Reference Format**: Requesters see only `Donor •••• [SUFFIX]` (derived from the last 4 characters of the donor UUID).
- **Non-PII Metadata**: Match, response, and audit records store aggregate matching facts only.
- **Service-Role Isolation**: The browser makes standard JSON HTTP requests to Next.js Route Handlers; `SUPABASE_SERVICE_ROLE_KEY` is completely isolated in server-only modules.
- **Idempotent Response Transitions**: Repeated response calls or race conditions will never create duplicate responses or corrupted match states (enforced by `UNIQUE(request_id, donor_id)` and atomic RPC `record_donor_response`).
- **Inbox Isolation**: Donors only ever receive notifications and can only respond to requests matching their own verified donor identity; cross-donor updates are rejected with `404 Not Found`.

---

## 3. Controlled Live Verification Summary (Step 8 Live Audit)

During Step 8 live verification against the configured Supabase database:
1. Created controlled test request and 3 test donors (Donor 1: Accept, Donor 2: Decline, Donor 3: Stale/Unavailable).
2. Generated matches and dispatched notifications via real engine paths.
3. Executed Flow A: Donor 1 Accepted → response row created in `donor_responses`, match status transitioned to `'accepted'`, notification marked read, request status preserved as `'notified'` (not fulfilled), inbox derived `response: 'accepted'`, zero `contact_reveals` created.
4. Executed Flow B: Donor 2 Declined → response row created in `donor_responses`, match status transitioned to `'declined'`, inbox derived `response: 'declined'`.
5. Executed Flow C: Stale Donor 3 updated to `temporarily_unavailable` → Accept was rejected by authoritative revalidation (`revalidation_failed`), match remained in `'notified'` status.
6. Executed Flow D: Repeated Accept rejected (`already_responded`), Decline after Accept rejected (`already_responded`), cross-donor response rejected (`not_found`).
7. Verified non-PII audit logging.
8. Confirmed 100% cleanup of test rows and exact baseline restoration across all database tables.

---

## 4. Next Milestone: Step 9 — Authorized Two-Way Contact Reveal Protocol

The next milestone will implement:
1. Two-way authorization mechanism for releasing minimum contact coordinates.
2. Immutable, append-only audit trail in `public.contact_reveals`.
3. Clinical contact unmasking triggered exclusively after verified donor acceptance.
