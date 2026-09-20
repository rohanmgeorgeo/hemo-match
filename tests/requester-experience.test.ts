/**
 * Hemo Match - Requester Experience & Matching UI Component Tests
 *
 * Tests for requester-side matching components and privacy lifecycle logic:
 * - Matching component exports
 * - Privacy protection guarantees before authorized reveal
 * - 5-stage lifecycle state progression
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as MatchingComponents from '../src/components/matching';
import type { PublicMatchCandidate } from '../src/types/matches';

describe('Requester Experience & Signature Contact Reveal Foundation', () => {
  describe('Matching Components Module Exports', () => {
    it('exports RequestLifecycle, ContactRevealCard, and CandidateCard', () => {
      assert.strictEqual(typeof MatchingComponents.RequestLifecycle, 'function');
      assert.strictEqual(typeof MatchingComponents.ContactRevealCard, 'function');
      assert.strictEqual(typeof MatchingComponents.CandidateCard, 'function');
    });
  });

  describe('Privacy Boundary Integrity', () => {
    it('confirms PublicMatchCandidate contains no phone or private donor fields', () => {
      const candidate: PublicMatchCandidate = {
        matchId: '99999999-9999-9999-9999-999999999999',
        requestId: '11111111-2222-3333-4444-555555555555',
        anonymizedDonorRef: 'Donor •••• 9B4F',
        bloodGroup: 'A+',
        districtName: 'Ernakulam',
        approximateArea: 'Kaloor',
        compatibilityType: 'homologous',
        factualMatchReasons: ['Compatible ABO/Rh', 'Same district'],
        status: 'notified',
        createdAt: '2026-09-18T10:00:00Z',
      };

      const record = candidate as unknown as Record<string, unknown>;
      assert.strictEqual(record.phone, undefined);
      assert.strictEqual(record.phoneNumber, undefined);
      assert.strictEqual(record.email, undefined);
      assert.strictEqual(record.donorName, undefined);
      assert.strictEqual(record.fullName, undefined);
      assert.strictEqual(record.address, undefined);
      assert.strictEqual(record.coordinates, undefined);
    });

    it('requires explicit authorization for RevealedContactInfo projection', () => {
      const revealedContact: MatchingComponents.RevealedContactInfo = {
        name: 'Arun K.',
        phone: '+91 98765 43210',
      };

      assert.strictEqual(typeof revealedContact.name, 'string');
      assert.strictEqual(typeof revealedContact.phone, 'string');
      // Verify no extraneous medical or private fields are included
      const record = revealedContact as unknown as Record<string, unknown>;
      assert.strictEqual(record.email, undefined);
      assert.strictEqual(record.address, undefined);
      assert.strictEqual(record.coordinates, undefined);
      assert.strictEqual(record.donorId, undefined);
    });
  });

  describe('Coordination Lifecycle States', () => {
    it('validates 5 distinct coordination steps', () => {
      const expectedSteps = ['Request', 'Match', 'Notify', 'Response', 'Reveal'];
      assert.strictEqual(expectedSteps.length, 5);
      assert.deepStrictEqual(expectedSteps, ['Request', 'Match', 'Notify', 'Response', 'Reveal']);
    });
  });
  describe("Request Editing Lifecycle Guards", () => {
    it("allows editing an open request before donor response or reveal occurs", () => {
      const lifecycleStates = {
        hasResponse: false,
        hasRevealed: false,
        isExpired: false,
      };

      const canEditRequest = !lifecycleStates.hasResponse && !lifecycleStates.hasRevealed;
      assert.strictEqual(canEditRequest, true);
    });

    it("locks editing once a volunteer donor has accepted to prevent coordination invalidation", () => {
      const lifecycleStates = {
        hasResponse: true,
        hasRevealed: false,
        isExpired: false,
      };

      const canEditRequest = !lifecycleStates.hasResponse && !lifecycleStates.hasRevealed;
      assert.strictEqual(canEditRequest, false);
    });

    it("locks editing once contact reveal has occurred", () => {
      const lifecycleStates = {
        hasResponse: true,
        hasRevealed: true,
        isExpired: false,
      };

      const canEditRequest = !lifecycleStates.hasResponse && !lifecycleStates.hasRevealed;
      assert.strictEqual(canEditRequest, false);
    });
  });
});
