/**
 * Hemo Match - Eligibility Rules Subsystem
 *
 * Scope: Evaluates donor medical intervals (e.g. 90 days for whole blood),
 * age, weight, and temporary health deferrals.
 *
 * Note: Business logic is deferred to subsequent implementation milestones.
 */

export interface EligibilityInput {
  lastDonationDate?: string | null;
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
 * Placeholder for evaluating donor eligibility against standard health protocols.
 * Business logic will be implemented in the eligibility milestone.
 */
export function evaluateDonorEligibility(
  _input: EligibilityInput
): EligibilityAssessment {
  // Stubbed for initial foundation
  return {
    isEligible: true,
    reasons: [],
    nextEligibleDate: null,
  };
}
