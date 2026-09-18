# Hemo Match Demonstration Walkthrough & Verification Guide

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Milestone:** Step 7 — Request → Match → Notify (COMPLETE)
**Last Updated:** 2026-09-18

---

## 1. Verified Live Demonstration Flow (Request → Match → Notify)

The following 9-step sequence demonstrates the completed, privacy-safe **Request → Match → Notify** workflow:

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
  │ Enter blood group requirement (e.g. O+, Whole Blood, 2 units, district, required-by)
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

────────────────────────────────────────────────────────────────────────

Step 8: Emphasize Donor Contact Remains Hidden
  │ Prominent privacy banner on notification card: "Your contact details are still private."
  │ Requesters cannot see donor phone number, name, or identity.
  │ Clinical safety notice: "Hemo Match coordinates donor discovery only. Final donor eligibility
  │ is determined by qualified blood-bank/clinical personnel."

────────────────────────────────────────────────────────────────────────

Step 9: Explain Accept is the Next Milestone
  │ Action placeholder explicitly reads: "Response available in the next step"
  │ No fake functioning Accept button
  │ Step 8 (Donor Accept/Decline) and Step 9 (Authorized Two-Way Contact Reveal) are the next milestones.
```

---

## 2. Privacy & Security Guarantees Proven in Live Demo

- **Zero Donor PII Exposed**: Donor names, raw UUIDs, phone numbers, email addresses, and coordinates are never sent across the network or displayed in matching results or inbox projections.
- **Anonymized Reference Format**: Requesters see only `Donor •••• [SUFFIX]` (derived from the last 4 characters of the donor UUID).
- **Non-PII Metadata**: Match and audit records store aggregate matching facts only.
- **Service-Role Isolation**: The browser makes standard JSON HTTP requests to Next.js Route Handlers; `SUPABASE_SERVICE_ROLE_KEY` is completely isolated in server-only modules.
- **Idempotent Dispatch**: Repeated dispatch calls or duplicate requests will never create duplicate notifications (enforced by `idx_notifications_match_found_unique` and atomic RPC).
- **Inbox Isolation**: Donors only ever receive notifications for their own donor ID; cross-donor updates are rejected with `404 Not Found`.

---

## 3. Controlled Live Verification Summary (Step 7 Live Audit)

During Step 7 live verification against the configured Supabase database:
1. Created controlled test request and 4 test donors (A: Exact, B: Compatible, C: Preference Disabled, D: Stale/Unavailable).
2. Proved Step 6 matched all 4 candidates.
3. Updated donor D to `temporarily_unavailable` after matching.
4. Executed real dispatch: Donors A and B were notified; Donor C was skipped (preference disabled); Donor D was skipped (stale availability).
5. Confirmed match status transitions to `'notified'` for A and B, remaining `'candidate'` for C and D.
6. Confirmed request status advanced to `'notified'`.
7. Confirmed repeated dispatch created zero duplicate notifications.
8. Confirmed inbox isolation: A sees 1, B sees 1, C sees 0.
9. Confirmed mark as read updated A to read while B remained unread; cross-donor read attempt was rejected.
10. Confirmed 100% cleanup of test rows and exact baseline restoration across all database tables.

---

## 4. Next Milestone: Step 8 — Donor Response (Accept / Decline)

The next milestone will implement:
1. `public.donor_responses` recording donor response status (`accepted`, `declined`, `expired`).
2. Accept/Decline actions on `/donors/notifications`.
3. Pre-acceptance donor revalidation.
4. Transition candidate match states based on response.
5. Paving the path for Step 9: Authorized Two-Way Contact Reveal Protocol.
