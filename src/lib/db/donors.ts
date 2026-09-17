import 'server-only';

import { getServerClient } from '@/lib/database';
import type {
  Database,
  DbBloodGroup,
  DbDonorAvailability,
  DbNotificationPreference,
  DonorPublicRow,
} from '@/types/database';

export interface CreateDonorParams {
  fullName: string;
  bloodGroup: DbBloodGroup;
  districtId: string; // Validated database UUID
  approximateArea: string;
  phoneNumber: string;
  lastDonationDate: string | null;
  availability: DbDonorAvailability;
  notificationPreference: DbNotificationPreference;
  consentGiven: boolean;
}



export type CreateDonorResult =
  | {
      success: true;
      donor: DonorPublicRow;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      donor?: never;
      error: 'unconfigured' | 'database_error';
      message: string;
    };

/**
 * Inserts a single donor record into public.donors via the privileged server client.
 *
 * Requirements:
 * - Server-only execution
 * - PostgreSQL generates the primary key UUID (no client ID accepted)
 * - Projections strictly omit phone_number in the return payload
 * - No credentials or phone numbers logged
 */
export async function createDonor(
  params: CreateDonorParams
): Promise<CreateDonorResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database client is not configured.',
    };
  }

  const insertPayload: Database['public']['Tables']['donors']['Insert'] = {
    full_name: params.fullName,
    blood_group: params.bloodGroup,
    district_id: params.districtId,
    approximate_area: params.approximateArea,
    phone_number: params.phoneNumber,
    last_donation_date: params.lastDonationDate,
    availability: params.availability,
    notification_preference: params.notificationPreference,
    consent_given: params.consentGiven,
  };

  const { data, error } = await client
    .from('donors')
    .insert(insertPayload)
    .select(
      'id, full_name, blood_group, district_id, approximate_area, last_donation_date, availability, notification_preference, consent_given, created_at, updated_at'
    )
    .single<DonorPublicRow>();

  if (error || !data) {
    return {
      success: false,
      error: 'database_error',
      message: error?.message || 'Database insert returned no row.',
    };
  }

  return {
    success: true,
    donor: data,
  };
}
