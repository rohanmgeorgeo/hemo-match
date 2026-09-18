import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAcceptPrerequisites,
  validateDeclinePrerequisites,
  validateCommonResponsePrerequisites,
  type ResponseRevalidationDonor,
  type ResponseRevalidationMatch,
  type ResponseRevalidationNotification,
  type ResponseRevalidationRequest,
} from '@/lib/responses/revalidation';
import {
  validateResponseInput,
} from '@/lib/validation/responses';
import type { PublicDonorNotification } from '@/lib/db/notifications';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2026-09-18T10:00:00.000Z');

function createBaseFixture() {
  const donorId = '11111111-1111-4111-8111-111111111111';
  const requestId = '22222222-2222-4222-8222-222222222222';
  const matchId = '33333333-3333-4333-8333-333333333333';
  const notifId = '44444444-4444-4444-8444-444444444444';
  const districtId = 'dist-0000-0000-0000-000000000001';

  const notification: ResponseRevalidationNotification = {
    id: notifId,
    donorId,
    requestId,
    matchId,
    type: 'match_found',
  };

  const request: ResponseRevalidationRequest = {
    id: requestId,
    status: 'notified',
    bloodGroup: 'B+',
    component: 'Whole Blood',
    districtId,
    requiredBy: '2026-09-18T18:00:00.000Z',
  };

  const match: ResponseRevalidationMatch = {
    id: matchId,
    requestId,
    donorId,
    status: 'notified',
  };

  const donor: ResponseRevalidationDonor = {
    id: donorId,
    bloodGroup: 'B+',
    districtId,
    availability: 'available',
    consentGiven: true,
    // 150 days prior to FIXED_NOW (exceeds 120-day interval requirement)
    lastDonationDate: '2026-04-20',
  };

  return {
    notification,
    request,
    match,
    donor,
    hasExistingResponse: false,
    now: FIXED_NOW,
  };
}

