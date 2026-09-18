/**
 * Hemo Match - Red Blood Cell (RBC) ABO/Rh Compatibility Subsystem
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final compatibility and donor screening decisions must
 * be made by qualified blood bank and clinical personnel via standard serological
 * crossmatching and laboratory testing.
 *
 * LOCKED SCOPE:
 * This matrix represents Red Blood Cell (RBC) compatibility for Whole Blood and
 * Red Blood Cells requests only. Platelets and Plasma have different compatibility
 * dynamics (such as reverse ABO/isohemagglutinin rules) and are strictly unsupported
 * in Step 6 preliminary matching.
 */

import type { BloodGroup } from '@/types';

export type CompatibilityType = 'homologous' | 'compatible';

/**
 * Locked ABO/Rh Red Blood Cell Compatibility Table.
 * Maps Recipient (Patient) Blood Group -> List of compatible Donor Blood Groups.
 *
 * Matrix:
 * O-  <- O-
 * O+  <- O-, O+
 * A-  <- O-, A-
 * A+  <- O-, O+, A-, A+
 * B-  <- O-, B-
 * B+  <- O-, O+, B-, B+
 * AB- <- O-, A-, B-, AB-
 * AB+ <- O-, O+, A-, A+, B-, B+, AB-, AB+
 */
export const RBC_COMPATIBILITY_TABLE: Readonly<Record<BloodGroup, readonly BloodGroup[]>> = Object.freeze({
  'O-': Object.freeze(['O-'] as const),
  'O+': Object.freeze(['O-', 'O+'] as const),
  'A-': Object.freeze(['O-', 'A-'] as const),
  'A+': Object.freeze(['O-', 'O+', 'A-', 'A+'] as const),
  'B-': Object.freeze(['O-', 'B-'] as const),
  'B+': Object.freeze(['O-', 'O+', 'B-', 'B+'] as const),
  'AB-': Object.freeze(['O-', 'A-', 'B-', 'AB-'] as const),
  'AB+': Object.freeze(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const),
});

/**
 * Checks if a donor's RBC blood group is compatible with the recipient's blood group.
 *
 * @param recipient The patient's requested blood group
 * @param donor The prospective donor's blood group
 * @returns true if the donor's blood group is compatible with the recipient under standard RBC rules
 */
export function isRbcCompatible(recipient: BloodGroup, donor: BloodGroup): boolean {
  const compatibleDonors = RBC_COMPATIBILITY_TABLE[recipient];
  if (!compatibleDonors) {
    return false;
  }
  return compatibleDonors.includes(donor);
}

/**
 * Classifies the compatibility relationship between recipient and donor:
 * - 'homologous': Exact ABO/Rh match (e.g. A+ recipient <- A+ donor)
 * - 'compatible': Compatible alternative match (e.g. A+ recipient <- O- donor)
 * - null: Incompatible (e.g. O- recipient <- A+ donor)
 *
 * @param recipient The patient's requested blood group
 * @param donor The prospective donor's blood group
 * @returns CompatibilityType or null if incompatible
 */
export function getCompatibilityType(
  recipient: BloodGroup,
  donor: BloodGroup
): CompatibilityType | null {
  if (!isRbcCompatible(recipient, donor)) {
    return null;
  }
  return donor === recipient ? 'homologous' : 'compatible';
}
