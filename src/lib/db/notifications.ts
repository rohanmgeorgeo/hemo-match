/**
 * Hemo Match - Server-Only Notification Dispatch Database Helper
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * Revalidation checks preliminary discovery suitability and donor communication preferences
 * immediately prior to notification dispatch. It does NOT determine final clinical eligibility,
 * serological compatibility, or transfusion safety. Final donor qualification is performed
 * by qualified blood-centre and clinical personnel.
 *
 * PRIVACY:
 * - Donor phone_number is NEVER selected, queried, or placed in notification payloads.
 * - Donor full_name is NEVER selected, queried, or returned.
 * - Requester phone numbers and patient identifiers are NEVER included in notification payloads.
 * - Audit logs record strictly aggregate metadata, avoiding donor UUID leaks.
 *
 * CONCURRENCY & IDEMPOTENCY:
 * - Atomic match status update ('candidate' -> 'notified') and notification creation
 *   are executed via the PostgreSQL RPC function claim_match_and_create_notification().
 * - Backed by partial unique index idx_notifications_match_found_unique on (match_id, type).
 * - Multi-thread safety: only one execution thread can claim any candidate match.
 */

import 'server-only';

import { getServerClient } from '@/lib/database';
import type {
  BloodComponent,
  BloodGroup,
  DonorAvailability,
  NotificationPreference,
} from '@/types';
import type {
  BloodRequestRow,
  DistrictRow,
  DonorRow,
  MatchRow,
} from '@/types/database';
import { DEFAULT_DISPATCH_LIMIT } from '@/lib/notifications/config';
import {
  revalidateAndRankCandidates,
  type RevalidationDonorInput,
  type RevalidationMatchInput,
  type RevalidationRequestInput,
} from '@/lib/notifications/revalidation';

// ---------------------------------------------------------------------------
// Narrow DB Projections
// Structurally excludes private columns (phone_number, full_name) so queries
// never select them.
// ---------------------------------------------------------------------------

type RequestDispatchRow = Pick<
  BloodRequestRow,
  | 'id'
  | 'blood_group'
  | 'component'
  | 'units_needed'
  | 'district_id'
  | 'approximate_area'
  | 'hospital_name'
  | 'required_by'
  | 'urgency'
  | 'status'
>;

type MatchDispatchRow = Pick<
  MatchRow,
  'id' | 'request_id' | 'donor_id' | 'status' | 'created_at'
>;

type DonorDispatchRow = Pick<
  DonorRow,
  | 'id'
  | 'blood_group'
  | 'district_id'
  | 'approximate_area'
  | 'last_donation_date'
  | 'availability'
  | 'notification_preference'
  | 'consent_given'
>;

// ---------------------------------------------------------------------------
// Public Result Types
// ---------------------------------------------------------------------------

export type DispatchResult =
  | {
      success: true;
      requestId: string;
      dispatchedCount: number;
      totalCandidates: number;
      eligibleCount: number;
      skippedCount: number;
      message?: string;
      error?: never;
    }
  | {
      success: false;
      requestId: string;
      error:
        | 'unconfigured'
        | 'request_not_found'
        | 'request_inactive'
        | 'request_expired'
        | 'unsupported_component'
        | 'database_error';
      message: string;
      dispatchedCount?: never;
      totalCandidates?: never;
      eligibleCount?: never;
      skippedCount?: never;
    };

// ---------------------------------------------------------------------------
// Privacy-Safe Notification Payload
// Minimum logistical context needed by candidate donor to decide whether to respond.
// Excludes: requester phone, patient info, donor phone/name, coordinates.
// ---------------------------------------------------------------------------

export interface SafeNotificationPayload {
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  districtName: string;
  approximateArea: string;
  hospitalName: string;
  urgency: string;
  requiredBy: string;
  compatibilityType: string;
}

// ---------------------------------------------------------------------------
// Main Exported Orchestrator
// ---------------------------------------------------------------------------

