-- =============================================================================
-- Hemo Match - Notification Idempotency Foundation
-- Migration: 0002_notification_idempotency.sql
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
--   Ensures database-level idempotency for match notifications.
--   A candidate match record may produce at most one 'match_found' notification.
--
-- Design:
--   Partial unique index on (match_id, type) WHERE match_id IS NOT NULL AND type = 'match_found'.
--   - match_id directly references the candidate in matches.id.
--   - Unrelated notification types (e.g. request_fulfilled, contact_reveal) are not restricted.
--   - Rows with null match_id are excluded from this constraint.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_match_found_unique
  ON notifications (match_id, type)
  WHERE match_id IS NOT NULL AND type = 'match_found';

COMMENT ON INDEX idx_notifications_match_found_unique IS
  'Ensures at most one match_found notification can be created per match record.';
