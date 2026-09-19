/**
 * Hemo Match - Geospatial Utilities (Pure deterministic algorithms)
 *
 * Implements Haversine great-circle distance calculation between two points
 * on Earth in kilometers, with strict coordinate validation.
 *
 * NOTE: Haversine computes straight-line geodesic distance on a spherical Earth model.
 * It is NOT road distance, routing distance, or travel time.
 */

export const EARTH_RADIUS_KM = 6371;

/**
 * Validates that latitude and longitude are finite numbers within valid geographic ranges:
 * - Latitude: [-90, +90]
 * - Longitude: [-180, +180]
 */
export function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  return true;
}

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes great-circle Haversine distance in kilometers between two geographic coordinates.
 * Returns distance in kilometers (rounded to 4 decimal places for precision).
 *
 * Throws an Error if any coordinate is invalid.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('Invalid coordinate provided to calculateHaversineDistanceKm');
  }

  // Identical points optimization & floating point defense
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Guard against numerical inaccuracies outside [-1, 1] range
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 10000) / 10000;
}

/**
 * Formats a distance in kilometers for privacy-safe UI display.
 * Example:
 * - 1.84 -> "~1.8 km"
 * - 0.04 -> "<0.1 km"
 */
export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return '<0.1 km';
  }
  return `~${distanceKm.toFixed(1)} km`;
}
