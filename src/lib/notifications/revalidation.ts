/**
 * Hemo Match - Pure Notification Pre-Dispatch Revalidation
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * Revalidation checks preliminary discovery suitability and donor communication preferences
 * immediately prior to notification dispatch. It does NOT determine final clinical eligibility,
 * serological compatibility, or transfusion safety. Final donor qualification is performed
 * by qualified blood-centre and clinical personnel.
 *
 * SCOPE:
 * Pure functions only. Zero direct database, network, or environment dependencies.
 * Deterministic execution and timezone-independent calendar math.
 */

import type {
  BloodComponent,
  BloodGroup,
  DonorAvailability,
  NotificationPreference,
} from '@/types';
import {
  getCompatibilityType,
  isRbcCompatible,
  type CompatibilityType,
} from '@/lib/matching/compatibility';
import { evaluateDonationInterval } from '@/lib/eligibility/intervals';

// ---------------------------------------------------------------------------
// Internal Skip Reasons
// Strictly for internal server logic, audit logs, and test assertions.
// MUST NEVER be exposed in public API responses or leak private donor context.
// ---------------------------------------------------------------------------

export type DispatchSkipReason =
  | 'EXCLUDE_REQUEST_INACTIVE'
  | 'EXCLUDE_REQUEST_EXPIRED'
  | 'UNSUPPORTED_COMPONENT'
  | 'EXCLUDE_MATCH_NOT_CANDIDATE'
  | 'EXCLUDE_MATCH_REQUEST_MISMATCH'
  | 'EXCLUDE_NO_CONSENT'
  | 'EXCLUDE_DONOR_UNAVAILABLE'
  | 'EXCLUDE_PREFERENCE_DISABLED'
  | 'EXCLUDE_DIFFERENT_DISTRICT'
  | 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE'
  | 'EXCLUDE_DONATION_HISTORY_UNKNOWN'
  | 'EXCLUDE_INTERVAL_TOO_SHORT'
  | 'EXCLUDE_ALREADY_RESPONDED'
  | 'EXCLUDE_ALREADY_NOTIFIED';

// ---------------------------------------------------------------------------
// Domain Input Types
// Narrow interfaces tailored to the exact fields required for revalidation.
// ---------------------------------------------------------------------------

export interface RevalidationRequestInput {
  id: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  districtId: string;
  requiredBy: string; // ISO 8601 or TIMESTAMPTZ string
  status: string;
}

export interface RevalidationMatchInput {
  id: string;
  requestId: string;
  donorId: string;
  status: string;
}

export interface RevalidationDonorInput {
  id: string;
  bloodGroup: BloodGroup;
  districtId: string;
  approximateArea: string;
  lastDonationDate: string | null;
  availability: DonorAvailability;
  notificationPreference: NotificationPreference;
  consentGiven: boolean;
}

export interface EligibleDispatchCandidate {
  matchId: string;
  donorId: string;
  requestId: string;
  bloodGroup: BloodGroup;
  districtId: string;
  approximateArea: string;
  compatibilityType: CompatibilityType;
  daysSinceLastDonation: number;
}

export interface CandidateRevalidationOutcome {
  matchId: string;
  donorId: string;
  eligible: boolean;
  skipReason: DispatchSkipReason | null;
  candidate?: EligibleDispatchCandidate;
}

export interface DispatchRevalidationResult {
  requestValid: boolean;
  requestError?: DispatchSkipReason;
  evaluatedAt: string;
  eligibleCandidates: EligibleDispatchCandidate[];
  skippedOutcomes: CandidateRevalidationOutcome[];
}

// ---------------------------------------------------------------------------
// Pure Request Pre-Check
// ---------------------------------------------------------------------------

