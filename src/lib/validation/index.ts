/**
 * Hemo Match - Validation Subsystem
 *
 * Scope: Input sanitization, blood group format verification, district validation,
 * and payload integrity checks for blood requests and donor registrations.
 */

import type { BloodComponent, BloodGroup, UrgencyLevel } from '@/types';

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

export const VALID_BLOOD_COMPONENTS: readonly BloodComponent[] = [
  'Whole Blood',
  'Red Blood Cells',
  'Platelets',
  'Plasma',
] as const;

export const VALID_URGENCY_LEVELS: readonly UrgencyLevel[] = [
  'critical',
  'urgent',
  'routine',
  'standard',
] as const;

export interface BloodRequestFormData {
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  districtId: string;
  approximateArea: string;
  hospitalName: string;
  requiredByDate: string;
  requiredByTime: string;
  urgency: UrgencyLevel;
  notes?: string;
}

export interface BloodRequestInput {
  bloodGroup: string;
  unitsNeeded: number;
  districtId: string;
  requesterContact?: string;
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
 * Validates whether a given string is a valid blood component.
 */
export function isValidBloodComponent(val: unknown): val is BloodComponent {
  return (
    typeof val === 'string' &&
    VALID_BLOOD_COMPONENTS.includes(val as BloodComponent)
  );
}

/**
 * Validates blood request form submissions.
 * Checks required fields, positive integer quantities, and future datetime.
 */
export function validateBloodRequest(
  input: unknown
): ValidationResult<BloodRequestFormData> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      isValid: false,
      errors: { form: 'Invalid form submission' },
    };
  }

  const data = input as Record<string, unknown>;

  // 1. Blood group
  const bloodGroup =
    typeof data.bloodGroup === 'string' ? data.bloodGroup.trim() : '';
  if (!bloodGroup) {
    errors.bloodGroup = 'Blood group is required';
  } else if (!isValidBloodGroup(bloodGroup)) {
    errors.bloodGroup = 'Please select a valid blood group';
  }

  // 2. Component
  const component =
    typeof data.component === 'string' ? data.component.trim() : '';
  if (!component) {
    errors.component = 'Blood component is required';
  } else if (!isValidBloodComponent(component)) {
    errors.component = 'Please select a valid blood component';
  }

  // 3. Quantity
  const unitsRaw = data.unitsNeeded;
  const unitsNum = Number(unitsRaw);
  if (unitsRaw === undefined || unitsRaw === null || unitsRaw === '') {
    errors.unitsNeeded = 'Quantity is required';
  } else if (isNaN(unitsNum) || unitsNum <= 0 || !Number.isInteger(unitsNum)) {
    errors.unitsNeeded = 'Quantity must be a positive whole number';
  }

  // 4. District
  const districtId =
    typeof data.districtId === 'string' ? data.districtId.trim() : '';
  if (!districtId) {
    errors.districtId = 'District is required';
  }

  // 5. Approximate Area
  const approximateArea =
    typeof data.approximateArea === 'string' ? data.approximateArea.trim() : '';
  if (!approximateArea) {
    errors.approximateArea = 'Approximate area or locality is required';
  } else if (approximateArea.length < 2) {
    errors.approximateArea = 'Approximate area must be at least 2 characters';
  }

  // 6. Hospital / Blood Centre
  const hospitalName =
    typeof data.hospitalName === 'string' ? data.hospitalName.trim() : '';
  if (!hospitalName) {
    errors.hospitalName = 'Hospital or blood centre is required';
  } else if (hospitalName.length < 2) {
    errors.hospitalName = 'Hospital or blood centre must be at least 2 characters';
  }

  // 7 & 8. Required Date & Time
  const requiredByDate =
    typeof data.requiredByDate === 'string' ? data.requiredByDate.trim() : '';
  const requiredByTime =
    typeof data.requiredByTime === 'string' ? data.requiredByTime.trim() : '';

  if (!requiredByDate) {
    errors.requiredByDate = 'Required date is required';
  }

  if (!requiredByTime) {
    errors.requiredByTime = 'Required time is required';
  }

  // 9. Required date/time must be in the future
  if (requiredByDate && requiredByTime) {
    const combinedIso = `${requiredByDate}T${requiredByTime}`;
    const targetDate = new Date(combinedIso);
    if (isNaN(targetDate.getTime())) {
      errors.requiredByDate = 'Please enter a valid date and time';
    } else if (targetDate.getTime() <= Date.now()) {
      errors.requiredByDate = 'Required date and time must be in the future';
      errors.requiredByTime = 'Required date and time must be in the future';
    }
  }

  // 10. Urgency
  const urgency =
    typeof data.urgency === 'string' ? data.urgency.trim() : '';
  if (!urgency) {
    errors.urgency = 'Urgency level is required';
  } else if (!VALID_URGENCY_LEVELS.includes(urgency as UrgencyLevel)) {
    errors.urgency = 'Please select a valid urgency level';
  }

  const notes =
    typeof data.notes === 'string' && data.notes.trim().length > 0
      ? data.notes.trim()
      : undefined;

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          bloodGroup: bloodGroup as BloodGroup,
          component: component as BloodComponent,
          unitsNeeded: unitsNum,
          districtId,
          approximateArea,
          hospitalName,
          requiredByDate,
          requiredByTime,
          urgency: urgency as UrgencyLevel,
          notes,
        }
      : undefined,
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
