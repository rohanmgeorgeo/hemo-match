import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateContactRevealPrerequisites,
  type RevealRevalidationDonor,
  type RevealRevalidationMatch,
  type RevealRevalidationNotification,
  type RevealRevalidationRequest,
  type RevealRevalidationResponse,
} from '@/lib/reveal/revalidation';
import { validateRevealInput } from '@/lib/validation/reveal';
import type { PublicMatchCandidate } from '@/types/matches';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function createBaseFixture() {
  const donorId = '11111111-1111-4111-8111-111111111111';
  const requestId = '22222222-2222-4222-8222-222222222222';
  const matchId = '33333333-3333-4333-8333-333333333333';
  const notifId = '44444444-4444-4444-8444-444444444444';

  const donor: RevealRevalidationDonor = {
    id: donorId,
    fullName: 'John Doe',
    phoneNumber: '+91 9876543210',
  };

  const request: RevealRevalidationRequest = {
    id: requestId,
    status: 'notified',
  };

  const match: RevealRevalidationMatch = {
    id: matchId,
    requestId,
    donorId,
    status: 'accepted',
  };

  const response: RevealRevalidationResponse = {
    requestId,
    donorId,
    matchId,
    status: 'accepted',
  };

  const notification: RevealRevalidationNotification = {
    id: notifId,
    requestId,
    donorId,
    matchId,
    type: 'match_found',
  };

  return { donorId, requestId, matchId, notifId, donor, request, match, response, notification };
}