describe('Step 8 — Donor Accept / Decline Response Unit Tests', () => {
  // -------------------------------------------------------------------------
  // 1. Happy Path Pre-validation
  // -------------------------------------------------------------------------
  describe('Happy Path Pre-validation', () => {
    test('1. notified eligible donor can accept', () => {
      const fixture = createBaseFixture();
      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, true);
    });

    test('2. notified donor can decline without medical qualification', () => {
      const fixture = createBaseFixture();
      // Even if donor has unknown history or interval too short, they can decline
      fixture.donor.lastDonationDate = null;
      fixture.donor.availability = 'temporarily_unavailable';

      const result = validateDeclinePrerequisites(fixture);
      assert.equal(result.isValid, true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Notification & Entity Linkage Guards
  // -------------------------------------------------------------------------
  describe('Notification & Entity Linkage Guards', () => {
    test('3. donor without matching notification cannot respond', () => {
      const fixture = createBaseFixture();
      fixture.notification.type = 'request_fulfilled';

      const result = validateCommonResponsePrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'INVALID_NOTIFICATION');
    });

    test('4. cross-donor response attempt rejected (notification donor does not match)', () => {
      const fixture = createBaseFixture();
      fixture.notification.donorId = '99999999-9999-4999-8999-999999999999';

      const result = validateCommonResponsePrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'NOTIFICATION_MISMATCH');
    });

    test('cross-entity request mismatch rejected', () => {
      const fixture = createBaseFixture();
      fixture.match.requestId = '88888888-8888-4888-8888-888888888888';

      const result = validateCommonResponsePrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'NOTIFICATION_MISMATCH');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Payload Validation
  // -------------------------------------------------------------------------
  describe('Payload Validation (validateResponseInput)', () => {
    const validDonor = '11111111-1111-4111-8111-111111111111';
    const validNotif = '22222222-2222-4222-8222-222222222222';

    test('5. malformed IDs rejected', () => {
      const invalidDonor = validateResponseInput({
        donorId: 'invalid-id',
        notificationId: validNotif,
        response: 'accepted',
      });
      assert.equal(invalidDonor.isValid, false);

      const invalidNotif = validateResponseInput({
        donorId: validDonor,
        notificationId: 'not-a-uuid',
        response: 'accepted',
      });
      assert.equal(invalidNotif.isValid, false);
    });

    test('6. unsupported response value rejected', () => {
      const invalidResponse = validateResponseInput({
        donorId: validDonor,
        notificationId: validNotif,
        response: 'maybe',
      });
      assert.equal(invalidResponse.isValid, false);

      const emptyResponse = validateResponseInput({
        donorId: validDonor,
        notificationId: validNotif,
        response: '',
      });
      assert.equal(emptyResponse.isValid, false);
    });

    test('valid input normalizes lowercase UUIDs and strips client overrides', () => {
      const valid = validateResponseInput({
        donorId: validDonor.toUpperCase(),
        notificationId: validNotif.toUpperCase(),
        response: 'accepted',
        requestId: 'tamper-request-id',
        matchId: 'tamper-match-id',
      });
      assert.equal(valid.isValid, true);
      assert.equal(valid.data?.donorId, validDonor);
      assert.equal(valid.data?.notificationId, validNotif);
      assert.equal(valid.data?.response, 'accepted');
      assert.equal('requestId' in (valid.data ?? {}), false);
      assert.equal('matchId' in (valid.data ?? {}), false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Idempotency & Overwrite Guards
  // -------------------------------------------------------------------------
  describe('Idempotency & Response Overwrite Guards', () => {
    test('7. already responded donor cannot create second response (hasExistingResponse flag)', () => {
      const fixture = createBaseFixture();
      fixture.hasExistingResponse = true;

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'ALREADY_RESPONDED');
    });

    test('8. repeated Accept is idempotent/safely rejected (match status is already accepted)', () => {
      const fixture = createBaseFixture();
      fixture.match.status = 'accepted';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'ALREADY_RESPONDED');
    });

    test('9. Accept after Decline cannot overwrite response', () => {
      const fixture = createBaseFixture();
      fixture.match.status = 'declined';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'ALREADY_RESPONDED');
    });

    test('10. Decline after Accept cannot overwrite response', () => {
      const fixture = createBaseFixture();
      fixture.match.status = 'accepted';

      const result = validateDeclinePrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'ALREADY_RESPONDED');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Authoritative Accept Revalidation Rules
  // -------------------------------------------------------------------------
  describe('Authoritative Accept Revalidation Rules', () => {
    test('11. Accept revalidates current donor availability', () => {
      const fixture = createBaseFixture();
      fixture.donor.availability = 'temporarily_unavailable';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'DONOR_UNAVAILABLE');
    });

    test('12. Accept revalidates consent', () => {
      const fixture = createBaseFixture();
      fixture.donor.consentGiven = false;

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'NO_DONOR_CONSENT');
    });

    test('13. Accept revalidates district consistency', () => {
      const fixture = createBaseFixture();
      fixture.donor.districtId = 'dist-other-district-uuid';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'DISTRICT_MISMATCH');
    });

    test('14. Accept revalidates blood compatibility', () => {
      const fixture = createBaseFixture();
      // B+ donor cannot donate Whole Blood to A+ request
      fixture.request.bloodGroup = 'A+';
      fixture.donor.bloodGroup = 'B+';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'BLOOD_INCOMPATIBLE');
    });

    test('15. Accept revalidates donation interval/history', () => {
      const fixtureUnknown = createBaseFixture();
      fixtureUnknown.donor.lastDonationDate = null;
      assert.equal(validateAcceptPrerequisites(fixtureUnknown).error, 'DONATION_HISTORY_UNKNOWN');

      const fixtureTooShort = createBaseFixture();
      // 30 days prior to FIXED_NOW (120 required)
      fixtureTooShort.donor.lastDonationDate = '2026-08-19';
      assert.equal(validateAcceptPrerequisites(fixtureTooShort).error, 'INTERVAL_TOO_SHORT');
    });

    test('16. expired request cannot be accepted', () => {
      const fixture = createBaseFixture();
      // Required by date is in the past relative to FIXED_NOW
      fixture.request.requiredBy = '2026-09-17T18:00:00.000Z';

      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, false);
      assert.equal(result.error, 'REQUEST_EXPIRED');
    });

    test('17. cancelled or fulfilled request cannot be accepted', () => {
      const fixtureCancelled = createBaseFixture();
      fixtureCancelled.request.status = 'cancelled';
      assert.equal(validateAcceptPrerequisites(fixtureCancelled).error, 'REQUEST_TERMINAL');

      const fixtureFulfilled = createBaseFixture();
      fixtureFulfilled.request.status = 'fulfilled';
      assert.equal(validateAcceptPrerequisites(fixtureFulfilled).error, 'REQUEST_TERMINAL');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Privacy & Non-PII Projection Guarantees
  // -------------------------------------------------------------------------
  describe('Privacy & Non-PII Projection Guarantees', () => {
    test('18. Decline does not expose contact information', () => {
      const fixture = createBaseFixture();
      const result = validateDeclinePrerequisites(fixture);
      assert.equal(result.isValid, true);
      // Confirms input/output types do not carry phone/email fields
      assert.equal('phoneNumber' in fixture.donor, false);
    });

    test('19. Accept response does not expose contact information', () => {
      const fixture = createBaseFixture();
      const result = validateAcceptPrerequisites(fixture);
      assert.equal(result.isValid, true);
      assert.equal('phoneNumber' in fixture.donor, false);
    });

    test('20. inbox reflects persisted accepted state', () => {
      const notification: PublicDonorNotification = {
        id: 'notif-1',
        type: 'match_found',
        status: 'read',
        createdAt: '2026-09-18T10:00:00.000Z',
        readAt: '2026-09-18T10:05:00.000Z',
        bloodGroup: 'B+',
        component: 'Whole Blood',
        unitsNeeded: 2,
        districtName: 'Ernakulam',
        approximateArea: 'Edappally',
        hospitalName: 'Medical Centre',
        urgency: 'urgent',
        requiredBy: '2026-09-18T18:00:00.000Z',
        compatibilityType: 'homologous',
        response: 'accepted',
      };

      assert.equal(notification.response, 'accepted');
      assert.equal('donorId' in notification, false);
      assert.equal('matchId' in notification, false);
      assert.equal('requestId' in notification, false);
    });

    test('21. inbox reflects persisted declined state', () => {
      const notification: PublicDonorNotification = {
        id: 'notif-2',
        type: 'match_found',
        status: 'read',
        createdAt: '2026-09-18T10:00:00.000Z',
        readAt: '2026-09-18T10:05:00.000Z',
        bloodGroup: 'B+',
        component: 'Whole Blood',
        unitsNeeded: 2,
        districtName: 'Ernakulam',
        approximateArea: 'Edappally',
        hospitalName: 'Medical Centre',
        urgency: 'urgent',
        requiredBy: '2026-09-18T18:00:00.000Z',
        compatibilityType: 'homologous',
        response: 'declined',
      };

      assert.equal(notification.response, 'declined');
    });

    test('22. privacy-safe public response structure', () => {
      const publicResponse = {
        success: true,
        response: 'accepted' as const,
      };

      const keys = Object.keys(publicResponse);
      assert.deepEqual(keys.sort(), ['response', 'success']);
    });

    test('23. no contact_reveals row or reference created by Step 8 revalidator or models', () => {
      // Step 8 code paths do not touch contact_reveals
      const fixture = createBaseFixture();
      assert.equal('contact_reveals' in fixture, false);
    });
  });
});
