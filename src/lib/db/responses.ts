import 'server-only';

import { getServerClient } from '@/lib/database';
import {
  validateAcceptPrerequisites,
  validateDeclinePrerequisites,
  type ResponseRevalidationDonor,
  type ResponseRevalidationMatch,
  type ResponseRevalidationNotification,
  type ResponseRevalidationRequest,
} from '@/lib/responses/revalidation';
import type { DonorResponseAction } from '@/lib/validation/responses';
import type {
  BloodComponent,
  BloodGroup,
} from '@/types';
import type {
  DbDonorAvailability as DonorAvailability,
  DbMatchStatus as MatchStatus,
  DbNotificationType as NotificationType,
  DbRequestStatus as RequestStatus,
} from '@/types/database';

export type SubmitDonorResponseErrorCode =
  | 'unconfigured'
  | 'not_found'
  | 'invalid_notification'
  | 'request_not_found'
  | 'match_not_found'
  | 'donor_not_found'
  | 'request_inactive'
  | 'request_expired'
  | 'invalid_match_status'
  | 'already_responded'
  | 'revalidation_failed'
  | 'database_error';

export type SubmitDonorResponseResult =
  | {
      success: true;
      response: DonorResponseAction;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      error: SubmitDonorResponseErrorCode;
      message: string;
      response?: never;
    };

export interface SubmitDonorResponseParams {
  donorId: string;
  notificationId: string;
  response: DonorResponseAction;
}

/**
 * Submits an authoritative donor response (accept or decline) to a blood request notification.
 *
 * PRIVACY & SECURITY GUARANTEES:
 * - Never returns donor or requester phone numbers, emails, or PII.
 * - Never creates contact_reveals entries (deferred strictly to Step 9).
 * - Enforces server-side donor ownership over the notification.
 * - Authoritatively revalidates all clinical/logistical prerequisites before accept.
 * - Executes atomic match state transition and response recording via database RPC.
 */
