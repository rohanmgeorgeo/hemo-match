/**
 * Hemo Match - Pure District Matching Engine
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final compatibility and donor screening decisions must
 * be made by qualified blood bank and clinical personnel via standard serological
 * crossmatching and laboratory testing.
 *
 * SCOPE:
 * Pure functions only. Zero database or Supabase imports.
 * Deterministic execution and ranking. Timezone-independent date evaluations.
 */

import type {
  BloodComponent,
  BloodGroup,
  DonorAvailability,
  NotificationPreference,
} from '@/types';
import type { BloodRequestRow, DonorRow, DbBloodGroup, DbBloodComponent, DbDonorAvailability, DbNotificationPreference } from '@/types/database';
import {
  getCompatibilityType,
  isRbcCompatible,
  type CompatibilityType,
} from './compatibility';
import {
  evaluateDonationInterval,
} from '../eligibility/intervals';

// ---------------------------------------------------------------------------
// Exclusion Reason Types
// ---------------------------------------------------------------------------

export type RequestExclusionReason =
  | 'EXCLUDE_REQUEST_INACTIVE'
  | 'EXCLUDE_REQUEST_EXPIRED'
  | 'UNSUPPORTED_COMPONENT_FOR_MATCHING';

export type DonorExclusionReason =
  | 'EXCLUDE_NO_CONSENT'
  | 'EXCLUDE_DONOR_UNAVAILABLE'
  | 'EXCLUDE_DIFFERENT_DISTRICT'
  | 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE'
  | 'EXCLUDE_DONATION_HISTORY_UNKNOWN'
  | 'EXCLUDE_NO_APPLICABLE_INTERVAL_RULE'
  | 'EXCLUDE_INTERVAL_TOO_SHORT'
  | 'EXCLUDE_ALREADY_RESPONDED'
  | 'EXCLUDE_ALREADY_MATCHED';

export type InternalExclusionReason = RequestExclusionReason | DonorExclusionReason;

// ---------------------------------------------------------------------------
// Engine Input & Output Interfaces
// ---------------------------------------------------------------------------

export interface EngineRequestInput {
  id: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  districtId: string;
  requiredBy: string; // ISO 8601 or TIMESTAMPTZ string
  status: string;
}

export interface EngineDonorInput {
  id: string;
  bloodGroup: BloodGroup;
  districtId: string;
  approximateArea: string;
  lastDonationDate: string | null;
  availability: DonorAvailability;
  consentGiven: boolean;
  notificationPreference?: NotificationPreference;
  hasPriorResponse?: boolean;
  isAlreadyMatched?: boolean;
}

export interface MatchMetadata {
  compatibility_type: CompatibilityType;
  recipient_blood_group: BloodGroup;
  donor_blood_group: BloodGroup;
  days_since_last_donation: number;
  minimum_interval_days: number;
  eligibility_rule_id: string;
  evaluated_at: string;
  rank_factors: {
    /** Priority 1: exact homologous before compatible alternative */
    is_homologous: boolean;
    /** Priority 2: longer physiological recovery first (days descending) */
    days_since_donation: number;
    // NOTE: donor UUID tie-break (Priority 3) is applied at ranking time
    // via EligibleMatchCandidate.donorId; it is NOT duplicated here because
    // matches.donor_id already records the relationship in the database row.
  };
}

export interface EligibleMatchCandidate {
  requestId: string;
  donorId: string;
  anonymizedDonorRef: string;
  bloodGroup: BloodGroup;
  districtId: string;
  approximateArea: string;
  compatibilityType: CompatibilityType;
  factualMatchReasons: string[];
  daysSinceLastDonation: number;
  status: 'candidate';
  metadata: MatchMetadata;
}

export interface DonorEvaluationOutcome {
  donorId: string;
  eligible: boolean;
  exclusionReason: DonorExclusionReason | null;
  compatibilityType: CompatibilityType | null;
  daysSinceLastDonation: number | null;
  candidate?: EligibleMatchCandidate;
}

export interface EngineExecutionResult {
  success: boolean;
  requestError?: RequestExclusionReason;
  evaluatedAt: string;
  candidates: EligibleMatchCandidate[];
  /** Internal evaluation audit log - for server-side testing/auditing only */
  evaluations: DonorEvaluationOutcome[];
}

// ---------------------------------------------------------------------------
// Privacy & Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a privacy-safe anonymized reference from the donor UUID.
 * Never reveals full name, phone number, or private credentials.
 * Example: 'Donor •••• 9B4F'
 */
