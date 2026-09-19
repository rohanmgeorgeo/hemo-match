-- =============================================================================
-- Hemo Match - Privacy-Safe Proximity Matching Coordinates
-- Migration: 0006_proximity_matching_coordinates.sql
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
--   Adds server-side private matching coordinate columns to blood_requests and donors.
--   Enables Haversine radius-based proximity matching (default 5 km) while preserving
--   district and approximate_area for display, context, and legacy fallback.
--
-- Privacy Guarantee:
--   Coordinates are strictly server-side matching data.
--   They must NEVER be exposed in public API projections, candidate cards,
--   notifications, or contact reveal responses.
-- =============================================================================

-- 1. BLOOD REQUESTS COORDINATES
ALTER TABLE blood_requests
  ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_blood_requests_latitude'
  ) THEN
    ALTER TABLE blood_requests
      ADD CONSTRAINT check_blood_requests_latitude
      CHECK (location_latitude IS NULL OR (location_latitude >= -90 AND location_latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_blood_requests_longitude'
  ) THEN
    ALTER TABLE blood_requests
      ADD CONSTRAINT check_blood_requests_longitude
      CHECK (location_longitude IS NULL OR (location_longitude >= -180 AND location_longitude <= 180));
  END IF;
END $$;

COMMENT ON COLUMN blood_requests.location_latitude IS
  'Private matching coordinates for proximity radius calculation. Never exposed to donors.';
COMMENT ON COLUMN blood_requests.location_longitude IS
  'Private matching coordinates for proximity radius calculation. Never exposed to donors.';

-- Partial index for active request spatial queries
CREATE INDEX IF NOT EXISTS idx_blood_requests_coordinates
  ON blood_requests (location_latitude, location_longitude)
  WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;


-- 2. DONORS COORDINATES
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_donors_latitude'
  ) THEN
    ALTER TABLE donors
      ADD CONSTRAINT check_donors_latitude
      CHECK (location_latitude IS NULL OR (location_latitude >= -90 AND location_latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_donors_longitude'
  ) THEN
    ALTER TABLE donors
      ADD CONSTRAINT check_donors_longitude
      CHECK (location_longitude IS NULL OR (location_longitude >= -180 AND location_longitude <= 180));
  END IF;
END $$;

COMMENT ON COLUMN donors.location_latitude IS
  'Private matching coordinates. Must NEVER be returned in public or requester-facing APIs.';
COMMENT ON COLUMN donors.location_longitude IS
  'Private matching coordinates. Must NEVER be returned in public or requester-facing APIs.';

-- Partial index for available donor spatial queries
CREATE INDEX IF NOT EXISTS idx_donors_coordinates
  ON donors (location_latitude, location_longitude)
  WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;
