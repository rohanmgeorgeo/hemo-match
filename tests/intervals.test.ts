/**
 * Hemo Match - Interval Evaluation Test Suite
 *
 * Scope:
 * - C: Unsupported component rejection (Platelets, Plasma)
 * - D: Preliminary donation interval evaluation:
 *      - NULL / missing history exclusion (EXCLUDE_DONATION_HISTORY_UNKNOWN)
 *      - 119 days excluded (EXCLUDE_INTERVAL_TOO_SHORT)
 *      - exactly 120 days eligible
 *      - 121+ days eligible
 *      - Future donation date handled safely
 *      - Timezone-independent deterministic calendar-day math
 *      - Verification of documented limitations and rule configuration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDonationInterval,
  parseDateToUtcMidnight,
  formatUtcDateString,
  MS_PER_DAY,
} from '@/lib/eligibility/intervals';
import {
  CONSERVATIVE_120D_INTERVAL_RULE,
  getActiveIntervalRule,
} from '@/lib/eligibility/rules';

describe('Interval Evaluation & Rule Configuration', () => {
  const FIXED_EVALUATION_DATE = '2026-09-18T00:00:00.000Z';

  describe('C. Component Scope & Rejection', () => {
    it('rejects Platelets with UNSUPPORTED_COMPONENT_FOR_MATCHING', () => {
      const result = evaluateDonationInterval(
        '2026-01-01',
        'Platelets',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.reasonCode, 'UNSUPPORTED_COMPONENT_FOR_MATCHING');
      assert.strictEqual(result.ruleId, null);
    });

    it('rejects Plasma with UNSUPPORTED_COMPONENT_FOR_MATCHING', () => {
      const result = evaluateDonationInterval(
        '2026-01-01',
        'Plasma',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.reasonCode, 'UNSUPPORTED_COMPONENT_FOR_MATCHING');
      assert.strictEqual(result.ruleId, null);
    });

    it('supports Whole Blood', () => {
      const rule = getActiveIntervalRule('Whole Blood');
      assert.ok(rule);
      assert.strictEqual(rule.id, 'RULE_IN_CONSERVATIVE_INTERVAL_120D');
      assert.strictEqual(rule.minimumIntervalDays, 120);
    });

    it('supports Red Blood Cells', () => {
      const rule = getActiveIntervalRule('Red Blood Cells');
      assert.ok(rule);
      assert.strictEqual(rule.id, 'RULE_IN_CONSERVATIVE_INTERVAL_120D');
      assert.strictEqual(rule.minimumIntervalDays, 120);
    });
  });

  describe('D. Interval Evaluation Logic', () => {
    it('excludes NULL last_donation_date with EXCLUDE_DONATION_HISTORY_UNKNOWN', () => {
      const result = evaluateDonationInterval(
        null,
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.reasonCode, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');
      assert.strictEqual(result.daysSinceLastDonation, null);
      assert.strictEqual(result.minimumIntervalDays, 120);
      assert.strictEqual(result.nextEligibleDate, null);
    });

    it('excludes undefined or empty string last_donation_date as unknown history', () => {
      const resUndef = evaluateDonationInterval(
        undefined,
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(resUndef.eligible, false);
      assert.strictEqual(resUndef.reasonCode, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');

      const resEmpty = evaluateDonationInterval(
        '   ',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(resEmpty.eligible, false);
      assert.strictEqual(resEmpty.reasonCode, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');
    });

    it('excludes 119 calendar days with EXCLUDE_INTERVAL_TOO_SHORT', () => {
      // Evaluation date: 2026-09-18
      // 119 days prior = 2026-05-22
      // May 22 to Sep 18:
      // May: 9 days (31 - 22)
      // Jun: 30 days
      // Jul: 31 days
      // Aug: 31 days
      // Sep: 18 days
      // Total = 9 + 30 + 31 + 31 + 18 = 119 days
      const result = evaluateDonationInterval(
        '2026-05-22',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.reasonCode, 'EXCLUDE_INTERVAL_TOO_SHORT');
      assert.strictEqual(result.daysSinceLastDonation, 119);
      assert.strictEqual(result.minimumIntervalDays, 120);
      assert.strictEqual(result.nextEligibleDate, '2026-09-19');
    });

    it('approves exactly 120 calendar days as eligible', () => {
      // Evaluation date: 2026-09-18
      // 120 days prior = 2026-05-21
      // May 21 to Sep 18:
      // May: 10 days (31 - 21)
      // Jun: 30 days
      // Jul: 31 days
      // Aug: 31 days
      // Sep: 18 days
      // Total = 10 + 30 + 31 + 31 + 18 = 120 days
      const result = evaluateDonationInterval(
        '2026-05-21',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, true);
      assert.strictEqual(result.reasonCode, null);
      assert.strictEqual(result.daysSinceLastDonation, 120);
      assert.strictEqual(result.minimumIntervalDays, 120);
      assert.strictEqual(result.nextEligibleDate, null);
    });

    it('approves 121 calendar days as eligible', () => {
      // Evaluation date: 2026-09-18
      // 121 days prior = 2026-05-20
      const result = evaluateDonationInterval(
        '2026-05-20',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, true);
      assert.strictEqual(result.reasonCode, null);
      assert.strictEqual(result.daysSinceLastDonation, 121);
    });

    it('approves 365 calendar days as eligible', () => {
      const result = evaluateDonationInterval(
        '2025-09-18',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, true);
      assert.strictEqual(result.reasonCode, null);
      assert.strictEqual(result.daysSinceLastDonation, 365);
    });

    it('handles future donation date safely and excludes it', () => {
      // Donation date set in the future relative to evaluation date
      const result = evaluateDonationInterval(
        '2026-09-25',
        'Whole Blood',
        FIXED_EVALUATION_DATE
      );
      assert.strictEqual(result.eligible, false);
      assert.strictEqual(result.reasonCode, 'EXCLUDE_INTERVAL_TOO_SHORT');
      assert.ok(result.daysSinceLastDonation !== null && result.daysSinceLastDonation < 0);
    });

    it('demonstrates timezone-independent deterministic calendar math', () => {
      const d1 = parseDateToUtcMidnight('2026-05-21T23:59:59.999Z');
      const d2 = parseDateToUtcMidnight('2026-09-18T00:00:00.000Z');
      assert.ok(d1 !== null && d2 !== null);
      const days = Math.floor((d2 - d1) / MS_PER_DAY);
      assert.strictEqual(days, 120, 'Midnight normalization must be unaffected by sub-day times');

      const dateStr = formatUtcDateString(d1);
      assert.strictEqual(dateStr, '2026-05-21');
    });

    it('validates rule configuration and clinical notes transparency', () => {
      assert.strictEqual(CONSERVATIVE_120D_INTERVAL_RULE.jurisdiction, 'IN-National');
      assert.strictEqual(CONSERVATIVE_120D_INTERVAL_RULE.minimumIntervalDays, 120);
      assert.ok(CONSERVATIVE_120D_INTERVAL_RULE.notes.includes('90 days for male'));
      assert.ok(CONSERVATIVE_120D_INTERVAL_RULE.notes.includes('120 days for female'));
      // Confirm the MVP schema-constraint explanation is present
      assert.ok(CONSERVATIVE_120D_INTERVAL_RULE.notes.includes('does not collect the information required'));
      // Confirm the clinical boundary statement is present
      assert.ok(CONSERVATIVE_120D_INTERVAL_RULE.notes.includes('Final donor eligibility is determined by qualified blood-bank/clinical personnel'));
      assert.ok(CONSERVATIVE_120D_INTERVAL_RULE.limitations.length >= 3);
    });
  });
});
