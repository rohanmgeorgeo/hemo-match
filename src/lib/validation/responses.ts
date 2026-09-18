/**
 * Hemo Match - Donor Response Input Validation
 *
 * SCOPE:
 * Pure functions validating client input for POST /api/donors/responses.
 * Rejects untrusted client overrides, non-UUID identifiers, and invalid action verbs.
 */

import { isValidUuid } from '@/lib/validation/matches';

export type DonorResponseAction = 'accepted' | 'declined';

export interface SubmitDonorResponsePayload {
  donorId: string;
  notificationId: string;
  response: DonorResponseAction;
}

export type ValidateResponseInputResult =
  | {
      isValid: true;
      data: SubmitDonorResponsePayload;
      error?: never;
    }
  | {
      isValid: false;
      error: string;
      data?: never;
    };

/**
 * Validates request payload for recording a donor response.
 *
 * STRICTNESS:
 * - Rejects non-object bodies.
 * - Enforces valid RFC 4122 UUID for donorId.
 * - Enforces valid RFC 4122 UUID for notificationId.
 * - Restricts response to exactly 'accepted' or 'declined'.
 * - Strips all extraneous client properties.
 */
export function validateResponseInput(body: unknown): ValidateResponseInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      error: 'Request body must be a JSON object.',
    };
  }

  const record = body as Record<string, unknown>;

  // Validate donorId
  if (typeof record.donorId !== 'string' || !isValidUuid(record.donorId)) {
    return {
      isValid: false,
      error: 'A valid donorId UUID is required.',
    };
  }

  // Validate notificationId
  if (typeof record.notificationId !== 'string' || !isValidUuid(record.notificationId)) {
    return {
      isValid: false,
      error: 'A valid notificationId UUID is required.',
    };
  }

  // Validate response action
  if (record.response !== 'accepted' && record.response !== 'declined') {
    return {
      isValid: false,
      error: "Response action must be either 'accepted' or 'declined'.",
    };
  }

  return {
    isValid: true,
    data: {
      donorId: record.donorId.toLowerCase(),
      notificationId: record.notificationId.toLowerCase(),
      response: record.response,
    },
  };
}
