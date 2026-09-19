/**
 * Hemo Match - Proximity Matching & Fallback Engine Unit Tests
 *
 * Requirements:
 * - Donor inside 5 km included
 * - Donor outside 5 km excluded (EXCLUDE_OUTSIDE_PROXIMITY_RADIUS)
 * - Donor physically nearby across district boundary included when both coordinates exist
 * - Exact homologous ABO/Rh match prioritized before distance
 * - Distance ranking works (nearer donor first)
 * - Missing request coordinates -> fallback to same district, distanceKm is null
 * - Missing donor coordinates -> fallback to same district, distanceKm is null
 * - No fake distance fabricated for fallback candidates
 * - All clinical/hard interval constraints preserved with coordinates
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchDonorsForRequest,
  evaluateDonorLevel,
  MATCH_RADIUS_KM,
  type EngineRequestInput,
  type EngineDonorInput,
} from '@/lib/matching/engine';

describe('Proximity Matching & Geographic Fallback Policy', () => {
  const EVAL_TIME = new Date('2026-09-18T10:00:00.000Z');
  const EVAL_TIME_ISO = EVAL_TIME.toISOString();

  // Central hospital coordinates in Ernakulam (e.g., MG Road, Kochi)
  const KOCHI_CENTER = { lat: 9.9700, lon: 76.2800 };

  // Donor ~2.0 km away (inside 5 km radius)
  const DONOR_NEARBY_2KM = { lat: 9.9880, lon: 76.2800 };

  // Donor ~3.5 km away (inside 5 km radius)
  const DONOR_NEARBY_3_5KM = { lat: 10.0015, lon: 76.2800 };

  // Donor ~7.0 km away (outside 5 km radius)
  const DONOR_FAR_7KM = { lat: 10.0330, lon: 76.2800 };

  const BASE_REQUEST: EngineRequestInput = {
    id: 'req-proximity-01',
    bloodGroup: 'A+',
    component: 'Whole Blood',
    districtId: 'dist-ekm',
    requiredBy: '2026-09-20T12:00:00.000Z',
    status: 'active',
    locationLatitude: KOCHI_CENTER.lat,
    locationLongitude: KOCHI_CENTER.lon,
  };

  const createDonor = (overrides: Partial<EngineDonorInput> = {}): EngineDonorInput => ({
    id: 'donor-base-1',
    bloodGroup: 'A+',
    districtId: 'dist-ekm',
    approximateArea: 'Ernakulam City',
    lastDonationDate: '2026-04-01', // >120 days
    availability: 'available',
    consentGiven: true,
    notificationPreference: 'enabled',
    hasPriorResponse: false,
    isAlreadyMatched: false,
    locationLatitude: DONOR_NEARBY_2KM.lat,
    locationLongitude: DONOR_NEARBY_2KM.lon,
    ...overrides,
  });

  describe('Radius Evaluation (5 km MVP)', () => {
    it('verifies MATCH_RADIUS_KM application configuration constant is 5 km', () => {
      assert.equal(MATCH_RADIUS_KM, 5);
    });

    it('includes candidate donor located inside the 5 km radius', () => {
      const donor = createDonor({
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donor, EVAL_TIME, EVAL_TIME_ISO);

      assert.equal(outcome.eligible, true);
      assert.equal(outcome.exclusionReason, null);
      assert.ok(outcome.candidate);
      assert.ok(outcome.candidate.distanceKm !== null && outcome.candidate.distanceKm !== undefined);
      assert.ok(outcome.candidate.distanceKm <= MATCH_RADIUS_KM);
      assert.ok(
        outcome.candidate.factualMatchReasons.some((r) => r.includes('Within proximity radius'))
      );
    });

    it('excludes candidate donor located outside the 5 km radius with EXCLUDE_OUTSIDE_PROXIMITY_RADIUS', () => {
      const donor = createDonor({
        locationLatitude: DONOR_FAR_7KM.lat,
        locationLongitude: DONOR_FAR_7KM.lon,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donor, EVAL_TIME, EVAL_TIME_ISO);

      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_OUTSIDE_PROXIMITY_RADIUS');
      assert.equal(outcome.candidate, undefined);
    });

    it('includes physically nearby donor across district boundary when both coordinates exist', () => {
      // Donor in Kottayam district but physically 2.5 km from the Ernakulam border request
      const crossDistrictDonor = createDonor({
        districtId: 'dist-ktm', // Different administrative district
        approximateArea: 'Border Town',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, crossDistrictDonor, EVAL_TIME, EVAL_TIME_ISO);

      assert.equal(outcome.eligible, true);
      assert.equal(outcome.exclusionReason, null);
      assert.ok(outcome.candidate);
      assert.equal(outcome.candidate.districtId, 'dist-ktm');
      assert.ok(outcome.candidate.distanceKm! <= MATCH_RADIUS_KM);
    });
  });

  describe('Fallback Behavior (Missing Coordinates)', () => {
    it('falls back to same-district check when request lacks coordinates', () => {
      const requestWithoutCoords: EngineRequestInput = {
        ...BASE_REQUEST,
        locationLatitude: null,
        locationLongitude: null,
      };

      const sameDistrictDonor = createDonor({
        districtId: 'dist-ekm',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const differentDistrictDonor = createDonor({
        districtId: 'dist-tsr',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const outcome1 = evaluateDonorLevel(requestWithoutCoords, sameDistrictDonor, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome1.eligible, true);
      assert.equal(outcome1.candidate?.distanceKm, null); // No fabricated distance!
      assert.ok(
        outcome1.candidate?.factualMatchReasons.includes('Same district geographic alignment')
      );

      const outcome2 = evaluateDonorLevel(requestWithoutCoords, differentDistrictDonor, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome2.eligible, false);
      assert.equal(outcome2.exclusionReason, 'EXCLUDE_DIFFERENT_DISTRICT');
    });

    it('falls back to same-district check when donor lacks coordinates', () => {
      const donorWithoutCoords = createDonor({
        districtId: 'dist-ekm',
        locationLatitude: null,
        locationLongitude: null,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorWithoutCoords, EVAL_TIME, EVAL_TIME_ISO);

      assert.equal(outcome.eligible, true);
      assert.equal(outcome.candidate?.distanceKm, null); // Must NOT invent distance
      assert.ok(
        outcome.candidate?.factualMatchReasons.includes('Same district geographic alignment')
      );
    });

    it('excludes donor when coordinates are absent on both sides and districts differ', () => {
      const requestNoCoords: EngineRequestInput = {
        ...BASE_REQUEST,
        districtId: 'dist-ekm',
        locationLatitude: null,
        locationLongitude: null,
      };

      const donorNoCoords: EngineDonorInput = createDonor({
        districtId: 'dist-ktm',
        locationLatitude: null,
        locationLongitude: null,
      });

      const outcome = evaluateDonorLevel(requestNoCoords, donorNoCoords, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_DIFFERENT_DISTRICT');
    });
  });

  describe('Ranking Policy with Proximity', () => {
    it('ranks exact homologous ABO/Rh match above compatible alternative regardless of distance', () => {
      // Homologous donor is 3.5 km away
      const donorHomologous = createDonor({
        id: 'donor-homologous',
        bloodGroup: 'A+',
        locationLatitude: DONOR_NEARBY_3_5KM.lat,
        locationLongitude: DONOR_NEARBY_3_5KM.lon,
      });

      // Compatible O- donor is nearer (2.0 km away)
      const donorCompatible = createDonor({
        id: 'donor-compatible',
        bloodGroup: 'O-',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const result = matchDonorsForRequest(BASE_REQUEST, [donorCompatible, donorHomologous], EVAL_TIME);
      assert.equal(result.success, true);
      assert.equal(result.candidates.length, 2);
      // Homologous match MUST rank first
      assert.equal(result.candidates[0].donorId, 'donor-homologous');
      assert.equal(result.candidates[1].donorId, 'donor-compatible');
    });

    it('ranks nearer donor ahead of farther donor when homologous priority is equal', () => {
      const donorFarther = createDonor({
        id: 'donor-farther',
        bloodGroup: 'A+',
        locationLatitude: DONOR_NEARBY_3_5KM.lat,
        locationLongitude: DONOR_NEARBY_3_5KM.lon,
        lastDonationDate: '2026-03-01',
      });

      const donorNearer = createDonor({
        id: 'donor-nearer',
        bloodGroup: 'A+',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
        lastDonationDate: '2026-03-01',
      });

      const result = matchDonorsForRequest(BASE_REQUEST, [donorFarther, donorNearer], EVAL_TIME);
      assert.equal(result.success, true);
      assert.equal(result.candidates[0].donorId, 'donor-nearer');
      assert.equal(result.candidates[1].donorId, 'donor-farther');
    });

    it('ranks verified proximity candidates ahead of district fallback candidates without distance', () => {
      const donorWithProximity = createDonor({
        id: 'donor-with-dist',
        locationLatitude: DONOR_NEARBY_2KM.lat,
        locationLongitude: DONOR_NEARBY_2KM.lon,
      });

      const donorFallback = createDonor({
        id: 'donor-fallback',
        locationLatitude: null,
        locationLongitude: null,
      });

      const result = matchDonorsForRequest(BASE_REQUEST, [donorFallback, donorWithProximity], EVAL_TIME);
      assert.equal(result.success, true);
      assert.equal(result.candidates[0].donorId, 'donor-with-dist');
      assert.equal(result.candidates[1].donorId, 'donor-fallback');
    });
  });

  describe('Hard Clinical and Eligibility Filters Preservation', () => {
    it('still excludes donor with interval too short even when within 1 km', () => {
      const donorRecent = createDonor({
        lastDonationDate: '2026-08-01', // only ~48 days ago
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorRecent, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_INTERVAL_TOO_SHORT');
    });

    it('still excludes donor with incompatible blood group even when adjacent', () => {
      const donorB = createDonor({
        bloodGroup: 'B+', // Incompatible with A+ recipient
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorB, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE');
    });

    it('still excludes donor without consent even when nearby', () => {
      const donorNoConsent = createDonor({
        consentGiven: false,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorNoConsent, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_NO_CONSENT');
    });

    it('still excludes donor who is temporarily unavailable', () => {
      const donorUnavailable = createDonor({
        availability: 'temporarily_unavailable',
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorUnavailable, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_DONOR_UNAVAILABLE');
    });

    it('still excludes donor with unknown donation history', () => {
      const donorUnknown = createDonor({
        lastDonationDate: null,
      });

      const outcome = evaluateDonorLevel(BASE_REQUEST, donorUnknown, EVAL_TIME, EVAL_TIME_ISO);
      assert.equal(outcome.eligible, false);
      assert.equal(outcome.exclusionReason, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');
    });
  });
});
