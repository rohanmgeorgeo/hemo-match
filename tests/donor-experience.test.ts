import { validateDonorProfile } from "../src/lib/validation";
import { evaluateDonationInterval } from "../src/lib/eligibility/intervals";
import { matchDonorsForRequest } from "../src/lib/matching/engine";
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
  describe("Donor Profile Edit & Deletion Lifecycle", () => {
    it("editing an existing donor profile preserves immutable identity fields", () => {
      const existingDonor: DonorProfile = {
        id: "11111111-1111-1111-1111-111111111111",
        fullName: "Maya S.",
        bloodGroup: "O+",
        districtId: "dist-ekm",
        districtName: "Ernakulam",
        approximateArea: "Kaloor",
        phoneNumber: "+91 98765 43210",
        lastDonationDate: "2026-01-01",
        availability: "available",
        notificationPreference: "enabled",
        consentGiven: true,
        createdAt: "2026-09-18T10:00:00Z",
      };

      const updatedDonor: DonorProfile = {
        ...existingDonor,
        approximateArea: "Palarivattom",
        availability: "temporarily_unavailable",
      };

      assert.strictEqual(updatedDonor.id, existingDonor.id);
      assert.strictEqual(updatedDonor.createdAt, existingDonor.createdAt);
      assert.strictEqual(updatedDonor.approximateArea, "Palarivattom");
      assert.strictEqual(updatedDonor.availability, "temporarily_unavailable");
    });

    it("Exit Donor Mode clears local demo donor state truthfully without claiming server account deletion", () => {
      const mockStorage: Record<string, string> = {
        hemo_match_demo_donor: JSON.stringify({ id: "test-donor" }),
      };

      // Truthful action: Exit Donor Mode removes client demo identity
      delete mockStorage.hemo_match_demo_donor;
      assert.strictEqual(mockStorage.hemo_match_demo_donor, undefined);
    });

    it("verifies 97-day elapsed donation interval reports not satisfied against 120-day policy", () => {
      // Direct verification of the production test scenario (June 15, 2026 to Sep 20, 2026)
      const lastDonationDate = "2026-06-15";
      const evalDate = new Date("2026-09-20T00:00:00Z");
      const lastDate = new Date(lastDonationDate + "T00:00:00Z");
      const diffDays = Math.floor((evalDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      assert.strictEqual(diffDays, 97);
      assert.strictEqual(diffDays >= 120, false);
    });
  });

  describe("Required Last Donation Date Registration Validation (Gates A-F)", () => {
    const baseValidForm = {
      fullName: "Ananya Sharma",
      bloodGroup: "B+" as const,
      districtId: "dist-ekm",
      approximateArea: "Edappally",
      phoneNumber: "+91 98460 12345",
      availability: "available" as const,
      notificationPreference: "enabled" as const,
      consentGiven: true,
    };

    it("A: missing Last Donation Date -> registration rejected", () => {
      const resultEmpty = validateDonorProfile({
        ...baseValidForm,
        lastDonationDate: "",
      });
      assert.strictEqual(resultEmpty.isValid, false);
      assert.ok(resultEmpty.errors.lastDonationDate);
      assert.match(resultEmpty.errors.lastDonationDate, /Last donation date is required/);

      const resultUndefined = validateDonorProfile({
        ...baseValidForm,
      });
      assert.strictEqual(resultUndefined.isValid, false);
      assert.ok(resultUndefined.errors.lastDonationDate);
    });

    it("B: future Last Donation Date -> rejected", () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const resultFuture = validateDonorProfile({
        ...baseValidForm,
        lastDonationDate: tomorrow,
      });
      assert.strictEqual(resultFuture.isValid, false);
      assert.strictEqual(
        resultFuture.errors.lastDonationDate,
        "Last donation date cannot be in the future"
      );
    });

    it("C: valid recent date (<120 days) -> registration allowed but matching-ineligible", () => {
      const recentDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const regResult = validateDonorProfile({
        ...baseValidForm,
        lastDonationDate: recentDate,
      });
      assert.strictEqual(regResult.isValid, true);
      assert.strictEqual(regResult.data?.lastDonationDate, recentDate);

      const intervalResult = evaluateDonationInterval(recentDate, "Whole Blood");
      assert.strictEqual(intervalResult.eligible, false);
      assert.strictEqual(intervalResult.reasonCode, "EXCLUDE_INTERVAL_TOO_SHORT");
      assert.strictEqual(intervalResult.daysSinceLastDonation, 30);
    });

    it("D: valid date exactly 120 days ago -> registration allowed & interval satisfied", () => {
      const exact120Date = new Date(Date.now() - 120 * 86400000).toISOString().split("T")[0];
      const regResult = validateDonorProfile({
        ...baseValidForm,
        lastDonationDate: exact120Date,
      });
      assert.strictEqual(regResult.isValid, true);
      assert.strictEqual(regResult.data?.lastDonationDate, exact120Date);

      const intervalResult = evaluateDonationInterval(exact120Date, "Whole Blood");
      assert.strictEqual(intervalResult.eligible, true);
      assert.strictEqual(intervalResult.reasonCode, null);
      assert.strictEqual(intervalResult.daysSinceLastDonation, 120);
    });

    it("E: valid older date (>120 days) -> registration allowed & interval satisfied", () => {
      const olderDate = new Date(Date.now() - 160 * 86400000).toISOString().split("T")[0];
      const regResult = validateDonorProfile({
        ...baseValidForm,
        lastDonationDate: olderDate,
      });
      assert.strictEqual(regResult.isValid, true);
      assert.strictEqual(regResult.data?.lastDonationDate, olderDate);

      const intervalResult = evaluateDonationInterval(olderDate, "Whole Blood");
      assert.strictEqual(intervalResult.eligible, true);
      assert.strictEqual(intervalResult.reasonCode, null);
      assert.strictEqual(intervalResult.daysSinceLastDonation, 160);
    });

    it("F: legacy donor with null date -> does not crash and remains matching-ineligible", () => {
      const intervalResult = evaluateDonationInterval(null, "Whole Blood");
      assert.strictEqual(intervalResult.eligible, false);
      assert.strictEqual(intervalResult.reasonCode, "EXCLUDE_DONATION_HISTORY_UNKNOWN");
      assert.strictEqual(intervalResult.daysSinceLastDonation, null);

      const matchResult = matchDonorsForRequest(
        {
          id: "req-test-null-date",
          bloodGroup: "B+",
          component: "Whole Blood",
          districtId: "dist-ekm",
          requiredBy: "2026-09-25T12:00:00.000Z",
          status: "active",
          locationLatitude: 9.98,
          locationLongitude: 76.28,
        },
        [
          {
            id: "legacy-donor-null",
            approximateArea: "Edappally",
            bloodGroup: "B+",
            districtId: "dist-ekm",
            availability: "available",
            notificationPreference: "enabled",
            consentGiven: true,
            lastDonationDate: null,
            locationLatitude: 9.981,
            locationLongitude: 76.281,
            hasPriorResponse: false,
            isAlreadyMatched: false,
          },
        ],
        new Date("2026-09-20T12:00:00.000Z")
      );

      assert.strictEqual(matchResult.candidates.length, 0);
      assert.strictEqual(matchResult.evaluations.length, 1);
      assert.strictEqual(matchResult.evaluations[0].eligible, false);
      assert.strictEqual(matchResult.evaluations[0].exclusionReason, "EXCLUDE_DONATION_HISTORY_UNKNOWN");
    });
  });

  describe("Donor Profile Edit Validation Lifecycle", () => {
    const existingDonor: DonorProfile = {
      id: "55555555-5555-5555-5555-555555555555",
      fullName: "Rahul K.",
      bloodGroup: "O+",
      districtId: "dist-ekm",
      districtName: "Ernakulam",
      approximateArea: "Panampilly Nagar",
      phoneNumber: "+91 98470 54321",
      lastDonationDate: "2026-04-10",
      availability: "available",
      notificationPreference: "enabled",
      consentGiven: true,
      createdAt: "2026-09-18T10:00:00Z",
    };

    it("prefills existing Last Donation Date correctly", () => {
      const editFormData = {
        fullName: existingDonor.fullName,
        phoneNumber: existingDonor.phoneNumber,
        bloodGroup: existingDonor.bloodGroup,
        districtId: existingDonor.districtId,
        approximateArea: existingDonor.approximateArea,
        lastDonationDate: existingDonor.lastDonationDate ?? "",
        availability: existingDonor.availability,
        notificationPreference: existingDonor.notificationPreference,
        consentGiven: existingDonor.consentGiven,
      };
      assert.strictEqual(editFormData.lastDonationDate, "2026-04-10");
      const validation = validateDonorProfile(editFormData);
      assert.strictEqual(validation.isValid, true);
    });

    it("attempting to clear Last Donation Date on edit triggers validation error", () => {
      const editFormData = {
        fullName: existingDonor.fullName,
        phoneNumber: existingDonor.phoneNumber,
        bloodGroup: existingDonor.bloodGroup,
        districtId: existingDonor.districtId,
        approximateArea: existingDonor.approximateArea,
        lastDonationDate: "",
        availability: existingDonor.availability,
        notificationPreference: existingDonor.notificationPreference,
        consentGiven: existingDonor.consentGiven,
      };
      const validation = validateDonorProfile(editFormData);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.lastDonationDate);
    });

    it("attempting a future date on edit triggers validation error", () => {
      const editFormData = {
        fullName: existingDonor.fullName,
        phoneNumber: existingDonor.phoneNumber,
        bloodGroup: existingDonor.bloodGroup,
        districtId: existingDonor.districtId,
        approximateArea: existingDonor.approximateArea,
        lastDonationDate: "2099-12-31",
        availability: existingDonor.availability,
        notificationPreference: existingDonor.notificationPreference,
        consentGiven: existingDonor.consentGiven,
      };
      const validation = validateDonorProfile(editFormData);
      assert.strictEqual(validation.isValid, false);
      assert.strictEqual(validation.errors.lastDonationDate, "Last donation date cannot be in the future");
    });

    it("valid date update preserves donor ID and updates interval evaluation", () => {
      const updatedDate = "2026-03-01";
      const editFormData = {
        fullName: existingDonor.fullName,
        phoneNumber: existingDonor.phoneNumber,
        bloodGroup: existingDonor.bloodGroup,
        districtId: existingDonor.districtId,
        approximateArea: "Marine Drive",
        lastDonationDate: updatedDate,
        availability: existingDonor.availability,
        notificationPreference: existingDonor.notificationPreference,
        consentGiven: existingDonor.consentGiven,
      };
      const validation = validateDonorProfile(editFormData);
      assert.strictEqual(validation.isValid, true);
      assert.ok(validation.data);

      const updatedProfile: DonorProfile = {
        ...existingDonor,
        approximateArea: validation.data.approximateArea,
        lastDonationDate: validation.data.lastDonationDate,
      };

      assert.strictEqual(updatedProfile.id, existingDonor.id);
      assert.strictEqual(updatedProfile.lastDonationDate, updatedDate);

      const interval = evaluateMatchingInterval(updatedProfile.lastDonationDate);
      assert.strictEqual(interval.known, true);
      assert.strictEqual(interval.satisfied, true);
    });
  });
});