export function createAnonymizedDonorRef(donorId: string): string {
  const cleanId = donorId.replace(/[^a-zA-Z0-9]/g, '');
  const suffix = cleanId.slice(-4).toUpperCase();
  return `Donor •••• ${suffix}`;
}

/**
 * Generates factual, evidence-based match reasons without claiming clinical clearance.
 */
export function buildFactualMatchReasons(params: {
  compatibilityType: CompatibilityType;
  recipientBloodGroup: BloodGroup;
  donorBloodGroup: BloodGroup;
  daysSinceLastDonation: number;
  minimumIntervalDays: number;
}): string[] {
  const reasons: string[] = [];

  if (params.compatibilityType === 'homologous') {
    reasons.push(`Exact ABO/Rh match (${params.donorBloodGroup})`);
  } else {
    reasons.push(
      `Compatible alternative ABO/Rh donor (${params.donorBloodGroup} for ${params.recipientBloodGroup})`
    );
  }

  reasons.push(
    `Preliminary interval satisfied (${params.daysSinceLastDonation} days elapsed, minimum ${params.minimumIntervalDays} days)`
  );

  reasons.push('Same district geographic alignment');

  return reasons;
}

/**
 * Builds structured, non-PII match metadata.
 * Prohibits phone numbers, donor names, or arbitrary clinical 0-100 scores.
 */
export function buildMatchMetadata(params: {
  compatibilityType: CompatibilityType;
  recipientBloodGroup: BloodGroup;
  donorBloodGroup: BloodGroup;
  daysSinceLastDonation: number;
  minimumIntervalDays: number;
  eligibilityRuleId: string;
  evaluatedAt: string;
}): MatchMetadata {
  return {
    compatibility_type: params.compatibilityType,
    recipient_blood_group: params.recipientBloodGroup,
    donor_blood_group: params.donorBloodGroup,
    days_since_last_donation: params.daysSinceLastDonation,
    minimum_interval_days: params.minimumIntervalDays,
    eligibility_rule_id: params.eligibilityRuleId,
    evaluated_at: params.evaluatedAt,
    rank_factors: {
      is_homologous: params.compatibilityType === 'homologous',
      days_since_donation: params.daysSinceLastDonation,
    },
  };
}

// ---------------------------------------------------------------------------
// Adapters for Database Row Types
// ---------------------------------------------------------------------------

export function requestRowToEngineInput(row: BloodRequestRow): EngineRequestInput {
  return {
    id: row.id,
    bloodGroup: row.blood_group as BloodGroup,
    component: row.component as BloodComponent,
    districtId: row.district_id,
    requiredBy: row.required_by,
    status: row.status,
  };
}

export function donorRowToEngineInput(
  row: DonorRow,
  options?: { hasPriorResponse?: boolean; isAlreadyMatched?: boolean }
): EngineDonorInput {
  return {
    id: row.id,
    bloodGroup: row.blood_group as BloodGroup,
    districtId: row.district_id,
    approximateArea: row.approximate_area,
    lastDonationDate: row.last_donation_date,
    availability: row.availability as DonorAvailability,
    consentGiven: row.consent_given,
    notificationPreference: row.notification_preference as NotificationPreference,
    hasPriorResponse: options?.hasPriorResponse ?? false,
    isAlreadyMatched: options?.isAlreadyMatched ?? false,
  };
}

// ---------------------------------------------------------------------------
// Narrow adapters — for DB queries that select only matching fields
// These intentionally accept structural types that omit private columns
// (phone_number, full_name) so no fake placeholder values are needed.
// ---------------------------------------------------------------------------

/**
 * Minimal donor fields required by the matching engine.
 * Structurally excludes phone_number, full_name, and other private columns
 * that must never be selected in matching queries.
 */
export interface DonorMatchingRow {
  id: string;
  blood_group: DbBloodGroup;
  district_id: string;
  approximate_area: string;
  last_donation_date: string | null;
  availability: DbDonorAvailability;
  notification_preference: DbNotificationPreference;
  consent_given: boolean;
}

/**
 * Minimal request fields required by the matching engine.
 * Omits private/unused columns such as hospital_name, approximate_area, notes.
 */
export interface RequestMatchingRow {
  id: string;
  blood_group: DbBloodGroup;
  component: DbBloodComponent;
  district_id: string;
  required_by: string;
  status: string;
}

