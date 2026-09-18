/**
 * Hemo Match - Contact Reveal Input Validation (Step 9)
 *
 * Strict validation for POST /api/requests/contact-reveal request payloads.
 *
 * ACCEPTED FIELDS:
 * - requestId: string (UUID) - authoritative request context
 * - matchId: string (UUID) - candidate match to reveal (primary identifier)
 * - notificationId: string (UUID) - optional alternative identifier for demo linkage
 *
 * REJECTED FIELDS / PRIVACY ENFORCEMENT:
 * - Client-supplied donor phone numbers, names, or contact data are strictly rejected.
 * - Client-supplied donor IDs, match statuses, or response statuses are stripped/ignored.
 * - Malformed UUIDs or invalid JSON payloads return immediate validation errors.
 */

import { isValidUuid } from '@/lib/validation/matches';

export interface ContactRevealInput {
  requestId: string;
  matchId?: string;
  notificationId?: string;
}

export type ValidateRevealInputResult =
  | {
      isValid: true;
      data: ContactRevealInput;
      errors?: never;
    }
  | {
      isValid: false;
      data?: never;
      errors: Record<string, string>;
    };

/**
 * Validates the raw request body for contact reveal requests.
 */
export function validateRevealInput(body: unknown): ValidateRevealInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const record = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // 1. Validate requestId
  const rawRequestId = record.requestId;
  if (!rawRequestId) {
    errors.requestId = 'requestId is required.';
  } else if (typeof rawRequestId !== 'string') {
    errors.requestId = 'requestId must be a string.';
  } else if (!isValidUuid(rawRequestId.trim())) {
    errors.requestId = 'requestId must be a valid UUID.';
  }

  // 2. Validate matchId or notificationId (at least one must be provided)
  const rawMatchId = record.matchId;
  const rawNotificationId = record.notificationId;

  if (!rawMatchId && !rawNotificationId) {
    errors.matchId = 'Either matchId or notificationId must be provided.';
  }

  let validMatchId: string | undefined;
  if (rawMatchId !== undefined) {
    if (typeof rawMatchId !== 'string') {
      errors.matchId = 'matchId must be a string.';
    } else if (!isValidUuid(rawMatchId.trim())) {
      errors.matchId = 'matchId must be a valid UUID.';
    } else {
      validMatchId = rawMatchId.trim().toLowerCase();
    }
  }

  let validNotificationId: string | undefined;
  if (rawNotificationId !== undefined) {
    if (typeof rawNotificationId !== 'string') {
      errors.notificationId = 'notificationId must be a string.';
    } else if (!isValidUuid(rawNotificationId.trim())) {
      errors.notificationId = 'notificationId must be a valid UUID.';
    } else {
      validNotificationId = rawNotificationId.trim().toLowerCase();
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      requestId: (rawRequestId as string).trim().toLowerCase(),
      matchId: validMatchId,
      notificationId: validNotificationId,
    },
  };
}
