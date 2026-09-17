-- =============================================================================
-- Hemo Match - Initial Database Schema
-- Migration: 0001_initial_schema.sql
-- Challenge: SC-12 (District Blood Donor Matching)
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Apply order: Run this file once against your Supabase project.
-- Via Supabase Dashboard: SQL Editor → paste → Run
-- Via Supabase CLI:       supabase db push  (if supabase/ dir is linked)
--
-- Privacy model:
--   • donor phone_number is stored in the donors table (server-side only).
--   • No exact home addresses are ever stored — approximate_area is used.
--   • Patient-identifying information is intentionally excluded from
--     blood_requests to minimize privacy risk.
--   • contact_reveals is the only authorized path to surface donor phone
--     numbers to a requester.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. CUSTOM ENUM TYPES
-- These mirror the TypeScript types in src/types/index.ts exactly.
-- If you add values to these enums later, also update the TS types.
-- ---------------------------------------------------------------------------

-- Blood groups (ABO + Rh factor)
CREATE TYPE blood_group AS ENUM (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

-- Blood components that can be requested
CREATE TYPE blood_component AS ENUM (
  'Whole Blood', 'Red Blood Cells', 'Platelets', 'Plasma'
);

-- Urgency tiers for blood requests
CREATE TYPE urgency_level AS ENUM (
  'critical', 'urgent', 'routine', 'standard'
);

-- Full request lifecycle.
-- draft       → saved but not yet submitted for matching.
-- active      → submitted and open for matching.
-- matching    → matching engine has been triggered.
-- notified    → donors have been notified; awaiting responses.
-- partially_filled → some units fulfilled; request still open.
-- fulfilled   → all required units confirmed fulfilled.
-- expired     → past required_by timestamp, not fulfilled.
-- cancelled   → manually cancelled by requester or admin.
CREATE TYPE request_status AS ENUM (
  'draft', 'active', 'matching', 'notified',
  'partially_filled', 'fulfilled', 'expired', 'cancelled'
);

-- Donor availability for matching consideration.
-- Note: "medically ineligible" is NOT represented here — eligibility
-- is a matching-stage concern determined by clinical rules, not a
-- permanent donor state flag.
CREATE TYPE donor_availability AS ENUM (
  'available', 'temporarily_unavailable', 'paused'
);

-- Notification preferences stored per donor
CREATE TYPE notification_preference AS ENUM (
  'enabled', 'disabled'
);

-- Possible statuses for a donor–request match record
CREATE TYPE match_status AS ENUM (
  'candidate',  -- donor identified as a potential match, not yet notified
  'notified',   -- donor has been notified of the request
  'responded',  -- donor has submitted a response (see donor_responses)
  'accepted',   -- donor confirmed intent to donate
  'declined',   -- donor declined this request
  'withdrawn',  -- donor withdrew after accepting
  'expired'     -- match window elapsed without a response
);

-- Possible donor responses
CREATE TYPE response_status AS ENUM (
  'accepted', 'declined', 'pending'
);

-- Notification record statuses
CREATE TYPE notification_status AS ENUM (
  'unread', 'read', 'dismissed'
);

-- Notification types (extensible set for the in-app notification feed)
CREATE TYPE notification_type AS ENUM (
  'match_found',         -- a new potential match for this donor's blood group/district
  'request_fulfilled',   -- a request this donor was matched on has been fulfilled
  'request_expired',     -- a request this donor was matched on has expired
  'contact_reveal',      -- a contact reveal was initiated for this donor
  'system'               -- generic system message
);


-- ---------------------------------------------------------------------------
-- 2. DISTRICTS TABLE
-- Normalized lookup table for districts. Seeded below with the same
-- demo districts used in DEMO_DISTRICTS in src/types/index.ts.
-- The slug field matches the frontend id values (e.g. 'dist-ekm').
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS districts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,    -- matches DEMO_DISTRICTS[n].id
  name       TEXT NOT NULL,
  state      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE districts IS
  'Administrative districts supported by the Hemo Match matching system. '
  'slug must match the id values in the DEMO_DISTRICTS frontend constant.';


-- ---------------------------------------------------------------------------
-- 3. DONORS TABLE
-- Core donor profile. phone_number is private — never exposed through
-- public queries. RLS ensures service-role access only for phone_number.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS donors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name               TEXT NOT NULL,
  blood_group             blood_group NOT NULL,
  district_id             UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  approximate_area        TEXT NOT NULL,

  -- PRIVATE: phone_number must never be returned in public matching queries.
  -- It is only surfaced through the contact_reveals workflow.
  phone_number            TEXT NOT NULL,

  last_donation_date      DATE,                       -- NULL = never donated / unknown
  availability            donor_availability NOT NULL DEFAULT 'available',
  notification_preference notification_preference NOT NULL DEFAULT 'enabled',
  consent_given           BOOLEAN NOT NULL DEFAULT FALSE,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE donors IS
  'Registered blood donors. phone_number is private — exclude from all '
  'public or matching-stage queries. Contact is revealed only via contact_reveals.';

COMMENT ON COLUMN donors.phone_number IS
  'Private. Never expose in matching results or public queries. '
  'Access through contact_reveals workflow only.';

COMMENT ON COLUMN donors.last_donation_date IS
  'Self-reported last donation date. Eligibility evaluation (interval checks) '
  'is performed at the matching stage by the eligibility subsystem, not here.';

-- Indexes for the matching engine's primary query dimensions
CREATE INDEX idx_donors_blood_group      ON donors (blood_group);
CREATE INDEX idx_donors_district_id      ON donors (district_id);
CREATE INDEX idx_donors_availability     ON donors (availability);
CREATE INDEX idx_donors_notification     ON donors (notification_preference);
CREATE INDEX idx_donors_last_donation    ON donors (last_donation_date);
CREATE INDEX idx_donors_created_at       ON donors (created_at DESC);


-- ---------------------------------------------------------------------------
-- 4. BLOOD REQUESTS TABLE
-- Intake records for emergency blood requirements.
-- Patient-identifying information is intentionally excluded.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blood_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_group      blood_group NOT NULL,
  component        blood_component NOT NULL DEFAULT 'Whole Blood',
  units_needed     SMALLINT NOT NULL CHECK (units_needed > 0 AND units_needed <= 50),
  district_id      UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  approximate_area TEXT NOT NULL,
  hospital_name    TEXT NOT NULL,

  -- required_by stores the combined date+time as a TIMESTAMPTZ for ordering
  required_by      TIMESTAMPTZ NOT NULL,

  urgency          urgency_level NOT NULL DEFAULT 'urgent',
  status           request_status NOT NULL DEFAULT 'active',

  -- Optional logistics note. Must not contain patient personal data.
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE blood_requests IS
  'Emergency blood requirement records. Patient personal information '
  '(name, phone, address) is intentionally not stored here.';

COMMENT ON COLUMN blood_requests.notes IS
  'Logistical coordination notes only. Must not contain patient name, '
  'phone number, home address, or diagnosis.';

-- Indexes for matching queries and status/urgency dashboards
CREATE INDEX idx_blood_requests_blood_group  ON blood_requests (blood_group);
CREATE INDEX idx_blood_requests_district_id  ON blood_requests (district_id);
CREATE INDEX idx_blood_requests_status       ON blood_requests (status);
CREATE INDEX idx_blood_requests_urgency      ON blood_requests (urgency);
CREATE INDEX idx_blood_requests_required_by  ON blood_requests (required_by);
CREATE INDEX idx_blood_requests_created_at   ON blood_requests (created_at DESC);


-- ---------------------------------------------------------------------------
-- 5. MATCHES TABLE
-- Records pairing a blood request with a potentially matching donor.
-- Created by the matching engine (future milestone).
-- Does NOT expose donor phone numbers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id          UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  status            match_status NOT NULL DEFAULT 'candidate',

  -- Matching engine metadata (stored as JSONB for extensibility)
  -- Example contents: { "blood_compat_score": 1.0, "district_match": true }
  -- Must NOT include donor phone_number or exact address.
  match_metadata    JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A donor can only appear once per request
  UNIQUE (request_id, donor_id)
);

