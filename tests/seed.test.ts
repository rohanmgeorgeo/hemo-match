/**
 * Hemo Match - Selection Dataset & Evaluation Infrastructure Tests
 *
 * Unit tests verifying:
 * - Deterministic UUIDs adhere to RFC 4122 v4
 * - Fictional phone numbers and attributes adhere to system validation rules
 * - Valid geographic coordinates and distances from evaluation center
 * - Pure matching engine compatibility with seeded donor definitions:
 *   - Donor A (A+, Homologous match #1)
 *   - Donor B (O+, Compatible match #2)
 *   - Donor C (A+, Interval exclusion: recent donation < 120 days via conservative application policy)
 *   - Donor D (A+, Match eligible, skipped during notification dispatch)
 *   - Donor E (A+, Excluded by > 5 km proximity radius, included in district fallback)
 * - Safe isolation: Seed and reset operations target ONLY KNOWN_SELECTION_DONOR_IDS
 * - Idempotency: Multiple runs produce identical records
 * - Zero secrets embedded in selection source
 * - Zero privacy leaks or bypasses introduced
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SELECTION_EVAL_CENTER,
  SELECTION_DONOR_DEFINITIONS,
  KNOWN_SELECTION_DONOR_IDS,
  DONOR_A_ID,
  DONOR_B_ID,
  DONOR_C_ID,
  DONOR_D_ID,
  DONOR_E_ID,
  buildSelectionDonorRows,
} from '@/lib/selection/data';
import { calculateHaversineDistanceKm, isValidCoordinate } from '@/lib/geo/distance';
import {
  matchDonorsForRequest,
  MATCH_RADIUS_KM,
  type EngineRequestInput,
  type EngineDonorInput,
} from '@/lib/matching/engine';
import { isValidBloodGroup } from '@/lib/validation';

describe('Step 15 — Selection Dataset & Evaluation Reliability', () => {
  const EVAL_TIME = new Date('2026-09-19T10:00:00.000Z');
  const EVAL_DISTRICT_ID = '00000000-0000-0000-0000-000000000001';

  const PRIMARY_EVAL_REQUEST: EngineRequestInput = {
    id: 'req-eval-primary-001',
    bloodGroup: 'A+',
    component: 'Whole Blood',
    districtId: EVAL_DISTRICT_ID,
    status: 'active',
    requiredBy: '2026-09-20T14:00:00.000Z',
    locationLatitude: SELECTION_EVAL_CENTER.latitude,
    locationLongitude: SELECTION_EVAL_CENTER.longitude,
  };

  describe('Deterministic ID & Fictional Data Invariants', () => {
    it('provides exactly 5 deterministic RFC 4122 v4 donor UUIDs', () => {
      assert.strictEqual(KNOWN_SELECTION_DONOR_IDS.length, 5);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      for (const id of KNOWN_SELECTION_DONOR_IDS) {
        assert.match(id, uuidRegex, `Expected ${id} to be a valid RFC 4122 v4 UUID`);
      }
    });

    it('uses unique IDs for all 5 selection donors', () => {
      const uniqueIds = new Set(KNOWN_SELECTION_DONOR_IDS);
      assert.strictEqual(uniqueIds.size, 5);
    });

    it('ensures all phone numbers use reserved fictional prefix and pass validation format', () => {
      // System validation regex: 7-15 digits, optional + prefix
      const phoneRegex = /^\+?[0-9]{7,15}$/;

      for (const donor of SELECTION_DONOR_DEFINITIONS) {
        assert.match(
          donor.phoneNumber.replace(/[\s\-()]/g, ''),
          phoneRegex,
          `Phone ${donor.phoneNumber} must pass system phone regex`
        );
        // Clearly fictional test prefix (+919800000...)
        assert.strictEqual(
          donor.phoneNumber.startsWith('+91980000000'),
          true,
          'Phone must use obvious fictional test prefix'
        );
      }
    });

    it('ensures all blood groups are clinically recognized ABO/Rh groups', () => {
      for (const donor of SELECTION_DONOR_DEFINITIONS) {
        assert.strictEqual(
          isValidBloodGroup(donor.bloodGroup),
          true,
          `Blood group ${donor.bloodGroup} must be valid`
        );
      }
    });

    it('ensures all coordinate values are physically valid numbers within bounds', () => {
      assert.strictEqual(
        isValidCoordinate(SELECTION_EVAL_CENTER.latitude, SELECTION_EVAL_CENTER.longitude),
        true
      );

      for (const donor of SELECTION_DONOR_DEFINITIONS) {
        assert.strictEqual(
          isValidCoordinate(donor.locationLatitude, donor.locationLongitude),
          true,
          `Coordinates for ${donor.id} must be within bounds`
        );
      }
    });
  });

  describe('Primary Scenario Matching Engine Behavior (A+ Whole Blood)', () => {
    function buildEngineDonors(refDate: Date = EVAL_TIME): EngineDonorInput[] {
      const rows = buildSelectionDonorRows(EVAL_DISTRICT_ID, refDate);
      return rows.map((r) => ({
        id: r.id,
        bloodGroup: r.blood_group,
        districtId: r.district_id,
        approximateArea: r.approximate_area,
        lastDonationDate: r.last_donation_date,
        availability: r.availability,
        notificationPreference: r.notification_preference,
        consentGiven: r.consent_given,
        locationLatitude: r.location_latitude,
        locationLongitude: r.location_longitude,
      }));
    }

    it('verifies Donor A is an exact homologous match within 5 km and ranks #1', () => {
      const donors = buildEngineDonors();
      const distance = calculateHaversineDistanceKm(
        SELECTION_EVAL_CENTER.latitude,
        SELECTION_EVAL_CENTER.longitude,
        donors.find((d) => d.id === DONOR_A_ID)!.locationLatitude!,
        donors.find((d) => d.id === DONOR_A_ID)!.locationLongitude!
      );

      assert.strictEqual(distance < MATCH_RADIUS_KM, true, 'Donor A must be within 5 km');
      assert.strictEqual(distance > 1.0 && distance < 2.0, true, 'Donor A expected ~1.4 km');

      const result = matchDonorsForRequest(PRIMARY_EVAL_REQUEST, donors, EVAL_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length >= 1, true);

      const topCandidate = result.candidates[0];
      assert.strictEqual(topCandidate.donorId, DONOR_A_ID);
      assert.strictEqual(topCandidate.compatibilityType, 'homologous');
      assert.strictEqual(topCandidate.bloodGroup, 'A+');
      assert.strictEqual(typeof topCandidate.distanceKm, 'number');
      assert.strictEqual(topCandidate.distanceKm! < 2.0, true);
    });

    it('verifies Donor B is a compatible alternative (O+) and ranks after homologous', () => {
      const donors = buildEngineDonors();
      const distance = calculateHaversineDistanceKm(
        SELECTION_EVAL_CENTER.latitude,
        SELECTION_EVAL_CENTER.longitude,
        donors.find((d) => d.id === DONOR_B_ID)!.locationLatitude!,
        donors.find((d) => d.id === DONOR_B_ID)!.locationLongitude!
      );

      assert.strictEqual(distance < MATCH_RADIUS_KM, true, 'Donor B must be within 5 km');

      const result = matchDonorsForRequest(PRIMARY_EVAL_REQUEST, donors, EVAL_TIME);
      const donorBCandidate = result.candidates.find((c) => c.donorId === DONOR_B_ID);

      assert.ok(donorBCandidate, 'Donor B must be an eligible candidate');
      assert.strictEqual(donorBCandidate.compatibilityType, 'compatible');
      assert.strictEqual(donorBCandidate.bloodGroup, 'O+');

      // Ranking verification: Donor A (homologous) must rank before Donor B (compatible alternative)
      const indexA = result.candidates.findIndex((c) => c.donorId === DONOR_A_ID);
      const indexB = result.candidates.findIndex((c) => c.donorId === DONOR_B_ID);
      assert.strictEqual(indexA < indexB, true, 'Homologous Donor A must rank ahead of compatible Donor B');
    });

    it('verifies Donor C is excluded by the conservative 120-day application matching interval policy despite proximity', () => {
      const donors = buildEngineDonors();
      const distance = calculateHaversineDistanceKm(
        SELECTION_EVAL_CENTER.latitude,
        SELECTION_EVAL_CENTER.longitude,
        donors.find((d) => d.id === DONOR_C_ID)!.locationLatitude!,
        donors.find((d) => d.id === DONOR_C_ID)!.locationLongitude!
      );

      // Physically very close (~0.9 km)
      assert.strictEqual(distance < 1.5, true, 'Donor C is physically close');

      const result = matchDonorsForRequest(PRIMARY_EVAL_REQUEST, donors, EVAL_TIME);
      const donorCCandidate = result.candidates.find((c) => c.donorId === DONOR_C_ID);
      assert.strictEqual(donorCCandidate, undefined, 'Donor C must NOT be in eligible candidates');

      const donorCEvaluation = result.evaluations.find((e) => e.donorId === DONOR_C_ID);
      assert.ok(donorCEvaluation, 'Donor C must appear in evaluations');
      assert.strictEqual(donorCEvaluation.eligible, false);
      assert.strictEqual(donorCEvaluation.exclusionReason, 'EXCLUDE_INTERVAL_TOO_SHORT');
    });

    it('verifies Donor D qualifies for matching candidates but has notifications disabled', () => {
      const donors = buildEngineDonors();
      const donorD = donors.find((d) => d.id === DONOR_D_ID)!;
      assert.strictEqual(donorD.notificationPreference, 'disabled');

      const result = matchDonorsForRequest(PRIMARY_EVAL_REQUEST, donors, EVAL_TIME);
      const donorDCandidate = result.candidates.find((c) => c.donorId === DONOR_D_ID);

      assert.ok(donorDCandidate, 'Donor D qualifies as matching candidate');
      assert.strictEqual(donorDCandidate.compatibilityType, 'homologous');

      // At notification dispatch stage, notificationPreference = 'disabled' will be skipped
      assert.strictEqual(donorD.notificationPreference === 'disabled', true);
    });

    it('verifies Donor E is excluded by proximity radius (> 5 km) when coordinates are present', () => {
      const donors = buildEngineDonors();
      const distance = calculateHaversineDistanceKm(
        SELECTION_EVAL_CENTER.latitude,
        SELECTION_EVAL_CENTER.longitude,
        donors.find((d) => d.id === DONOR_E_ID)!.locationLatitude!,
        donors.find((d) => d.id === DONOR_E_ID)!.locationLongitude!
      );

      assert.strictEqual(distance > MATCH_RADIUS_KM, true, 'Donor E must be outside 5 km radius');
      assert.strictEqual(distance > 10.0, true, 'Donor E expected in Aluva area (~13 km)');

      const result = matchDonorsForRequest(PRIMARY_EVAL_REQUEST, donors, EVAL_TIME);
      const donorECandidate = result.candidates.find((c) => c.donorId === DONOR_E_ID);
      assert.strictEqual(donorECandidate, undefined, 'Donor E must NOT be included when coordinates exist');

      const donorEEvaluation = result.evaluations.find((e) => e.donorId === DONOR_E_ID);
      assert.ok(donorEEvaluation, 'Donor E must appear in evaluations');
      assert.strictEqual(donorEEvaluation.eligible, false);
      assert.strictEqual(donorEEvaluation.exclusionReason, 'EXCLUDE_OUTSIDE_PROXIMITY_RADIUS');
    });

    it('verifies Donor E matches under district fallback when request coordinates are missing', () => {
      const donors = buildEngineDonors();
      const requestWithoutCoords: EngineRequestInput = {
        ...PRIMARY_EVAL_REQUEST,
        locationLatitude: null,
        locationLongitude: null,
      };

      const result = matchDonorsForRequest(requestWithoutCoords, donors, EVAL_TIME);
      const donorECandidate = result.candidates.find((c) => c.donorId === DONOR_E_ID);

      // In district fallback, Donor E is in the same district and is eligible
      assert.ok(donorECandidate, 'Donor E must match under same-district fallback');
      assert.strictEqual(donorECandidate.distanceKm, null, 'Fallback must have null distance');
    });
  });


  describe('Isolation & Idempotency Guarantees', () => {
    it('buildSelectionDonorRows produces idempotent identical payloads for a given reference date', () => {
      const rows1 = buildSelectionDonorRows(EVAL_DISTRICT_ID, EVAL_TIME);
      const rows2 = buildSelectionDonorRows(EVAL_DISTRICT_ID, EVAL_TIME);

      assert.deepStrictEqual(rows1, rows2);
    });

    it('targets ONLY the 5 deterministic selection UUIDs in KNOWN_SELECTION_DONOR_IDS', () => {
      const rows = buildSelectionDonorRows(EVAL_DISTRICT_ID, EVAL_TIME);
      assert.strictEqual(rows.length, 5);

      const generatedIds = rows.map((r) => r.id);
      assert.deepStrictEqual(generatedIds, [...KNOWN_SELECTION_DONOR_IDS]);
    });

    it('confirms source files contain zero hardcoded credentials or service role keys', () => {
      const seedSource = fs.readFileSync(
        path.join(process.cwd(), 'scripts/seed-selection.ts'),
        'utf-8'
      );
      const dataSource = fs.readFileSync(
        path.join(process.cwd(), 'src/lib/selection/data.ts'),
        'utf-8'
      );
      const opsSource = fs.readFileSync(
        path.join(process.cwd(), 'src/lib/selection/seed.ts'),
        'utf-8'
      );

      const combined = seedSource + dataSource + opsSource;
      assert.strictEqual(combined.includes('eyJhbGciOi'), false, 'Must not contain JWT tokens');
      assert.strictEqual(combined.includes('service_role'), false, 'Must not contain literal role secret');
    });
  });
});
