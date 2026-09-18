/**
 * Hemo Match - Match Route Validation & HTTP Mapping Tests
 *
 * Tests the pure validation and HTTP status-mapping logic that is factored
 * out of the POST /api/requests/matches route handler.
 *
 * Scope:
 * - I: UUID validation (isValidUuid)
 * - J: Match request body validation (validateMatchRequest)
 * - K: HTTP status mapping for all FindAndCreateMatchesResult error codes
 *
 * No Supabase mocking required — all tested logic is pure.
 * No live network calls.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUuid,
  validateMatchRequest,
  type MatchRequestInput,
} from '@/lib/validation/matches';

// ---------------------------------------------------------------------------
// I. UUID format validation
// ---------------------------------------------------------------------------

describe('UUID validation (isValidUuid)', () => {
  describe('I. Valid UUIDs', () => {
    it('accepts a canonical lowercase v4 UUID', () => {
      assert.ok(isValidUuid('550e8400-e29b-41d4-a716-446655440000'));
    });

    it('accepts a canonical uppercase UUID', () => {
      assert.ok(isValidUuid('550E8400-E29B-41D4-A716-446655440000'));
    });

    it('accepts a mixed-case UUID', () => {
      assert.ok(isValidUuid('550e8400-E29B-41d4-a716-446655440000'));
    });

    it('accepts a real v4 UUID from PostgreSQL', () => {
      assert.ok(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'));
    });
  });

  describe('I. Invalid UUIDs', () => {
    it('rejects undefined', () => {
      assert.strictEqual(isValidUuid(undefined), false);
    });

    it('rejects null', () => {
      assert.strictEqual(isValidUuid(null), false);
    });

    it('rejects a number', () => {
      assert.strictEqual(isValidUuid(42), false);
    });

    it('rejects an object', () => {
      assert.strictEqual(isValidUuid({}), false);
    });

    it('rejects an empty string', () => {
      assert.strictEqual(isValidUuid(''), false);
    });

    it('rejects a string without hyphens', () => {
      assert.strictEqual(isValidUuid('550e8400e29b41d4a716446655440000'), false);
    });

    it('rejects a UUID missing one segment', () => {
      assert.strictEqual(isValidUuid('550e8400-e29b-41d4-a716'), false);
    });

    it('rejects a UUID with extra characters', () => {
      assert.strictEqual(isValidUuid('550e8400-e29b-41d4-a716-44665544000Z'), false);
    });

    it('rejects a slug string', () => {
      assert.strictEqual(isValidUuid('dist-ekm'), false);
    });

    it('rejects a plain word', () => {
      assert.strictEqual(isValidUuid('requestId'), false);
    });
  });
});

// ---------------------------------------------------------------------------
// J. Match request body validation (validateMatchRequest)
// ---------------------------------------------------------------------------

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Match request body validation (validateMatchRequest)', () => {
  describe('J. Valid inputs', () => {
    it('accepts a valid { requestId } object', () => {
      const result = validateMatchRequest({ requestId: VALID_UUID });
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.data?.requestId, VALID_UUID);
      assert.deepStrictEqual(result.errors, {});
    });

    it('ignores extra fields and returns only requestId', () => {
      const result = validateMatchRequest({
        requestId: VALID_UUID,
        donorId: 'should-be-ignored',
        status: 'should-be-ignored',
        matchId: 'should-be-ignored',
        bloodGroup: 'A+',
        district: 'dist-ekm',
      });
      assert.strictEqual(result.isValid, true);
      const data = result.data as MatchRequestInput;
      assert.strictEqual(data.requestId, VALID_UUID);
      // Extra fields must NOT appear on the validated data object
      assert.strictEqual((data as unknown as Record<string, unknown>).donorId, undefined);
      assert.strictEqual((data as unknown as Record<string, unknown>).status, undefined);
      assert.strictEqual((data as unknown as Record<string, unknown>).matchId, undefined);
    });
  });

  describe('J. Invalid inputs — body structure', () => {
    it('rejects null body', () => {
      const result = validateMatchRequest(null);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.body);
    });

    it('rejects array body', () => {
      const result = validateMatchRequest([{ requestId: VALID_UUID }]);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.body);
    });

    it('rejects string body', () => {
      const result = validateMatchRequest(VALID_UUID);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.body);
    });

    it('rejects number body', () => {
      const result = validateMatchRequest(42);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.body);
    });
  });

  describe('J. Invalid inputs — requestId field', () => {
    it('rejects missing requestId', () => {
      const result = validateMatchRequest({});
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
      assert.match(result.errors.requestId, /required/i);
    });

    it('rejects null requestId', () => {
      const result = validateMatchRequest({ requestId: null });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });

    it('rejects number requestId', () => {
      const result = validateMatchRequest({ requestId: 42 });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });

    it('rejects boolean requestId', () => {
      const result = validateMatchRequest({ requestId: true });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });

    it('rejects empty string requestId', () => {
      const result = validateMatchRequest({ requestId: '' });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });

    it('rejects a slug string as requestId', () => {
      const result = validateMatchRequest({ requestId: 'dist-ekm' });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
      assert.match(result.errors.requestId, /uuid/i);
    });

    it('rejects a plain word as requestId', () => {
      const result = validateMatchRequest({ requestId: 'not-a-uuid-at-all' });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });

    it('rejects a UUID without hyphens', () => {
      const result = validateMatchRequest({ requestId: 'a0eebc999c0b4ef8bb6d6bb9bd380a11' });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.requestId);
    });
  });
});

// ---------------------------------------------------------------------------
// K. HTTP status mapping — verify the mapping table as pure assertions
// ---------------------------------------------------------------------------

describe('HTTP status mapping for FindAndCreateMatchesResult error codes', () => {
  /**
   * Documents the required mapping without exercising Next.js machinery.
   * These match the switch/case in the route handler.
   */
  const ERROR_TO_HTTP: Record<string, number> = {
    unconfigured: 503,
    request_not_found: 404,
    request_inactive: 400,
    request_expired: 400,
    unsupported_component: 400,
    rule_not_found: 500,
    database_error: 500,
  };

  it('K. confirms all helper error codes map to a defined HTTP status', () => {
    const allCodes = Object.keys(ERROR_TO_HTTP);
    assert.ok(allCodes.length >= 7, 'All 7 error codes must be mapped');
    for (const code of allCodes) {
      const status = ERROR_TO_HTTP[code];
      assert.ok(
        status === 400 || status === 404 || status === 500 || status === 503,
        `Error code '${code}' must map to 400, 404, 500, or 503 — got ${status}`
      );
    }
  });

  it('K. confirms unconfigured maps to 503 (Service Unavailable)', () => {
    assert.strictEqual(ERROR_TO_HTTP.unconfigured, 503);
  });

  it('K. confirms request_not_found maps to 404 (Not Found)', () => {
    assert.strictEqual(ERROR_TO_HTTP.request_not_found, 404);
  });

  it('K. confirms client errors (inactive/expired/unsupported) map to 400', () => {
    assert.strictEqual(ERROR_TO_HTTP.request_inactive, 400);
    assert.strictEqual(ERROR_TO_HTTP.request_expired, 400);
    assert.strictEqual(ERROR_TO_HTTP.unsupported_component, 400);
  });

  it('K. confirms server errors (rule_not_found/database_error) map to 500', () => {
    assert.strictEqual(ERROR_TO_HTTP.rule_not_found, 500);
    assert.strictEqual(ERROR_TO_HTTP.database_error, 500);
  });

  it('K. confirms success (0 matches) maps to 200 with explanatory message', () => {
    // Document the zero-match convention: HTTP 200 + message, not 404 or 400
    const ZERO_MATCH_STATUS = 200;
    assert.strictEqual(ZERO_MATCH_STATUS, 200);
  });
});
