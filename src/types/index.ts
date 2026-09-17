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

export type BloodComponent =
  | 'Whole Blood'
  | 'Red Blood Cells'
  | 'Platelets'
  | 'Plasma';

export type UrgencyLevel = 'critical' | 'urgent' | 'routine' | 'standard';

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

export const DEMO_DISTRICTS: readonly DistrictInfo[] = [
  { id: 'dist-ekm', name: 'Ernakulam', state: 'Kerala' },
  { id: 'dist-tvm', name: 'Thiruvananthapuram', state: 'Kerala' },
  { id: 'dist-clt', name: 'Kozhikode', state: 'Kerala' },
  { id: 'dist-tsr', name: 'Thrissur', state: 'Kerala' },
  { id: 'dist-ktm', name: 'Kottayam', state: 'Kerala' },
  { id: 'dist-pkd', name: 'Palakkad', state: 'Kerala' },
  { id: 'dist-mpm', name: 'Malappuram', state: 'Kerala' },
  { id: 'dist-cen', name: 'Central District', state: 'Kerala' },
] as const;

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
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  districtId: string;
  districtName?: string;
  approximateArea: string;
  hospitalName: string;
  requiredByDate: string;
  requiredByTime: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  patientName?: string;
  requesterContact?: string;
}
