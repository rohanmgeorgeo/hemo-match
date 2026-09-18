/**
 * Hemo Match - Eligibility Rules Subsystem Entry Point
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final donor screening, deferral evaluation, and health
 * clearance must be performed by qualified medical officers at the licensed blood bank.
 */

export * from './rules';
export * from './intervals';

import type { BloodComponent } from '@/types';
import { evaluateDonationInterval } from './intervals';

export interface EligibilityInput {
  lastDonationDate?: string | null;
  component?: BloodComponent;
  evaluationDate?: Date | string;
  ageYears?: number;
  weightKg?: number;
  hasRecentTattooOrSurgery?: boolean;
  isCurrentlyMedicated?: boolean;
}

export interface EligibilityAssessment {
  isEligible: boolean;
  reasons: string[];
  nextEligibleDate?: string | null;
  daysRemaining?: number;
}

/**
 * Preliminary eligibility evaluator for donor donation intervals.
 * Uses the locked 120-day conservative preliminary matching policy.
 */
export function evaluateDonorEligibility(
  input: EligibilityInput
): EligibilityAssessment {
  const component = input.component ?? 'Whole Blood';
  const result = evaluateDonationInterval(
    input.lastDonationDate,
    component,
    input.evaluationDate
  );

  const reasons: string[] = [];
  if (!result.eligible && result.reasonCode) {
    reasons.push(result.reasonCode);
  }

  return {
    isEligible: result.eligible,
    reasons,
    nextEligibleDate: result.nextEligibleDate,
    daysRemaining:
      result.minimumIntervalDays !== null && result.daysSinceLastDonation !== null
        ? Math.max(0, result.minimumIntervalDays - result.daysSinceLastDonation)
        : undefined,
  };
}