export async function dispatchNotificationsForRequest(
  requestId: string,
  evaluationTime: Date = new Date()
): Promise<DispatchResult> {
  // 1. Obtain server-side service-role client
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      requestId,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  // 2. Fetch blood request (minimal projection)
  const { data: requestData, error: requestError } = await client
    .from('blood_requests')
    .select(
      'id, blood_group, component, units_needed, district_id, approximate_area, hospital_name, required_by, urgency, status'
    )
    .eq('id', requestId)
    .maybeSingle<RequestDispatchRow>();

  if (requestError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching the blood request.',
    };
  }

  if (!requestData) {
    return {
      success: false,
      requestId,
      error: 'request_not_found',
      message: 'Blood request not found.',
    };
  }

  // 3. Request-level validation guards
  if (requestData.status !== 'active') {
    return {
      success: false,
      requestId,
      error: 'request_inactive',
      message: 'Blood request is not currently active for notification dispatch.',
    };
  }

  const component = requestData.component as BloodComponent;
  if (component !== 'Whole Blood' && component !== 'Red Blood Cells') {
    return {
      success: false,
      requestId,
      error: 'unsupported_component',
      message: 'This blood component is not supported for notification dispatch in the current version.',
    };
  }

  const requiredByMs = new Date(requestData.required_by).getTime();
  if (isNaN(requiredByMs) || evaluationTime.getTime() > requiredByMs) {
    return {
      success: false,
      requestId,
      error: 'request_expired',
      message: 'Blood request required-by time has passed.',
    };
  }

  // 4. Resolve district display name for privacy-safe payload
  const { data: districtData, error: districtError } = await client
    .from('districts')
    .select('id, name')
    .eq('id', requestData.district_id)
    .maybeSingle<Pick<DistrictRow, 'id' | 'name'>>();

  if (districtError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching district information.',
    };
  }

  const districtName = districtData?.name ?? 'Unknown District';

  // 5. Fetch candidate matches for this request
  const { data: matchRows, error: matchError } = await client
    .from('matches')
    .select('id, request_id, donor_id, status, created_at')
    .eq('request_id', requestId)
    .eq('status', 'candidate');

  if (matchError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while querying candidate matches.',
    };
  }

  const matches = (matchRows ?? []) as MatchDispatchRow[];
  if (matches.length === 0) {
    return {
      success: true,
      requestId,
      dispatchedCount: 0,
      totalCandidates: 0,
      eligibleCount: 0,
      skippedCount: 0,
      message: 'No candidate matches found to dispatch.',
    };
  }

  // 6. Fetch donor records corresponding to candidate matches (narrow projection)
  const donorIds = Array.from(new Set(matches.map((m) => m.donor_id)));
  const { data: donorRows, error: donorError } = await client
    .from('donors')
    .select(
      'id, blood_group, district_id, approximate_area, last_donation_date, availability, notification_preference, consent_given'
    )
    .in('id', donorIds);

  if (donorError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching donor profiles for revalidation.',
    };
  }

  const donors = (donorRows ?? []) as DonorDispatchRow[];
  const donorsById = new Map<string, RevalidationDonorInput>();
  for (const d of donors) {
    donorsById.set(d.id, {
      id: d.id,
      bloodGroup: d.blood_group as BloodGroup,
      districtId: d.district_id,
      approximateArea: d.approximate_area,
      lastDonationDate: d.last_donation_date,
      availability: d.availability as DonorAvailability,
      notificationPreference: d.notification_preference as NotificationPreference,
      consentGiven: d.consent_given,
    });
  }

  // 7. Fetch existing responses for this request
  const { data: responseRows, error: responseError } = await client
    .from('donor_responses')
    .select('donor_id')
    .eq('request_id', requestId);

  if (responseError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while checking prior donor responses.',
    };
  }

  const respondedDonorIds = new Set<string>(
    (responseRows ?? []).map((r: { donor_id: string }) => r.donor_id)
  );

  // 8. Fetch existing match_found notifications for this request
  const { data: notifRows, error: notifError } = await client
    .from('notifications')
    .select('match_id')
    .eq('request_id', requestId)
    .eq('type', 'match_found');

  if (notifError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while checking existing notifications.',
    };
  }

  const notifiedMatchIds = new Set<string>(
    (notifRows ?? [])
      .map((n: { match_id: string | null }) => n.match_id)
      .filter((id: string | null): id is string => Boolean(id))
  );

  // 9. Run pure revalidation and deterministic ranking
  const revalRequest: RevalidationRequestInput = {
    id: requestData.id,
    bloodGroup: requestData.blood_group as BloodGroup,
    component,
    districtId: requestData.district_id,
    requiredBy: requestData.required_by,
    status: requestData.status,
  };

  const revalMatches: RevalidationMatchInput[] = matches.map((m) => ({
    id: m.id,
    requestId: m.request_id,
    donorId: m.donor_id,
    status: m.status,
  }));

  const revalidation = revalidateAndRankCandidates({
    request: revalRequest,
    matches: revalMatches,
    donorsById,
    respondedDonorIds,
    notifiedMatchIds,
    evaluationTime,
  });

  if (!revalidation.requestValid) {
    return {
      success: false,
      requestId,
      error: 'request_inactive',
      message: 'Request is not valid for notification dispatch.',
    };
  }

  const totalCandidates = matches.length;
  const eligibleCount = revalidation.eligibleCandidates.length;
  const skippedCount = revalidation.skippedOutcomes.length;

  if (eligibleCount === 0) {
    return {
      success: true,
      requestId,
      dispatchedCount: 0,
      totalCandidates,
      eligibleCount: 0,
      skippedCount,
      message: 'No eligible candidate donors currently satisfy dispatch criteria.',
    };
  }

  // 10. Apply server-controlled dispatch limit
  const selectedCandidates = revalidation.eligibleCandidates.slice(
    0,
    DEFAULT_DISPATCH_LIMIT
  );

  // 11. Execute atomic RPC per selected candidate
  let dispatchedCount = 0;

  for (const candidate of selectedCandidates) {
    const payload: SafeNotificationPayload = {
      bloodGroup: candidate.bloodGroup,
      component,
      unitsNeeded: requestData.units_needed,
      districtName,
      approximateArea: candidate.approximateArea,
      hospitalName: requestData.hospital_name,
      urgency: requestData.urgency,
      requiredBy: requestData.required_by,
      compatibilityType: candidate.compatibilityType,
    };

    const { data: createdNotifId, error: rpcError } = await client.rpc(
      'claim_match_and_create_notification',
      {
        p_match_id: candidate.matchId,
        p_donor_id: candidate.donorId,
        p_request_id: requestId,
        p_payload: payload as unknown as Record<string, unknown>,
      }
    );

    if (rpcError) {
      // If error is unique constraint or concurrence contention, log internally and continue
      continue;
    }

    if (createdNotifId) {
      dispatchedCount++;
    }
  }

  // 12. Advance request status conditionally if at least 1 notification dispatched
  if (dispatchedCount > 0) {
    await client
      .from('blood_requests')
      .update({ status: 'notified' })
      .eq('id', requestId)
      .eq('status', 'active');

    // 13. Append aggregate, non-PII audit record
    await client.from('audit_logs').insert({
      actor_ref: null,
      action: 'notification.dispatch_completed',
      entity_type: 'blood_request',
      entity_id: requestId,
      metadata: {
        dispatched_count: dispatchedCount,
        candidate_count: totalCandidates,
        eligible_count: eligibleCount,
        skipped_count: skippedCount,
        dispatch_limit: DEFAULT_DISPATCH_LIMIT,
      },
    });
  }

  return {
    success: true,
    requestId,
    dispatchedCount,
    totalCandidates,
    eligibleCount,
    skippedCount,
    message:
      dispatchedCount > 0
        ? `${dispatchedCount} candidate donor notification(s) created.`
        : 'No candidate donor notifications could be created.',
  };
}

