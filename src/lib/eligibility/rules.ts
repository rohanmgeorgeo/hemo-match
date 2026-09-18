/**
 * Hemo Match - Eligibility Rule Configuration Subsystem
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final donor screening, deferral evaluation, and health
 * clearance must be performed by qualified medical officers at the licensed blood bank.
 *
 * INTERVAL POLICY RATIONALE & LIMITATIONS:
 * Under statutory Indian blood banking guidelines (Drugs and Cosmetics Rules, 1945,
 * Schedule F, Part XII-B, and National Blood Transfusion Council / NACO guidelines),
 * whole-blood donation intervals are sex-specific:
 *   - 90 calendar days for male donors
 *   - 120 calendar days for female donors
 *
 * CURRENT SCHEMA LIMITATION:
 * The current Hemo Match donor registration schema does NOT collect donor biological
 * sex or gender. Additionally, the schema does not record the specific component type
 * of the donor's previous donation (e.g. whole blood vs red cell apheresis vs platelets).
 *
 * CONSERVATIVE MATCHING POLICY:
 * Hemo Match currently applies a conservative 120-day preliminary matching interval
 * because the MVP does not collect the information required to select a more specific
 * interval rule (donor sex/gender and previous donation component type are both absent
 * from the current schema). Final donor eligibility is determined by qualified
 * blood-bank/clinical personnel, not by this software.
 *
 * IMPORTANT: This 120-day rule is an application-level matching policy chosen to fit
 * current schema constraints; it must NOT be described as a universal clinical guideline
 * or final medical clearance.
 */

import type { BloodComponent } from '@/types';

export interface EligibilityRuleConfig {
  readonly id: string;
  readonly name: string;
  readonly supportedComponents: readonly BloodComponent[];
  readonly minimumIntervalDays: number;
  readonly jurisdiction: string;
  readonly sourceReference: string;
  readonly sourceLabel: string;
  readonly effectiveDate: string;
  readonly active: boolean;
  readonly notes: string;
  readonly limitations: readonly string[];
}

/**
 * Baseline conservative preliminary interval rule for India (120 calendar days).
 */
export const CONSERVATIVE_120D_INTERVAL_RULE: EligibilityRuleConfig = Object.freeze({
  id: 'RULE_IN_CONSERVATIVE_INTERVAL_120D',
  name: 'India Preliminary Conservative Donation Interval Policy',
  supportedComponents: Object.freeze(['Whole Blood', 'Red Blood Cells'] as const),
  minimumIntervalDays: 120,
  jurisdiction: 'IN-National',
  sourceReference:
    'Drugs and Cosmetics Rules, 1945 (Schedule F, Part XII-B) / National Blood Transfusion Council (NBTC) Donor Selection Guidelines',
  sourceLabel:
    'NBTC / Indian National Blood Safety Framework (Conservative Application Baseline)',
  effectiveDate: '2026-01-01',
  active: true,
  notes:
    'Indian whole-blood donation guidelines establish sex-specific minimum intervals: 90 days for male donors and 120 days for female donors. Hemo Match currently applies a conservative 120-day preliminary matching interval because the MVP does not collect the information required to select a more specific interval rule — donor biological sex/gender and previous donation component type are both absent from the current registration schema. Final donor eligibility is determined by qualified blood-bank/clinical personnel, not by this software. This policy must not be described as a universal clinical standard.',
  limitations: Object.freeze([
    'Donor biological sex/gender is not collected in the registration schema; cannot select sex-specific 90-day male interval.',
    'Previous donation component type is not tracked; cannot differentiate whole blood, red cell apheresis, or platelet donations.',
    'Conservative 120-day interval is an application-level matching heuristic, not a universal clinical mandate.',
    'Final donor eligibility, deferral, and clinical screening must be determined by qualified medical staff at the licensed blood bank.',
  ]),
});

/**
 * Active eligibility rule registry.
 */
export const ACTIVE_ELIGIBILITY_RULES: readonly EligibilityRuleConfig[] = Object.freeze([
  CONSERVATIVE_120D_INTERVAL_RULE,
]);

/**
 * Finds an active interval rule applicable to the requested blood component.
 *
 * @param component The requested blood component
 * @returns The active EligibilityRuleConfig or null if no configured rule applies
 */
export function getActiveIntervalRule(component: BloodComponent): EligibilityRuleConfig | null {
  const rule = ACTIVE_ELIGIBILITY_RULES.find(
    (r) => r.active && r.supportedComponents.includes(component)
  );
  return rule ?? null;
}