/**
 * Adapter from DonorMatchingRow (narrow DB projection) -> EngineDonorInput.
 * Does NOT accept or require phone_number or full_name.
 */
export function donorMatchingRowToEngineInput(
  row: DonorMatchingRow,
  options?: { hasPriorResponse?: boolean; isAlreadyMatched?: boolean }
): EngineDonorInput {
  return {
    id: row.id,
    bloodGroup: row.blood_group as BloodGroup,
    districtId: row.district_id,
    approximateArea: row.approximate_area,
    lastDonationDate: row.last_donation_date,
    availability: row.availability as DonorAvailability,
    consentGiven: row.consent_given,
    notificationPreference: row.notification_preference as NotificationPreference,
    hasPriorResponse: options?.hasPriorResponse ?? false,
    isAlreadyMatched: options?.isAlreadyMatched ?? false,
  };
}

/**
 * Adapter from RequestMatchingRow (narrow DB projection) -> EngineRequestInput.
 */
export function requestMatchingRowToEngineInput(row: RequestMatchingRow): EngineRequestInput {
  return {
    id: row.id,
    bloodGroup: row.blood_group as BloodGroup,
    component: row.component as BloodComponent,
    districtId: row.district_id,
    requiredBy: row.required_by,
    status: row.status,
  };
}

// ---------------------------------------------------------------------------
// Deterministic Ranking Comparator
// ---------------------------------------------------------------------------

/**
 * Deterministic candidate ranking comparator:
 * 1. Exact ABO/Rh homologous matches first (to preserve universal O- / alternative stocks)
 * 2. Greater days since known last donation first (longer physiological recovery preferred)
 * 3. Stable deterministic tie-breaker: donor UUID ascending
 *
 * NOTE: approximate_area is NEVER used for distance or ranking calculation.
 */
export function compareEligibleCandidates(
  a: EligibleMatchCandidate,
  b: EligibleMatchCandidate
): number {
  // Priority 1: Exact homologous match before compatible non-homologous
  if (a.compatibilityType === 'homologous' && b.compatibilityType !== 'homologous') {
    return -1;
  }
  if (b.compatibilityType === 'homologous' && a.compatibilityType !== 'homologous') {
    return 1;
  }

  // Priority 2: Greater days since last donation (descending)
  if (b.daysSinceLastDonation !== a.daysSinceLastDonation) {
    return b.daysSinceLastDonation - a.daysSinceLastDonation;
  }

  // Priority 3: Stable deterministic tie-breaker: donor UUID ascending
  return a.donorId.localeCompare(b.donorId);
}

// ---------------------------------------------------------------------------
// Core Matching Engine
// ---------------------------------------------------------------------------

/**
 * Validates request-level hard constraints.
 */
export function evaluateRequestLevel(
  request: EngineRequestInput,
  now: Date
): RequestExclusionReason | null {
  // 1. Request status must be active
  if (request.status !== 'active') {
    return 'EXCLUDE_REQUEST_INACTIVE';
  }

  // 2. Component must be supported
  if (request.component !== 'Whole Blood' && request.component !== 'Red Blood Cells') {
    return 'UNSUPPORTED_COMPONENT_FOR_MATCHING';
  }

  // 3. required_by must not be past
  const requiredByMs = new Date(request.requiredBy).getTime();
  if (isNaN(requiredByMs) || now.getTime() > requiredByMs) {
    return 'EXCLUDE_REQUEST_EXPIRED';
  }

  return null;
}

/**
 * Evaluates a single donor against an active request.
 */
