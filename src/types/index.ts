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
  | 'draft'
  | 'active'
  | 'matching'
  | 'notified'
  | 'partially_filled'
  | 'fulfilled'
  | 'cancelled'
  | 'expired'
  | 'open';

export type DonorAvailability = 'available' | 'temporarily_unavailable' | 'paused';

export type NotificationPreference = 'enabled' | 'disabled';

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

/**
 * DonorProfile — complete donor intake record.
 * Compatible with future Supabase/PostgreSQL `donors` table.
 * phoneNumber is private and must never be surfaced in matching previews.
 */
export interface DonorProfile {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  districtId: string;
  districtName?: string;
  approximateArea: string;
  /** Private — must remain masked in all public-facing matching views. */
  phoneNumber: string;
  lastDonationDate?: string | null;
  availability: DonorAvailability;
  notificationPreference: NotificationPreference;
  consentGiven: boolean;
  /** Private server-side matching coordinates — never exposed to requesters */
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  createdAt: string;
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
  /** Private server-side matching coordinates — never exposed to donors */
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  createdAt: string;
  updatedAt: string;
  patientName?: string;
  requesterContact?: string;
}
