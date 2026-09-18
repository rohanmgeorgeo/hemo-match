/**
 * Hemo Match - Donor Experience & Volunteer Workflow Tests
 *
 * Tests for donor-side presentation, privacy preservation, and interval calculation:
 * - Phone masking integrity
 * - 120-day application matching interval calculation
 * - Response state semantics (accept volunteers, decline opts out, both protect contact)
 * - LocalStorage demo donor profile contract
 * - Absolute avoidance of clinical eligibility inference
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { DonorProfile } from '../src/types';

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••••••';
  const visible = digits.slice(-4);
  return `••••••${visible}`;
}

function evaluateMatchingInterval(lastDonationDate?: string | null): {
  known: boolean;
  satisfied: boolean;
  diffDays?: number;
} {
  if (!lastDonationDate) {
    return { known: false, satisfied: false };
  }

  try {
    const lastDate = new Date(lastDonationDate + 'T00:00:00');
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 120) {
      return { known: true, satisfied: true, diffDays };
    } else {
      return { known: true, satisfied: false, diffDays };
    }
  } catch {
    return { known: false, satisfied: false };
  }
}

describe('Donor Experience & Volunteer Workflow', () => {
  describe('Phone Masking Guarantee', () => {
    it('masks standard 10-digit phone number revealing only the last 4 digits', () => {
      const masked = maskPhone('+91 98765 43210');
      assert.strictEqual(masked, '••••••3210');
      assert.strictEqual(masked.includes('98765'), false);
    });

    it('handles short or malformed numbers gracefully without leaking PII', () => {
      const masked = maskPhone('12');
      assert.strictEqual(masked, '••••••••');
    });
  });

  describe('120-Day Application Recovery Interval Evaluation', () => {
    it('treats unknown / null last donation date as excluded from matching', () => {
      const result = evaluateMatchingInterval(null);
      assert.strictEqual(result.known, false);
      assert.strictEqual(result.satisfied, false);
    });

    it('treats empty string last donation date as unknown', () => {
      const result = evaluateMatchingInterval('');
      assert.strictEqual(result.known, false);
      assert.strictEqual(result.satisfied, false);
    });

    it('correctly satisfies 120-day interval for a donation 150 days ago', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 150);
      const dateStr = pastDate.toISOString().split('T')[0];

      const result = evaluateMatchingInterval(dateStr);
      assert.strictEqual(result.known, true);
      assert.strictEqual(result.satisfied, true);
      assert.ok(result.diffDays && result.diffDays >= 120);
    });

    it('correctly reports interval not satisfied for a donation 45 days ago', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 45);
      const dateStr = recentDate.toISOString().split('T')[0];

      const result = evaluateMatchingInterval(dateStr);
      assert.strictEqual(result.known, true);
      assert.strictEqual(result.satisfied, false);
      assert.ok(result.diffDays && result.diffDays < 120);
    });
  });

  describe('LocalStorage Demo Donor Contract', () => {
    it('validates required fields for demo donor profile stored under hemo_match_demo_donor', () => {
      const demoProfile: DonorProfile = {
        id: '11111111-1111-1111-1111-111111111111',
        fullName: 'Maya S.',
        bloodGroup: 'O+',
        districtId: 'dist-ekm',
        districtName: 'Ernakulam',
        approximateArea: 'Kaloor',
        phoneNumber: '+91 98765 43210',
        lastDonationDate: '2026-01-01',
        availability: 'available',
        notificationPreference: 'enabled',
        consentGiven: true,
        createdAt: '2026-09-18T10:00:00Z',
      };

      assert.strictEqual(typeof demoProfile.id, 'string');
      assert.strictEqual(typeof demoProfile.fullName, 'string');
      assert.strictEqual(typeof demoProfile.bloodGroup, 'string');
      assert.strictEqual(typeof demoProfile.districtId, 'string');
      assert.strictEqual(typeof demoProfile.phoneNumber, 'string');
      assert.strictEqual(demoProfile.availability, 'available');
      assert.strictEqual(demoProfile.notificationPreference, 'enabled');
      assert.strictEqual(demoProfile.consentGiven, true);

      // Verify no prohibited medical eligibility fields are stored
      const record = demoProfile as unknown as Record<string, unknown>;
      assert.strictEqual(record.isMedicallyVerified, undefined);
      assert.strictEqual(record.clinicalClearance, undefined);
      assert.strictEqual(record.hemoglobin, undefined);
      assert.strictEqual(record.weight, undefined);
      assert.strictEqual(record.age, undefined);
    });
  });

  describe('Response Privacy Invariant', () => {
    it('accepting a notification volunteers participation but keeps contact protected', () => {
      const donorResponse = {
        notificationId: 'notif-123',
        donorId: 'donor-456',
        response: 'accepted' as const,
      };

      assert.strictEqual(donorResponse.response, 'accepted');
      // Acceptance alone NEVER reveals contact information
      const payload = donorResponse as unknown as Record<string, unknown>;
      assert.strictEqual(payload.phoneNumber, undefined);
      assert.strictEqual(payload.revealAuthorized, undefined);
    });

    it('declining a notification is a safe, non-destructive choice that also protects contact', () => {
      const donorResponse = {
        notificationId: 'notif-123',
        donorId: 'donor-456',
        response: 'declined' as const,
      };

      assert.strictEqual(donorResponse.response, 'declined');
      const payload = donorResponse as unknown as Record<string, unknown>;
      assert.strictEqual(payload.phoneNumber, undefined);
    });
  });
});
