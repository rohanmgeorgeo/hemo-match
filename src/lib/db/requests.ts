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

export interface UpdateBloodRequestParams {
  id: string;
  bloodGroup: DbBloodGroup;
  component: DbBloodComponent;
  unitsNeeded: number;
  districtId: string;
  approximateArea: string;
  hospitalName: string;
  requiredBy: string;
  urgency: DbUrgencyLevel;
  notes: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
}

export type UpdateBloodRequestResult =
  | {
      success: true;
      request: BloodRequestRow;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      request?: never;
      error: "unconfigured" | "not_found" | "locked" | "database_error";
      message: string;
    };

/**
 * Updates an existing blood request record in public.blood_requests.
 *
 * Requirements:
 * - Server-only execution
 * - Validates that the request exists
 * - Lifecycle guard: checks if any match has progressed to accepted, revealed, or fulfilled
 * - Lifecycle guard: checks if any contact reveals have been granted
 * - Preserves existing request UUID and created_at
 * - Cleans up existing candidate matches so new criteria can evaluate fresh matches
 */
export async function updateBloodRequest(
  params: UpdateBloodRequestParams
): Promise<UpdateBloodRequestResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: "unconfigured",
      message: "Database client is not configured.",
    };
  }

  // 1. Check if request exists
  const { data: existing, error: fetchError } = await client
    .from("blood_requests")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle<BloodRequestRow>();

  if (fetchError) {
    return {
      success: false,
      error: "database_error",
      message: fetchError.message || "Failed to fetch existing blood request.",
    };
  }

  if (!existing) {
    return {
      success: false,
      error: "not_found",
      message: "Blood request not found.",
    };
  }

  // 2. Lifecycle check: check if any donor accepted or contact revealed
  const { data: progressedMatches } = await client
    .from("matches")
    .select("id, status")
    .eq("request_id", params.id)
    .in("status", ["accepted", "responded"]);

  if (progressedMatches && progressedMatches.length > 0) {
    return {
      success: false,
      error: "locked",
      message:
        "This blood request cannot be modified because a donor response or contact reveal has already been initiated.",
    };
  }

  const { data: reveals } = await client
    .from("contact_reveals")
    .select("id")
    .eq("request_id", params.id);

  if (reveals && reveals.length > 0) {
    return {
      success: false,
      error: "locked",
      message:
        "This blood request cannot be modified because contact reveal has already been granted.",
    };
  }

  // 3. Remove existing candidate matches so subsequent match queries re-evaluate against new criteria
  await client
    .from("matches")
    .delete()
    .eq("request_id", params.id)
    .eq("status", "candidate");

  // 4. Update the blood request
  const updatePayload: Database["public"]["Tables"]["blood_requests"]["Update"] = {
    blood_group: params.bloodGroup,
    component: params.component,
    units_needed: params.unitsNeeded,
    district_id: params.districtId,
    approximate_area: params.approximateArea,
    hospital_name: params.hospitalName,
    required_by: params.requiredBy,
    urgency: params.urgency,
    notes: params.notes,
    location_latitude: params.locationLatitude ?? null,
    location_longitude: params.locationLongitude ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("blood_requests")
    .update(updatePayload)
    .eq("id", params.id)
    .select(
      "id, blood_group, component, units_needed, district_id, approximate_area, hospital_name, required_by, urgency, status, notes, created_at, updated_at, location_latitude, location_longitude"
    )
    .single<BloodRequestRow>();

  if (error || !data) {
    return {
      success: false,
      error: "database_error",
      message: error?.message || "Database update returned no row.",
    };
  }

  return {
    success: true,
    request: data,
  };
}