// ---------------------------------------------------------------------------
// Donor Inbox Public Projection & Queries
// ---------------------------------------------------------------------------

export interface PublicDonorNotification {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  readAt: string | null;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  districtName: string;
  approximateArea: string;
  hospitalName: string;
  urgency: string;
  requiredBy: string;
  compatibilityType: string;
  response: 'accepted' | 'declined' | null;
}

export type GetDonorNotificationsResult =
  | {
      success: true;
      notifications: PublicDonorNotification[];
      error?: never;
      message?: never;
    }
  | {
      success: false;
      error: 'unconfigured' | 'database_error';
      message: string;
      notifications?: never;
    };

export type MarkNotificationReadResult =
  | {
      success: true;
      notificationId: string;
      readAt: string;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      error: 'unconfigured' | 'not_found' | 'database_error';
      message: string;
      notificationId?: never;
      readAt?: never;
    };

/**
 * Retrieves privacy-safe notification projections for a specific demo donor identity.
 *
 * PRIVACY GUARANTEES:
 * - Omits donor_id, match_id, request_id from public projection.
 * - Excludes donor phone_number and full_name.
 * - Excludes requester contact information and patient identifiers.
 * - Filters strictly by donor_id at the database level.
 * - Derives authoritative response status ('accepted' | 'declined' | null) from donor_responses.
 */
