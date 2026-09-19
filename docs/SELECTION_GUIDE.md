# Hemo Match — Selection Dataset & Evaluation Guide

> **Notice**: The selection dataset is internal evaluation infrastructure and does **not** alter Hemo Match matching behavior. All matching, exclusion, interval, notification, acceptance, and contact reveal workflows operate through standard production application logic.

---

## 1. Overview & Evaluation Scenario

To evaluate Hemo Match independently without developer assistance, a deterministic, fictional donor dataset has been prepared in **Ernakulam District**.

### Primary Scenario Parameters
- **Blood Group**: `A+`
- **Component**: `Whole Blood`
- **District**: `Ernakulam`
- **Hospital / Blood Centre**: `General Hospital, Ernakulam` (or any hospital in Ernakulam)
- **Approximate Area**: `Marine Drive` (or `Kaloor`)
- **Required By**: Any valid future time (e.g., today + 4 hours or tomorrow)
- **Urgency**: `Urgent` or `Standard`

---

## 2. Seeded Evaluation Donor Pool

Five deterministic, clearly fictional volunteer donor records have been prepared for this scenario:

| Donor Ref | Name | Blood Group | Approx. Area | Coords (Lat, Lon) | Dist to Center | Last Donation | Delivery Pref | Scenario Outcome |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Donor A** | Adarsh Menon | `A+` | Kaloor | 9.9916, 76.2879 | ~1.4 km | 160 days ago | Enabled | **Match #1**: Homologous exact match within 5 km. Ranks 1st. |
| **Donor B** | Biju Varma | `O+` | Panampilly Nagar | 9.9650, 76.2900 | ~2.2 km | 150 days ago | Enabled | **Match #2**: Universal compatible alternative within 5 km. Ranks after homologous. |
| **Donor C** | Cyril Joseph | `A+` | Ernakulam North | 9.9750, 76.2750 | ~0.9 km | 40 days ago | Enabled | **Excluded**: Physically close (~0.9 km), but recent donation (< 120 days) excludes candidate. |
| **Donor D** | Deepak Nair | `A+` | Marine Drive West | 9.9890, 76.2650 | ~1.8 km | 170 days ago | **Disabled** | **Match Candidate / Skip Dispatch**: Qualifies in candidate list; skipped during notification dispatch. |
| **Donor E** | Eldho Paul | `A+` | Aluva | 10.0800, 76.3500 | ~13.4 km | 180 days ago | Enabled | **Radius Exclusion / Fallback**: Excluded by 5 km radius when coordinates exist; matches under district fallback if coordinates missing. |

---

## 3. Step-by-Step Evaluation Walkthrough

### Step 1: Open Application & Create Request
1. Open the deployed application URL: `https://hemomatch.vercel.app`
2. Click **Request Blood** (`/requests/new`).
3. Enter the scenario details:
   - Patient Blood Group: **A+**
   - Component: **Whole Blood**
   - Units Needed: **1**
   - District: **Ernakulam**
   - Hospital / Blood Centre: **General Hospital, Ernakulam**
   - Approximate Area: **Marine Drive**
   - Required By: Select today with a future time (or tomorrow).
   - Urgency: **Urgent**

### Step 2: Location Choice (Proximity vs. District Fallback)
Because evaluators may test from anywhere (locally or remotely outside Kerala), Hemo Match supports two authentic paths:

- **Path A — Proximity Matching (Local / Geolocation Granted)**:
  - Click **Use current location** in Card 2.
  - If you are physically near Ernakulam (or testing locally with simulated coordinates), your coordinates are captured.
  - Matching will use **real straight-line Haversine distance**.
  - You will observe approximate distance badges: `~1.4 km away`, `~2.2 km away`.
  - **Donor E** (~13.4 km) will be excluded because it exceeds the 5 km application radius.

