-- =============================================================================
-- Hemo Match - Atomic Notification Dispatch Function
-- Migration: 0003_atomic_notification_dispatch.sql
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
--   Atomically transitions a candidate match from 'candidate' to 'notified'
--   and creates the corresponding 'match_found' in-app notification row.
--   Guarantees that match status transition and notification creation succeed
--   or fail together within a single transaction boundary.
--
-- Security:
--   - SECURITY INVOKER: Runs with caller privileges (service_role only).
--   - Fixed search_path: public, pg_temp to prevent search_path hijacking.
--   - Access control: Default execution revoked from PUBLIC, anon, and authenticated.
--     Execution granted exclusively to service_role.
-- =============================================================================

CREATE OR REPLACE FUNCTION claim_match_and_create_notification(
  p_match_id UUID,
  p_donor_id UUID,
  p_request_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_match_id UUID;
  v_notification_id UUID;
BEGIN
  -- 1. Atomically claim candidate match (status='candidate' -> 'notified')
  -- Conditional update ensures only one concurrent execution thread can claim this candidate.
  UPDATE matches
  SET status = 'notified',
      updated_at = NOW()
  WHERE id = p_match_id
    AND status = 'candidate'
    AND request_id = p_request_id
    AND donor_id = p_donor_id
  RETURNING id INTO v_updated_match_id;

  -- If match was not in candidate status or did not match parameters, return NULL
  IF v_updated_match_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Insert notification row
  -- Backed by partial unique index idx_notifications_match_found_unique on (match_id, type)
  INSERT INTO notifications (
    donor_id,
    request_id,
    match_id,
    type,
    status,
    payload
  ) VALUES (
    p_donor_id,
    p_request_id,
    p_match_id,
    'match_found',
    'unread',
    p_payload
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION claim_match_and_create_notification IS
  'Atomically transitions a candidate match to notified and creates an unread match_found notification. Server-only.';

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION claim_match_and_create_notification(UUID, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- Grant execution exclusively to service_role (Next.js server client)
GRANT EXECUTE ON FUNCTION claim_match_and_create_notification(UUID, UUID, UUID, JSONB) TO service_role;
