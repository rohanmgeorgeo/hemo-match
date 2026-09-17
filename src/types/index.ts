/**
 * Hemo Match - Core Domain Types
 * Challenge: SC-12 (District Blood Donor Matching)
 */

export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

export type UrgencyLevel = 'standard' | 'urgent' | 'critical';

export type RequestStatus =
  | 'open'
  | 'matching'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';

export type DonorAvailability = 'available' | 'paused' | 'ineligible';

export interface DistrictInfo {
  id: string;
  name: string;
  state?: string;
}

export interface DonorProfile {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  districtId: string;
  districtName: string;
  phone: string;
  isPhoneMasked: boolean;
  availability: DonorAvailability;
  lastDonatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BloodRequest {
  id: string;
  patientName?: string;
  requesterContact: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  districtId: string;
  hospitalName?: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
