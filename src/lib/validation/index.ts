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
 * Normalizes date and time strings entered in India Standard Time (Asia/Kolkata, UTC+05:30)
 * into a Date object representing the exact instant.
 * Returns null if input is invalid or represents a non-existent calendar date.
 */
export function parseIstDateTime(dateStr: string, timeStr: string): Date | null {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim();
  if (!cleanDate || !cleanTime) return null;

  // Validate YYYY-MM-DD format
  const dateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;
  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;

  // Validate time format (HH:mm or HH:mm:ss)
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) return null;
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  const paddedH = String(hours).padStart(2, '0');
  const paddedM = String(minutes).padStart(2, '0');
  const paddedS = String(seconds).padStart(2, '0');

  const istIso = `${cleanDate}T${paddedH}:${paddedM}:${paddedS}+05:30`;
  const d = new Date(istIso);
  if (isNaN(d.getTime())) return null;

  return d;
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

  // 9. Required date/time must be in the future (evaluated in India Standard Time, UTC+05:30)
  if (requiredByDate && requiredByTime) {
    const targetDate = parseIstDateTime(requiredByDate, requiredByTime);
    if (!targetDate) {
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


export interface DonorProfileFormData {
  fullName: string;
  bloodGroup: BloodGroup;
  districtId: string;
  approximateArea: string;
  phoneNumber: string;
  lastDonationDate?: string;
  availability: 'available' | 'temporarily_unavailable' | 'paused';
  notificationPreference: 'enabled' | 'disabled';
  consentGiven: boolean;
}

/**
 * Validates a donor registration profile form submission.
 * Does NOT implement medical eligibility — eligibility will be evaluated
 * during the matching stage using configured rules and clinical guidance.
 */
export function validateDonorProfile(
  input: unknown
): ValidationResult<DonorProfileFormData> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      isValid: false,
      errors: { form: 'Invalid form submission' },
    };
  }

  const data = input as Record<string, unknown>;

  // 1. Full name
  const fullName =
    typeof data.fullName === 'string' ? data.fullName.trim() : '';
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  // 2. Blood group
  const bloodGroup =
    typeof data.bloodGroup === 'string' ? data.bloodGroup.trim() : '';
  if (!bloodGroup) {
    errors.bloodGroup = 'Blood group is required';
  } else if (!isValidBloodGroup(bloodGroup)) {
    errors.bloodGroup = 'Please select a valid blood group';
  }

  // 3. District
  const districtId =
    typeof data.districtId === 'string' ? data.districtId.trim() : '';
  if (!districtId) {
    errors.districtId = 'District is required';
  }

  // 4. Approximate area
  const approximateArea =
    typeof data.approximateArea === 'string' ? data.approximateArea.trim() : '';
  if (!approximateArea) {
    errors.approximateArea = 'Approximate area or locality is required';
  } else if (approximateArea.length < 2) {
    errors.approximateArea = 'Approximate area must be at least 2 characters';
  }

  // 5. Phone number — basic format: 7–15 digits, optional leading +
  const phoneNumber =
    typeof data.phoneNumber === 'string' ? data.phoneNumber.trim() : '';
  if (!phoneNumber) {
    errors.phoneNumber = 'Phone number is required for coordination purposes';
  } else if (!/^\+?[0-9]{7,15}$/.test(phoneNumber.replace(/[\s\-()]/g, ''))) {
    errors.phoneNumber =
      'Please enter a valid phone number (7–15 digits, optional + prefix)';
  }

  // 6. Last donation date — must NOT be in the future (optional field)
  const lastDonationDate =
    typeof data.lastDonationDate === 'string'
      ? data.lastDonationDate.trim()
      : '';
  if (lastDonationDate) {
    const donationDate = new Date(lastDonationDate);
    if (isNaN(donationDate.getTime())) {
      errors.lastDonationDate = 'Please enter a valid date';
    } else if (donationDate.getTime() > Date.now()) {
      errors.lastDonationDate = 'Last donation date cannot be in the future';
    }
  }

  // 7. Availability
  const validAvailabilities = ['available', 'temporarily_unavailable', 'paused'] as const;
  const availability =
    typeof data.availability === 'string' ? data.availability.trim() : '';
  if (!availability) {
    errors.availability = 'Availability status is required';
  } else if (!validAvailabilities.includes(availability as typeof validAvailabilities[number])) {
    errors.availability = 'Please select a valid availability status';
  }

  // 8. Notification preference
  const validPreferences = ['enabled', 'disabled'] as const;
  const notificationPreference =
    typeof data.notificationPreference === 'string'
      ? data.notificationPreference.trim()
      : '';
  if (!notificationPreference) {
    errors.notificationPreference = 'Notification preference is required';
  } else if (!validPreferences.includes(notificationPreference as typeof validPreferences[number])) {
    errors.notificationPreference = 'Please select a notification preference';
  }

  // 9. Consent
  const consentGiven = data.consentGiven === true;
  if (!consentGiven) {
    errors.consentGiven = 'You must agree to the consent statement to register';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          fullName,
          bloodGroup: bloodGroup as BloodGroup,
          districtId,
          approximateArea,
          phoneNumber,
          lastDonationDate: lastDonationDate || undefined,
          availability: availability as DonorProfileFormData['availability'],
          notificationPreference: notificationPreference as DonorProfileFormData['notificationPreference'],
          consentGiven: true,
        }
      : undefined,
  };
}
