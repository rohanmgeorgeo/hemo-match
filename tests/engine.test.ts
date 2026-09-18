/**
 * Hemo Match - Pure Matching Engine Test Suite
 *
 * Scope:
 * - E: Request-level and Donor-level hard filters:
 *      - inactive request
 *      - expired request
 *      - unsupported component
 *      - no consent
 *      - unavailable donor
 *      - paused donor
 *      - different district
 *      - incompatible blood group
 *      - unknown donation history
 *      - interval too short
 *      - prior response
 *      - already matched
 * - F: Notification preference disabled does NOT exclude candidate
 * - G: Deterministic ranking (homologous > elapsed days > UUID tie-break; no approximateArea influence)
 * - H: Privacy verification (no PII in metadata or candidates, anonymized ref, no 0-100 score)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchDonorsForRequest,
  createAnonymizedDonorRef,
  type EngineRequestInput,
  type EngineDonorInput,
} from '@/lib/matching/engine';

describe('Pure Matching Engine', () => {
  const BASE_TIME = new Date('2026-09-18T10:00:00.000Z');
  const FUTURE_REQUIRED_BY = '2026-09-20T12:00:00.000Z';
  const PAST_REQUIRED_BY = '2026-09-15T12:00:00.000Z';

  const VALID_REQUEST: EngineRequestInput = {
    id: 'req-001',
    bloodGroup: 'A+',
    component: 'Whole Blood',
    districtId: 'dist-ekm',
    requiredBy: FUTURE_REQUIRED_BY,
    status: 'active',
  };

  const VALID_HOMOLOGOUS_DONOR: EngineDonorInput = {
    id: 'donor-100',
    bloodGroup: 'A+',
    districtId: 'dist-ekm',
    approximateArea: 'Kaloor',
    lastDonationDate: '2026-05-01', // >120 days ago
    availability: 'available',
    consentGiven: true,
    notificationPreference: 'enabled',
    hasPriorResponse: false,
    isAlreadyMatched: false,
  };

  describe('E. Request-Level Hard Filters', () => {
    it('rejects an inactive request with EXCLUDE_REQUEST_INACTIVE', () => {
      const inactiveReq = { ...VALID_REQUEST, status: 'fulfilled' };
      const result = matchDonorsForRequest(inactiveReq, [VALID_HOMOLOGOUS_DONOR], BASE_TIME);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.requestError, 'EXCLUDE_REQUEST_INACTIVE');
      assert.strictEqual(result.candidates.length, 0);
    });

    it('rejects an expired request with EXCLUDE_REQUEST_EXPIRED', () => {
      const expiredReq = { ...VALID_REQUEST, requiredBy: PAST_REQUIRED_BY };
      const result = matchDonorsForRequest(expiredReq, [VALID_HOMOLOGOUS_DONOR], BASE_TIME);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.requestError, 'EXCLUDE_REQUEST_EXPIRED');
      assert.strictEqual(result.candidates.length, 0);
    });

    it('rejects an unsupported request component with UNSUPPORTED_COMPONENT_FOR_MATCHING', () => {
      const plateletReq = { ...VALID_REQUEST, component: 'Platelets' as const };
      const result = matchDonorsForRequest(plateletReq, [VALID_HOMOLOGOUS_DONOR], BASE_TIME);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.requestError, 'UNSUPPORTED_COMPONENT_FOR_MATCHING');
      assert.strictEqual(result.candidates.length, 0);
    });
  });

  describe('E. Donor-Level Hard Filters', () => {
    it('excludes donor with no consent (EXCLUDE_NO_CONSENT)', () => {
      const donor = { ...VALID_HOMOLOGOUS_DONOR, consentGiven: false };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_NO_CONSENT');
    });

    it('excludes donor who is temporarily unavailable (EXCLUDE_DONOR_UNAVAILABLE)', () => {
      const donor = {
        ...VALID_HOMOLOGOUS_DONOR,
        availability: 'temporarily_unavailable' as const,
      };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_DONOR_UNAVAILABLE');
    });

    it('excludes donor who is paused (EXCLUDE_DONOR_UNAVAILABLE)', () => {
      const donor = {
        ...VALID_HOMOLOGOUS_DONOR,
        availability: 'paused' as const,
      };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_DONOR_UNAVAILABLE');
    });

    it('excludes donor from a different district (EXCLUDE_DIFFERENT_DISTRICT)', () => {
      const donor = { ...VALID_HOMOLOGOUS_DONOR, districtId: 'dist-tvm' };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_DIFFERENT_DISTRICT');
    });

    it('excludes RBC-incompatible donor (EXCLUDE_BLOOD_GROUP_INCOMPATIBLE)', () => {
      // Recipient is A+, Donor is B+
      const donor = { ...VALID_HOMOLOGOUS_DONOR, bloodGroup: 'B+' as const };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE');
    });

    it('excludes donor with NULL last_donation_date (EXCLUDE_DONATION_HISTORY_UNKNOWN)', () => {
      const donor = { ...VALID_HOMOLOGOUS_DONOR, lastDonationDate: null };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');
    });

    it('excludes donor whose interval is less than 120 days (EXCLUDE_INTERVAL_TOO_SHORT)', () => {
      // Evaluation is 2026-09-18. 119 days prior is 2026-05-22.
      const donor = { ...VALID_HOMOLOGOUS_DONOR, lastDonationDate: '2026-05-22' };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_INTERVAL_TOO_SHORT');
    });

    it('excludes donor who has already responded (EXCLUDE_ALREADY_RESPONDED)', () => {
      const donor = { ...VALID_HOMOLOGOUS_DONOR, hasPriorResponse: true };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_ALREADY_RESPONDED');
    });

    it('excludes donor who is already matched (EXCLUDE_ALREADY_MATCHED)', () => {
      const donor = { ...VALID_HOMOLOGOUS_DONOR, isAlreadyMatched: true };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.evaluations[0].exclusionReason, 'EXCLUDE_ALREADY_MATCHED');
    });
  });

  describe('F. Notification Preference Handling', () => {
    it('does NOT exclude an otherwise eligible donor when notificationPreference is disabled', () => {
      const donor: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        notificationPreference: 'disabled',
      };
      const result = matchDonorsForRequest(VALID_REQUEST, [donor], BASE_TIME);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.candidates.length, 1);
      assert.strictEqual(result.candidates[0].donorId, donor.id);
    });
  });

  describe('G. Deterministic Ranking Strategy', () => {
    it('ranks homologous match before compatible non-homologous match regardless of recovery time', () => {
      // Recipient: A+
      // Donor 1: O- (compatible), 300 days recovery
      // Donor 2: A+ (homologous), 125 days recovery
      const compatibleDonor: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-compatible-o-minus',
        bloodGroup: 'O-',
        lastDonationDate: '2025-11-22', // ~300 days
      };
      const homologousDonor: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-homologous-a-plus',
        bloodGroup: 'A+',
        lastDonationDate: '2026-05-15', // ~126 days
      };

      const result = matchDonorsForRequest(
        VALID_REQUEST,
        [compatibleDonor, homologousDonor],
        BASE_TIME
      );

      assert.strictEqual(result.candidates.length, 2);
      assert.strictEqual(result.candidates[0].donorId, 'donor-homologous-a-plus');
      assert.strictEqual(result.candidates[0].compatibilityType, 'homologous');
      assert.strictEqual(result.candidates[1].donorId, 'donor-compatible-o-minus');
      assert.strictEqual(result.candidates[1].compatibilityType, 'compatible');
    });

    it('ranks greater elapsed recovery time before shorter recovery time within the same tier', () => {
      // Both donors homologous (A+)
      // Donor 1: 130 days recovery (2026-05-11)
      // Donor 2: 180 days recovery (2026-03-22)
      const donorShorter: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-shorter',
        lastDonationDate: '2026-05-11',
      };
      const donorLonger: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-longer',
        lastDonationDate: '2026-03-22',
      };

      const result = matchDonorsForRequest(
        VALID_REQUEST,
        [donorShorter, donorLonger],
        BASE_TIME
      );

      assert.strictEqual(result.candidates.length, 2);
      assert.strictEqual(result.candidates[0].donorId, 'donor-longer');
      assert.strictEqual(result.candidates[1].donorId, 'donor-shorter');
    });

    it('breaks ties deterministically using donor UUID ascending', () => {
      // Identical compatibility tier (homologous) and identical recovery date
      const donorB: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: '00000000-0000-0000-0000-000000000002',
        lastDonationDate: '2026-05-01',
      };
      const donorA: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: '00000000-0000-0000-0000-000000000001',
        lastDonationDate: '2026-05-01',
      };

      const result = matchDonorsForRequest(
        VALID_REQUEST,
        [donorB, donorA],
        BASE_TIME
      );

      assert.strictEqual(result.candidates.length, 2);
      assert.strictEqual(result.candidates[0].donorId, '00000000-0000-0000-0000-000000000001');
      assert.strictEqual(result.candidates[1].donorId, '00000000-0000-0000-0000-000000000002');
    });

    it('confirms approximateArea string is NOT used for ranking or distance calculation', () => {
      // Request approximateArea is undefined or different
      // Donor 1 has exact matching area text, Donor 2 has random text
      // But Donor 2 has longer recovery, so Donor 2 must still rank first
      const donorSameArea: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-same-area',
        approximateArea: 'Hospital Vicinity Area',
        lastDonationDate: '2026-05-15',
      };
      const donorDiffArea: EngineDonorInput = {
        ...VALID_HOMOLOGOUS_DONOR,
        id: 'donor-diff-area',
        approximateArea: 'Distant Suburb Area',
        lastDonationDate: '2026-01-01', // Much longer recovery
      };

      const requestWithArea: EngineRequestInput = {
        ...VALID_REQUEST,
        districtId: 'dist-ekm',
      };

      const result = matchDonorsForRequest(
        requestWithArea,
        [donorSameArea, donorDiffArea],
        BASE_TIME
      );

      assert.strictEqual(result.candidates.length, 2);
      // donor-diff-area must rank first due to recovery time; area text similarity is ignored
      assert.strictEqual(result.candidates[0].donorId, 'donor-diff-area');
      assert.strictEqual(result.candidates[1].donorId, 'donor-same-area');
    });
  });

  describe('H. Privacy & Non-PII Match Projections', () => {
    it('produces safe public candidate projections without PII', () => {
      const result = matchDonorsForRequest(
        VALID_REQUEST,
        [VALID_HOMOLOGOUS_DONOR],
        BASE_TIME
      );

      assert.strictEqual(result.candidates.length, 1);
      const candidate = result.candidates[0];

      // Verify no phone number in candidate
      const rawCandidate = candidate as unknown as Record<string, unknown>;
      assert.strictEqual(rawCandidate.phoneNumber, undefined);
      assert.strictEqual(rawCandidate.phone_number, undefined);

      // Verify no full name in candidate
      assert.strictEqual(rawCandidate.fullName, undefined);
      assert.strictEqual(rawCandidate.full_name, undefined);

      // Verify anonymized donor reference
      assert.ok(candidate.anonymizedDonorRef.startsWith('Donor ••••'));
      assert.strictEqual(candidate.anonymizedDonorRef, createAnonymizedDonorRef(VALID_HOMOLOGOUS_DONOR.id));

      // Verify match reasons are purely factual
      assert.ok(candidate.factualMatchReasons.length >= 2);
      for (const reason of candidate.factualMatchReasons) {
        assert.ok(!reason.includes('score'));
        assert.ok(!reason.includes('100'));
      }
    });

    it('ensures match_metadata contains only non-PII structured facts and no arbitrary clinical score', () => {
      const result = matchDonorsForRequest(
        VALID_REQUEST,
        [VALID_HOMOLOGOUS_DONOR],
        BASE_TIME
      );

      const metadata = result.candidates[0].metadata;
      assert.ok(metadata);
      assert.strictEqual(metadata.compatibility_type, 'homologous');
      assert.strictEqual(metadata.recipient_blood_group, 'A+');
      assert.strictEqual(metadata.donor_blood_group, 'A+');
      assert.strictEqual(metadata.minimum_interval_days, 120);
      assert.strictEqual(metadata.eligibility_rule_id, 'RULE_IN_CONSERVATIVE_INTERVAL_120D');
      assert.ok(typeof metadata.days_since_last_donation === 'number');

      // Verify no clinical score field
      const rawMetadata = metadata as unknown as Record<string, unknown>;
      assert.strictEqual(rawMetadata.score, undefined);
      assert.strictEqual(rawMetadata.compatibilityScore, undefined);
      assert.strictEqual(rawMetadata.clinicalScore, undefined);

      // Verify no phone number in metadata
      assert.strictEqual(rawMetadata.phoneNumber, undefined);
      assert.strictEqual(rawMetadata.phone_number, undefined);

      // Verify tie_break_id is NOT in persisted metadata
      // (matches.donor_id already records the relationship; duplication is unnecessary)
      assert.strictEqual(rawMetadata.tie_break_id, undefined);
      const rawRankFactors = metadata.rank_factors as unknown as Record<string, unknown>;
      assert.strictEqual(rawRankFactors.tie_break_id, undefined);
    });
  });
});
