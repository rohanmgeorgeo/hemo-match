/**
 * Hemo Match - Geospatial Haversine & Coordinate Validation Unit Tests
 *
 * Requirements:
 * - Identical coordinates = 0 km
 * - Known nearby coordinates verify expected straight-line distance
 * - Symmetry: distance(A, B) === distance(B, A)
 * - Coordinate validation bounds: -90 <= lat <= 90, -180 <= lon <= 180
 * - Format distance properly without claiming road/driving routes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKm,
  isValidCoordinate,
  formatDistanceKm,
  EARTH_RADIUS_KM,
} from '@/lib/geo/distance';

describe('Geospatial Haversine Distance & Coordinate Validation', () => {
  describe('Coordinate Validation (isValidCoordinate)', () => {
    it('accepts valid coordinates within geographic ranges', () => {
      assert.equal(isValidCoordinate(0, 0), true);
      assert.equal(isValidCoordinate(9.9312, 76.2673), true); // Kochi
      assert.equal(isValidCoordinate(-90, -180), true);
      assert.equal(isValidCoordinate(90, 180), true);
      assert.equal(isValidCoordinate(45.5, -122.6), true);
    });

    it('rejects latitudes outside [-90, +90]', () => {
      assert.equal(isValidCoordinate(90.1, 0), false);
      assert.equal(isValidCoordinate(-90.1, 0), false);
      assert.equal(isValidCoordinate(100, 50), false);
    });

    it('rejects longitudes outside [-180, +180]', () => {
      assert.equal(isValidCoordinate(0, 180.1), false);
      assert.equal(isValidCoordinate(0, -180.1), false);
      assert.equal(isValidCoordinate(45, 200), false);
    });

    it('rejects non-numeric and non-finite values', () => {
      assert.equal(isValidCoordinate('9.93' as unknown as number, 76.26), false);
      assert.equal(isValidCoordinate(null as unknown as number, 76.26), false);
      assert.equal(isValidCoordinate(undefined as unknown as number, 76.26), false);
      assert.equal(isValidCoordinate(NaN, 76.26), false);
      assert.equal(isValidCoordinate(Infinity, 76.26), false);
      assert.equal(isValidCoordinate(-Infinity, 76.26), false);
      assert.equal(isValidCoordinate(9.93, NaN), false);
      assert.equal(isValidCoordinate(9.93, Infinity), false);
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('returns 0 km for identical coordinates', () => {
      const distance = calculateHaversineDistanceKm(9.9312, 76.2673, 9.9312, 76.2673);
      assert.equal(distance, 0);
    });

    it('is symmetric: distance(A, B) === distance(B, A)', () => {
      const p1 = { lat: 9.9312, lon: 76.2673 }; // Kochi
      const p2 = { lat: 10.0159, lon: 76.3419 }; // Kakkanad
      const d1 = calculateHaversineDistanceKm(p1.lat, p1.lon, p2.lat, p2.lon);
      const d2 = calculateHaversineDistanceKm(p2.lat, p2.lon, p1.lat, p1.lon);
      assert.equal(d1, d2);
      assert.ok(d1 > 10 && d1 < 14, `Expected Kakkanad to Kochi to be ~12km, got ${d1}`);
    });

    it('accurately calculates known nearby distance (~1.8 km)', () => {
      // 0.0162 degrees latitude difference at equator/tropics is approximately 1.8 km
      const p1 = { lat: 9.9800, lon: 76.2800 };
      const p2 = { lat: 9.9962, lon: 76.2800 };
      const distance = calculateHaversineDistanceKm(p1.lat, p1.lon, p2.lat, p2.lon);
      assert.ok(
        Math.abs(distance - 1.8) < 0.05,
        `Expected ~1.8 km, got ${distance} km`
      );
    });

    it('throws error for invalid coordinates', () => {
      assert.throws(
        () => calculateHaversineDistanceKm(95, 0, 0, 0),
        /Invalid coordinate provided/
      );
      assert.throws(
        () => calculateHaversineDistanceKm(0, 0, 0, 190),
        /Invalid coordinate provided/
      );
    });

    it('uses correct Earth radius of 6371 km', () => {
      assert.equal(EARTH_RADIUS_KM, 6371);
    });
  });

  describe('Distance Formatting (formatDistanceKm)', () => {
    it('formats distances with ~ and 1 decimal place', () => {
      assert.equal(formatDistanceKm(1.84), '~1.8 km');
      assert.equal(formatDistanceKm(4.29), '~4.3 km');
      assert.equal(formatDistanceKm(0.42), '~0.4 km');
    });

    it('formats very small distances as <0.1 km', () => {
      assert.equal(formatDistanceKm(0.04), '<0.1 km');
      assert.equal(formatDistanceKm(0.001), '<0.1 km');
    });
  });
});