export function evaluateDonorLevel(
  request: EngineRequestInput,
  donor: EngineDonorInput,
  now: Date,
  evaluatedAtIso: string
): DonorEvaluationOutcome {
  // 1. Donor consent must be given
  if (!donor.consentGiven) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_NO_CONSENT',
      compatibilityType: null,
      daysSinceLastDonation: null,
    };
  }

  // 2. Donor availability must be 'available'
  if (donor.availability !== 'available') {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_DONOR_UNAVAILABLE',
      compatibilityType: null,
      daysSinceLastDonation: null,
    };
  }

  // 3. Same district geographic alignment
  if (donor.districtId !== request.districtId) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_DIFFERENT_DISTRICT',
      compatibilityType: null,
      daysSinceLastDonation: null,
    };
  }

  // 4. RBC Blood group compatibility
  if (!isRbcCompatible(request.bloodGroup, donor.bloodGroup)) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE',
      compatibilityType: null,
      daysSinceLastDonation: null,
    };
  }

  const compatibilityType = getCompatibilityType(request.bloodGroup, donor.bloodGroup);
  if (!compatibilityType) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE',
      compatibilityType: null,
      daysSinceLastDonation: null,
    };
  }

  // 5. Interval evaluation (handles missing history, active rule lookup, and elapsed days)
  const intervalResult = evaluateDonationInterval(
    donor.lastDonationDate,
    request.component,
    now
  );

  if (!intervalResult.eligible) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: intervalResult.reasonCode as DonorExclusionReason,
      compatibilityType,
      daysSinceLastDonation: intervalResult.daysSinceLastDonation,
    };
  }

  // 6. Check prior response flag
  if (donor.hasPriorResponse) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_ALREADY_RESPONDED',
      compatibilityType,
      daysSinceLastDonation: intervalResult.daysSinceLastDonation,
    };
  }

  // 7. Check already matched flag
  if (donor.isAlreadyMatched) {
    return {
      donorId: donor.id,
      eligible: false,
      exclusionReason: 'EXCLUDE_ALREADY_MATCHED',
      compatibilityType,
      daysSinceLastDonation: intervalResult.daysSinceLastDonation,
    };
  }

  // NOTE: notificationPreference is deliberately NOT used as an exclusion at Match stage.
  // Matching evaluates clinical & geographic alignment; notification delivery evaluates preference in Step 7.

  const daysSinceLastDonation = intervalResult.daysSinceLastDonation ?? 0;
  const minimumIntervalDays = intervalResult.minimumIntervalDays ?? 120;
  const ruleId = intervalResult.ruleId ?? 'RULE_IN_CONSERVATIVE_INTERVAL_120D';

  const metadata = buildMatchMetadata({
    compatibilityType,
    recipientBloodGroup: request.bloodGroup,
    donorBloodGroup: donor.bloodGroup,
    daysSinceLastDonation,
    minimumIntervalDays,
    eligibilityRuleId: ruleId,
    evaluatedAt: evaluatedAtIso,
  });

  const factualMatchReasons = buildFactualMatchReasons({
    compatibilityType,
    recipientBloodGroup: request.bloodGroup,
    donorBloodGroup: donor.bloodGroup,
    daysSinceLastDonation,
    minimumIntervalDays,
  });

  const candidate: EligibleMatchCandidate = {
    requestId: request.id,
    donorId: donor.id,
    anonymizedDonorRef: createAnonymizedDonorRef(donor.id),
    bloodGroup: donor.bloodGroup,
    districtId: donor.districtId,
    approximateArea: donor.approximateArea,
    compatibilityType,
    factualMatchReasons,
    daysSinceLastDonation,
    status: 'candidate',
    metadata,
  };

  return {
    donorId: donor.id,
    eligible: true,
    exclusionReason: null,
    compatibilityType,
    daysSinceLastDonation,
    candidate,
  };
}

/**
 * Pure Matching Engine execution function.
 * Evaluates a blood request against a list of donor candidates.
 *
 * @param request The request input
 * @param donors List of prospective donors
 * @param evaluationTime Explicit Date for evaluation (defaults to current time)
 * @returns EngineExecutionResult with sorted candidates and full audit logs
 */
export function matchDonorsForRequest(
  request: EngineRequestInput,
  donors: readonly EngineDonorInput[],
  evaluationTime: Date = new Date()
): EngineExecutionResult {
  const evaluatedAtIso = evaluationTime.toISOString();

  // 1. Request-level validation
  const requestExclusion = evaluateRequestLevel(request, evaluationTime);
  if (requestExclusion !== null) {
    return {
      success: false,
      requestError: requestExclusion,
      evaluatedAt: evaluatedAtIso,
      candidates: [],
      evaluations: [],
    };
  }

  // 2. Donor-level evaluation
  const candidates: EligibleMatchCandidate[] = [];
  const evaluations: DonorEvaluationOutcome[] = [];

  for (const donor of donors) {
    const outcome = evaluateDonorLevel(request, donor, evaluationTime, evaluatedAtIso);
    evaluations.push(outcome);

    if (outcome.eligible && outcome.candidate) {
      candidates.push(outcome.candidate);
    }
  }

  // 3. Deterministic candidate ranking
  candidates.sort(compareEligibleCandidates);

  return {
    success: true,
    evaluatedAt: evaluatedAtIso,
    candidates,
    evaluations,
  };
}