export async function getDonorNotifications(
  donorId: string
): Promise<GetDonorNotificationsResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  // 1. Fetch notifications for donor (request_id used purely for server-side response lookup)
  const { data: notifData, error: notifError } = await client
    .from('notifications')
    .select('id, type, status, payload, created_at, read_at, request_id')
    .eq('donor_id', donorId)
    .order('created_at', { ascending: false });

  if (notifError) {
    return {
      success: false,
      error: 'database_error',
      message: 'Failed to retrieve donor notifications.',
    };
  }

  // 2. Fetch recorded responses for this donor to attach status without leaking IDs
  const { data: responseRows } = await client
    .from('donor_responses')
    .select('request_id, status')
    .eq('donor_id', donorId);

  const responseMap = new Map<string, 'accepted' | 'declined'>();
  if (responseRows) {
    for (const r of responseRows) {
      if (r.status === 'accepted' || r.status === 'declined') {
        responseMap.set(r.request_id, r.status);
      }
    }
  }

  const notifications: PublicDonorNotification[] = (notifData ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Partial<SafeNotificationPayload>;
    const recordedResponse = row.request_id ? responseMap.get(row.request_id) ?? null : null;
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      createdAt: row.created_at,
      readAt: row.read_at,
      bloodGroup: (payload.bloodGroup ?? 'O+') as BloodGroup,
      component: (payload.component ?? 'Whole Blood') as BloodComponent,
      unitsNeeded:
        typeof payload.unitsNeeded === 'number' ? payload.unitsNeeded : 1,
      districtName: payload.districtName ?? 'Unknown District',
      approximateArea: payload.approximateArea ?? '',
      hospitalName: payload.hospitalName ?? 'Clinical Centre',
      urgency: payload.urgency ?? 'urgent',
      requiredBy: payload.requiredBy ?? '',
      compatibilityType: payload.compatibilityType ?? 'compatible',
      response: recordedResponse,
    };
  });

  return {
    success: true,
    notifications,
  };
}

/**
 * Marks a notification as read with strict donor ownership verification.
 *
 * OWNERSHIP GUARANTEE:
 * - Update includes both notification id AND donor_id in WHERE clause.
 * - Cross-donor mutations are rejected (returns not_found if donor does not own the notification).
 */
export async function markNotificationAsRead(
  notificationId: string,
  donorId: string
): Promise<MarkNotificationReadResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await client
    .from('notifications')
    .update({
      status: 'read',
      read_at: nowIso,
    })
    .eq('id', notificationId)
    .eq('donor_id', donorId)
    .select('id, read_at')
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: 'database_error',
      message: 'Failed to update notification status.',
    };
  }

  if (!data) {
    return {
      success: false,
      error: 'not_found',
      message: 'Notification not found or access denied.',
    };
  }

  return {
    success: true,
    notificationId: data.id,
    readAt: data.read_at ?? nowIso,
  };
}

