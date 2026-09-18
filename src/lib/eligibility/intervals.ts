/**
 * Hemo Match - Preliminary Interval Evaluation Subsystem
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final donor screening, deferral evaluation, and health
 * clearance must be performed by qualified medical officers at the licensed blood bank.
 *
 * Pure functions only. Zero database dependencies. Timezone-independent calendar math.
 */

import type { BloodComponent } from '@/types';
import { getActiveIntervalRule, type EligibilityRuleConfig } from './rules';

export const MS_PER_DAY = 86_400_000;

export type IntervalExclusionReason =
  | 'EXCLUDE_DONATION_HISTORY_UNKNOWN'
  | 'UNSUPPORTED_COMPONENT_FOR_MATCHING'
  | 'EXCLUDE_NO_APPLICABLE_INTERVAL_RULE'
  | 'EXCLUDE_INTERVAL_TOO_SHORT';

export interface IntervalEvaluationResult {
  readonly eligible: boolean;
  readonly reasonCode: IntervalExclusionReason | null;
  readonly daysSinceLastDonation: number | null;
  readonly minimumIntervalDays: number | null;
  readonly nextEligibleDate: string | null;
  readonly ruleId: string | null;
}

/**
 * Parses an ISO date string or Date object into UTC midnight milliseconds.
 * This guarantees strict timezone-independence across local server runtimes.
 */
export function parseDateToUtcMidnight(input: Date | string): number | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
  } else if (input instanceof Date && !isNaN(input.getTime())) {
    return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  }
  return null;
}

/**
 * Formats a UTC midnight timestamp as a deterministic YYYY-MM-DD string.
 */
export function formatUtcDateString(utcMidnightMs: number): string {
  const d = new Date(utcMidnightMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates whether a donor satisfies the preliminary donation interval for a requested component.
 *
 * Requirements:
 * 1. NULL or unparseable lastDonationDate -> EXCLUDE_DONATION_HISTORY_UNKNOWN
 * 2. Unsupported component (e.g. Platelets, Plasma) -> UNSUPPORTED_COMPONENT_FOR_MATCHING
 * 3. No active configured rule for component -> EXCLUDE_NO_APPLICABLE_INTERVAL_RULE
 * 4. Known date but elapsed calendar days < minimumIntervalDays (including future dates) -> EXCLUDE_INTERVAL_TOO_SHORT
 * 5. Exactly minimumIntervalDays or greater -> eligible: true
 *
 * @param lastDonationDate The donor's recorded last donation date (YYYY-MM-DD or ISO)
 * @param component The requested blood component
 * @param evaluationDate Explicit evaluation date (defaults to current time in UTC)
 */
export function evaluateDonationInterval(
  lastDonationDate: string | null | undefined,
  component: BloodComponent,
  evaluationDate: Date | string = new Date()
): IntervalEvaluationResult {
  // 1. Validate request component scope
  if (component !== 'Whole Blood' && component !== 'Red Blood Cells') {
    return {
      eligible: false,
      reasonCode: 'UNSUPPORTED_COMPONENT_FOR_MATCHING',
      daysSinceLastDonation: null,
      minimumIntervalDays: null,
      nextEligibleDate: null,
      ruleId: null,
    };
  }

  // 2. Fetch active eligibility rule
  const rule: EligibilityRuleConfig | null = getActiveIntervalRule(component);
  if (!rule) {
    return {
      eligible: false,
      reasonCode: 'EXCLUDE_NO_APPLICABLE_INTERVAL_RULE',
      daysSinceLastDonation: null,
      minimumIntervalDays: null,
      nextEligibleDate: null,
      ruleId: null,
    };
  }

  // 3. Check for missing or unrecorded donation history
  // A NULL last_donation_date MUST NOT be interpreted as "first-time donor"
  if (!lastDonationDate || lastDonationDate.trim() === '') {
    return {
      eligible: false,
      reasonCode: 'EXCLUDE_DONATION_HISTORY_UNKNOWN',
      daysSinceLastDonation: null,
      minimumIntervalDays: rule.minimumIntervalDays,
      nextEligibleDate: null,
      ruleId: rule.id,
    };
  }

  const donationMidnight = parseDateToUtcMidnight(lastDonationDate);
  if (donationMidnight === null) {
    return {
      eligible: false,
      reasonCode: 'EXCLUDE_DONATION_HISTORY_UNKNOWN',
      daysSinceLastDonation: null,
      minimumIntervalDays: rule.minimumIntervalDays,
      nextEligibleDate: null,
      ruleId: rule.id,
    };
  }

  const evalMidnight = parseDateToUtcMidnight(evaluationDate);
  if (evalMidnight === null) {
    throw new Error(`Invalid evaluation date provided: ${String(evaluationDate)}`);
  }

  // 4. Calculate elapsed calendar days
  const daysSinceLastDonation = Math.floor((evalMidnight - donationMidnight) / MS_PER_DAY);

  // 5. Evaluate against minimum interval threshold
  if (daysSinceLastDonation < rule.minimumIntervalDays) {
    const nextEligibleMidnight = donationMidnight + rule.minimumIntervalDays * MS_PER_DAY;
    return {
      eligible: false,
      reasonCode: 'EXCLUDE_INTERVAL_TOO_SHORT',
      daysSinceLastDonation,
      minimumIntervalDays: rule.minimumIntervalDays,
      nextEligibleDate: formatUtcDateString(nextEligibleMidnight),
      ruleId: rule.id,
    };
  }

  // 6. Interval satisfied (>= 120 calendar days)
  return {
    eligible: true,
    reasonCode: null,
    daysSinceLastDonation,
    minimumIntervalDays: rule.minimumIntervalDays,
    nextEligibleDate: null,
    ruleId: rule.id,
  };
}