COMMENT ON TABLE matches IS
  'Pairs a blood_request with a candidate donor identified by the matching engine. '
  'match_metadata must not contain donor phone_number or exact address.';

CREATE INDEX idx_matches_request_id  ON matches (request_id);
CREATE INDEX idx_matches_donor_id    ON matches (donor_id);
CREATE INDEX idx_matches_status      ON matches (status);


-- ---------------------------------------------------------------------------
-- 6. DONOR_RESPONSES TABLE
-- Tracks each donor's accept/decline response to a match notification.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS donor_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id    UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,
  status      response_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One response record per donor per request
  UNIQUE (request_id, donor_id)
);

COMMENT ON TABLE donor_responses IS
  'Records donor accept/decline responses to blood request match notifications.';

CREATE INDEX idx_donor_responses_request_id ON donor_responses (request_id);
CREATE INDEX idx_donor_responses_donor_id   ON donor_responses (donor_id);
CREATE INDEX idx_donor_responses_status     ON donor_responses (status);


-- ---------------------------------------------------------------------------
-- 7. NOTIFICATIONS TABLE
-- In-app notification feed records. No SMS/email dispatch in this milestone.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id    UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  request_id  UUID REFERENCES blood_requests(id) ON DELETE SET NULL,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,
  type        notification_type NOT NULL,
  status      notification_status NOT NULL DEFAULT 'unread',
  -- Structured payload for the notification. Must NOT contain phone_number.
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

