# Hemo Match Project Status

**Project:** Hemo Match  
**Challenge:** SC-12 — District Blood Donor Matching  
**Branch:** `feature/supabase-schema`  
**Current Milestone:** Step 4: Supabase/PostgreSQL Database Foundation  
**Last Updated:** 2026-09-17  

---

## 1. Current Project State

Four milestones complete. The system now has a clean relational schema and typed server-side Supabase connection ready for future persistence wiring.

Active user-facing flows (all still localStorage-based, unchanged):
1. **Request Blood** — `/ → /requests/new → /requests/matching-demo`
2. **Donor Registration** — `/ → /donors/register → /donors/profile`

> [!IMPORTANT]
> The existing localStorage frontend flows are intentionally **NOT yet wired to Supabase**.  
> Wiring real persistence is the next milestone (Step 5).

---

## 2. Active Flows

```
Landing Page (/)
│
├── "Request Blood" ──► /requests/new ──► /requests/matching-demo
│
└── "Find Donors"  ──► /donors/register ──► /donors/profile
```

**localStorage keys still in use (frontend only):**
- `hemo_match_active_request` — temporary blood request from `/requests/new`
- `hemo_match_demo_donor` — temporary donor profile from `/donors/register`

---

## 3. Completed Milestones

### Step 1: Foundation (complete)
- Next.js App Router, strict TypeScript, Tailwind CSS, lib module stubs, docs, `.env.example`.

### Step 2: Request Blood Flow (complete)
- Blood request form with full client-side validation (`validateBloodRequest`).
- Clinical safety disclaimer.
- Matching demo page at `/requests/matching-demo`.

### Step 3: Donor Registration Flow (complete)
- Donor registration form with full client-side validation (`validateDonorProfile`).
- Profile view page with masked phone number.
- Privacy notice cards on both pages.

### Step 4: Supabase/PostgreSQL Database Foundation (complete)

#### Files Created / Modified

| File | Status | Purpose |
| :--- | :--- | :--- |
| `supabase/migrations/0001_initial_schema.sql` | Created | Full PostgreSQL schema (see below) |
| `src/types/database.ts` | Created | Server-side DB row types (snake_case, mirrors DB columns) |
| `src/lib/database/index.ts` | Modified | Real Supabase client factories (was a stub) |
| `.env.example` | Modified | Added `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, improved docs |
| `docs/ARCHITECTURE.md` | Modified | Added DB schema section, RLS model, client architecture |
| `docs/DECISIONS.md` | Modified | Added ADRs 10–15 for enum strategy, type files, RLS, immutable tables |
| `docs/PROJECT_STATUS.md` | Modified | This file |

#### Database Tables Created

| Table | Rows stored | Notes |
| :--- | :--- | :--- |
| `districts` | 8 demo seed rows | Public read; slug matches `DEMO_DISTRICTS` in TypeScript |
| `donors` | — | `phone_number` private; no exact home address |
| `blood_requests` | — | No patient name/phone/email |
| `matches` | — | Created by future matching engine |
| `donor_responses` | — | Donor accept/decline records |
| `notifications` | — | In-app notification feed |
| `contact_reveals` | — | **Immutable** privacy audit log |
| `audit_logs` | — | **Append-only** security action audit log |

#### Custom PostgreSQL Enum Types

`blood_group`, `blood_component`, `urgency_level`, `request_status`,  
`donor_availability`, `notification_preference`, `match_status`,  
`response_status`, `notification_status`, `notification_type`

#### Key Relationships

```
districts ← donors.district_id
districts ← blood_requests.district_id
donors + blood_requests → matches
matches → donor_responses
matches → notifications
matches + donors + blood_requests → contact_reveals (immutable log)
```

#### RLS / Privacy Decisions

| Table | Anon key | Service-role key |
| :--- | :--- | :--- |
| `districts` | ✅ SELECT | ✅ Full |
| `donors` | ❌ Denied | ✅ Full |
| `blood_requests` | ❌ Denied | ✅ Full |
| All other tables | ❌ Denied | ✅ Full |

- **Mock-auth phase:** All protected tables denied to anon key. Service-role key used server-side only.
- **`donors.phone_number`** is never returned through anon-key queries by RLS design.
- **Future:** When real auth (Supabase Auth / OTP) is integrated, add `auth.uid()`-scoped policies.

#### Server-Side Supabase Client

`src/lib/database/index.ts` now exports:
- `getServerClient()` — service-role key, bypasses RLS, server-only.
- `getAnonClient()` — anon key, respects RLS, safe for server components.
- `getDatabaseConfig()` — returns env readiness status with placeholder detection.

#### TypeScript Database Types

`src/types/database.ts` contains:
- Row types for all 8 tables (snake_case, mirrors PostgreSQL column names).
- `DonorPublicRow` — `DonorRow` with `phone_number` omitted, for safe projections.
- `Database` interface — used as a generic parameter to type the Supabase client.

#### Environment Variables Added

| Variable | Where Used |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server (already existed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server (already existed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (activated, was commented out) |
| `NEXT_PUBLIC_APP_URL` | Absolute URL generation (new) |

---

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ All 6 routes generated |
| SQL: all 8 tables present | ✅ Confirmed via script |
| SQL: all 10 enum types present | ✅ Confirmed via script |
| SQL: no patient_name / patient_phone / patient_email | ✅ Confirmed via script |
| SQL: no anon SELECT on donors table | ✅ Confirmed via script |
| SQL: phone_number not in any RLS POLICY statement | ✅ Confirmed (only in a comment) |
| SQL: all FK references valid | ✅ Confirmed via script |
| Supabase CLI validation | ⚠ Not available locally (CLI not installed, no linked project) |

---

## 5. Known Issues / Limitations

- **Supabase CLI not installed.** The migration cannot be validated via `supabase db push` locally. Apply via the Supabase Dashboard SQL Editor.
- **Real persistence not yet wired.** The UI still uses localStorage. This is intentional for this milestone.
- **No real authentication.** Mock auth phase continues. RLS policies will need updating when auth is integrated.

---

## 6. How to Apply the Migration

### Option A: Supabase Dashboard (recommended for now)
1. Open your Supabase project → SQL Editor.
2. Paste the contents of `supabase/migrations/0001_initial_schema.sql`.
3. Click **Run**.

### Option B: Supabase CLI
```bash
# Install CLI if not already installed
brew install supabase/tap/supabase

# Link your project (one-time)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option C: psql direct
```bash
psql "$SUPABASE_DB_URL" \
  -f supabase/migrations/0001_initial_schema.sql
```

---

## 7. Recommended Next Milestone

**Step 5: Persistence Wiring — API Routes**

Replace the localStorage flows with real Supabase persistence:
- Create `POST /api/requests` route handler → inserts into `blood_requests` using `getServerClient()`.
- Create `POST /api/donors` route handler → inserts into `donors` using `getServerClient()`.
- Create `GET /api/districts` route handler → reads from `districts` using `getAnonClient()`.
- Update `/requests/new` to call `POST /api/requests` instead of writing to localStorage.
- Update `/donors/register` to call `POST /api/donors` instead of writing to localStorage.
- Update district selects to fetch from `/api/districts` instead of the static `DEMO_DISTRICTS` constant.
