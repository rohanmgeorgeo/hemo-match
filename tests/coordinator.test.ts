/**
 * Hemo Match - Coordinator Dashboard Unit Tests
 *
 * Scope:
 * - Deterministic "Needs Attention" evaluation rules
 * - Operational metrics calculations (active, fulfilled, needs attention, counts)
 * - Strict privacy invariants (anonymization, zero donor PII, absence of phone/email/coords)
 * - Empty state and lifecycle timeline construction
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRequestAttention,
  calculateCoordinatorMetrics,
  formatAnonymizedDonorId,
  buildCoordinatorTimeline,
} from '@/lib/coordinator/projection';
import type { CoordinatorCandidateSummary, CoordinatorRequestSummary } from '@/types/coordinator';

describe('Step 16 — Coordinator Operations Dashboard Unit Tests', () => {
  describe('Deterministic Needs Attention Evaluation', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const testNow = new Date();

    it('flags active request with zero discovered candidates as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'active',
        requiredBy: futureDate,
        matchCount: 0,
        acceptedCount: 0,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, true);
      assert.deepStrictEqual(result.attentionReasons, ['Zero eligible candidates matched']);
    });

    it('does not flag active request with candidates discovered as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'active',
        requiredBy: futureDate,
        matchCount: 3,
        acceptedCount: 0,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, false);
      assert.strictEqual(result.attentionReasons.length, 0);
    });

    it('flags notified request with zero acceptances as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'notified',
        requiredBy: futureDate,
        matchCount: 2,
        acceptedCount: 0,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, true);
      assert.deepStrictEqual(result.attentionReasons, ['Awaiting donor acceptance']);
    });

    it('does not flag notified request with at least one acceptance as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'notified',
        requiredBy: futureDate,
        matchCount: 2,
        acceptedCount: 1,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, false);
    });

    it('flags active/notified request past deadline as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'notified',
        requiredBy: pastDate,
        matchCount: 3,
        acceptedCount: 1,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, true);
      assert.ok(result.attentionReasons.includes('Past required deadline without fulfillment'));
    });

    it('flags explicitly expired request as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'expired',
        requiredBy: pastDate,
        matchCount: 2,
        acceptedCount: 0,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, true);
      assert.ok(result.attentionReasons.includes('Request expired unfulfilled'));
    });

    it('does not flag fulfilled request as needing attention even if past deadline', () => {
      const result = evaluateRequestAttention({
        status: 'fulfilled',
        requiredBy: pastDate,
        matchCount: 2,
        acceptedCount: 2,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, false);
      assert.strictEqual(result.attentionReasons.length, 0);
    });

    it('does not flag cancelled request as needing attention', () => {
      const result = evaluateRequestAttention({
        status: 'cancelled',
        requiredBy: futureDate,
        matchCount: 0,
        acceptedCount: 0,
        now: testNow,
      });

      assert.strictEqual(result.needsAttention, false);
    });
  });

  describe('Operational Metrics Aggregation', () => {
    function createMockRequest(overrides: Partial<CoordinatorRequestSummary> = {}): CoordinatorRequestSummary {
      return {
        id: '11111111-1111-4111-8111-111111111111',
        bloodGroup: 'A+',
        component: 'Whole Blood',
        unitsNeeded: 1,
        districtId: 'dist-ekm',
        districtName: 'Ernakulam',
        approximateArea: 'Marine Drive',
        hospitalName: 'General Hospital',
        requiredBy: new Date().toISOString(),
        urgency: 'urgent',
        status: 'active',
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasCoordinates: true,
        matchCount: 3,
        notificationCount: 2,
        acceptedCount: 1,
        declinedCount: 0,
        contactRevealCount: 1,
        isContactRevealed: true,
        needsAttention: false,
        attentionReasons: [],
        ...overrides,
      };
    }

    it('computes correct aggregate metrics from real request summaries', () => {
      const requests: CoordinatorRequestSummary[] = [
        createMockRequest({ id: 'req-1', status: 'active', matchCount: 3, notificationCount: 0, acceptedCount: 0 }),
        createMockRequest({ id: 'req-2', status: 'notified', matchCount: 2, notificationCount: 2, acceptedCount: 1 }),
        createMockRequest({ id: 'req-3', status: 'fulfilled', matchCount: 4, notificationCount: 2, acceptedCount: 2 }),
        createMockRequest({ id: 'req-4', status: 'expired', matchCount: 1, notificationCount: 1, acceptedCount: 0, needsAttention: true }),
      ];

      const metrics = calculateCoordinatorMetrics(requests);

      assert.strictEqual(metrics.totalRequests, 4);
      assert.strictEqual(metrics.activeRequests, 2, 'Active + notified count as active');
      assert.strictEqual(metrics.fulfilledRequests, 1);
      assert.strictEqual(metrics.needsAttentionCount, 1);
      assert.strictEqual(metrics.totalMatches, 10);
      assert.strictEqual(metrics.totalNotified, 5);
      assert.strictEqual(metrics.totalAccepted, 3);
      assert.strictEqual(metrics.totalDeclined, 0);
    });

    it('handles empty requests list safely with zeroed metrics', () => {
      const metrics = calculateCoordinatorMetrics([]);

      assert.strictEqual(metrics.totalRequests, 0);
      assert.strictEqual(metrics.activeRequests, 0);
      assert.strictEqual(metrics.needsAttentionCount, 0);
      assert.strictEqual(metrics.totalMatches, 0);
      assert.strictEqual(metrics.totalNotified, 0);
      assert.strictEqual(metrics.totalAccepted, 0);
      assert.strictEqual(metrics.totalDeclined, 0);
      assert.strictEqual(metrics.fulfilledRequests, 0);
    });
  });

  describe('Privacy Boundary & Anonymization Invariants', () => {
    it('anonymizes donor UUIDs into privacy-safe references', () => {
      const anonymized1 = formatAnonymizedDonorId('a0000000-0000-4000-8000-000000000001');
      assert.strictEqual(anonymized1, 'Donor •••• 0001');

      const anonymized2 = formatAnonymizedDonorId('9b4f7382-1234-4567-890a-abcdef123456');
      assert.strictEqual(anonymized2, 'Donor •••• 3456');
    });

    it('handles malformed or missing donor IDs gracefully', () => {
      // @ts-expect-error testing null safety
      assert.strictEqual(formatAnonymizedDonorId(null), 'Donor •••• UNKNOWN');
      // @ts-expect-error testing undefined safety
      assert.strictEqual(formatAnonymizedDonorId(undefined), 'Donor •••• UNKNOWN');
      assert.strictEqual(formatAnonymizedDonorId(''), 'Donor •••• UNKNOWN');
    });

    it('confirms candidate summary contains strictly non-PII fields', () => {
      const candidate: CoordinatorCandidateSummary = {
        matchId: 'm-1',
        anonymizedDonorId: formatAnonymizedDonorId('a0000000-0000-4000-8000-000000000001'),
        bloodGroup: 'A+',
        approximateArea: 'Kaloor',
        matchStatus: 'accepted',
        matchCreatedAt: new Date().toISOString(),
        responseStatus: 'accepted',
        respondedAt: new Date().toISOString(),
        isContactRevealed: true,
      };

      // Assert phone, email, and coordinates are not present on candidate object
      assert.strictEqual('phoneNumber' in candidate, false);
      assert.strictEqual('phone_number' in candidate, false);
      assert.strictEqual('email' in candidate, false);
      assert.strictEqual('locationLatitude' in candidate, false);
      assert.strictEqual('locationLongitude' in candidate, false);
      assert.strictEqual('location_latitude' in candidate, false);
      assert.strictEqual('fullName' in candidate, false);
      assert.strictEqual('full_name' in candidate, false);
      assert.strictEqual(candidate.anonymizedDonorId, 'Donor •••• 0001');
    });
  });

  describe('Lifecycle Timeline Construction', () => {
    it('constructs a multi-stage operational timeline from real workflow events', () => {
      const summary: CoordinatorRequestSummary = {
        id: 'req-1',
        bloodGroup: 'A+',
        component: 'Whole Blood',
        unitsNeeded: 2,
        districtId: 'dist-ekm',
        districtName: 'Ernakulam',
        approximateArea: 'Marine Drive',
        hospitalName: 'General Hospital',
        requiredBy: new Date().toISOString(),
        urgency: 'urgent',
        status: 'notified',
        notes: null,
        createdAt: '2026-09-19T10:00:00Z',
        updatedAt: '2026-09-19T10:15:00Z',
        hasCoordinates: true,
        matchCount: 2,
        notificationCount: 2,
        acceptedCount: 1,
        declinedCount: 0,
        contactRevealCount: 1,
        isContactRevealed: true,
        needsAttention: false,
        attentionReasons: [],
      };

      const candidates: CoordinatorCandidateSummary[] = [
        {
          matchId: 'm-1',
          anonymizedDonorId: 'Donor •••• 0001',
          bloodGroup: 'A+',
          approximateArea: 'Kaloor',
          matchStatus: 'accepted',
          matchCreatedAt: '2026-09-19T10:05:00Z',
          responseStatus: 'accepted',
          respondedAt: '2026-09-19T10:12:00Z',
          isContactRevealed: true,
        },
      ];

      const reveals = [
        {
          revealedAt: '2026-09-19T10:15:00Z',
          trigger: 'donor_accepted',
          reason: 'Authorized coordination',
        },
      ];

      const timeline = buildCoordinatorTimeline(summary, candidates, reveals);

      assert.strictEqual(timeline.length, 5);
      assert.strictEqual(timeline[0].stage, 'created');
      assert.strictEqual(timeline[1].stage, 'matching');
      assert.strictEqual(timeline[2].stage, 'notification');
      assert.strictEqual(timeline[3].stage, 'response');
      assert.strictEqual(timeline[4].stage, 'reveal');
      assert.ok(timeline[0].details.includes('General Hospital'));
      assert.ok(timeline[1].details.includes('2 candidate donors'));
      assert.ok(timeline[2].details.includes('2 opted-in'));
      assert.ok(timeline[3].details.includes('1 donor confirmed acceptance'));
      assert.ok(timeline[4].details.includes('Minimum contact unmasked'));
    });
  });
});
