/**
 * Hemo Match - Coordinator Database Projections
 *
 * Scope: Server-only data aggregation and projection queries for the
 * Coordinator Operations Dashboard.
 *
 * SECURITY & PRIVACY INVARIANTS:
 * 1. Server-only execution ('server-only').
 * 2. Uses getServerClient() with service role key inside server boundaries only.
 * 3. STRICT PRIVACY: NEVER selects, transforms, or returns donor phone numbers,
 *    emails, exact coordinates, or home addresses.
 * 4. Strictly READ-ONLY: performs zero mutations, deletions, or updates.
 * 5. Returns structured, sanitized projections with graceful unconfigured/empty handling.
 */

import 'server-only';

import { getServerClient } from '@/lib/database';
import {
  buildCoordinatorTimeline,
  calculateCoordinatorMetrics,
  evaluateRequestAttention,
  formatAnonymizedDonorId,
} from '@/lib/coordinator/projection';
import type {
  CoordinatorCandidateSummary,
  CoordinatorDetailApiResponse,
  CoordinatorOverviewApiResponse,
  CoordinatorRequestDetail,
  CoordinatorRequestSummary,
} from '@/types/coordinator';
import type { RequestStatus } from '@/types';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_V4_REGEX.test(id.trim());
}

/**
 * Fetches all blood requests with aggregated operational counts and metrics.
 */
