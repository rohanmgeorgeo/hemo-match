/**
 * Hemo Match - Coordinator Operations Dashboard Types
 *
 * Scope: Data structures for the system-level coordinator operations view.
 *
 * PRIVACY INVARIANTS:
 * 1. STRICTLY NO DONOR PHONE NUMBERS.
 * 2. STRICTLY NO DONOR EMAILS.
 * 3. STRICTLY NO DONOR EXACT COORDINATES (latitude/longitude).
 * 4. STRICTLY NO DONOR EXACT ADDRESSES.
 * 5. Candidate donors must be identified ONLY by anonymized labels (e.g. "Donor •••• 9B4F").
 * 6. Contact reveal details remain exclusively on the requester workflow.
 */

import type { BloodComponent, BloodGroup, RequestStatus, UrgencyLevel } from './index';

/**
 * Top-level operational metrics derived entirely from real database state.
 */
export interface CoordinatorMetrics {
  totalRequests: number;
  activeRequests: number;
  needsAttentionCount: number;
  totalMatches: number;
  totalNotified: number;
  totalAccepted: number;
  totalDeclined: number;
  fulfilledRequests: number;
}

/**
 * Summary record of a blood request with aggregated operational metrics.
 */
export interface CoordinatorRequestSummary {
  id: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  districtId: string;
  districtName: string;
  approximateArea: string;
  hospitalName: string;
  requiredBy: string; // ISO string
  urgency: UrgencyLevel;
  status: RequestStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  hasCoordinates: boolean;
  matchCount: number;
  notificationCount: number;
  acceptedCount: number;
  declinedCount: number;
  contactRevealCount: number;
  isContactRevealed: boolean;
  needsAttention: boolean;
  attentionReasons: string[];
}

/**
 * Anonymized candidate record for request detail views.
 * Strictly non-PII.
 */
export interface CoordinatorCandidateSummary {
  matchId: string;
  anonymizedDonorId: string; // e.g. "Donor •••• ABCD"
  bloodGroup: BloodGroup;
  approximateArea: string;
  matchStatus: string; // 'candidate' | 'notified' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
  matchCreatedAt: string;
  responseStatus: 'accepted' | 'declined' | 'pending' | null;
  respondedAt: string | null;
  isContactRevealed: boolean;
}

/**
 * Audit event for request detail view.
 */
export interface CoordinatorAuditEvent {
  stage: 'created' | 'matching' | 'notification' | 'response' | 'reveal';
  label: string;
  timestamp: string;
  details: string;
}

/**
 * Detailed operational view of a specific blood request.
 */
export interface CoordinatorRequestDetail extends CoordinatorRequestSummary {
  candidates: CoordinatorCandidateSummary[];
  timeline: CoordinatorAuditEvent[];
}

/**
 * Response shape for the coordinator overview API.
 */
export interface CoordinatorOverviewApiResponse {
  success: boolean;
  metrics: CoordinatorMetrics;
  requests: CoordinatorRequestSummary[];
  generatedAt: string;
  error?: string;
}

/**
 * Response shape for the coordinator request detail API.
 */
export interface CoordinatorDetailApiResponse {
  success: boolean;
  request?: CoordinatorRequestDetail;
  generatedAt: string;
  error?: string;
}
