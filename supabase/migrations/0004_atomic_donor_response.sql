-- =============================================================================
-- Hemo Match - Atomic Donor Response Function
-- Migration: 0004_atomic_donor_response.sql
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
--   Atomically records a donor's response ('accepted' or 'declined') to a blood
--   request match and transitions the match status from 'notified' to 'accepted'
--   or 'declined'.
--   Guarantees that match status transition and response record insertion succeed
--   or fail together within a single transaction boundary.
--   Prevents duplicate responses, race conditions, and cross-state overwrites.
--
-- Security:
--   - SECURITY INVOKER: Runs with caller privileges (service_role only).
--   - Fixed search_path: public, pg_temp to prevent search_path hijacking.
--   - Access control: Default execution revoked from PUBLIC, anon, and authenticated.
--     Execution granted exclusively to service_role.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_donor_response(
  p_donor_id UUID,
  p_request_id UUID,
  p_match_id UUID,
  p_response response_status
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_match_status match_status;
  v_updated_match_id UUID;
  v_response_id UUID;
BEGIN
  -- 1. Validate response parameter (must be accepted or declined)
  IF p_response = 'accepted' THEN
    v_target_match_status := 'accepted';
  ELSIF p_response = 'declined' THEN
    v_target_match_status := 'declined';
  ELSE
    RAISE EXCEPTION 'Invalid donor response status: %. Must be accepted or declined.', p_response;
  END IF;

  -- 2. Atomically claim match transition (status='notified' -> 'accepted' or 'declined')
  -- Conditional update ensures only a match in 'notified' status can transition.
  UPDATE matches
  SET status = v_target_match_status,
      updated_at = NOW()
  WHERE id = p_match_id
    AND status = 'notified'
    AND request_id = p_request_id
    AND donor_id = p_donor_id
  RETURNING id INTO v_updated_match_id;

  -- If match was not in 'notified' status or did not match parameters, return NULL
  IF v_updated_match_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Insert donor_responses row
  -- Backed by UNIQUE (request_id, donor_id) constraint on donor_responses
  INSERT INTO donor_responses (
    request_id,
    donor_id,
    match_id,
    status,
    responded_at
  ) VALUES (
    p_request_id,
    p_donor_id,
    p_match_id,
    p_response,
    NOW()
  )
  RETURNING id INTO v_response_id;

  RETURN v_response_id;
END;
$$;

COMMENT ON FUNCTION record_donor_response IS
  'Atomically transitions a match from notified to accepted/declined and inserts a donor_response row. Server-only.';

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION record_donor_response(UUID, UUID, UUID, response_status) FROM PUBLIC, anon, authenticated;

-- Grant execution exclusively to service_role (Next.js server client)
GRANT EXECUTE ON FUNCTION record_donor_response(UUID, UUID, UUID, response_status) TO service_role;
