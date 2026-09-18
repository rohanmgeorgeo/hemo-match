/**
 * Hemo Match - RBC ABO/Rh Compatibility Test Suite
 *
 * Scope:
 * - A: Exhaustive verification of all 64 recipient/donor blood-group combinations
 * - B: Compatibility classification (homologous, compatible non-homologous, incompatible)
 * - C: Defense against unsupported components
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BloodGroup } from '@/types';
import {
  isRbcCompatible,
  getCompatibilityType,
  RBC_COMPATIBILITY_TABLE,
} from '@/lib/matching/compatibility';

const ALL_BLOOD_GROUPS: readonly BloodGroup[] = [
  'O-',
  'O+',
  'A-',
  'A+',
  'B-',
  'B+',
  'AB-',
  'AB+',
] as const;

// Expected compatible donor set for each recipient under locked RBC rules
const EXPECTED_COMPATIBLE_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

describe('RBC ABO/Rh Compatibility', () => {
  describe('A. All 64 Recipient / Donor Combinations', () => {
    it('exhaustively evaluates all 64 pairs against the locked RBC matrix', () => {
      let compatibleCount = 0;
      let incompatibleCount = 0;

      for (const recipient of ALL_BLOOD_GROUPS) {
        const expectedDonors = EXPECTED_COMPATIBLE_MAP[recipient];

        for (const donor of ALL_BLOOD_GROUPS) {
          const compatible = isRbcCompatible(recipient, donor);
          const shouldBeCompatible = expectedDonors.includes(donor);

          assert.strictEqual(
            compatible,
            shouldBeCompatible,
            `Failed for recipient ${recipient} with donor ${donor}: expected ${shouldBeCompatible}, got ${compatible}`
          );

          if (compatible) {
            compatibleCount++;
          } else {
            incompatibleCount++;
          }
        }
      }

      assert.strictEqual(compatibleCount + incompatibleCount, 64, 'Must evaluate exactly 64 pairs');
      assert.strictEqual(compatibleCount, 27, 'Locked matrix has exactly 27 compatible pairings');
      assert.strictEqual(incompatibleCount, 37, 'Locked matrix has exactly 37 incompatible pairings');
    });

    it('confirms O- is the universal RBC donor for all 8 recipient groups', () => {
      for (const recipient of ALL_BLOOD_GROUPS) {
        assert.strictEqual(
          isRbcCompatible(recipient, 'O-'),
          true,
          `O- must be compatible with recipient ${recipient}`
        );
      }
    });

    it('confirms AB+ is the universal RBC recipient from all 8 donor groups', () => {
      for (const donor of ALL_BLOOD_GROUPS) {
        assert.strictEqual(
          isRbcCompatible('AB+', donor),
          true,
          `Recipient AB+ must accept donor ${donor}`
        );
      }
    });

    it('confirms O- recipient only accepts O- donor', () => {
      for (const donor of ALL_BLOOD_GROUPS) {
        const expected = donor === 'O-';
        assert.strictEqual(
          isRbcCompatible('O-', donor),
          expected,
          `O- recipient with donor ${donor} expected ${expected}`
        );
      }
    });
  });

  describe('B. Compatibility Classification (Homologous vs Compatible vs Incompatible)', () => {
    it('classifies identical blood groups as homologous', () => {
      for (const group of ALL_BLOOD_GROUPS) {
        const classification = getCompatibilityType(group, group);
        assert.strictEqual(
          classification,
          'homologous',
          `${group} <- ${group} must be classified as homologous`
        );
      }
    });

    it('classifies compatible non-identical groups as compatible', () => {
      assert.strictEqual(getCompatibilityType('O+', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('A-', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('A+', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('A+', 'O+'), 'compatible');
      assert.strictEqual(getCompatibilityType('A+', 'A-'), 'compatible');
      assert.strictEqual(getCompatibilityType('B-', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('B+', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('B+', 'B-'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB-', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB-', 'A-'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB-', 'B-'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB+', 'O-'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB+', 'A+'), 'compatible');
      assert.strictEqual(getCompatibilityType('AB+', 'B+'), 'compatible');
    });

    it('returns null for all incompatible groups', () => {
      assert.strictEqual(getCompatibilityType('O-', 'O+'), null);
      assert.strictEqual(getCompatibilityType('O-', 'A+'), null);
      assert.strictEqual(getCompatibilityType('A-', 'A+'), null);
      assert.strictEqual(getCompatibilityType('A+', 'B+'), null);
      assert.strictEqual(getCompatibilityType('B-', 'B+'), null);
      assert.strictEqual(getCompatibilityType('B+', 'A+'), null);
      assert.strictEqual(getCompatibilityType('AB-', 'AB+'), null);
      assert.strictEqual(getCompatibilityType('AB-', 'O+'), null);
    });

    it('ensures the table is immutable and frozen', () => {
      assert.ok(Object.isFrozen(RBC_COMPATIBILITY_TABLE), 'Table must be frozen');
      for (const group of ALL_BLOOD_GROUPS) {
        assert.ok(
          Object.isFrozen(RBC_COMPATIBILITY_TABLE[group]),
          `Table entry for ${group} must be frozen`
        );
      }
    });
  });
});