COMMENT ON TABLE notifications IS
  'In-app notification records for donors. payload must not contain '
  'donor phone_number or any other private PII beyond what is needed '
  'to render the notification UI.';

CREATE INDEX idx_notifications_donor_id   ON notifications (donor_id);
CREATE INDEX idx_notifications_status     ON notifications (status);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);


-- ---------------------------------------------------------------------------
-- 8. CONTACT_REVEALS TABLE
-- Privacy audit trail. Records every instance where a donor's contact
-- information was revealed to a requester after explicit authorization.
-- This is the ONLY authorized path for a requester to obtain a donor's
-- phone number.
--
-- APPEND-ONLY INTENT: This table is designed to be an immutable audit log.
-- The TypeScript Database type sets  Update: never  for this table, which
-- prevents normal typed `.update()` calls through the Supabase client.
--
-- KNOWN GAP: PostgreSQL-level UPDATE/DELETE enforcement (e.g. BEFORE UPDATE
-- and BEFORE DELETE triggers that RAISE EXCEPTION) is intentionally deferred
-- to a future security-hardening migration. Until that migration is applied,
-- a direct psql session or an untyped service-role query can still mutate or
-- delete rows. Do NOT treat this table as cryptographically immutable until
-- the hardening migration has been applied.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_reveals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES blood_requests(id) ON DELETE RESTRICT,
  donor_id    UUID NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,

  -- Who triggered the reveal and why — for audit purposes.
  -- Must not store the phone_number itself (that is fetched separately).
  trigger     TEXT NOT NULL DEFAULT 'donor_accepted',
  -- Optional notes from an admin or automated workflow
  reason      TEXT,

  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contact_reveals IS
  'Immutable audit log of every contact reveal event. '
  'Does not store the phone_number itself — that is fetched from donors '
  'at reveal time using the service-role client, not the anon client.';

CREATE INDEX idx_contact_reveals_request_id ON contact_reveals (request_id);
CREATE INDEX idx_contact_reveals_donor_id   ON contact_reveals (donor_id);
CREATE INDEX idx_contact_reveals_revealed_at ON contact_reveals (revealed_at DESC);


