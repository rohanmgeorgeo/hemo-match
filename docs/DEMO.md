# Hemo Match Demonstration Walkthrough & Verification Guide

**Project:** Hemo Match
**Challenge:** SC-12 — District Blood Donor Matching
**Milestone:** Step 12 — Production Closure & Live Verification Guide (COMPLETE)
**Production URL:** https://hemomatch.vercel.app
**Last Updated:** 2026-09-18

---

## 1. Production Smoke Test & Live Verification (https://hemomatch.vercel.app)

The complete end-to-end flow is verified live on Vercel at **https://hemomatch.vercel.app**.

### Demonstration Setup
Use **two normal tabs side-by-side** in the same browser window:
- **Tab 1**: Requester Device
- **Tab 2**: Donor Device

> [!IMPORTANT]
> **Application Interval Requirement**:
> When registering a donor, the **Last Donation Date** is strictly required and must be a valid calendar date at least 120 calendar days before today (e.g. 5 months ago) to participate in preliminary matching under Hemo Match's conservative interval policy. Submitting an empty date is rejected by registration validation. (Donors with recent dates <120 days may register, but remain excluded from preliminary matching until the 120-day interval is met).

### Step-by-Step Live Execution:

1. **Tab 2 (Donor Setup)**:
   - Navigate to [`/donors/register`](https://hemomatch.vercel.app/donors/register).
   - Enter Full Name: `Rahul Sharma`
   - Blood Group: `A+`
   - District: `Ernakulam`
   - Approximate Area: `Edappally`
   - Phone: `+91 98765 43210`
   - **Last Donation Date**: `2024-01-15` (or any known date > 120 days ago).
   - Check the **Consent** checkbox and submit.
   - Profile renders at `/donors/profile` with masked phone (`••••••4321`).
   - Click **Notifications** in the header to open `/donors/notifications`.

2. **Tab 1 (Requester Intake & Match)**:
   - Navigate to [`/requests/new`](https://hemomatch.vercel.app/requests/new).
   - Blood Group: `A+`
   - Component: `Whole Blood`
   - Quantity: `1` Unit
   - District: `Ernakulam`
   - Hospital: `Lisie Hospital`
   - Required By: Choose today or tomorrow with a future time (e.g. `18:00`).
   - Urgency: `Urgent`.
   - Click **Find Matching Donors**.
   - Redirects to `/requests/matching-demo`.
   - Server matching automatically evaluates candidates: `Rahul Sharma` renders as **Exact blood-group match (Homologous)** with phone masked (`••••••••••`).

3. **Tab 1 (Notification Dispatch)**:
   - Click **Notify Eligible Donors**.
   - Dispatch executes atomically. A green confirmation banner provides step guidance:
     *"Step 2: Switch to the Donor tab or open the Donor Inbox to view and accept this request."*

4. **Tab 2 (Donor Inbox & Accept)**:
   - In `/donors/notifications`, click **Refresh**.
   - The urgent transfusion match card appears at the top.
   - Click **Accept Request**. The confirmation modal explains coordination and confirms contact details remain private.
   - Click **Confirm Acceptance**. The card updates in place to a green **Accepted** badge.

5. **Tab 1 (Status Refresh & Privacy Boundary)**:
   - Return to `/requests/matching-demo`.
   - Click the elevated **Refresh Status** button.
   - The candidate card transitions to **Donor Accepted Request** with a pulsing green indicator.
   - **Privacy Check**: Phone remains completely hidden: `•••••••••• (Hidden) Contact Protected Until Reveal`.
   - The high-contrast **Reveal Contact** button appears.

6. **Tab 1 (Authorized Contact Reveal)**:
   - Click **Reveal Contact**.
   - Authorized reveal card unlocks in place displaying:
     - Badge: `Authorized Reveal`
     - Donor Name: `Rahul Sharma`
     - Phone: `+91 98765 43210` (active clickable `tel:` link)
     - Clinical disclaimer: *"Minimum coordination contact revealed. Final clinical qualification occurs at the blood center."*

7. **Expired Request Verification**:
   - To test expired-request handling: if a request has a required-by date/time in the past, `/requests/matching-demo` displays:
     - Title: `Blood Request Expired`
     - Message: `This blood request has expired. Create a new request with a future required-by time.`
     - Action: `Create New Request` button linking directly to `/requests/new`.

---

## 2. Verified Demonstration Flow Architecture (Request → Match → Notify → Accept)

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

Step 9: Visibly Show "Accepted" State in Donor Inbox
  │ Modal closes and notification card updates immediately to persistent "Accepted" state:
  │ • Green badge: "Accepted"
  │ • Privacy assurance: "Your contact details are protected until authorized coordination."
  │ Action buttons are replaced with persistent status badge
  │ Reopening inbox reliably loads response state derived from the database

────────────────────────────────────────────────────────────────────────

Step 10: Requester Observes Acceptance & Reveals Contact (/requests/matching-demo)
  │ Requester clicks "Refresh Status" on /requests/matching-demo
  ▼
GET /api/requests/matches?requestId=<uuid>
  │ Retrieves live match statuses without re-running matching
  │ Accepted candidate card displays:
  │ • Green badge: "Donor Accepted"
  │ • Action CTA: "Reveal Contact" button
  │ Non-accepted and declined candidate cards retain protected privacy boundaries:
  │ • "Phone hidden until donor accepts request"
  │ • "Unavailable / Declined"
  ▼
Requester Clicks "Reveal Contact"
  ▼
POST /api/requests/contact-reveal { "requestId": "<uuid>", "matchId": "<uuid>" }
  │ Server validates match is 'accepted', donor response is 'accepted', request is non-terminal
  │ Executes atomic PostgreSQL RPC record_contact_reveal()
  │ Inserts unique row into public.contact_reveals with ON CONFLICT DO NOTHING
  │ Writes non-PII audit record (action: 'contact_reveal.authorized') with 0 contact PII
  │ Projects strictly minimum contact details: { name, phone }
  ▼
HTTP 200 Response ({ success: true, contact: { name, phone } })
  │ Candidate card unmasks donor's full name and phone number
  │ Shows emergency coordination banner: "Direct verbal coordination permitted for this emergency."
  │ Repeated clicks are idempotent (0 duplicate rows, 0 duplicate audit events)
```

---

## 3. Privacy & Security Guarantees Proven in Live Demo

- **Zero Donor PII Exposed Before Acceptance**: Donor names, raw UUIDs, phone numbers, email addresses, and coordinates are never sent across the network or displayed in matching results, notifications, or pre-reveal response projections.
- **Anonymized Reference Format**: Requesters see only `Donor •••• [SUFFIX]` (derived from the last 4 characters of the donor UUID).
- **Minimum Contact Projection Policy**: Authorized reveal releases strictly `name` and `phone`. No email, exact address, coordinates, or medical history are ever unmasked.
- **Non-PII Metadata**: Match, response, contact reveal, and audit records store aggregate matching facts only; zero phone numbers or names are written to audit logs.
- **Service-Role Isolation**: The browser makes standard JSON HTTP requests to Next.js Route Handlers; `SUPABASE_SERVICE_ROLE_KEY` is completely isolated in server-only modules.
- **Idempotent Reveal Execution**: Repeated reveal calls or race conditions will never create duplicate reveals or duplicate audit events (enforced by `UNIQUE(request_id, donor_id)` and atomic RPC `record_contact_reveal`).
- **Gated Authorization**: Reveal attempts on candidates, notified unresponded donors, declined donors, cross-requests, or terminal requests (cancelled/expired/fulfilled) are rejected with `403 Forbidden` (`unauthorized_or_not_accepted`).

---

## 4. Controlled Live Verification Summary (Step 9 Live Audit)

During Step 9 live verification against the configured Supabase database:
1. Recorded exact database baseline (`donors: 1, blood_requests: 1, matches: 0, notifications: 0, donor_responses: 0, contact_reveals: 0, audit_logs: 0`).
2. Created controlled test request and 3 test donors (Donor 1: Accept, Donor 2: Decline, Donor 3: Notified/Unresponded).
3. Generated matches and dispatched notifications via real engine paths.
4. Recorded Donor 1 Accept and Donor 2 Decline via atomic response RPCs.
5. Flow 1 (Pre-Acceptance Privacy): Proved 0 phone numbers or names present in requester projection.
6. Flow 2 (Lifecycle Observation): Requester observed match lifecycle (`accepted`, `declined`, `notified`) without PII leaks.
7. Flow 3 (First Authorized Reveal): Succeeded for Donor 1, returned authorized minimum contact (`name`, `phone`), persisted 1 `contact_reveals` row, and created non-PII audit record (`contact_reveal.authorized`).
8. Flow 4 (Idempotency): Repeated reveal for Donor 1 succeeded idempotently with 0 duplicate rows and 0 duplicate audit records.
9. Flow 5 (Notified Non-Accepted Guard): Contact reveal for Donor 3 rejected (`unauthorized_or_not_accepted`).
10. Flow 6 (Declined Guard): Contact reveal for Donor 2 rejected (`unauthorized_or_not_accepted`).
11. Flow 7 (Cross-Request Guard): Cross-request reveal attempt rejected (`unauthorized_or_not_accepted`).
12. Flow 8 (Request Lifecycle Integrity): Blood request status remained `notified` (not prematurely fulfilled).
13. Confirmed 100% cleanup of test rows and exact baseline restoration across all database tables.

---

## 5. Hackathon Demo Readiness Status

With Step 12 complete, Hemo Match is fully deployed to production on Vercel at **https://hemomatch.vercel.app**, live verified, and hardened for hackathon demonstration.
