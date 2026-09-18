-- =============================================================================
-- Hemo Match - Contact Reveal Authorization & Uniqueness Foundation
-- Migration: 0005_contact_reveal_authorization.sql
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
--   1. Adds a UNIQUE constraint on contact_reveals (request_id, donor_id) to
--      guarantee at most one reveal record per donor-request pair at the database
--      level, preventing duplicate records from concurrent requests.
--   2. Implements the atomic PostgreSQL function record_contact_reveal to:
--      - Authoritatively verify that the match is in status 'accepted'.
--      - Authoritatively verify that the donor response is 'accepted'.
--      - Authoritatively verify that a valid match_found notification exists.
--      - Authoritatively verify that the blood request is not cancelled, expired, or fulfilled.
--      - Idempotently insert or retrieve the contact_reveals row.
--      - Return only the authorized minimum contact projection (name and phone)
--        along with an is_new flag to drive non-duplicate audit logging.
--
-- Security:
--   - SECURITY INVOKER: Runs with caller privileges (service_role only).
--   - Fixed search_path: public, pg_temp to prevent search_path hijacking.
--   - Access control: Default execution revoked from PUBLIC, anon, and authenticated.
--     Execution granted exclusively to service_role.
--   - Never returns donor home address, coordinates, email, or health history.
-- =============================================================================

-- 1. Database-enforced uniqueness: at most one reveal record per donor/request pair
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_reveals_request_id_donor_id_key'
  ) THEN
    ALTER TABLE contact_reveals
      ADD CONSTRAINT contact_reveals_request_id_donor_id_key
      UNIQUE (request_id, donor_id);
  END IF;
END $$;

-- 2. Atomic contact reveal function
CREATE OR REPLACE FUNCTION record_contact_reveal(
  p_request_id UUID,
  p_match_id UUID,
  p_trigger TEXT DEFAULT 'donor_accepted',
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  reveal_id UUID,
  donor_id UUID,
  donor_name TEXT,
  donor_phone TEXT,
  is_new BOOLEAN,
  revealed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_match_donor_id UUID;
  v_match_status match_status;
  v_request_status request_status;
  v_response_status response_status;
  v_notification_id UUID;
  v_donor_name TEXT;
  v_donor_phone TEXT;
  v_reveal_id UUID;
  v_revealed_at TIMESTAMPTZ;
  v_is_new BOOLEAN;
BEGIN
  -- 1. Verify match existence, ownership, and accepted status
  SELECT m.donor_id, m.status
  INTO v_match_donor_id, v_match_status
  FROM matches m
  WHERE m.id = p_match_id
    AND m.request_id = p_request_id;

  IF v_match_donor_id IS NULL OR v_match_status <> 'accepted' THEN
    RETURN; -- Returns 0 rows (unauthorized/invalid match state)
  END IF;

  -- 2. Verify request existence and non-terminal lifecycle (not cancelled, expired, or fulfilled)
  SELECT r.status
  INTO v_request_status
  FROM blood_requests r
  WHERE r.id = p_request_id;

  IF v_request_status IS NULL OR v_request_status IN ('cancelled', 'expired', 'fulfilled') THEN
    RETURN; -- Returns 0 rows (request not actionable)
  END IF;

  -- 3. Verify donor response exists and is explicitly 'accepted'
  SELECT dr.status
  INTO v_response_status
  FROM donor_responses dr
  WHERE dr.request_id = p_request_id
    AND dr.donor_id = v_match_donor_id;

  IF v_response_status IS NULL OR v_response_status <> 'accepted' THEN
    RETURN; -- Returns 0 rows (donor has not accepted)
  END IF;

  -- 4. Verify corresponding match_found notification relationship
  SELECT n.id
  INTO v_notification_id
  FROM notifications n
  WHERE n.request_id = p_request_id
    AND n.donor_id = v_match_donor_id
    AND n.match_id = p_match_id
    AND n.type = 'match_found'
  LIMIT 1;

  IF v_notification_id IS NULL THEN
    RETURN; -- Returns 0 rows (unauthorized notification link)
  END IF;

  -- 5. Fetch authorized minimum donor contact (name, phone)
  SELECT d.full_name, d.phone_number
  INTO v_donor_name, v_donor_phone
  FROM donors d
  WHERE d.id = v_match_donor_id;

  IF v_donor_name IS NULL OR v_donor_phone IS NULL THEN
    RETURN; -- Returns 0 rows (donor record missing)
  END IF;

  -- 6. Atomically insert or retrieve existing contact_reveals record
  -- Check if already revealed
  SELECT cr.id, cr.revealed_at
  INTO v_reveal_id, v_revealed_at
  FROM contact_reveals cr
  WHERE cr.request_id = p_request_id
    AND cr.donor_id = v_match_donor_id;

  IF v_reveal_id IS NOT NULL THEN
    v_is_new := FALSE;
  ELSE
    -- Attempt atomic insertion with conflict protection
    INSERT INTO contact_reveals (
      request_id,
      donor_id,
      match_id,
      trigger,
      reason,
      revealed_at
    ) VALUES (
      p_request_id,
      v_match_donor_id,
      p_match_id,
      COALESCE(p_trigger, 'donor_accepted'),
      p_reason,
      NOW()
    )
    ON CONFLICT ON CONSTRAINT contact_reveals_request_id_donor_id_key DO NOTHING
    RETURNING contact_reveals.id, contact_reveals.revealed_at
    INTO v_reveal_id, v_revealed_at;

    IF v_reveal_id IS NOT NULL THEN
      v_is_new := TRUE;
    ELSE
      -- Concurrent transaction inserted just before us; retrieve existing
      SELECT cr.id, cr.revealed_at
      INTO v_reveal_id, v_revealed_at
      FROM contact_reveals cr
      WHERE cr.request_id = p_request_id
        AND cr.donor_id = v_match_donor_id;
      v_is_new := FALSE;
    END IF;
  END IF;

  -- 7. Return the single authorized result row
  RETURN QUERY
  SELECT
    v_reveal_id,
    v_match_donor_id,
    v_donor_name,
    v_donor_phone,
    v_is_new,
    v_revealed_at;
END;
$$;

COMMENT ON FUNCTION record_contact_reveal IS
  'Atomically authorizes contact reveal, records or looks up contact_reveals row, and returns minimum contact info. Server-only.';

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION record_contact_reveal(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Grant execution exclusively to service_role (Next.js server client)
GRANT EXECUTE ON FUNCTION record_contact_reveal(UUID, UUID, TEXT, TEXT) TO service_role;