export async function fetchCoordinatorOverview(): Promise<CoordinatorOverviewApiResponse> {
  const client = getServerClient();
  const now = new Date();

  if (!client) {
    return {
      success: false,
      metrics: {
        totalRequests: 0,
        activeRequests: 0,
        needsAttentionCount: 0,
        totalMatches: 0,
        totalNotified: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        fulfilledRequests: 0,
      },
      requests: [],
      generatedAt: now.toISOString(),
      error: 'Database client is not configured.',
    };
  }

  try {
    // 1. Fetch district metadata for readable labels
    const { data: districtsData } = await client
      .from('districts')
      .select('id, name, slug');
    const districtMap = new Map((districtsData ?? []).map((d) => [d.id, d.name]));

    // 2. Fetch blood requests ordered by creation time descending
    // Explicit projection: intentionally excludes any non-existent or internal fields
    const { data: requestsData, error: reqErr } = await client
      .from('blood_requests')
      .select(
        'id, blood_group, component, units_needed, district_id, approximate_area, hospital_name, required_by, urgency, status, notes, created_at, updated_at, location_latitude, location_longitude'
      )
      .order('created_at', { ascending: false });

    if (reqErr) {
      return {
        success: false,
        metrics: {
          totalRequests: 0,
          activeRequests: 0,
          needsAttentionCount: 0,
          totalMatches: 0,
          totalNotified: 0,
          totalAccepted: 0,
          totalDeclined: 0,
          fulfilledRequests: 0,
        },
        requests: [],
        generatedAt: now.toISOString(),
        error: reqErr.message || 'Failed to query blood requests.',
      };
    }

    if (!requestsData || requestsData.length === 0) {
      return {
        success: true,
        metrics: {
          totalRequests: 0,
          activeRequests: 0,
          needsAttentionCount: 0,
          totalMatches: 0,
          totalNotified: 0,
          totalAccepted: 0,
          totalDeclined: 0,
          fulfilledRequests: 0,
        },
        requests: [],
        generatedAt: now.toISOString(),
      };
    }

    const requestIds = requestsData.map((r) => r.id);

    // 3. Batch query related tables (exactly 4 indexed queries, avoiding N+1)
    const [matchesRes, notifsRes, responsesRes, revealsRes] = await Promise.all([
      client.from('matches').select('request_id, status').in('request_id', requestIds),
      client.from('notifications').select('request_id, status').in('request_id', requestIds),
      client.from('donor_responses').select('request_id, status').in('request_id', requestIds),
      client.from('contact_reveals').select('request_id, revealed_at').in('request_id', requestIds),
    ]);

    // 4. Aggregate counts per request_id
    const matchCounts = new Map<string, number>();
    for (const m of matchesRes.data ?? []) {
      matchCounts.set(m.request_id, (matchCounts.get(m.request_id) ?? 0) + 1);
    }

    const notifCounts = new Map<string, number>();
    for (const n of notifsRes.data ?? []) {
      if (n.request_id) {
        notifCounts.set(n.request_id, (notifCounts.get(n.request_id) ?? 0) + 1);
      }
    }

    const acceptedCounts = new Map<string, number>();
    const declinedCounts = new Map<string, number>();
    for (const resp of responsesRes.data ?? []) {
      if (resp.status === 'accepted') {
        acceptedCounts.set(resp.request_id, (acceptedCounts.get(resp.request_id) ?? 0) + 1);
      } else if (resp.status === 'declined') {
        declinedCounts.set(resp.request_id, (declinedCounts.get(resp.request_id) ?? 0) + 1);
      }
    }

    const revealCounts = new Map<string, number>();
    for (const rev of revealsRes.data ?? []) {
      revealCounts.set(rev.request_id, (revealCounts.get(rev.request_id) ?? 0) + 1);
    }

    // 5. Project into sanitized CoordinatorRequestSummary array
    const requests: CoordinatorRequestSummary[] = requestsData.map((row) => {
      const matchCount = matchCounts.get(row.id) ?? 0;
      const notificationCount = notifCounts.get(row.id) ?? 0;
      const acceptedCount = acceptedCounts.get(row.id) ?? 0;
      const declinedCount = declinedCounts.get(row.id) ?? 0;
      const contactRevealCount = revealCounts.get(row.id) ?? 0;
      const status: RequestStatus = row.status === 'matching' ? 'active' : row.status;

      const attention = evaluateRequestAttention({
        status,
        requiredBy: row.required_by,
        matchCount,
        acceptedCount,
        now,
      });

      return {
        id: row.id,
        bloodGroup: row.blood_group,
        component: row.component,
        unitsNeeded: row.units_needed,
        districtId: row.district_id,
        districtName: districtMap.get(row.district_id) ?? 'Unknown District',
        approximateArea: row.approximate_area,
        hospitalName: row.hospital_name,
        requiredBy: row.required_by,
        urgency: row.urgency,
        status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        hasCoordinates: row.location_latitude != null && row.location_longitude != null,
        matchCount,
        notificationCount,
        acceptedCount,
        declinedCount,
        contactRevealCount,
        isContactRevealed: contactRevealCount > 0,
        needsAttention: attention.needsAttention,
        attentionReasons: attention.attentionReasons,
      };
    });

    const metrics = calculateCoordinatorMetrics(requests);

    return {
      success: true,
      metrics,
      requests,
      generatedAt: now.toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      metrics: {
        totalRequests: 0,
        activeRequests: 0,
        needsAttentionCount: 0,
        totalMatches: 0,
        totalNotified: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        fulfilledRequests: 0,
      },
      requests: [],
      generatedAt: now.toISOString(),
      error: err instanceof Error ? err.message : 'Unknown database error occurred.',
    };
  }
}

/**
 * Fetches the operational lifecycle breakdown for a single blood request.
 */