-- ---------------------------------------------------------------------------
-- 9. AUDIT_LOGS TABLE
-- Append-only privacy and security action log.
-- Records critical platform events without storing sensitive field values.
--
-- APPEND-ONLY INTENT: This table is designed to be an immutable audit log.
-- The TypeScript Database type sets  Update: never  for this table, which
-- prevents normal typed `.update()` calls through the Supabase client.
--
-- KNOWN GAP: PostgreSQL-level UPDATE/DELETE enforcement (e.g. BEFORE UPDATE
-- and BEFORE DELETE triggers that RAISE EXCEPTION) is intentionally deferred
-- to a future security-hardening migration. Until that migration is applied,
-- a direct psql session or an untyped service-role query can still mutate or
-- delete rows. Do NOT treat this table as cryptographically immutable until
-- the hardening migration has been applied.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- actor_ref: opaque identifier for the acting entity (future: auth user id)
  -- May be NULL during mock-auth phase.
  actor_ref   TEXT,
  action      TEXT NOT NULL,  -- e.g. 'donor.register', 'contact.reveal', 'request.cancel'
  entity_type TEXT NOT NULL,  -- e.g. 'donor', 'blood_request', 'match'
  entity_id   UUID,           -- the primary key of the affected row
  -- Metadata for context. Must NOT store phone numbers, passwords, or PII.
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS
  'Append-only security and privacy action audit log. '
  'metadata must never contain phone_number, passwords, or sensitive PII. '
  'Store only identifiers, status transitions, and non-sensitive context.';

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);


-- ---------------------------------------------------------------------------
-- 10. updated_at TRIGGER FUNCTION
-- Automatically updates the updated_at timestamp on row updates.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to all tables with updated_at columns
CREATE TRIGGER set_updated_at_donors
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_blood_requests
  BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_matches
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_donor_responses
  BEFORE UPDATE ON donor_responses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- CURRENT PHASE: Mock authentication is in use. Real user sessions do not
-- exist yet. RLS is therefore configured conservatively:
--
--   • All application tables use DENY ALL as the default (no permissive
--     policy means no access through the anon key by default).
--   • The service_role client bypasses RLS entirely, so trusted server-side
--     Next.js code (Route Handlers, Server Actions) can read/write freely
--     using the SUPABASE_SERVICE_ROLE_KEY.
--   • districts is the only table with a SELECT open to the anon key,
--     since district data is non-sensitive public reference data.
--   • This prevents accidental exposure of donor phone_number through
--     unrestricted public queries.
--
-- NEXT PHASE: Once real authentication (Supabase Auth / OTP) is integrated,
--   add per-user RLS policies using auth.uid() to restrict read/write
--   access to owned rows for donors and blood_requests.
-- ---------------------------------------------------------------------------

ALTER TABLE districts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;

-- Districts: public read-only (non-sensitive reference data)
CREATE POLICY "districts_public_read"
  ON districts FOR SELECT
  TO anon, authenticated
  USING (true);

-- All other tables: anon key has NO access.
-- service_role bypasses RLS automatically (used by server-side client).
-- When real auth is added, replace these with auth.uid()-scoped policies.

-- Intentionally NO permissive policies for: donors, blood_requests, matches,
-- donor_responses, notifications, contact_reveals, audit_logs.
-- These tables are accessible only through the service_role key (server-side).


-- ---------------------------------------------------------------------------
-- 12. DEMO SEED DATA — DISTRICTS ONLY
-- Seeds the same demo districts used in DEMO_DISTRICTS in src/types/index.ts.
-- slug values MUST match the id fields in DEMO_DISTRICTS exactly.
-- ---------------------------------------------------------------------------

INSERT INTO districts (slug, name, state) VALUES
  ('dist-ekm', 'Ernakulam',         'Kerala'),
  ('dist-tvm', 'Thiruvananthapuram','Kerala'),
  ('dist-clt', 'Kozhikode',         'Kerala'),
  ('dist-tsr', 'Thrissur',          'Kerala'),
  ('dist-ktm', 'Kottayam',          'Kerala'),
  ('dist-pkd', 'Palakkad',          'Kerala'),
  ('dist-mpm', 'Malappuram',        'Kerala'),
  ('dist-cen', 'Central District',  'Kerala')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- END OF MIGRATION 0001
-- ---------------------------------------------------------------------------
