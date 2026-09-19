/**
 * Hemo Match - Evaluation Selection Dataset
 *
 * Scope: Internal evaluation dataset definitions and deterministic donor profiles.
 *
 * SAFETY & INTEGRITY GUARANTEES:
 * 1. Fictional Data Only: All names and telephone numbers are reserved fictional entries.
 * 2. Deterministic UUIDs: All selection donor IDs use fixed, predictable UUIDs.
 * 3. Scope Isolation: Seed tooling operates ONLY on KNOWN_SELECTION_DONOR_IDS.
 * 4. Clinical Non-Interference: These donors pass through standard matching engine
 *    rules with zero special-casing or logic modifications.
 */

import type { BloodGroup, DonorAvailability, NotificationPreference } from '@/types';

export interface SelectionReferenceLocation {
  readonly hospitalName: string;
  readonly approximateArea: string;
  readonly districtSlug: string;
  readonly districtName: string;
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Primary evaluation center located in Ernakulam, Kerala.
 * Evaluators can reference these exact attributes when creating a test blood request.
 */
export const SELECTION_EVAL_CENTER: SelectionReferenceLocation = {
  hospitalName: 'General Hospital, Ernakulam',
  approximateArea: 'Marine Drive',
  districtSlug: 'dist-ekm',
  districtName: 'Ernakulam',
  latitude: 9.9816,
  longitude: 76.2799,
};

export const DONOR_A_ID = 'a0000000-0000-4000-8000-000000000001';
export const DONOR_B_ID = 'a0000000-0000-4000-8000-000000000002';
export const DONOR_C_ID = 'a0000000-0000-4000-8000-000000000003';
export const DONOR_D_ID = 'a0000000-0000-4000-8000-000000000004';
export const DONOR_E_ID = 'a0000000-0000-4000-8000-000000000005';

export const KNOWN_SELECTION_DONOR_IDS: readonly string[] = [
  DONOR_A_ID,
  DONOR_B_ID,
  DONOR_C_ID,
  DONOR_D_ID,
  DONOR_E_ID,
] as const;

export interface SelectionDonorDefinition {
  id: string;
  fullName: string;
  phoneNumber: string;
  bloodGroup: BloodGroup;
  approximateArea: string;
  locationLatitude: number;
  locationLongitude: number;
  daysSinceLastDonation: number;
  availability: DonorAvailability;
  notificationPreference: NotificationPreference;
  consentGiven: boolean;
  scenarioRole: string;
  expectedBehavior: string;
}

export const SELECTION_DONOR_DEFINITIONS: readonly SelectionDonorDefinition[] = [
  {
    id: DONOR_A_ID,
    fullName: 'Adarsh Menon (Scenario Donor A)',
    phoneNumber: '+919800000001',
    bloodGroup: 'A+',
    approximateArea: 'Kaloor',
    locationLatitude: 9.9916,
    locationLongitude: 76.2879, // ~1.4 km from eval center
    daysSinceLastDonation: 160, // >= 120 days: eligible
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: true,
    scenarioRole: 'DONOR A — PRIMARY EXACT MATCH',
    expectedBehavior:
      'Exact homologous A+ match within 5 km. Fully eligible. Ranks #1 in matching demo.',
  },
  {
    id: DONOR_B_ID,
    fullName: 'Biju Varma (Scenario Donor B)',
    phoneNumber: '+919800000002',
    bloodGroup: 'O+',
    approximateArea: 'Panampilly Nagar',
    locationLatitude: 9.965,
    locationLongitude: 76.29, // ~2.2 km from eval center
    daysSinceLastDonation: 150, // >= 120 days: eligible
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: true,
    scenarioRole: 'DONOR B — COMPATIBLE FALLBACK',
    expectedBehavior:
      'Universal compatible O+ alternative within 5 km. Matches after exact homologous priority.',
  },
  {
    id: DONOR_C_ID,
    fullName: 'Cyril Joseph (Scenario Donor C)',
    phoneNumber: '+919800000003',
    bloodGroup: 'A+',
    approximateArea: 'Ernakulam North',
    locationLatitude: 9.975,
    locationLongitude: 76.275, // ~0.9 km from eval center
    daysSinceLastDonation: 40, // < 120 days: EXCLUDED
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: true,
    scenarioRole: 'DONOR C — INTERVAL EXCLUSION',
    expectedBehavior:
      'Located physically nearby (~0.9 km), but recent donation (40 days ago) excludes candidate via 120-day interval rule.',
  },
  {
    id: DONOR_D_ID,
    fullName: 'Deepak Nair (Scenario Donor D)',
    phoneNumber: '+919800000004',
    bloodGroup: 'A+',
    approximateArea: 'Marine Drive West',
    locationLatitude: 9.989,
    locationLongitude: 76.265, // ~1.8 km from eval center
    daysSinceLastDonation: 170, // >= 120 days: eligible
    availability: 'available',
    notificationPreference: 'disabled', // Notification delivery disabled
    consentGiven: true,
    scenarioRole: 'DONOR D — NOTIFICATION PREFERENCE CASE',
    expectedBehavior:
      'Eligible homologous A+ candidate in match list (~1.8 km), but skipped during notification dispatch due to disabled preference.',
  },
  {
    id: DONOR_E_ID,
    fullName: 'Eldho Paul (Scenario Donor E)',
    phoneNumber: '+919800000005',
    bloodGroup: 'A+',
    approximateArea: 'Aluva',
    locationLatitude: 10.08,
    locationLongitude: 76.35, // ~13.4 km from eval center
    daysSinceLastDonation: 180, // >= 120 days: eligible
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: true,
    scenarioRole: 'DONOR E — PROXIMITY EXCLUSION',
    expectedBehavior:
      'Outside 5 km radius (~13.4 km). Excluded when request has coordinates; included via district fallback if coordinates missing.',
  },
] as const;

/**
 * Returns database insert payloads for the selection donors, resolving
 * last_donation_date relative to referenceDate (defaults to now).
 */
export function buildSelectionDonorRows(
  districtId: string,
  referenceDate: Date = new Date()
) {
  return SELECTION_DONOR_DEFINITIONS.map((def) => {
    const lastDonationDateMs =
      referenceDate.getTime() - def.daysSinceLastDonation * 86_400_000;
    const lastDonationDate = new Date(lastDonationDateMs)
      .toISOString()
      .split('T')[0];

    return {
      id: def.id,
      full_name: def.fullName,
      phone_number: def.phoneNumber,
      blood_group: def.bloodGroup,
      district_id: districtId,
      approximate_area: def.approximateArea,
      last_donation_date: lastDonationDate,
      availability: def.availability,
      notification_preference: def.notificationPreference,
      consent_given: def.consentGiven,
      location_latitude: def.locationLatitude,
      location_longitude: def.locationLongitude,
    };
  });
}
