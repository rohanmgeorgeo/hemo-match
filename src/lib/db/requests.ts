import 'server-only';

import { getServerClient } from '@/lib/database';
import type {
  BloodRequestRow,
  Database,
  DbBloodComponent,
  DbBloodGroup,
  DbUrgencyLevel,
} from '@/types/database';

export interface CreateBloodRequestParams {
  bloodGroup: DbBloodGroup;
  component: DbBloodComponent;
  unitsNeeded: number;
  districtId: string; // Validated database UUID
  approximateArea: string;
  hospitalName: string;
  requiredBy: string; // Valid TIMESTAMPTZ ISO string
  urgency: DbUrgencyLevel;
  notes: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
}

export type CreateBloodRequestResult =
  | {
      success: true;
      request: BloodRequestRow;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      request?: never;
      error: 'unconfigured' | 'database_error';
      message: string;
    };

/**
 * Inserts a single blood request record into public.blood_requests via the privileged server client.
 *
 * Requirements:
 * - Server-only execution
 * - PostgreSQL generates the primary key UUID (no client ID accepted)
 * - Projections strictly omit any non-existent or private fields
 * - Initial lifecycle status is hardcoded to 'active' (caller cannot override)
 * - No credentials or requester contact logged
 */
export async function createBloodRequest(
  params: CreateBloodRequestParams
): Promise<CreateBloodRequestResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database client is not configured.',
    };
  }

  const insertPayload: Database['public']['Tables']['blood_requests']['Insert'] = {
    blood_group: params.bloodGroup,
    component: params.component,
    units_needed: params.unitsNeeded,
    district_id: params.districtId,
    approximate_area: params.approximateArea,
    hospital_name: params.hospitalName,
    required_by: params.requiredBy,
    urgency: params.urgency,
    status: 'active',
    notes: params.notes,
    location_latitude: params.locationLatitude ?? null,
    location_longitude: params.locationLongitude ?? null,
  };

  const { data, error } = await client
    .from('blood_requests')
    .insert(insertPayload)
    .select(
      'id, blood_group, component, units_needed, district_id, approximate_area, hospital_name, required_by, urgency, status, notes, created_at, updated_at, location_latitude, location_longitude'
    )
    .single<BloodRequestRow>();

  if (error || !data) {
    return {
      success: false,
      error: 'database_error',
      message: error?.message || 'Database insert returned no row.',
    };
  }

  return {
    success: true,
    request: data,
  };
}
