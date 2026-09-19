/**
 * Hemo Match - UI Foundation & Design System Unit Tests
 *
 * Verifies core UI foundation logic:
 * - Theme state resolution and storage keys
 * - Blood group picker contract & completeness
 * - Reusable UI component barrel exports
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VALID_BLOOD_GROUPS } from '../src/lib/validation';
import * as UI from '../src/components/ui';
import { getSystemTheme, getStoredTheme } from '../src/lib/theme';

describe('UI Foundation & Design System', () => {
  describe('Theme Management', () => {
    it('defaults to system/light in non-browser environments without errors', () => {
      const sys = getSystemTheme();
      assert.strictEqual(sys, 'light');

      const stored = getStoredTheme();
      assert.strictEqual(stored, 'system');
    });
  });

  describe('Blood Group Completeness for Picker', () => {
    it('contains all 8 clinical ABO/Rh blood groups in standard order', () => {
      assert.strictEqual(VALID_BLOOD_GROUPS.length, 8);
      const expected = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      assert.deepStrictEqual(VALID_BLOOD_GROUPS, expected);
    });
  });

  describe('Component Barrel Exports', () => {
    it('exports all foundational UI components', () => {
      assert.strictEqual(typeof UI.AppHeader, 'function');
      assert.strictEqual(typeof UI.Card, 'function');
      assert.strictEqual(typeof UI.Badge, 'function');
      assert.strictEqual(typeof UI.Button, 'function');
      assert.strictEqual(typeof UI.BloodGroupPicker, 'function');
      assert.strictEqual(typeof UI.EmergencyBanner, 'function');
      assert.strictEqual(typeof UI.GlowSurface, 'function');
      assert.strictEqual(typeof UI.AppBottomNav, 'function');
    });
  });
});