export function validateRequestForDispatch(
  request: RevalidationRequestInput,
  now: Date
): DispatchSkipReason | null {
  if (request.status !== 'active') {
    return 'EXCLUDE_REQUEST_INACTIVE';
  }

  if (request.component !== 'Whole Blood' && request.component !== 'Red Blood Cells') {
    return 'UNSUPPORTED_COMPONENT';
  }

  const requiredByMs = new Date(request.requiredBy).getTime();
  if (isNaN(requiredByMs) || now.getTime() > requiredByMs) {
    return 'EXCLUDE_REQUEST_EXPIRED';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pure Candidate Revalidation
// ---------------------------------------------------------------------------

export function revalidateCandidate(
  request: RevalidationRequestInput,
  match: RevalidationMatchInput,
  donor: RevalidationDonorInput,
  options: {
    hasPriorResponse: boolean;
    hasPriorNotification: boolean;
    now: Date;
  }
): CandidateRevalidationOutcome {
  // 1. Verify match association and candidate status
  if (match.requestId !== request.id) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_MATCH_REQUEST_MISMATCH',
    };
  }

  if (match.status !== 'candidate') {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_MATCH_NOT_CANDIDATE',
    };
  }

  // 2. Notification history check (idempotency guard)
  if (options.hasPriorNotification) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_ALREADY_NOTIFIED',
    };
  }

  // 3. Prior donor response check
  if (options.hasPriorResponse) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_ALREADY_RESPONDED',
    };
  }

  // 4. Donor consent verification
  if (!donor.consentGiven) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_NO_CONSENT',
    };
  }

  // 5. Donor availability verification
  if (donor.availability !== 'available') {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_DONOR_UNAVAILABLE',
    };
  }

  // 6. Notification preference filter (enforced at Step 7 dispatch)
  if (donor.notificationPreference !== 'enabled') {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_PREFERENCE_DISABLED',
    };
  }

  // 7. Same district alignment
  if (donor.districtId !== request.districtId) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_DIFFERENT_DISTRICT',
    };
  }

  // 8. Biological blood group compatibility
  if (!isRbcCompatible(request.bloodGroup, donor.bloodGroup)) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE',
    };
  }

  const compatibilityType = getCompatibilityType(request.bloodGroup, donor.bloodGroup);
  if (!compatibilityType) {
    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason: 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE',
    };
  }

  // 9. Preliminary interval evaluation (locked 120-day policy)
  const intervalResult = evaluateDonationInterval(
    donor.lastDonationDate,
    request.component,
    options.now
  );

  if (!intervalResult.eligible) {
    const skipReason: DispatchSkipReason =
      intervalResult.reasonCode === 'EXCLUDE_DONATION_HISTORY_UNKNOWN'
        ? 'EXCLUDE_DONATION_HISTORY_UNKNOWN'
        : 'EXCLUDE_INTERVAL_TOO_SHORT';

    return {
      matchId: match.id,
      donorId: donor.id,
      eligible: false,
      skipReason,
    };
  }

  const daysSinceLastDonation = intervalResult.daysSinceLastDonation ?? 0;

  return {
    matchId: match.id,
    donorId: donor.id,
    eligible: true,
    skipReason: null,
    candidate: {
      matchId: match.id,
      donorId: donor.id,
      requestId: request.id,
      bloodGroup: donor.bloodGroup,
      districtId: donor.districtId,
      approximateArea: donor.approximateArea,
      compatibilityType,
      daysSinceLastDonation,
    },
  };
}

// ---------------------------------------------------------------------------
// Deterministic Ordering Comparator
// 1. Homologous ABO/Rh matches rank before compatible alternative matches.
// 2. Greater elapsed days since donation rank ahead.
// 3. Stable tie-break: donor UUID ascending (internal only, never exposed).
// ---------------------------------------------------------------------------

export function compareDispatchCandidates(
  a: EligibleDispatchCandidate,
  b: EligibleDispatchCandidate
): number {
  if (a.compatibilityType === 'homologous' && b.compatibilityType !== 'homologous') {
    return -1;
  }
  if (b.compatibilityType === 'homologous' && a.compatibilityType !== 'homologous') {
    return 1;
  }

  if (b.daysSinceLastDonation !== a.daysSinceLastDonation) {
    return b.daysSinceLastDonation - a.daysSinceLastDonation;
  }

  return a.donorId.localeCompare(b.donorId);
}

// ---------------------------------------------------------------------------
// Batch Revalidation & Ranking Orchestrator
// ---------------------------------------------------------------------------

export function revalidateAndRankCandidates(params: {
  request: RevalidationRequestInput;
  matches: readonly RevalidationMatchInput[];
  donorsById: ReadonlyMap<string, RevalidationDonorInput>;
  respondedDonorIds: ReadonlySet<string>;
  notifiedMatchIds: ReadonlySet<string>;
  evaluationTime?: Date;
}): DispatchRevalidationResult {
  const now = params.evaluationTime ?? new Date();
  const evaluatedAt = now.toISOString();

  // 1. Validate request
  const requestError = validateRequestForDispatch(params.request, now);
  if (requestError) {
    return {
      requestValid: false,
      requestError,
      evaluatedAt,
      eligibleCandidates: [],
      skippedOutcomes: [],
    };
  }

  const eligibleCandidates: EligibleDispatchCandidate[] = [];
  const skippedOutcomes: CandidateRevalidationOutcome[] = [];

  // 2. Evaluate each match
  for (const match of params.matches) {
    const donor = params.donorsById.get(match.donorId);
    if (!donor) {
      skippedOutcomes.push({
        matchId: match.id,
        donorId: match.donorId,
        eligible: false,
        skipReason: 'EXCLUDE_DONOR_UNAVAILABLE',
      });
      continue;
    }

    const outcome = revalidateCandidate(params.request, match, donor, {
      hasPriorResponse: params.respondedDonorIds.has(donor.id),
      hasPriorNotification: params.notifiedMatchIds.has(match.id),
      now,
    });

    if (outcome.eligible && outcome.candidate) {
      eligibleCandidates.push(outcome.candidate);
    } else {
      skippedOutcomes.push(outcome);
    }
  }

  // 3. Deterministic candidate ranking
  eligibleCandidates.sort(compareDispatchCandidates);

  return {
    requestValid: true,
    evaluatedAt,
    eligibleCandidates,
    skippedOutcomes,
  };
}