- **Path B — District Fallback (Remote / Evaluator Anywhere)**:
  - Do **not** click "Use current location" (or leave location unselected).
  - Hemo Match smoothly falls back to **Same District** matching without failing or fabricating fake kilometers.
  - You will observe the restrained badge: `Same district`.
  - **Donor A**, **Donor B**, **Donor D**, and **Donor E** will match via district alignment; **Donor C** remains excluded by interval.

### Step 3: Discover Matches & Observe Deterministic Ranking
1. Click **Submit Blood Request**.
2. On `/requests/matching-demo`, click **Discover Compatible Donors**.
3. **Observe Candidate Presentation**:
   - **Top Match**: `Donor •••• 0001` (Donor A) — Exact blood-group match (A+), ~1.4 km away (or Same district).
   - **Compatible Match**: `Donor •••• 0002` (Donor B) — Compatible alternative (O+), ~2.2 km away.
   - **Notification Preference Candidate**: `Donor •••• 0004` (Donor D) — Exact match (A+), ~1.8 km away.
   - **Excluded Donors**: Donor C is automatically filtered out by the 120-day interval policy.

### Step 4: Dispatch In-App Notifications
1. Click **Notify Eligible Donors**.
2. **Observe Delivery Enforcement**:
   - Notifications are dispatched to eligible candidates with `notification_preference = 'enabled'`.
   - **Donor D** is safely skipped by the server revalidator because notification delivery was disabled.
   - Status transitions to `In-App Notifications Sent`.

### Step 5: Donor Acceptance & Contact Reveal
1. **Donor Workflow**:
   - To experience the donor acceptance flow, open an incognito/secondary tab and register as an A+ donor in Ernakulam (`/donors/register`), or view `/donors/notifications`.
   - On `/donors/notifications`, click **Accept** on the coordination alert.
   - Confirm acceptance in the voluntary modal.
2. **Requester Workflow**:
   - Return to the requester tab at `/requests/matching-demo`.
   - Click **Refresh Status**.
   - Observe that the accepted candidate displays a prominent **Donor Accepted** badge, but **phone number and full name remain strictly hidden**.
   - Click **Reveal Contact**.
   - Observe authorized unmasking of minimum coordination contact details (name and phone) backed by the atomic database authorization function.

---

## 4. Internal Developer CLI Commands

The seed tooling operates server-side using the existing Supabase service boundary. It operates **strictly** on the 5 deterministic selection UUIDs (`a0000000-0000-4000-8000-000000000001` through `0005`) and will **never** touch, truncate, or reset unrelated user records.

```bash
# Seed or refresh the 5 selection donor records in Ernakulam:
npm run seed:selection

# Safely reset/remove ONLY the 5 selection donor records:
npm run seed:selection:reset
```

> [!NOTE]
> `seed:selection` requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment or `.env.local`. It fails safely with a clear warning if credentials are absent.

---

## 5. Suggested PPT Evaluation Slide

*Content ready for direct adaptation into a presentation slide:*

### **Slide Title: Live Evaluation & Verification Scenario**
- **Application URL**: `https://hemomatch.vercel.app`
- **Scenario Inputs**:
  - Request Type: `A+` Whole Blood, `Ernakulam District` (`General Hospital, Ernakulam` / `Marine Drive`)
- **Key Capabilities Demonstrated Live**:
  1. **Dual Location Handling**: Real 5 km Haversine straight-line proximity when coordinates exist (`~1.4 km away`); graceful district fallback (`Same district`) when testing remotely.
  2. **Clinical Safety & Priority**: Exact homologous matches prioritized over compatible alternatives; 120-day donation interval strictly excludes recent donors (Donor C).
  3. **Preference-Respecting Dispatch**: In-app alerts delivered only to opted-in donors; non-consenting candidates (Donor D) skipped.
  4. **Strict Contact Privacy**: Anonymized candidate cards; donor contact remains locked after acceptance until requester triggers an audited, explicit **Reveal Contact**.
- **Real Infrastructure**: Real Next.js App Router, real Supabase PostgreSQL persistence, real atomic RPCs, zero mock timers or fake delays.