export async function fetchCoordinatorRequestDetail(
  requestId: string
): Promise<CoordinatorDetailApiResponse> {
  const now = new Date();

  if (!isValidUuid(requestId)) {
    return {
      success: false,
      generatedAt: now.toISOString(),
      error: 'Invalid blood request UUID parameter.',
    };
  }

  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      generatedAt: now.toISOString(),
      error: 'Database client is not configured.',
    };
  }

  try {
    // 1. Fetch the request
    const { data: req, error: reqErr } = await client
      .from('blood_requests')
      .select(
        'id, blood_group, component, units_needed, district_id, approximate_area, hospital_name, required_by, urgency, status, notes, created_at, updated_at, location_latitude, location_longitude'
      )
      .eq('id', requestId.trim().toLowerCase())
      .maybeSingle();

    if (reqErr || !req) {
      return {
        success: false,
        generatedAt: now.toISOString(),
        error: reqErr?.message || 'Blood request not found.',
      };
    }

    // 2. Fetch district name
    const { data: district } = await client
      .from('districts')
      .select('name')
      .eq('id', req.district_id)
      .maybeSingle();

    // 3. Query candidate matches
    const { data: matchesData } = await client
      .from('matches')
      .select('id, donor_id, status, created_at')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true });

    // 4. Query donor attributes (STRICT PRIVACY: ONLY blood_group and approximate_area)
    const donorIds = (matchesData ?? []).map((m) => m.donor_id);
    let donorMap = new Map<string, { blood_group: string; approximate_area: string }>();

    if (donorIds.length > 0) {
      const { data: donorsData } = await client
        .from('donors')
        .select('id, blood_group, approximate_area')
        .in('id', donorIds);

      donorMap = new Map((donorsData ?? []).map((d) => [d.id, d]));
    }

    // 5. Query notifications
    const { data: notifsData } = await client
      .from('notifications')
      .select('id, donor_id, status, created_at')
      .eq('request_id', req.id);

    // 6. Query responses
    const { data: respData } = await client
      .from('donor_responses')
      .select('id, donor_id, match_id, status, responded_at, created_at')
      .eq('request_id', req.id);

    // 7. Query contact reveals
    const { data: revealsData } = await client
      .from('contact_reveals')
      .select('id, donor_id, trigger, reason, revealed_at')
      .eq('request_id', req.id);

    const respMap = new Map((respData ?? []).map((r) => [r.donor_id, r]));
    const revealSet = new Set((revealsData ?? []).map((r) => r.donor_id));

    let acceptedCount = 0;
    let declinedCount = 0;
    for (const r of respData ?? []) {
      if (r.status === 'accepted') acceptedCount += 1;
      if (r.status === 'declined') declinedCount += 1;
    }

    const matchCount = (matchesData ?? []).length;
    const notificationCount = (notifsData ?? []).length;
    const contactRevealCount = (revealsData ?? []).length;

    const status: RequestStatus = req.status === 'matching' ? 'active' : req.status;

    const attention = evaluateRequestAttention({
      status,
      requiredBy: req.required_by,
      matchCount,
      acceptedCount,
      now,
    });

    const summary: CoordinatorRequestSummary = {
      id: req.id,
      bloodGroup: req.blood_group,
      component: req.component,
      unitsNeeded: req.units_needed,
      districtId: req.district_id,
      districtName: district?.name ?? 'Unknown District',
      approximateArea: req.approximate_area,
      hospitalName: req.hospital_name,
      requiredBy: req.required_by,
      urgency: req.urgency,
      status,
      notes: req.notes,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      hasCoordinates: req.location_latitude != null && req.location_longitude != null,
      matchCount,
      notificationCount,
      acceptedCount,
      declinedCount,
      contactRevealCount,
      isContactRevealed: contactRevealCount > 0,
      needsAttention: attention.needsAttention,
      attentionReasons: attention.attentionReasons,
    };

    const candidates: CoordinatorCandidateSummary[] = (matchesData ?? []).map((m) => {
      const donor = donorMap.get(m.donor_id);
      const resp = respMap.get(m.donor_id);

      return {
        matchId: m.id,
        anonymizedDonorId: formatAnonymizedDonorId(m.donor_id),
        bloodGroup: (donor?.blood_group as CoordinatorRequestSummary['bloodGroup']) ?? req.blood_group,
        approximateArea: donor?.approximate_area ?? 'Registered District',
        matchStatus: m.status,
        matchCreatedAt: m.created_at,
        responseStatus: resp?.status ?? null,
        respondedAt: resp?.responded_at ?? null,
        isContactRevealed: revealSet.has(m.donor_id),
      };
    });

    const mappedReveals = (revealsData ?? []).map((r) => ({
      revealedAt: r.revealed_at,
      trigger: r.trigger,
      reason: r.reason,
    }));

    const timeline = buildCoordinatorTimeline(summary, candidates, mappedReveals);

    const detail: CoordinatorRequestDetail = {
      ...summary,
      candidates,
      timeline,
    };

    return {
      success: true,
      request: detail,
      generatedAt: now.toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      generatedAt: now.toISOString(),
      error: err instanceof Error ? err.message : 'Unknown database error occurred.',
    };
  }
}
