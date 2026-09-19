/**
 * Hemo Match - Coordinator Projection Helpers
 *
 * Scope: Pure transformation and deterministic evaluation functions
 * for the coordinator operations dashboard.
 *
 * SAFETY INVARIANTS:
 * 1. Pure functions with zero side effects.
 * 2. Deterministic "Needs Attention" evaluation based strictly on existing schema fields.
 * 3. Never produces or accepts donor contact PII.
 */

import type { RequestStatus } from '@/types';
import type {
  CoordinatorCandidateSummary,
  CoordinatorMetrics,
  CoordinatorRequestDetail,
  CoordinatorRequestSummary,
} from '@/types/coordinator';

/**
 * Anonymizes a donor UUID into a privacy-safe reference label.
 * Example: 'a0000000-0000-4000-8000-000000000001' -> 'Donor •••• 0001'
 */
export function formatAnonymizedDonorId(donorId: string): string {
  if (!donorId || typeof donorId !== 'string') {
    return 'Donor •••• UNKNOWN';
  }
  const clean = donorId.replace(/-/g, '');
  const lastFour = clean.slice(-4).toUpperCase();
  return `Donor •••• ${lastFour}`;
}

export interface AttentionInput {
  status: RequestStatus;
  requiredBy: string;
  matchCount: number;
  acceptedCount: number;
  now?: Date;
}

export interface AttentionResult {
  needsAttention: boolean;
  attentionReasons: string[];
}

/**
 * Deterministically evaluates whether a blood request needs coordinator attention.
 *
 * RULES:
 * 1. An active request with zero discovered candidates has no immediate donor pipeline.
 * 2. A notified request with zero accepted responses is waiting for donor availability.
 * 3. An open/unfulfilled request past its required-by deadline requires coordinator review.
 * 4. An explicitly expired request is unfulfilled and closed without fulfillment.
 *
 * Does NOT invent arbitrary clinical urgency, synthetic scoring, or AI heuristics.
 */
export function evaluateRequestAttention(input: AttentionInput): AttentionResult {
  const reasons: string[] = [];
  const now = input.now ?? new Date();
  const requiredByTime = new Date(input.requiredBy).getTime();
  const isPastDeadline = !Number.isNaN(requiredByTime) && requiredByTime < now.getTime();

  // Rule 1: Zero matches for open request
  if (input.status === 'active' && input.matchCount === 0) {
    reasons.push('Zero eligible candidates matched');
  }

  // Rule 2: Notified with zero acceptances
  if (input.status === 'notified' && input.acceptedCount === 0) {
    reasons.push('Awaiting donor acceptance');
  }

  // Rule 3: Past deadline without fulfillment
  if (['active', 'notified'].includes(input.status) && isPastDeadline) {
    reasons.push('Past required deadline without fulfillment');
  }

  // Rule 4: Expired request
  if (input.status === 'expired') {
    reasons.push('Request expired unfulfilled');
  }

  return {
    needsAttention: reasons.length > 0,
    attentionReasons: reasons,
  };
}

/**
 * Aggregates top-level operational metrics across all requests.
 * Derived entirely from real database records.
 */
export function calculateCoordinatorMetrics(
  requests: readonly CoordinatorRequestSummary[]
): CoordinatorMetrics {
  let activeRequests = 0;
  let needsAttentionCount = 0;
  let totalMatches = 0;
  let totalNotified = 0;
  let totalAccepted = 0;
  let totalDeclined = 0;
  let fulfilledRequests = 0;

  for (const r of requests) {
    if (['active', 'notified'].includes(r.status)) {
      activeRequests += 1;
    }
    if (r.status === 'fulfilled') {
      fulfilledRequests += 1;
    }
    if (r.needsAttention) {
      needsAttentionCount += 1;
    }
    totalMatches += r.matchCount;
    totalNotified += r.notificationCount;
    totalAccepted += r.acceptedCount;
    totalDeclined += r.declinedCount;
  }

  return {
    totalRequests: requests.length,
    activeRequests,
    needsAttentionCount,
    totalMatches,
    totalNotified,
    totalAccepted,
    totalDeclined,
    fulfilledRequests,
  };
}

/**
 * Builds a structured operational timeline for a request detail view.
 */
export function buildCoordinatorTimeline(
  summary: CoordinatorRequestSummary,
  candidates: readonly CoordinatorCandidateSummary[],
  revealEvents: readonly { revealedAt: string; trigger: string; reason?: string | null }[]
): CoordinatorRequestDetail['timeline'] {
  const timeline: CoordinatorRequestDetail['timeline'] = [];

  // 1. Request Creation
  timeline.push({
    stage: 'created',
    label: 'Blood Request Created',
    timestamp: summary.createdAt,
    details: `${summary.bloodGroup} ${summary.component} (${summary.unitsNeeded} unit${
      summary.unitsNeeded > 1 ? 's' : ''
    }) for ${summary.hospitalName}, ${summary.districtName}. Urgency: ${summary.urgency}.`,
  });

  // 2. Matching Stage
  if (summary.matchCount > 0) {
    const firstMatchTime = candidates[0]?.matchCreatedAt ?? summary.updatedAt;
    timeline.push({
      stage: 'matching',
      label: 'Compatible Matches Identified',
      timestamp: firstMatchTime,
      details: `${summary.matchCount} candidate donor${
        summary.matchCount > 1 ? 's' : ''
      } discovered via authoritative server matching engine.`,
    });
  }

  // 3. Notification Dispatch
  if (summary.notificationCount > 0) {
    timeline.push({
      stage: 'notification',
      label: 'In-App Notifications Dispatched',
      timestamp: summary.updatedAt,
      details: `Dispatched to ${summary.notificationCount} opted-in eligible candidate${
        summary.notificationCount > 1 ? 's' : ''
      }.`,
    });
  }

  // 4. Responses
  if (summary.acceptedCount > 0 || summary.declinedCount > 0) {
    const acceptedDetails =
      summary.acceptedCount > 0
        ? `${summary.acceptedCount} donor${summary.acceptedCount > 1 ? 's' : ''} confirmed acceptance`
        : '';
    const declinedDetails =
      summary.declinedCount > 0
        ? `${summary.declinedCount} donor${summary.declinedCount > 1 ? 's' : ''} declined`
        : '';
    const responseDetails = [acceptedDetails, declinedDetails].filter(Boolean).join(', ');

    timeline.push({
      stage: 'response',
      label: 'Donor Responses Received',
      timestamp: summary.updatedAt,
      details: responseDetails,
    });
  }

  // 5. Contact Reveal Audit
  if (revealEvents.length > 0) {
    for (const reveal of revealEvents) {
      timeline.push({
        stage: 'reveal',
        label: 'Requester Contact Reveal Authorized',
        timestamp: reveal.revealedAt,
        details: `Audit event recorded: triggered by '${reveal.trigger}'. Minimum contact unmasked for coordination.`,
      });
    }
  }

  return timeline;
}
