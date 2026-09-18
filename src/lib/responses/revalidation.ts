/**
 * Hemo Match - Pure Donor Response Pre-Execution Revalidation
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * Revalidation checks preliminary discovery suitability and consistency immediately
 * prior to recording a donor response. It does NOT determine final clinical eligibility,
 * serological compatibility, or transfusion safety. Final donor qualification is
 * performed exclusively by qualified blood-centre and clinical personnel.
 *
 * SCOPE:
 * Pure functions only. Zero direct database, network, or environment dependencies.
 * Deterministic execution and timezone-independent calendar math.
 */

import type {
  BloodComponent,
  BloodGroup,
} from '@/types';
import type {
  DbDonorAvailability as DonorAvailability,
  DbMatchStatus as MatchStatus,
  DbNotificationType as NotificationType,
  DbRequestStatus as RequestStatus,
} from '@/types/database';
import { isRbcCompatible } from '@/lib/matching/compatibility';
import { evaluateDonationInterval } from '@/lib/eligibility/intervals';

// ---------------------------------------------------------------------------
// Error Codes
// Strictly for internal server logic, sanitized error mapping, and tests.
// MUST NEVER expose PII or confidential donor/requester details.
// ---------------------------------------------------------------------------

export type ResponseRevalidationError =
  | 'INVALID_NOTIFICATION'
  | 'NOTIFICATION_MISMATCH'
  | 'REQUEST_TERMINAL'
  | 'REQUEST_EXPIRED'
  | 'UNSUPPORTED_COMPONENT'
  | 'MATCH_NOT_NOTIFIED'
  | 'ALREADY_RESPONDED'
  | 'NO_DONOR_CONSENT'
  | 'DONOR_UNAVAILABLE'
  | 'DISTRICT_MISMATCH'
  | 'BLOOD_INCOMPATIBLE'
  | 'DONATION_HISTORY_UNKNOWN'
  | 'INTERVAL_TOO_SHORT';

export interface ResponseRevalidationRequest {
  id: string;
  status: RequestStatus;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  districtId: string;
  requiredBy: string; // ISO 8601 or TIMESTAMPTZ string
}

export interface ResponseRevalidationMatch {
  id: string;
  requestId: string;
  donorId: string;
  status: MatchStatus;
}

export interface ResponseRevalidationNotification {
  id: string;
  donorId: string;
  requestId: string | null;
  matchId: string | null;
  type: NotificationType;
}

export interface ResponseRevalidationDonor {
  id: string;
  bloodGroup: BloodGroup;
  districtId: string;
  availability: DonorAvailability;
  consentGiven: boolean;
  lastDonationDate: string | null;
}

export interface ResponseRevalidationInput {
  notification: ResponseRevalidationNotification;
  request: ResponseRevalidationRequest;
  match: ResponseRevalidationMatch;
  donor: ResponseRevalidationDonor;
  hasExistingResponse: boolean;
  now?: Date;
}

export type RevalidationResult =
  | { isValid: true; error?: never }
  | { isValid: false; error: ResponseRevalidationError };

/**
 * Validates common preconditions required for any donor response (Accept or Decline).
 */
export function validateCommonResponsePrerequisites(
  input: ResponseRevalidationInput
): RevalidationResult {
  const { notification, request, match, donor, hasExistingResponse, now = new Date() } = input;

  // 1. Notification must be a match_found notification
  if (notification.type !== 'match_found') {
    return { isValid: false, error: 'INVALID_NOTIFICATION' };
  }

  // 2. Notification must belong to the matching request, match, and donor
  if (
    notification.donorId !== donor.id ||
    notification.requestId !== request.id ||
    notification.matchId !== match.id
  ) {
    return { isValid: false, error: 'NOTIFICATION_MISMATCH' };
  }

  // 3. Match must belong to the same request and donor
  if (match.requestId !== request.id || match.donorId !== donor.id) {
    return { isValid: false, error: 'NOTIFICATION_MISMATCH' };
  }

  // 4. Donor must not have already responded to this request
  if (hasExistingResponse || match.status === 'accepted' || match.status === 'declined' || match.status === 'responded') {
    return { isValid: false, error: 'ALREADY_RESPONDED' };
  }

  // 5. Match must currently be in 'notified' status
  if (match.status !== 'notified') {
    return { isValid: false, error: 'MATCH_NOT_NOTIFIED' };
  }

  // 6. Request must not be in a terminal non-actionable status
  const terminalStatuses: RequestStatus[] = ['expired', 'cancelled', 'fulfilled'];
  if (terminalStatuses.includes(request.status)) {
    return { isValid: false, error: 'REQUEST_TERMINAL' };
  }

  // 7. Request must not have elapsed its required_by deadline
  const deadline = new Date(request.requiredBy);
  if (!isNaN(deadline.getTime()) && deadline.getTime() < now.getTime()) {
    return { isValid: false, error: 'REQUEST_EXPIRED' };
  }

  return { isValid: true };
}

/**
 * Authoritatively revalidates pre-conditions immediately before recording an ACCEPT response.
 *
 * Checks:
 * - Common response preconditions
 * - Supported blood component (Whole Blood / RBC)
 * - Active donor consent
 * - Current donor availability ('available')
 * - Current donor district matching request district
 * - ABO/Rh erythrocyte biological compatibility
 * - Known donation history & 120-calendar-day interval compliance
 */
export function validateAcceptPrerequisites(
  input: ResponseRevalidationInput
): RevalidationResult {
  const common = validateCommonResponsePrerequisites(input);
  if (!common.isValid) {
    return common;
  }

  const { request, donor, now = new Date() } = input;

  // 1. Component scope: whole blood / red blood cells only in this MVP
  if (request.component !== 'Whole Blood' && request.component !== 'Red Blood Cells') {
    return { isValid: false, error: 'UNSUPPORTED_COMPONENT' };
  }

  // 2. Active donor consent
  if (!donor.consentGiven) {
    return { isValid: false, error: 'NO_DONOR_CONSENT' };
  }

  // 3. Current donor availability
  if (donor.availability !== 'available') {
    return { isValid: false, error: 'DONOR_UNAVAILABLE' };
  }

  // 4. District consistency
  if (donor.districtId !== request.districtId) {
    return { isValid: false, error: 'DISTRICT_MISMATCH' };
  }

  // 5. Biological compatibility
  if (!isRbcCompatible(donor.bloodGroup, request.bloodGroup)) {
    return { isValid: false, error: 'BLOOD_INCOMPATIBLE' };
  }

  // 6. Preliminary 120-day donation interval rule
  const intervalResult = evaluateDonationInterval(
    donor.lastDonationDate,
    request.component,
    now
  );

  if (!intervalResult.eligible) {
    if (intervalResult.reasonCode === 'EXCLUDE_DONATION_HISTORY_UNKNOWN') {
      return { isValid: false, error: 'DONATION_HISTORY_UNKNOWN' };
    }
    return { isValid: false, error: 'INTERVAL_TOO_SHORT' };
  }

  return { isValid: true };
}

/**
 * Validates pre-conditions immediately before recording a DECLINE response.
 * A donor may decline without asserting medical or interval eligibility.
 */
export function validateDeclinePrerequisites(
  input: ResponseRevalidationInput
): RevalidationResult {
  return validateCommonResponsePrerequisites(input);
}
