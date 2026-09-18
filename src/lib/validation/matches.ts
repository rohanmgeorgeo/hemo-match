/**
 * Hemo Match - Match Request Validation
 *
 * Pure, side-effect-free validator for POST /api/requests/matches input.
 * Validates that the request body contains exactly one field: a well-formed
 * UUID string for requestId.
 *
 * No Supabase imports. No database access. Usable in test environments
 * without any mocking.
 */

// ---------------------------------------------------------------------------
// UUID format
// ---------------------------------------------------------------------------

/**
 * RFC 4122 UUID v4 pattern (case-insensitive).
 * Accepts the canonical hyphenated 8-4-4-4-12 hex format.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Input / result types
// ---------------------------------------------------------------------------

export interface MatchRequestInput {
  requestId: string;
}

export interface MatchRequestValidationResult {
  isValid: boolean;
  data: MatchRequestInput | null;
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validates an unknown POST body for /api/requests/matches.
 *
 * Accepts:  { "requestId": "<UUID>" }
 * Rejects:  non-object, missing requestId, non-string requestId, malformed UUID.
 *
 * Only requestId is read. Any other fields in the body are ignored and never
 * passed downstream — client-supplied match IDs, donor IDs, statuses, blood
 * groups, and metadata are all silently discarded.
 *
 * @param body Raw parsed JSON from the request body.
 * @returns MatchRequestValidationResult
 */
export function validateMatchRequest(body: unknown): MatchRequestValidationResult {
  const errors: Record<string, string> = {};

  // Must be a plain object
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    errors.body = 'Request body must be a JSON object.';
    return { isValid: false, data: null, errors };
  }

  const raw = body as Record<string, unknown>;

  // requestId must be present
  if (!('requestId' in raw)) {
    errors.requestId = 'requestId is required.';
    return { isValid: false, data: null, errors };
  }

  // requestId must be a string
  if (typeof raw.requestId !== 'string') {
    errors.requestId = 'requestId must be a string.';
    return { isValid: false, data: null, errors };
  }

  // requestId must be a well-formed UUID
  if (!isValidUuid(raw.requestId)) {
    errors.requestId = 'requestId must be a valid UUID.';
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data: { requestId: raw.requestId },
    errors: {},
  };
}
