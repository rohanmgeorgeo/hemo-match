/**
 * Hemo Match - Validation Subsystem
 *
 * Scope: Input sanitization, blood group format verification, district validation,
 * and payload integrity checks for blood requests and donor registrations.
 *
 * Note: Business logic is deferred to subsequent implementation milestones.
 */

import type { BloodGroup, UrgencyLevel } from '@/types';

export const VALID_BLOOD_GROUPS: readonly BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export const VALID_URGENCY_LEVELS: readonly UrgencyLevel[] = [
  'standard',
  'urgent',
  'critical',
] as const;

export interface BloodRequestInput {
  bloodGroup: string;
  unitsNeeded: number;
  districtId: string;
  requesterContact: string;
  patientName?: string;
  hospitalName?: string;
  urgency: string;
}

export interface DonorRegistrationInput {
  fullName: string;
  bloodGroup: string;
  districtId: string;
  phone: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  data?: T;
}

/**
 * Validates whether a given string is a valid blood group symbol.
 */
export function isValidBloodGroup(val: unknown): val is BloodGroup {
  return typeof val === 'string' && VALID_BLOOD_GROUPS.includes(val as BloodGroup);
}

/**
 * Placeholder for blood request payload validation.
 * Business logic will be implemented in the validation milestone.
 */
export function validateBloodRequest(
  _input: unknown
): ValidationResult<BloodRequestInput> {
  // Stubbed for initial foundation
  return {
    isValid: true,
    errors: {},
  };
}

/**
 * Placeholder for donor registration payload validation.
 * Business logic will be implemented in the validation milestone.
 */
export function validateDonorRegistration(
  _input: unknown
): ValidationResult<DonorRegistrationInput> {
  // Stubbed for initial foundation
  return {
    isValid: true,
    errors: {},
  };
}
