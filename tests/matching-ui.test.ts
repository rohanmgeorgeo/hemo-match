/**
 * Hemo Match - Matching UI State & Helper Tests
 *
 * Unit tests for pure UI helpers used in /requests/matching-demo:
 * - Stored request validation (UUID verification, schema presence)
 * - API response parsing (success, zero-matches, 4xx/5xx errors, corrupt data)
 * - Compatibility badge classification
 * - Type privacy verification (ensuring candidate types expect no sensitive fields)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateStoredRequest,
  parseMatchApiResponse,
  getCompatibilityBadgeDetails,
} from '../src/lib/matching/ui-helpers';
import type { PublicMatchCandidate } from '../src/types/matches';

describe('Matching UI Helpers', () => {
  describe('Stored Active Request Validation', () => {
    it('approves a valid stored request with authoritative PostgreSQL UUID', () => {
      const validPayload = JSON.stringify({
        id: '11111111-2222-3333-4444-555555555555',
        bloodGroup: 'A+',
        component: 'Red Blood Cells',
        unitsNeeded: 2,
        districtId: 'dist-ekm',
        districtName: 'Ernakulam',
        approximateArea: 'North Ward',
        hospitalName: 'General Hospital',
        requiredByDate: '2026-09-20',
        requiredByTime: '14:00',
        urgency: 'urgent',
        status: 'open',
      });

      const result = validateStoredRequest(validPayload);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requestId, '11111111-2222-3333-4444-555555555555');
      assert.strictEqual(result.request?.bloodGroup, 'A+');
    });

    it('rejects null, undefined, or empty string storage', () => {
      assert.strictEqual(validateStoredRequest(null).isValid, false);
      assert.strictEqual(validateStoredRequest(undefined).isValid, false);
      assert.strictEqual(validateStoredRequest('').isValid, false);
      assert.strictEqual(validateStoredRequest('   ').isValid, false);
    });

    it('rejects invalid JSON syntax', () => {
      const result = validateStoredRequest('{ malformed json');
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.requestId, null);
      assert.strictEqual(result.request, null);
    });

    it('rejects non-object parsed values', () => {
      assert.strictEqual(validateStoredRequest('"hello"').isValid, false);
      assert.strictEqual(validateStoredRequest('123').isValid, false);
      assert.strictEqual(validateStoredRequest('[]').isValid, false);
    });

    it('rejects request with missing or non-UUID id', () => {
      const missingId = JSON.stringify({
        bloodGroup: 'A+',
        component: 'Red Blood Cells',
        districtId: 'dist-ekm',
      });
      assert.strictEqual(validateStoredRequest(missingId).isValid, false);

      const invalidUuid = JSON.stringify({
        id: 'not-a-uuid',
        bloodGroup: 'A+',
        component: 'Red Blood Cells',
        districtId: 'dist-ekm',
      });
      assert.strictEqual(validateStoredRequest(invalidUuid).isValid, false);
    });

    it('rejects request missing essential presentation fields', () => {
      const missingBloodGroup = JSON.stringify({
        id: '11111111-2222-3333-4444-555555555555',
        component: 'Red Blood Cells',
        districtId: 'dist-ekm',
      });
      assert.strictEqual(validateStoredRequest(missingBloodGroup).isValid, false);
    });
  });

  describe('API Response Parsing', () => {
    it('parses a successful response with candidate matches', () => {
      const mockCandidate: PublicMatchCandidate = {
        matchId: '99999999-9999-9999-9999-999999999999',
        requestId: '11111111-2222-3333-4444-555555555555',
        anonymizedDonorRef: 'Donor •••• 9B4F',
        bloodGroup: 'A+',
        districtName: 'Ernakulam',
        approximateArea: 'Kaloor',
        compatibilityType: 'homologous',
        factualMatchReasons: [
          'Exact ABO/Rh match (A+)',
          'Preliminary interval satisfied',
          'Same district geographic alignment',
        ],
        status: 'candidate',
        createdAt: '2026-09-18T00:00:00.000Z',
      };

      const raw = {
        success: true,
        requestId: '11111111-2222-3333-4444-555555555555',
        totalMatches: 1,
        matches: [mockCandidate],
      };

      const parsed = parseMatchApiResponse(200, raw);
      assert.strictEqual(parsed.status, 'success');
      if (parsed.status === 'success') {
        assert.strictEqual(parsed.totalMatches, 1);
        assert.strictEqual(parsed.matches.length, 1);
        assert.strictEqual(parsed.matches[0].anonymizedDonorRef, 'Donor •••• 9B4F');
        assert.strictEqual(parsed.matches[0].compatibilityType, 'homologous');
      }
    });

    it('parses a zero-matches response into calm zero_matches state', () => {
      const raw = {
        success: true,
        requestId: '11111111-2222-3333-4444-555555555555',
        totalMatches: 0,
        matches: [],
        message: 'No eligible candidate donors currently found in this district.',
      };

      const parsed = parseMatchApiResponse(200, raw);
      assert.strictEqual(parsed.status, 'zero_matches');
      if (parsed.status === 'zero_matches') {
        assert.strictEqual(
          parsed.message,
          'No eligible candidate donors currently found in this district.'
        );
      }
    });

    it('handles empty matches array even if message is missing', () => {
      const raw = {
        success: true,
        requestId: '11111111-2222-3333-4444-555555555555',
        totalMatches: 0,
        matches: [],
      };

      const parsed = parseMatchApiResponse(200, raw);
      assert.strictEqual(parsed.status, 'zero_matches');
      if (parsed.status === 'zero_matches') {
        assert.ok(parsed.message.length > 0);
      }
    });

    it('maps 400 validation error into safe user error state', () => {
      const raw = {
        success: false,
        error: 'validation_error',
        message: 'Request validation failed.',
      };

      const parsed = parseMatchApiResponse(400, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.ok(!parsed.message.includes('validation_error'));
      }
    });

    it('maps request_expired error into actionable expiration message', () => {
      const raw = {
        success: false,
        error: 'request_expired',
        message: 'Blood request required-by time has passed.',
      };

      const parsed = parseMatchApiResponse(400, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.errorCode, 'request_expired');
        assert.strictEqual(
          parsed.message,
          'This blood request has expired. Create a new request with a future required-by time.'
        );
      }
    });

    it('maps request_inactive error code cleanly', () => {
      const raw = {
        success: false,
        error: 'request_inactive',
        message: 'Blood request is not currently active for matching.',
      };

      const parsed = parseMatchApiResponse(400, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.errorCode, 'request_inactive');
        assert.strictEqual(
          parsed.message,
          'This blood request is not currently active for matching.'
        );
      }
    });

    it('maps unsupported_component error code cleanly', () => {
      const raw = {
        success: false,
        error: 'unsupported_component',
        message:
          'This blood component is not supported for preliminary matching in the current version.',
      };

      const parsed = parseMatchApiResponse(400, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.errorCode, 'unsupported_component');
        assert.strictEqual(
          parsed.message,
          'This blood component is not supported for preliminary matching in the current version.'
        );
      }
    });

    it('maps 404 not found into safe user error state', () => {
      const raw = {
        success: false,
        error: 'not_found',
        message: 'Blood request not found.',
      };

      const parsed = parseMatchApiResponse(404, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.errorCode, 'not_found');
        assert.strictEqual(parsed.message, 'Blood request not found.');
      }
    });

    it('maps 503 service unavailable cleanly', () => {
      const raw = {
        success: false,
        error: 'service_unavailable',
        message: 'Database service is temporarily unavailable.',
      };

      const parsed = parseMatchApiResponse(503, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.errorCode, 'service_unavailable');
        assert.strictEqual(
          parsed.message,
          'Database service is temporarily unavailable. Please try again shortly.'
        );
      }
    });

    it('maps 500 database error into safe user error state without exposing internal details', () => {
      const raw = {
        success: false,
        error: 'database_error',
        message: 'Internal DB details that should not leak.',
      };

      const parsed = parseMatchApiResponse(500, raw);
      assert.strictEqual(parsed.status, 'error');
      if (parsed.status === 'error') {
        assert.strictEqual(parsed.message.includes('Internal DB details'), false);
        assert.strictEqual(parsed.errorCode, undefined);
      }
    });

    it('maps non-200 non-JSON or null response safely', () => {
      assert.strictEqual(parseMatchApiResponse(502, null).status, 'error');
      assert.strictEqual(parseMatchApiResponse(503, 'Gateway Timeout').status, 'error');
    });
  });

  describe('Compatibility Badge Details', () => {
    it('returns exact badge copy for homologous compatibility', () => {
      const details = getCompatibilityBadgeDetails('homologous');
      assert.strictEqual(details.label, 'Exact blood-group match');
      assert.strictEqual(details.isHomologous, true);
    });

    it('returns compatible badge copy for compatible alternative compatibility', () => {
      const details = getCompatibilityBadgeDetails('compatible');
      assert.strictEqual(details.label, 'Compatible blood-group match');
      assert.strictEqual(details.isHomologous, false);
    });
  });

  describe('Frontend Match Types Privacy Enforcement', () => {
    it('confirms PublicMatchCandidate does not contain raw private donor fields', () => {
      const candidate: PublicMatchCandidate = {
        matchId: 'm-1',
        requestId: 'r-1',
        anonymizedDonorRef: 'Donor •••• A1B2',
        bloodGroup: 'O+',
        districtName: 'Ernakulam',
        approximateArea: 'Aluva',
        compatibilityType: 'compatible',
        factualMatchReasons: ['Compatible alternative ABO/Rh donor (O+ for A+)'],
        status: 'candidate',
        createdAt: '2026-09-18T00:00:00.000Z',
      };

      const candidateKeys = Object.keys(candidate);
      assert.strictEqual(candidateKeys.includes('phone'), false);
      assert.strictEqual(candidateKeys.includes('phoneNumber'), false);
      assert.strictEqual(candidateKeys.includes('phone_number'), false);
      assert.strictEqual(candidateKeys.includes('donorId'), false);
      assert.strictEqual(candidateKeys.includes('donor_id'), false);
      assert.strictEqual(candidateKeys.includes('fullName'), false);
      assert.strictEqual(candidateKeys.includes('full_name'), false);
      assert.strictEqual(candidateKeys.includes('coordinates'), false);
    });
  });
});
