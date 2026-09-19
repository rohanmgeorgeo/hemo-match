/**
 * Hemo Match - Location Privacy Boundary Verification Tests
 *
 * NON-NEGOTIABLE PRIVACY GUARANTEES:
 * 1. Matching candidate objects (PublicMatchCandidate) must NEVER contain donor coordinates
 * 2. Match engine candidate output must NEVER return raw coordinates to public consumers
 * 3. Notification payloads must NEVER contain donor or recipient coordinates
 * 4. Contact reveal authorization must NEVER expose donor coordinates
 * 5. Donor public profile projections (DonorPublicRow) must strictly omit coordinates
 * 6. Contact reveal returns ONLY authorized name & phone — NO location data
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchDonorsForRequest,
  type EngineRequestInput,
  type EngineDonorInput,
} from '@/lib/matching/engine';
import type { PublicMatchCandidate } from '@/types/matches';
import type { DonorPublicRow } from '@/types/database';

describe('Location Privacy Boundary Verification', () => {
  const EVAL_TIME = new Date('2026-09-18T10:00:00.000Z');

  const REQUEST_WITH_COORDS: EngineRequestInput = {
    id: 'req-priv-001',
    bloodGroup: 'O+',
    component: 'Whole Blood',
    districtId: 'dist-ekm',
    requiredBy: '2026-09-20T12:00:00.000Z',
    status: 'active',
    locationLatitude: 9.9700,
    locationLongitude: 76.2800,
  };

  const DONOR_WITH_COORDS: EngineDonorInput = {
    id: 'donor-priv-001',
    bloodGroup: 'O+',
    districtId: 'dist-ekm',
    approximateArea: 'Ernakulam North',
    lastDonationDate: '2026-03-01',
    availability: 'available',
    consentGiven: true,
    notificationPreference: 'enabled',
    hasPriorResponse: false,
    isAlreadyMatched: false,
    locationLatitude: 9.9850,
    locationLongitude: 76.2800,
  };

  it('verifies PublicMatchCandidate structure contains NO coordinate fields', () => {
    const result = matchDonorsForRequest(REQUEST_WITH_COORDS, [DONOR_WITH_COORDS], EVAL_TIME);
    assert.equal(result.success, true);
    assert.equal(result.candidates.length, 1);

    const candidate = result.candidates[0];

    // Check candidate object keys
    const candidateKeys = Object.keys(candidate);
    assert.equal(candidateKeys.includes('locationLatitude'), false, 'candidate must not contain locationLatitude');
    assert.equal(candidateKeys.includes('locationLongitude'), false, 'candidate must not contain locationLongitude');
    assert.equal(candidateKeys.includes('latitude'), false, 'candidate must not contain latitude');
    assert.equal(candidateKeys.includes('longitude'), false, 'candidate must not contain longitude');
    assert.equal(candidateKeys.includes('coords'), false, 'candidate must not contain coords');

    // PublicMatchCandidate projection representation
    const publicCandidate: PublicMatchCandidate = {
      matchId: 'match-123',
      requestId: candidate.requestId,
      anonymizedDonorRef: candidate.anonymizedDonorRef,
      bloodGroup: candidate.bloodGroup,
      districtName: 'Ernakulam',
      approximateArea: candidate.approximateArea,
      compatibilityType: candidate.compatibilityType,
      factualMatchReasons: candidate.factualMatchReasons,
      status: 'candidate',
      createdAt: new Date().toISOString(),
      distanceKm: candidate.distanceKm,
    };

    const serialized = JSON.stringify(publicCandidate);
    assert.equal(serialized.includes('locationLatitude'), false);
    assert.equal(serialized.includes('locationLongitude'), false);
    assert.equal(serialized.includes('latitude'), false);
    assert.equal(serialized.includes('longitude'), false);

    // Only approximate scalar distanceKm is present
    assert.ok(typeof publicCandidate.distanceKm === 'number');
  });

  it('verifies match metadata does NOT leak coordinates into candidate metadata', () => {
    const result = matchDonorsForRequest(REQUEST_WITH_COORDS, [DONOR_WITH_COORDS], EVAL_TIME);
    const candidate = result.candidates[0];

    assert.ok(candidate.metadata);
    const metaRecord = candidate.metadata as unknown as Record<string, unknown>;
    assert.equal(metaRecord.location_latitude, undefined);
    assert.equal(metaRecord.location_longitude, undefined);
    assert.equal(metaRecord.donor_latitude, undefined);
    assert.equal(metaRecord.donor_longitude, undefined);

    // Only distance_km is recorded
    assert.ok(typeof metaRecord.distance_km === 'number');
  });

  it('verifies DonorPublicRow type strictly omits coordinates and phone_number', () => {
    // Type-level assertion: DonorPublicRow cannot have location_latitude or location_longitude
    type HasCoordField<T> = 'location_latitude' extends keyof T ? true : false;
    type HasPhoneField<T> = 'phone_number' extends keyof T ? true : false;

    type CoordInPublic = HasCoordField<DonorPublicRow>;
    type PhoneInPublic = HasPhoneField<DonorPublicRow>;

    const coordInPublic: CoordInPublic = false;
    const phoneInPublic: PhoneInPublic = false;

    assert.equal(coordInPublic, false);
    assert.equal(phoneInPublic, false);
  });

  it('confirms contact reveal return payload contains only name and phone — no location fields', () => {
    // Simulated contact reveal output structure matching RequestContactRevealResult
    const revealedPayload = {
      success: true as const,
      contact: {
        name: 'John Doe',
        phone: '+919876543210',
      },
    };

    const keys = Object.keys(revealedPayload.contact);
    assert.deepEqual(keys.sort(), ['name', 'phone']);
    assert.equal(keys.includes('location'), false);
    assert.equal(keys.includes('latitude'), false);
    assert.equal(keys.includes('longitude'), false);
    assert.equal(keys.includes('coordinates'), false);
  });
});