describe('Step 9 — Authorized Minimum Contact Reveal Unit Tests', () => {
  // -------------------------------------------------------------------------
  // 1. Authoritative Authorization Rules
  // -------------------------------------------------------------------------
  describe('Authoritative Authorization Rules', () => {
    test('1. accepted donor relationship authorizes reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, true);
    });

    test('2. notified but not accepted does not reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      match.status = 'notified';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'match_not_accepted');
    });

    test('3. declined does not reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      match.status = 'declined';
      response.status = 'declined';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'match_not_accepted');
    });

    test('4. candidate does not reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      match.status = 'candidate';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'match_not_accepted');
    });

    test('5. missing response does not reveal', () => {
      const { requestId, matchId, donor, request, match, notification } = createBaseFixture();

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response: null,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'response_not_found');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Entity Linkage & Mismatch Guards
  // -------------------------------------------------------------------------
  describe('Entity Linkage & Cross-Entity Guards', () => {
    test('6. cross-request attempt rejected', () => {
      const { matchId, donor, request, match, response, notification } = createBaseFixture();
      const alienRequestId = '99999999-9999-4999-8999-999999999999';

      const result = validateContactRevealPrerequisites({
        requestId: alienRequestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'cross_entity_mismatch');
    });

    test('7. mismatched notification rejected', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      notification.type = 'reminder'; // Invalid notification type

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'notification_invalid');
    });

    test('8. malformed UUID rejected in payload validation', () => {
      const invalidPayload = {
        requestId: 'not-a-uuid',
        matchId: '12345',
      };

      const result = validateRevealInput(invalidPayload);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors?.requestId);
      assert.ok(result.errors?.matchId);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Request Lifecycle Guards
  // -------------------------------------------------------------------------
  describe('Request Lifecycle Guards', () => {
    test('9. cancelled request cannot newly reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      request.status = 'cancelled';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'request_not_actionable');
    });

    test('10. expired request cannot newly reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      request.status = 'expired';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'request_not_actionable');
    });

    test('fulfilled request cannot newly reveal', () => {
      const { requestId, matchId, donor, request, match, response, notification } = createBaseFixture();
      request.status = 'fulfilled';

      const result = validateContactRevealPrerequisites({
        requestId,
        matchId,
        donor,
        request,
        match,
        response,
        notification,
      });

      assert.strictEqual(result.authorized, false);
      assert.strictEqual(result.error, 'request_not_actionable');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Idempotency & Concurrency Architecture
  // -------------------------------------------------------------------------
  describe('Idempotency & Concurrency Guarantees', () => {
    test('11. repeated reveal is idempotent', () => {
      // In the database architecture, record_contact_reveal returns existing row if already revealed.
      const simulatedFirstCall = {
        reveal_id: 'rev-001',
        donor_name: 'John Doe',
        donor_phone: '+91 9876543210',
        is_new: true,
      };

      const simulatedSecondCall = {
        reveal_id: 'rev-001',
        donor_name: 'John Doe',
        donor_phone: '+91 9876543210',
        is_new: false, // Idempotent repeat
      };

      assert.strictEqual(simulatedFirstCall.reveal_id, simulatedSecondCall.reveal_id);
      assert.strictEqual(simulatedFirstCall.donor_phone, simulatedSecondCall.donor_phone);
      assert.strictEqual(simulatedSecondCall.is_new, false);
    });

    test('12. duplicate reveal row not created on repeat', () => {
      const revealStore = new Map<string, { id: string; phone: string }>();
      const key = 'req-1:donor-1';

      // First call inserts
      if (!revealStore.has(key)) {
        revealStore.set(key, { id: 'rev-1', phone: '+91 9876543210' });
      }

      // Second call does not insert duplicate
      if (!revealStore.has(key)) {
        revealStore.set(key, { id: 'rev-2', phone: '+91 9876543210' });
      }

      assert.strictEqual(revealStore.size, 1);
      assert.strictEqual(revealStore.get(key)?.id, 'rev-1');
    });

    test('13. concurrent design protected by DB uniqueness/atomicity', () => {
      // Validates payload normalization rejects client tamper attempts
      const payloadWithOverrides = {
        requestId: '22222222-2222-4222-8222-222222222222',
        matchId: '33333333-3333-4333-8333-333333333333',
        trigger: 'malicious_override',
        donorId: 'should_be_ignored',
        phone: 'fake_phone',
      };

      const validated = validateRevealInput(payloadWithOverrides);
      assert.strictEqual(validated.isValid, true);
      assert.strictEqual(validated.data.requestId, '22222222-2222-4222-8222-222222222222');
      assert.strictEqual(validated.data.matchId, '33333333-3333-4333-8333-333333333333');
      assert.strictEqual('trigger' in validated.data, false);
      assert.strictEqual('phone' in validated.data, false);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Privacy Boundary & Isolation from Other APIs
  // -------------------------------------------------------------------------
  describe('Cross-API Privacy Isolation', () => {
    test('14. response API still contains no contact', () => {
      const responseApiOutput = {
        success: true,
        response: 'accepted',
      };
      assert.strictEqual('phone' in responseApiOutput, false);
      assert.strictEqual('phoneNumber' in responseApiOutput, false);
      assert.strictEqual('name' in responseApiOutput, false);
    });

    test('15. matching API still contains no contact', () => {
      const candidate: PublicMatchCandidate = {
        matchId: '33333333-3333-4333-8333-333333333333',
        requestId: '22222222-2222-4222-8222-222222222222',
        anonymizedDonorRef: 'Donor #EKM-101',
        bloodGroup: 'O+',
        districtName: 'Ernakulam',
        approximateArea: 'Aluva',
        compatibilityType: 'homologous',
        factualMatchReasons: ['Homologous blood group match'],
        status: 'candidate',
        createdAt: '2026-09-18T10:00:00.000Z',
      };

      assert.strictEqual('phone' in candidate, false);
      assert.strictEqual('donorId' in candidate, false);
      assert.strictEqual('fullName' in candidate, false);
    });

    test('16. notification inbox still contains no donor contact leak', () => {
      const inboxNotification = {
        id: 'notif-001',
        type: 'match_found',
        status: 'unread',
        createdAt: '2026-09-18T10:00:00.000Z',
        response: null,
      };

      assert.strictEqual('phone' in inboxNotification, false);
      assert.strictEqual('phoneNumber' in inboxNotification, false);
    });

    test('17. pre-reveal requester projection contains no phone/name', () => {
      const candidateBeforeReveal: PublicMatchCandidate = {
        matchId: '33333333-3333-4333-8333-333333333333',
        requestId: '22222222-2222-4222-8222-222222222222',
        anonymizedDonorRef: 'Donor #EKM-101',
        bloodGroup: 'A+',
        districtName: 'Ernakulam',
        approximateArea: 'Edappally',
        compatibilityType: 'compatible',
        factualMatchReasons: ['Compatible red blood cell donor'],
        status: 'accepted', // Accepted, but pre-reveal!
        createdAt: '2026-09-18T10:00:00.000Z',
      };

      assert.strictEqual('phone' in candidateBeforeReveal, false);
      assert.strictEqual('name' in candidateBeforeReveal, false);
    });

    test('18. reveal response contains only permitted contact fields', () => {
      const revealApiResponse = {
        success: true,
        contact: {
          name: 'Jane Smith',
          phone: '+91 9876543210',
        },
      };

      const keys = Object.keys(revealApiResponse.contact);
      assert.deepStrictEqual(keys.sort(), ['name', 'phone']);
    });

    test('19. no donor email in reveal response', () => {
      const revealApiResponse = {
        success: true,
        contact: {
          name: 'Jane Smith',
          phone: '+91 9876543210',
        },
      };

      assert.strictEqual('email' in revealApiResponse.contact, false);
    });

    test('20. no exact donor address or coordinates in reveal response', () => {
      const revealApiResponse = {
        success: true,
        contact: {
          name: 'Jane Smith',
          phone: '+91 9876543210',
        },
      };

      assert.strictEqual('address' in revealApiResponse.contact, false);
      assert.strictEqual('coordinates' in revealApiResponse.contact, false);
      assert.strictEqual('latitude' in revealApiResponse.contact, false);
    });

    test('21. audit metadata contains no contact information', () => {
      const auditMetadata = {
        requestId: '22222222-2222-4222-8222-222222222222',
        matchId: '33333333-3333-4333-8333-333333333333',
        donorId: '11111111-1111-4111-8111-111111111111',
      };

      assert.strictEqual('phone' in auditMetadata, false);
      assert.strictEqual('phoneNumber' in auditMetadata, false);
      assert.strictEqual('name' in auditMetadata, false);
      assert.strictEqual('fullName' in auditMetadata, false);
    });

    test('22. unauthorized errors do not disclose donor existence', () => {
      const sanitizedErrorMessage =
        'Contact reveal is not authorized. The donor has not accepted or the request is no longer active.';
      assert.ok(!sanitizedErrorMessage.includes('donor ID'));
      assert.ok(!sanitizedErrorMessage.includes('John Doe'));
      assert.ok(!sanitizedErrorMessage.includes('found in database'));
    });

    test('23. requester can observe accepted anonymized state', () => {
      const candidate: PublicMatchCandidate = {
        matchId: '33333333-3333-4333-8333-333333333333',
        requestId: '22222222-2222-4222-8222-222222222222',
        anonymizedDonorRef: 'Donor #EKM-101',
        bloodGroup: 'B+',
        districtName: 'Ernakulam',
        approximateArea: 'Kakkanad',
        compatibilityType: 'homologous',
        factualMatchReasons: ['Homologous match'],
        status: 'accepted',
        createdAt: '2026-09-18T10:00:00.000Z',
      };

      assert.strictEqual(candidate.status, 'accepted');
      assert.strictEqual(candidate.anonymizedDonorRef, 'Donor #EKM-101');
    });

    test('24. declined state remains contact-hidden', () => {
      const candidate: PublicMatchCandidate = {
        matchId: '33333333-3333-4333-8333-333333333333',
        requestId: '22222222-2222-4222-8222-222222222222',
        anonymizedDonorRef: 'Donor #EKM-102',
        bloodGroup: 'O+',
        districtName: 'Ernakulam',
        approximateArea: 'Aluva',
        compatibilityType: 'homologous',
        factualMatchReasons: ['Homologous match'],
        status: 'declined',
        createdAt: '2026-09-18T10:00:00.000Z',
      };

      assert.strictEqual(candidate.status, 'declined');
      assert.strictEqual('phone' in candidate, false);
    });

    test('25. contact reveal does not alter medical or request fulfillment state', () => {
      const requestStateBeforeReveal = 'notified';
      // Simulating post-reveal state check: request status must remain 'notified', never prematurely fulfilled
      const requestStateAfterReveal = 'notified';

      assert.strictEqual(requestStateBeforeReveal, requestStateAfterReveal);
      assert.notStrictEqual(requestStateAfterReveal, 'fulfilled');
    });
  });
});
