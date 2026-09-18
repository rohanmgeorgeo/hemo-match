/**
 * Hemo Match - Contact Reveal Authorization & Revalidation (Step 9)
 *
 * Pure, deterministic functions validating that a contact reveal request meets
 * all authoritative criteria before private contact information is accessed.
 *
 * LOCKED AUTHORIZATION RULES:
 * 1. Match must exist and status must be 'accepted'.
 * 2. Donor response must exist and status must be 'accepted'.
 * 3. Notification must exist, belong to donor/request/match, and type must be 'match_found'.
 * 4. Blood request must exist and must not be in a terminal lifecycle state
 *    ('cancelled', 'expired', or 'fulfilled').
 * 5. Donor must exist and have minimum contact details available.
 * 6. All entity relationships (request_id, donor_id, match_id) must be strictly consistent.
 *
 * CRITICAL PRIVACY DIRECTIVES:
 * - Do NOT re-run medical eligibility or donation intervals (Step 8 performed
 *   authoritative medical revalidation immediately prior to acceptance).
 * - Step 9 is an authorization and privacy transition, not a medical decision.
 * - Minimum contact projection only (name and phone). Zero home address,
 *   coordinates, health records, or email.
 */

export interface RevealRevalidationDonor {
  id: string;
  fullName: string;
  phoneNumber: string;
}

export interface RevealRevalidationRequest {
  id: string;
  status: string;
}

export interface RevealRevalidationMatch {
  id: string;
  requestId: string;
  donorId: string;
  status: string;
}

export interface RevealRevalidationResponse {
  id?: string;
  requestId: string;
  donorId: string;
  matchId?: string | null;
  status: string;
}

export interface RevealRevalidationNotification {
  id?: string;
  requestId: string | null;
  donorId: string;
  matchId: string | null;
  type: string;
}

export type RevealAuthorizationErrorCode =
  | 'match_not_found'
  | 'match_not_accepted'
  | 'request_not_found'
  | 'request_not_actionable'
  | 'response_not_found'
  | 'response_not_accepted'
  | 'notification_invalid'
  | 'cross_entity_mismatch'
  | 'donor_not_found';

export type RevealAuthorizationResult =
  | { authorized: true; error?: never; message?: never }
  | { authorized: false; error: RevealAuthorizationErrorCode; message: string };

/**
 * Validates whether all authoritative database criteria permit revealing
 * the donor's contact information to the requester.
 */
export function validateContactRevealPrerequisites(params: {
  requestId: string;
  matchId: string;
  request: RevealRevalidationRequest | null;
  match: RevealRevalidationMatch | null;
  response: RevealRevalidationResponse | null;
  notification: RevealRevalidationNotification | null;
  donor: RevealRevalidationDonor | null;
}): RevealAuthorizationResult {
  const { requestId, matchId, request, match, response, notification, donor } = params;

  // 1. Verify Match
  if (!match) {
    return {
      authorized: false,
      error: 'match_not_found',
      message: 'Match record not found.',
    };
  }

  if (match.id !== matchId || match.requestId !== requestId) {
    return {
      authorized: false,
      error: 'cross_entity_mismatch',
      message: 'Match does not belong to the specified request.',
    };
  }

  if (match.status !== 'accepted') {
    return {
      authorized: false,
      error: 'match_not_accepted',
      message: `Match status is "${match.status}". Contact can only be revealed for accepted matches.`,
    };
  }

  // 2. Verify Request
  if (!request) {
    return {
      authorized: false,
      error: 'request_not_found',
      message: 'Blood request record not found.',
    };
  }

  if (request.id !== requestId) {
    return {
      authorized: false,
      error: 'cross_entity_mismatch',
      message: 'Request identifier mismatch.',
    };
  }

  const terminalStatuses = ['cancelled', 'expired', 'fulfilled'];
  if (terminalStatuses.includes(request.status.toLowerCase())) {
    return {
      authorized: false,
      error: 'request_not_actionable',
      message: `Request is in terminal state "${request.status}". Contact reveal is not authorized.`,
    };
  }

  // 3. Verify Donor Response
  if (!response) {
    return {
      authorized: false,
      error: 'response_not_found',
      message: 'Donor response record not found for this match.',
    };
  }

  if (response.requestId !== requestId || response.donorId !== match.donorId) {
    return {
      authorized: false,
      error: 'cross_entity_mismatch',
      message: 'Donor response does not match the request or donor.',
    };
  }

  if (response.status !== 'accepted') {
    return {
      authorized: false,
      error: 'response_not_accepted',
      message: `Donor response is "${response.status}". Contact reveal requires an accepted response.`,
    };
  }

  // 4. Verify Notification
  if (!notification) {
    return {
      authorized: false,
      error: 'notification_invalid',
      message: 'Match notification record not found.',
    };
  }

  if (
    notification.requestId !== requestId ||
    notification.donorId !== match.donorId ||
    notification.matchId !== matchId ||
    notification.type !== 'match_found'
  ) {
    return {
      authorized: false,
      error: 'notification_invalid',
      message: 'Notification does not correspond to a valid match_found alert for this donor and request.',
    };
  }

  // 5. Verify Donor
  if (!donor) {
    return {
      authorized: false,
      error: 'donor_not_found',
      message: 'Donor record not found.',
    };
  }

  if (donor.id !== match.donorId) {
    return {
      authorized: false,
      error: 'cross_entity_mismatch',
      message: 'Donor record does not match the candidate donor.',
    };
  }

  if (!donor.phoneNumber || !donor.fullName) {
    return {
      authorized: false,
      error: 'donor_not_found',
      message: 'Donor contact details are incomplete.',
    };
  }

  return { authorized: true };
}