export async function submitDonorResponse(
  params: SubmitDonorResponseParams
): Promise<SubmitDonorResponseResult> {
  const { donorId, notificationId, response } = params;

  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  // 1. Fetch notification and verify demo donor ownership
  const { data: notifData, error: notifErr } = await client
    .from('notifications')
    .select('id, donor_id, request_id, match_id, type, status')
    .eq('id', notificationId)
    .eq('donor_id', donorId)
    .maybeSingle();

  if (notifErr || !notifData) {
    return {
      success: false,
      error: 'not_found',
      message: 'Notification not found or access denied.',
    };
  }

  if (notifData.type !== 'match_found') {
    return {
      success: false,
      error: 'invalid_notification',
      message: 'Only match_found notifications can receive a response.',
    };
  }

  if (!notifData.request_id || !notifData.match_id) {
    return {
      success: false,
      error: 'invalid_notification',
      message: 'Notification has incomplete linkage.',
    };
  }

  const requestId = notifData.request_id;
  const matchId = notifData.match_id;

  // 2. Fetch blood request
  const { data: requestData, error: requestErr } = await client
    .from('blood_requests')
    .select('id, status, blood_group, component, district_id, required_by')
    .eq('id', requestId)
    .maybeSingle();

  if (requestErr || !requestData) {
    return {
      success: false,
      error: 'request_not_found',
      message: 'Associated blood request not found.',
    };
  }

  // 3. Fetch candidate match
  const { data: matchData, error: matchErr } = await client
    .from('matches')
    .select('id, status, request_id, donor_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchErr || !matchData) {
    return {
      success: false,
      error: 'match_not_found',
      message: 'Associated match record not found.',
    };
  }

  // 4. Fetch donor profile
  const { data: donorData, error: donorErr } = await client
    .from('donors')
    .select('id, blood_group, district_id, availability, consent_given, last_donation_date')
    .eq('id', donorId)
    .maybeSingle();

  if (donorErr || !donorData) {
    return {
      success: false,
      error: 'donor_not_found',
      message: 'Donor profile not found.',
    };
  }

  // 5. Check whether a response already exists in donor_responses
  const { data: existingResponse } = await client
    .from('donor_responses')
    .select('id, status')
    .eq('request_id', requestId)
    .eq('donor_id', donorId)
    .maybeSingle();

  const hasExistingResponse = Boolean(existingResponse);

  // 6. Map to pure revalidation structures
  const revalNotification: ResponseRevalidationNotification = {
    id: notifData.id,
    donorId: notifData.donor_id,
    requestId: notifData.request_id,
    matchId: notifData.match_id,
    type: notifData.type as NotificationType,
  };

  const revalRequest: ResponseRevalidationRequest = {
    id: requestData.id,
    status: requestData.status as RequestStatus,
    bloodGroup: requestData.blood_group as BloodGroup,
    component: requestData.component as BloodComponent,
    districtId: requestData.district_id,
    requiredBy: requestData.required_by,
  };

  const revalMatch: ResponseRevalidationMatch = {
    id: matchData.id,
    requestId: matchData.request_id,
    donorId: matchData.donor_id,
    status: matchData.status as MatchStatus,
  };

  const revalDonor: ResponseRevalidationDonor = {
    id: donorData.id,
    bloodGroup: donorData.blood_group as BloodGroup,
    districtId: donorData.district_id,
    availability: donorData.availability as DonorAvailability,
    consentGiven: Boolean(donorData.consent_given),
    lastDonationDate: donorData.last_donation_date,
  };

  const revalInput = {
    notification: revalNotification,
    request: revalRequest,
    match: revalMatch,
    donor: revalDonor,
    hasExistingResponse,
  };

  // 7. Authoritative revalidation
  const revalResult =
    response === 'accepted'
      ? validateAcceptPrerequisites(revalInput)
      : validateDeclinePrerequisites(revalInput);

  if (!revalResult.isValid) {
    switch (revalResult.error) {
      case 'ALREADY_RESPONDED':
        return {
          success: false,
          error: 'already_responded',
          message: 'A response has already been recorded for this request.',
        };
      case 'REQUEST_TERMINAL':
        return {
          success: false,
          error: 'request_inactive',
          message: 'This blood request is no longer active.',
        };
      case 'REQUEST_EXPIRED':
        return {
          success: false,
          error: 'request_expired',
          message: 'This blood request has expired.',
        };
      case 'MATCH_NOT_NOTIFIED':
        return {
          success: false,
          error: 'invalid_match_status',
          message: 'The match is not currently in a notified status.',
        };
      case 'NO_DONOR_CONSENT':
      case 'DONOR_UNAVAILABLE':
      case 'DISTRICT_MISMATCH':
      case 'BLOOD_INCOMPATIBLE':
      case 'DONATION_HISTORY_UNKNOWN':
      case 'INTERVAL_TOO_SHORT':
      case 'UNSUPPORTED_COMPONENT':
      default:
        return {
          success: false,
          error: 'revalidation_failed',
          message: 'Eligibility criteria or donation interval requirements are not satisfied.',
        };
    }
  }

  // 8. Execute atomic RPC (transitions match & creates donor_responses row)
  const { data: responseId, error: rpcErr } = await client.rpc(
    'record_donor_response',
    {
      p_donor_id: donorId,
      p_request_id: requestId,
      p_match_id: matchId,
      p_response: response,
    }
  );

  if (rpcErr) {
    if (rpcErr.code === '23505') {
      return {
        success: false,
        error: 'already_responded',
        message: 'A response has already been recorded for this request.',
      };
    }
    return {
      success: false,
      error: 'database_error',
      message: 'Failed to record response in database.',
    };
  }

  if (!responseId) {
    return {
      success: false,
      error: 'already_responded',
      message: 'Match is no longer in a notified status or response was already recorded.',
    };
  }

  // 9. Update notification status to 'read' if currently 'unread'
  if (notifData.status === 'unread') {
    await client
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('status', 'unread');
  }

  // 10. Write non-PII audit log
  await client.from('audit_logs').insert({
    action: response === 'accepted' ? 'donor_response.accepted' : 'donor_response.declined',
    entity_type: 'donor_responses',
    entity_id: responseId,
    actor_ref: 'donor',
    metadata: {
      response,
      request_status: requestData.status,
    },
  });

  return {
    success: true,
    response,
  };
}
