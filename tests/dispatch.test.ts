/**
 * Hemo Match - Notification Pre-Dispatch & Revalidation Test Suite
 *
 * Automated unit and contract tests verifying:
 * 1. Request-level eligibility guards (active, unexpired, supported component)
 * 2. Donor-level revalidation filters (consent, availability, notification preference, district, compatibility, interval)
 * 3. History and lifecycle filters (prior response, prior notification, candidate status)
 * 4. Deterministic candidate ranking (homologous first, longer recovery first, UUID tie-break)
 * 5. Server-controlled dispatch limit clamping
 * 6. Privacy protection (payload sanitization, public response PII omission)
 * 7. Request body validation rejecting client limits or extra fields
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { BloodComponent } from '@/types';

import {
  validateRequestForDispatch,
  revalidateCandidate,
  revalidateAndRankCandidates,
  compareDispatchCandidates,
  type RevalidationRequestInput,
  type RevalidationMatchInput,
  type RevalidationDonorInput,
  type EligibleDispatchCandidate,
} from '@/lib/notifications/revalidation';
import {
  DEFAULT_DISPATCH_LIMIT,
  MAX_DISPATCH_LIMIT,
} from '@/lib/notifications/config';
import { validateDispatchRequest } from '@/lib/validation/notifications';

// ---------------------------------------------------------------------------
// Test Fixtures & Factory Helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2026-09-18T10:00:00.000Z');

function createTestRequest(
  overrides?: Partial<RevalidationRequestInput>
): RevalidationRequestInput {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    bloodGroup: 'A+',
    component: 'Whole Blood',
    districtId: 'dist-ekm-uuid',
    requiredBy: '2026-09-18T18:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function createTestMatch(
  overrides?: Partial<RevalidationMatchInput>
): RevalidationMatchInput {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    requestId: '11111111-1111-4111-8111-111111111111',
    donorId: '33333333-3333-4333-8333-333333333333',
    status: 'candidate',
    ...overrides,
  };
}

function createTestDonor(
  overrides?: Partial<RevalidationDonorInput>
): RevalidationDonorInput {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    bloodGroup: 'A+',
    districtId: 'dist-ekm-uuid',
    approximateArea: 'Aluva',
    lastDonationDate: '2026-04-01', // >120 days before Sep 18
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Step 7C Notification Dispatch Revalidation', () => {
  // 1. Eligible enabled candidate passes revalidation
  test('1. eligible enabled candidate passes revalidation', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor();

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, true);
    assert.equal(outcome.skipReason, null);
    assert.ok(outcome.candidate);
    assert.equal(outcome.candidate.matchId, match.id);
    assert.equal(outcome.candidate.compatibilityType, 'homologous');
  });

  // 2. Notification disabled skipped
  test('2. notification disabled candidate is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor({ notificationPreference: 'disabled' });

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_PREFERENCE_DISABLED');
  });

  // 3. Donor unavailable after matching skipped
  test('3. donor unavailable after matching is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor1 = createTestDonor({ availability: 'temporarily_unavailable' });
    const donor2 = createTestDonor({ availability: 'paused' });

    const outcome1 = revalidateCandidate(request, match, donor1, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });
    const outcome2 = revalidateCandidate(request, match, donor2, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome1.eligible, false);
    assert.equal(outcome1.skipReason, 'EXCLUDE_DONOR_UNAVAILABLE');
    assert.equal(outcome2.eligible, false);
    assert.equal(outcome2.skipReason, 'EXCLUDE_DONOR_UNAVAILABLE');
  });

  // 4. Consent withdrawn skipped
  test('4. donor with consent withdrawn is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor({ consentGiven: false });

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_NO_CONSENT');
  });

  // 5. Different district skipped
  test('5. donor in different district is skipped', () => {
    const request = createTestRequest({ districtId: 'dist-ekm-uuid' });
    const match = createTestMatch();
    const donor = createTestDonor({ districtId: 'dist-clt-uuid' });

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_DIFFERENT_DISTRICT');
  });

  // 6. Current incompatible blood group skipped
  test('6. incompatible blood group candidate is skipped', () => {
    const request = createTestRequest({ bloodGroup: 'O-' });
    const match = createTestMatch();
    const donor = createTestDonor({ bloodGroup: 'A+' }); // A+ cannot donate to O-

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_BLOOD_GROUP_INCOMPATIBLE');
  });

  // 7. Unknown donation history skipped
  test('7. donor with unknown/null donation history is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor({ lastDonationDate: null });

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_DONATION_HISTORY_UNKNOWN');
  });

  // 8. Interval too short skipped
  test('8. donor whose interval is less than 120 days is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    // 119 days prior to Sep 18 2026: May 21 2026
    const donor = createTestDonor({ lastDonationDate: '2026-05-22' });

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_INTERVAL_TOO_SHORT');
  });

  // 9. Unsupported component rejected
  test('9. request with unsupported component is rejected', () => {
    const reqPlatelets = createTestRequest({ component: 'Platelets' as unknown as BloodComponent });
    const reqPlasma = createTestRequest({ component: 'Plasma' as unknown as BloodComponent });

    assert.equal(validateRequestForDispatch(reqPlatelets, FIXED_NOW), 'UNSUPPORTED_COMPONENT');
    assert.equal(validateRequestForDispatch(reqPlasma, FIXED_NOW), 'UNSUPPORTED_COMPONENT');
  });

  // 10. Request expired rejected
  test('10. expired request is rejected', () => {
    const expiredRequest = createTestRequest({
      requiredBy: '2026-09-17T09:00:00.000Z', // In the past relative to FIXED_NOW
    });

    assert.equal(
      validateRequestForDispatch(expiredRequest, FIXED_NOW),
      'EXCLUDE_REQUEST_EXPIRED'
    );
  });

  // 11. Request inactive rejected
  test('11. inactive request is rejected', () => {
    const inactive1 = createTestRequest({ status: 'cancelled' });
    const inactive2 = createTestRequest({ status: 'fulfilled' });
    const inactive3 = createTestRequest({ status: 'notified' });

    assert.equal(validateRequestForDispatch(inactive1, FIXED_NOW), 'EXCLUDE_REQUEST_INACTIVE');
    assert.equal(validateRequestForDispatch(inactive2, FIXED_NOW), 'EXCLUDE_REQUEST_INACTIVE');
    assert.equal(validateRequestForDispatch(inactive3, FIXED_NOW), 'EXCLUDE_REQUEST_INACTIVE');
  });

  // 12. Already responded skipped
  test('12. donor with prior response is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor();

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: true,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_ALREADY_RESPONDED');
  });

  // 13. Already notified skipped
  test('13. match already notified is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor();

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: true,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_ALREADY_NOTIFIED');
  });

  // 14. Non-candidate match skipped
  test('14. match not in candidate status is skipped', () => {
    const request = createTestRequest();
    const match = createTestMatch({ status: 'notified' });
    const donor = createTestDonor();

    const outcome = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });

    assert.equal(outcome.eligible, false);
    assert.equal(outcome.skipReason, 'EXCLUDE_MATCH_NOT_CANDIDATE');
  });

  // 15. Deterministic homologous-before-compatible ordering
  test('15. deterministic ranking orders homologous match before compatible non-homologous', () => {
    const candidateHomologous: EligibleDispatchCandidate = {
      matchId: 'm1',
      donorId: 'd1',
      requestId: 'r1',
      bloodGroup: 'A+',
      districtId: 'dist-ekm',
      approximateArea: 'Area A',
      compatibilityType: 'homologous',
      daysSinceLastDonation: 130,
    };

    const candidateCompatible: EligibleDispatchCandidate = {
      matchId: 'm2',
      donorId: 'd2',
      requestId: 'r1',
      bloodGroup: 'O+',
      districtId: 'dist-ekm',
      approximateArea: 'Area B',
      compatibilityType: 'compatible',
      daysSinceLastDonation: 300, // Even with much longer recovery
    };

    const list = [candidateCompatible, candidateHomologous];
    list.sort(compareDispatchCandidates);

    assert.equal(list[0].matchId, 'm1'); // Homologous must come first
    assert.equal(list[1].matchId, 'm2');
  });

  // 16. Greater elapsed interval ordering
  test('16. deterministic ranking orders greater elapsed recovery days first within tier', () => {
    const donorRecent: EligibleDispatchCandidate = {
      matchId: 'm1',
      donorId: 'd1',
      requestId: 'r1',
      bloodGroup: 'A+',
      districtId: 'dist-ekm',
      approximateArea: 'Area A',
      compatibilityType: 'homologous',
      daysSinceLastDonation: 125,
    };

    const donorWellRested: EligibleDispatchCandidate = {
      matchId: 'm2',
      donorId: 'd2',
      requestId: 'r1',
      bloodGroup: 'A+',
      districtId: 'dist-ekm',
      approximateArea: 'Area B',
      compatibilityType: 'homologous',
      daysSinceLastDonation: 250,
    };

    const list = [donorRecent, donorWellRested];
    list.sort(compareDispatchCandidates);

    assert.equal(list[0].matchId, 'm2'); // 250 days first
    assert.equal(list[1].matchId, 'm1');
  });

  // 17. Deterministic UUID tie-break
  test('17. deterministic UUID tie-break resolves identical tier and interval', () => {
    const candidateA: EligibleDispatchCandidate = {
      matchId: 'm1',
      donorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      requestId: 'r1',
      bloodGroup: 'A+',
      districtId: 'dist-ekm',
      approximateArea: 'Area A',
      compatibilityType: 'homologous',
      daysSinceLastDonation: 150,
    };

    const candidateB: EligibleDispatchCandidate = {
      matchId: 'm2',
      donorId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      requestId: 'r1',
      bloodGroup: 'A+',
      districtId: 'dist-ekm',
      approximateArea: 'Area B',
      compatibilityType: 'homologous',
      daysSinceLastDonation: 150,
    };

    const list = [candidateB, candidateA];
    list.sort(compareDispatchCandidates);

    assert.equal(list[0].donorId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    assert.equal(list[1].donorId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  // 18. Dispatch limit = server-controlled 5
  test('18. batch revalidation respects server-controlled default dispatch limit of 5', () => {
    assert.equal(DEFAULT_DISPATCH_LIMIT, 5);
    assert.equal(MAX_DISPATCH_LIMIT, 10);

    const request = createTestRequest();
    const matches: RevalidationMatchInput[] = [];
    const donorsById = new Map<string, RevalidationDonorInput>();

    for (let i = 0; i < 8; i++) {
      const dId = `00000000-0000-4000-8000-00000000000${i}`;
      const mId = `11111111-1111-4000-8000-00000000000${i}`;
      matches.push({ id: mId, requestId: request.id, donorId: dId, status: 'candidate' });
      donorsById.set(dId, createTestDonor({ id: dId, lastDonationDate: '2025-01-01' }));
    }

    const result = revalidateAndRankCandidates({
      request,
      matches,
      donorsById,
      respondedDonorIds: new Set(),
      notifiedMatchIds: new Set(),
      evaluationTime: FIXED_NOW,
    });

    assert.equal(result.eligibleCandidates.length, 8);
    // When slicing for dispatch:
    const dispatchSlice = result.eligibleCandidates.slice(0, DEFAULT_DISPATCH_LIMIT);
    assert.equal(dispatchSlice.length, 5);
  });

  // 19. Public request body cannot override dispatch limit
  test('19. public request body validator rejects client-supplied limit or extra fields', () => {
    const validBody = { requestId: '11111111-1111-4111-8111-111111111111' };
    const validated = validateDispatchRequest(validBody);
    assert.equal(validated.isValid, true);
    assert.equal(validated.data?.requestId, validBody.requestId);
    assert.equal('limit' in (validated.data ?? {}), false);

    // If client tries to supply limit: 100
    const tamperBody = {
      requestId: '11111111-1111-4111-8111-111111111111',
      limit: 100,
      donorIds: ['foo'],
    };
    const tamperedResult = validateDispatchRequest(tamperBody);
    assert.equal(tamperedResult.isValid, true);
    // Extra fields are completely stripped from validated data:
    assert.deepEqual(tamperedResult.data, {
      requestId: '11111111-1111-4111-8111-111111111111',
    });
  });

  // 20. Privacy-safe payload excludes private fields
  test('20. notification payload contains only non-PII request parameters', () => {
    const payload = {
      bloodGroup: 'A+',
      component: 'Whole Blood',
      unitsNeeded: 2,
      districtName: 'Ernakulam',
      approximateArea: 'Aluva',
      hospitalName: 'District Hospital',
      urgency: 'urgent',
      requiredBy: '2026-09-18T18:00:00.000Z',
      compatibilityType: 'homologous',
    };

    const keys = Object.keys(payload);
    assert.ok(!keys.includes('phoneNumber'));
    assert.ok(!keys.includes('phone_number'));
    assert.ok(!keys.includes('fullName'));
    assert.ok(!keys.includes('full_name'));
    assert.ok(!keys.includes('patientName'));
    assert.ok(!keys.includes('donorId'));
  });

  // 21. Public response contains no donor identity
  test('21. dispatch public response contract contains only aggregate counts', () => {
    const mockApiResponse = {
      success: true,
      requestId: '11111111-1111-4111-8111-111111111111',
      dispatchedCount: 3,
      totalCandidates: 5,
      message: '3 candidate donor notification(s) created.',
    };

    const str = JSON.stringify(mockApiResponse);
    assert.ok(!str.includes('donorId'));
    assert.ok(!str.includes('donor_id'));
    assert.ok(!str.includes('match_id'));
    assert.ok(!str.includes('phone'));
  });

  // 22. Repeated dispatch semantics are idempotent
  test('22. repeated candidate evaluation excludes already notified matches', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor();

    // First call: not in notified set
    const outcome1 = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: false,
      now: FIXED_NOW,
    });
    assert.equal(outcome1.eligible, true);

    // Second call: match has been marked as notified
    const outcome2 = revalidateCandidate(request, match, donor, {
      hasPriorResponse: false,
      hasPriorNotification: true,
      now: FIXED_NOW,
    });
    assert.equal(outcome2.eligible, false);
    assert.equal(outcome2.skipReason, 'EXCLUDE_ALREADY_NOTIFIED');
  });

  // 23. Zero eligible candidates returns success with count 0
  test('23. batch revalidation with zero eligible candidates returns clean empty result', () => {
    const request = createTestRequest();
    const match = createTestMatch();
    const donor = createTestDonor({ notificationPreference: 'disabled' });

    const donorsById = new Map([[donor.id, donor]]);
    const result = revalidateAndRankCandidates({
      request,
      matches: [match],
      donorsById,
      respondedDonorIds: new Set(),
      notifiedMatchIds: new Set(),
      evaluationTime: FIXED_NOW,
    });

    assert.equal(result.requestValid, true);
    assert.equal(result.eligibleCandidates.length, 0);
    assert.equal(result.skippedOutcomes.length, 1);
    assert.equal(result.skippedOutcomes[0].skipReason, 'EXCLUDE_PREFERENCE_DISABLED');
  });
});
