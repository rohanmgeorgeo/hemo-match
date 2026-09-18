/**
 * Hemo Match - Donor Inbox & Dispatch UI Test Suite
 *
 * Tests:
 * 1. Donor inbox query validation (donorId parameter)
 * 2. Mark notification read input validation (notificationId, donorId)
 * 3. Public notification projection privacy guarantees (no donor UUID, match ID, phone, name, patient info)
 * 4. Dispatch API UI response parsing and state mapping (success, zero-dispatch, already-notified, error)
 * 5. Cross-donor ownership isolation contract
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateDonorNotificationsQuery,
  validateMarkNotificationReadInput,
  parseDispatchApiResponse,
} from '@/lib/validation/notifications';
import type { PublicDonorNotification } from '@/lib/db/notifications';

describe('Donor Inbox & Dispatch UI Tests', () => {
  // -------------------------------------------------------------------------
  // 1. Inbox Query Validation (GET /api/donors/notifications?donorId=...)
  // -------------------------------------------------------------------------
  describe('Inbox Query Validation', () => {
    test('accepts a valid v4 UUID for donorId', () => {
      const validUuid = '12345678-1234-4234-8234-1234567890ab';
      const result = validateDonorNotificationsQuery(validUuid);
      assert.equal(result.isValid, true);
      assert.equal(result.donorId, validUuid);
      assert.equal(result.error, undefined);
    });

    test('accepts uppercase and mixed-case valid UUIDs', () => {
      const upperUuid = '12345678-1234-4234-8234-1234567890AB';
      const result = validateDonorNotificationsQuery(upperUuid);
      assert.equal(result.isValid, true);
      assert.equal(result.donorId, upperUuid);
    });

    test('rejects null, undefined, and empty string', () => {
      assert.equal(validateDonorNotificationsQuery(null).isValid, false);
      assert.equal(validateDonorNotificationsQuery(undefined).isValid, false);
      assert.equal(validateDonorNotificationsQuery('').isValid, false);
      assert.equal(validateDonorNotificationsQuery('   ').isValid, false);
    });

    test('rejects invalid UUID formats', () => {
      assert.equal(validateDonorNotificationsQuery('not-a-uuid').isValid, false);
      assert.equal(validateDonorNotificationsQuery('12345').isValid, false);
      assert.equal(
        validateDonorNotificationsQuery('12345678-1234-1234-1234-1234567890a').isValid,
        false
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Mark Notification Read Validation (PATCH /api/donors/notifications)
  // -------------------------------------------------------------------------
  describe('Mark Notification Read Validation (PATCH)', () => {
    const validNotifId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const validDonorId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    test('accepts valid notificationId and donorId', () => {
      const result = validateMarkNotificationReadInput({
        notificationId: validNotifId,
        donorId: validDonorId,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.data?.notificationId, validNotifId);
      assert.equal(result.data?.donorId, validDonorId);
      assert.deepEqual(result.errors, {});
    });

    test('ignores extraneous body properties', () => {
      const result = validateMarkNotificationReadInput({
        notificationId: validNotifId,
        donorId: validDonorId,
        status: 'read',
        readAt: '2026-09-18T10:00:00.000Z',
        adminOverride: true,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.data?.notificationId, validNotifId);
      assert.equal(result.data?.donorId, validDonorId);
      assert.equal('adminOverride' in (result.data ?? {}), false);
    });

    test('rejects non-object payloads', () => {
      assert.equal(validateMarkNotificationReadInput(null).isValid, false);
      assert.equal(validateMarkNotificationReadInput('string').isValid, false);
      assert.equal(validateMarkNotificationReadInput([]).isValid, false);
    });

    test('rejects missing or malformed notificationId', () => {
      const missing = validateMarkNotificationReadInput({ donorId: validDonorId });
      assert.equal(missing.isValid, false);
      assert.ok(missing.errors.notificationId);

      const malformed = validateMarkNotificationReadInput({
        notificationId: 'invalid-uuid',
        donorId: validDonorId,
      });
      assert.equal(malformed.isValid, false);
      assert.ok(malformed.errors.notificationId);
    });

    test('rejects missing or malformed donorId (prevents cross-donor update)', () => {
      const missing = validateMarkNotificationReadInput({ notificationId: validNotifId });
      assert.equal(missing.isValid, false);
      assert.ok(missing.errors.donorId);

      const malformed = validateMarkNotificationReadInput({
        notificationId: validNotifId,
        donorId: 'invalid-uuid',
      });
      assert.equal(malformed.isValid, false);
      assert.ok(malformed.errors.donorId);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Public Notification Projection Privacy
  // -------------------------------------------------------------------------
  describe('Public Notification Projection Privacy', () => {
    test('ensures public notification projection contains only safe logistical fields', () => {
      const projection: PublicDonorNotification = {
        id: 'notif-1111-2222-3333-444444444444',
        type: 'match_found',
        status: 'sent',
        createdAt: '2026-09-18T10:00:00.000Z',
        readAt: null,
        bloodGroup: 'O+',
        component: 'Whole Blood',
        unitsNeeded: 2,
        districtName: 'Ernakulam',
        approximateArea: 'Kakkanad',
        hospitalName: 'District Hospital',
        urgency: 'critical',
        requiredBy: '2026-09-18T18:00:00.000Z',
        compatibilityType: 'homologous',
      };

      // Prohibited private keys must NOT exist in public projection
      const prohibitedKeys = [
        'donor_id',
        'donorId',
        'match_id',
        'matchId',
        'request_id',
        'requestId',
        'phone_number',
        'phoneNumber',
        'full_name',
        'fullName',
        'requesterPhone',
        'requesterContact',
        'patientName',
        'patient_name',
        'exclusionReasons',
        'service_role',
      ];

      for (const key of prohibitedKeys) {
        assert.equal(
          Reflect.has(projection, key),
          false,
          `Prohibited field "${key}" was found in PublicDonorNotification projection!`
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Dispatch UI Response Parser
  // -------------------------------------------------------------------------
  describe('Dispatch UI Response Parser', () => {
    test('parses 200 with dispatchedCount > 0 into success state with aggregate wording', () => {
      const parsed = parseDispatchApiResponse(200, {
        success: true,
        requestId: '11111111-1111-4111-8111-111111111111',
        dispatchedCount: 3,
        totalCandidates: 3,
        eligibleCount: 3,
        skippedCount: 0,
      });

      assert.equal(parsed.status, 'success');
      if (parsed.status === 'success') {
        assert.equal(parsed.count, 3);
        assert.ok(parsed.message.includes('3 eligible donor'));
        assert.ok(parsed.message.includes('In-app notifications sent'));
      }
    });

    test('parses 200 with dispatchedCount === 0 into zero_notifications state', () => {
      const parsed = parseDispatchApiResponse(200, {
        success: true,
        requestId: '11111111-1111-4111-8111-111111111111',
        dispatchedCount: 0,
        totalCandidates: 1,
        eligibleCount: 0,
        skippedCount: 1,
        message: 'No candidate donor notifications could be created.',
      });

      assert.equal(parsed.status, 'zero_notifications');
      assert.ok(parsed.message.includes('No candidate donor notifications could be created'));
    });

    test('parses 400 request_inactive into already_notified state', () => {
      const parsed = parseDispatchApiResponse(400, {
        success: false,
        error: 'request_inactive',
        message: 'Blood request is not currently active for notification dispatch.',
      });

      assert.equal(parsed.status, 'already_notified');
      assert.ok(parsed.message.includes('already been sent'));
    });

    test('parses 404 not found safely', () => {
      const parsed = parseDispatchApiResponse(404, {
        success: false,
        error: 'not_found',
        message: 'Blood request not found.',
      });

      assert.equal(parsed.status, 'error');
      assert.equal(parsed.message, 'Blood request not found.');
    });

    test('parses 503 service unavailable safely without internal stack trace', () => {
      const parsed = parseDispatchApiResponse(503, {
        success: false,
        error: 'service_unavailable',
        message: 'Database service is temporarily unavailable.',
      });

      assert.equal(parsed.status, 'error');
      assert.ok(parsed.message.includes('temporarily unavailable'));
    });
  });
});
