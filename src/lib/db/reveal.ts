import 'server-only';

import { getServerClient } from '@/lib/database';
import { createAnonymizedDonorRef } from '@/lib/matching/engine';
import type { PublicMatchCandidate, MatchStatus } from '@/types/matches';
import type { DbBloodGroup } from '@/types/database';
import type { BloodGroup } from '@/types';

export interface RequestContactRevealParams {
  requestId: string;
  matchId?: string;
  notificationId?: string;
}

export type RequestContactRevealResult =
  | {
      success: true;
      contact: {
        name: string;
        phone: string;
      };
      error?: never;
      message?: never;
    }
  | {
      success: false;
      contact?: never;
      error:
        | 'unconfigured'
        | 'not_found'
        | 'unauthorized_or_not_accepted'
        | 'database_error';
      message: string;
    };

/**
 * Server-only helper to authoritatively authorize and record contact reveal.
 *
 * PRIVACY RULES:
 * - Contact information is returned ONLY when authoritative server state proves:
 *   1. Match status is 'accepted'
 *   2. Donor response is 'accepted'
 *   3. Notification was a valid match_found notification
 *   4. Blood request is not cancelled, expired, or fulfilled
 *   5. Donor exists
 * - Returns ONLY minimum permitted contact: name and phone.
 * - Idempotently logs a non-PII audit event on first reveal only.
 * - Repeated reveal calls return the same contact without duplicate audit logs.
 */
export async function requestContactReveal(
  params: RequestContactRevealParams
): Promise<RequestContactRevealResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  const { requestId, matchId, notificationId } = params;

  // 1. Resolve matchId if only notificationId was supplied
  let resolvedMatchId = matchId;
  if (!resolvedMatchId && notificationId) {
    const { data: notif, error: notifError } = await client
      .from('notifications')
      .select('match_id')
      .eq('id', notificationId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (notifError || !notif || !notif.match_id) {
      return {
        success: false,
        error: 'not_found',
        message: 'Notification or associated match record not found.',
      };
    }
    resolvedMatchId = notif.match_id;
  }

  if (!resolvedMatchId) {
    return {
      success: false,
      error: 'not_found',
      message: 'Match identifier could not be determined.',
    };
  }

  // 2. Call the atomic PostgreSQL RPC function
  const { data, error: rpcError } = await client.rpc('record_contact_reveal', {
    p_request_id: requestId,
    p_match_id: resolvedMatchId,
    p_trigger: 'donor_accepted',
  });

  if (rpcError) {
    return {
      success: false,
      error: 'database_error',
      message: 'An error occurred while authorizing contact reveal.',
    };
  }

  // 3. If RPC returned no rows, authorization failed (not accepted, expired, cancelled, etc.)
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'unauthorized_or_not_accepted',
      message: 'Contact reveal is not authorized. The donor has not accepted or the request is no longer active.',
    };
  }

  const revealRow = data[0];

  // 4. If this is a newly created reveal, log the audit event
  if (revealRow.is_new) {
    await client.from('audit_logs').insert({
      action: 'contact_reveal.authorized',
      actor_ref: requestId,
      entity_type: 'contact_reveal',
      entity_id: revealRow.reveal_id,
      metadata: {
        requestId,
        matchId: resolvedMatchId,
        donorId: revealRow.donor_id,
      },
    });
  }

  // 5. Return minimum permitted contact fields only
  return {
    success: true,
    contact: {
      name: revealRow.donor_name,
      phone: revealRow.donor_phone,
    },
  };
}

export type GetRequestMatchesResult =
  | {
      success: true;
      requestId: string;
      requestStatus: string;
      totalMatches: number;
      matches: PublicMatchCandidate[];
      error?: never;
      message?: never;
    }
  | {
      success: false;
      requestId?: string;
      requestStatus?: never;
      totalMatches?: never;
      matches?: never;
      error: 'unconfigured' | 'request_not_found' | 'database_error';
      message: string;
    };

/**
 * Server-only helper to fetch the current status of all matches for a request
 * without re-running matching or overwriting existing states.
 *
 * PRIVACY GUARANTEES:
 * - Excludes phone_number, full_name, email, and raw donor UUID.
 * - Allows requester to see updated statuses (e.g. 'accepted', 'declined', 'notified').
 */
export async function getRequestMatches(
  requestId: string
): Promise<GetRequestMatchesResult> {
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  // 1. Fetch request details
  const { data: requestData, error: reqError } = await client
    .from('blood_requests')
    .select('id, status, district_id')
    .eq('id', requestId)
    .maybeSingle();

  if (reqError) {
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

  // 2. Fetch district name
  const { data: districtData } = await client
    .from('districts')
    .select('name')
    .eq('id', requestData.district_id)
    .maybeSingle();

  const districtName = districtData?.name ?? 'Kerala';

  // 3. Fetch all matches for this request
  const { data: matchRows, error: matchError } = await client
    .from('matches')
    .select('id, donor_id, status, match_metadata, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (matchError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching match records.',
    };
  }

  if (!matchRows || matchRows.length === 0) {
    return {
      success: true,
      requestId,
      requestStatus: requestData.status,
      totalMatches: 0,
      matches: [],
    };
  }

  // 4. Fetch non-PII donor attributes for presentation (blood group, approximate area)
  const donorIds = matchRows.map((m: { donor_id: string }) => m.donor_id);
  const { data: donorRows, error: donorError } = await client
    .from('donors')
    .select('id, blood_group, approximate_area')
    .in('id', donorIds);

  if (donorError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching donor presentation details.',
    };
  }

  const donorLookup = new Map<string, { blood_group: DbBloodGroup; approximate_area: string }>(
    (donorRows ?? []).map((d: { id: string; blood_group: DbBloodGroup; approximate_area: string }) => [d.id, d])
  );

  // 5. Construct privacy-safe PublicMatchCandidate items
  const candidates: PublicMatchCandidate[] = [];

  for (const m of matchRows) {
    const donor = donorLookup.get(m.donor_id);
    if (!donor) continue;

    const metadata = (m.match_metadata ?? {}) as Record<string, unknown>;
    const compatibilityType = (metadata.compatibilityType as 'homologous' | 'compatible') ?? 'compatible';
    const factualMatchReasons = Array.isArray(metadata.factualMatchReasons)
      ? (metadata.factualMatchReasons as string[])
      : [];

    candidates.push({
      matchId: m.id,
      requestId,
      anonymizedDonorRef: createAnonymizedDonorRef(m.donor_id),
      bloodGroup: donor.blood_group as BloodGroup,
      districtName,
      approximateArea: donor.approximate_area,
      compatibilityType,
      factualMatchReasons,
      status: m.status as MatchStatus,
      createdAt: m.created_at,
    });
  }

  return {
    success: true,
    requestId,
    requestStatus: requestData.status,
    totalMatches: candidates.length,
    matches: candidates,
  };
}
