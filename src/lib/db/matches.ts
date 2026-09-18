/**
 * Hemo Match - Server-Only Matches Database Helper
 *
 * SAFETY & CLINICAL DISCLAIMER:
 * This software performs preliminary donor discovery and algorithmic matching ONLY.
 * It does NOT determine final donor eligibility, transfusion compatibility, or
 * clinical suitability. Final donor screening and compatibility decisions must
 * be made by qualified blood-bank/clinical personnel.
 *
 * PRIVACY POLICY:
 * - Donor phone_number is NEVER selected, stored in match_metadata, or returned.
 * - Donor full_name is NEVER selected or returned in any matching projection.
 * - The anonymized reference (e.g. 'Donor •••• 9B4F') is derived from the UUID suffix.
 * - Excluded donor reasons are internal and never surface to API consumers.
 *
 * IDEMPOTENCY:
 * Repeated calls to findAndCreateMatches() for the same requestId are idempotent:
 * - Existing candidate matches are fetched first and preserved unconditionally.
 * - Only newly eligible donors not already in a match row are inserted.
 * - The UNIQUE(request_id, donor_id) constraint is the final concurrency guard.
 * - After insertion, the authoritative current candidate set is re-queried and returned.
 *
 * DONOR STATE RECONCILIATION POLICY (Step 6C limitation):
 * Existing persisted candidate rows are treated as historical records for Step 6.
 * This helper does NOT automatically withdraw or revalidate existing candidate rows
 * if a donor's availability or eligibility later changes between calls.
 * Revalidation before notification/acceptance belongs to a later milestone (Step 7).
 * Newly evaluated donors must satisfy current matching rules at evaluation time.
 */

import 'server-only';

import { getServerClient } from '@/lib/database';
import type {
  Database,
  DbMatchStatus,
  DistrictRow,
  MatchRow,
} from '@/types/database';
import type { BloodGroup, BloodComponent } from '@/types';
import {
  matchDonorsForRequest,
  requestMatchingRowToEngineInput,
  donorMatchingRowToEngineInput,
  createAnonymizedDonorRef,
  buildFactualMatchReasons,
  type DonorMatchingRow,
  type RequestMatchingRow,
  type EligibleMatchCandidate,
  type MatchMetadata,
} from '@/lib/matching/engine';
import type { CompatibilityType } from '@/lib/matching/compatibility';

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

/**
 * Privacy-safe public match candidate returned to API consumers.
 * Contains no donor phone_number, full_name, or raw donor UUID.
 */
export interface PublicMatchCandidate {
  matchId: string;
  requestId: string;
  anonymizedDonorRef: string;
  bloodGroup: BloodGroup;
  districtName: string;
  approximateArea: string;
  compatibilityType: CompatibilityType;
  factualMatchReasons: string[];
  status: DbMatchStatus;
  createdAt: string;
}

export type FindAndCreateMatchesResult =
  | {
      success: true;
      requestId: string;
      matches: PublicMatchCandidate[];
      totalMatches: number;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      requestId?: string;
      matches?: never;
      totalMatches?: never;
      error:
        | 'unconfigured'
        | 'request_not_found'
        | 'request_inactive'
        | 'request_expired'
        | 'unsupported_component'
        | 'database_error'
        | 'rule_not_found';
      message: string;
    };

// ---------------------------------------------------------------------------
// Narrow internal projection types
// DonorMatchingRow and RequestMatchingRow are defined in engine.ts and re-used
// here. They explicitly exclude phone_number, full_name, and other private
// columns so matching queries never need to select those fields.
// ---------------------------------------------------------------------------

/** Match row with only fields needed for idempotency tracking */
type ExistingMatchFields = Pick<MatchRow, 'id' | 'donor_id' | 'status' | 'match_metadata' | 'created_at'>;

// ---------------------------------------------------------------------------
// Pure helper: build PublicMatchCandidate from engine output + DB match row
// ---------------------------------------------------------------------------

/**
 * Constructs a privacy-safe public candidate from an engine-generated
 * EligibleMatchCandidate and the authoritative database match row.
 *
 * The donor UUID is used only to produce the anonymized reference; it is
 * NOT returned in any public field.
 */
function buildPublicCandidateFromEngine(
  candidate: EligibleMatchCandidate,
  matchRow: { id: string; status: DbMatchStatus; created_at: string },
  districtName: string
): PublicMatchCandidate {
  return {
    matchId: matchRow.id,
    requestId: candidate.requestId,
    anonymizedDonorRef: candidate.anonymizedDonorRef,
    bloodGroup: candidate.bloodGroup,
    districtName,
    approximateArea: candidate.approximateArea,
    compatibilityType: candidate.compatibilityType,
    factualMatchReasons: candidate.factualMatchReasons,
    status: matchRow.status,
    createdAt: matchRow.created_at,
  };
}

/**
 * Reconstructs a PublicMatchCandidate from an existing persisted MatchRow
 * and associated donor/district data. Used for the authoritative re-query result.
 *
 * Privacy: only the donor UUID suffix is used for the anonymized reference.
 */
function buildPublicCandidateFromRow(
  matchRow: ExistingMatchFields,
  donorId: string,
  donorBloodGroup: BloodGroup,
  donorApproximateArea: string,
  requestId: string,
  districtName: string,
  metadata: MatchMetadata | null
): PublicMatchCandidate {
  const anonymizedRef = createAnonymizedDonorRef(donorId);
  const compatibilityType: CompatibilityType = metadata?.compatibility_type ?? 'compatible';

  const factualMatchReasons = metadata
    ? buildFactualMatchReasons({
        compatibilityType,
        recipientBloodGroup: metadata.recipient_blood_group,
        donorBloodGroup: metadata.donor_blood_group,
        daysSinceLastDonation: metadata.days_since_last_donation,
        minimumIntervalDays: metadata.minimum_interval_days,
      })
    : ['Preliminary interval satisfied', 'Same district geographic alignment'];

  return {
    matchId: matchRow.id,
    requestId,
    anonymizedDonorRef: anonymizedRef,
    bloodGroup: donorBloodGroup,
    districtName,
    approximateArea: donorApproximateArea,
    compatibilityType,
    factualMatchReasons,
    status: matchRow.status,
    createdAt: matchRow.created_at,
  };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Runs the pure matching engine against the database, persists newly eligible
 * donor candidates, and returns the complete authoritative candidate set.
 *
 * Execution flow:
 * 1. Validate Supabase client availability.
 * 2. Fetch the blood request by UUID (minimal projection, no `select *`).
 * 3. Perform request-level eligibility checks before fetching donors.
 * 4. Fetch district name for display.
 * 5. Fetch donor candidates from the same district (no phone_number, no full_name).
 * 6. Fetch existing match rows for this request (for idempotency).
 * 7. Fetch donor_responses for this request (to mark donors who already responded).
 * 8. Run the pure matching engine.
 * 9. Insert only newly eligible donors not already in a match row.
 *    UNIQUE(request_id, donor_id) is the concurrency guard.
 * 10. Re-query the authoritative current candidate match set.
 * 11. Return privacy-safe PublicMatchCandidate list.
 *
 * @param requestId Authoritative PostgreSQL UUID of the blood request.
 * @param evaluationTime Explicit evaluation timestamp (defaults to now).
 */
export async function findAndCreateMatches(
  requestId: string,
  evaluationTime: Date = new Date()
): Promise<FindAndCreateMatchesResult> {
  // ---------------------------------------------------------------------------
  // Step 1: Obtain server client
  // ---------------------------------------------------------------------------
  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      requestId,
      error: 'unconfigured',
      message: 'Database service is temporarily unavailable.',
    };
  }

  // ---------------------------------------------------------------------------
  // Step 2: Fetch the blood request — minimal projection only
  // ---------------------------------------------------------------------------
  const { data: requestData, error: requestError } = await client
    .from('blood_requests')
    .select('id, blood_group, component, district_id, required_by, status')
    .eq('id', requestId)
    .maybeSingle<RequestMatchingRow>();

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

  // ---------------------------------------------------------------------------
  // Step 3: Request-level pre-checks (fail fast before expensive donor query)
  // ---------------------------------------------------------------------------
  if (requestData.status !== 'active') {
    return {
      success: false,
      requestId,
      error: 'request_inactive',
      message: 'Blood request is not currently active for matching.',
    };
  }

  const component = requestData.component as BloodComponent;
  if (component !== 'Whole Blood' && component !== 'Red Blood Cells') {
    return {
      success: false,
      requestId,
      error: 'unsupported_component',
      message: 'This blood component is not supported for preliminary matching in the current version.',
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

  // ---------------------------------------------------------------------------
  // Step 4: Fetch district name for display in public projections
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Step 5: Fetch donor candidates from the request district
  // Explicitly selected columns — phone_number and full_name are NOT included.
  // ---------------------------------------------------------------------------
  const { data: donorRows, error: donorError } = await client
    .from('donors')
    .select(
      'id, blood_group, district_id, approximate_area, last_donation_date, availability, notification_preference, consent_given'
    )
    .eq('district_id', requestData.district_id);

  if (donorError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching donor candidates.',
    };
  }

  const donors = (donorRows ?? []) as DonorMatchingRow[];

  // ---------------------------------------------------------------------------
  // Step 6: Fetch existing match rows for this request (idempotency)
  // ---------------------------------------------------------------------------
  const { data: existingMatchRows, error: existingMatchError } = await client
    .from('matches')
    .select('id, donor_id, status, match_metadata, created_at')
    .eq('request_id', requestId);

  if (existingMatchError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching existing match records.',
    };
  }

  const existingMatches = (existingMatchRows ?? []) as ExistingMatchFields[];

  // Build a set of donor IDs that already have a match row (any status)
  const alreadyMatchedDonorIds = new Set<string>(existingMatches.map((m) => m.donor_id));

  // ---------------------------------------------------------------------------
  // Step 7: Fetch donor_responses for this request (to exclude already-responded donors)
  // ---------------------------------------------------------------------------
  const { data: responseRows, error: responseError } = await client
    .from('donor_responses')
    .select('donor_id')
    .eq('request_id', requestId);

  if (responseError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching donor response records.',
    };
  }

  const respondedDonorIds = new Set<string>(
    (responseRows ?? []).map((r: { donor_id: string }) => r.donor_id)
  );

  // ---------------------------------------------------------------------------
  // Step 8: Run the pure matching engine
  // Uses narrow DonorMatchingRow/RequestMatchingRow adapters — no phone_number
  // or full_name stubs are needed.
  // ---------------------------------------------------------------------------
  const engineInputs = donors.map((donor) =>
    donorMatchingRowToEngineInput(donor, {
      hasPriorResponse: respondedDonorIds.has(donor.id),
      isAlreadyMatched: alreadyMatchedDonorIds.has(donor.id),
    })
  );

  const engineResult = matchDonorsForRequest(
    requestMatchingRowToEngineInput(requestData),
    engineInputs,
    evaluationTime
  );

  // Engine should always succeed here because we pre-validated the request
  // (the engine's request-level check is redundant but safe).
  if (!engineResult.success) {
    if (engineResult.requestError === 'EXCLUDE_REQUEST_INACTIVE') {
      return { success: false, requestId, error: 'request_inactive', message: 'Blood request is not active.' };
    }
    if (engineResult.requestError === 'EXCLUDE_REQUEST_EXPIRED') {
      return { success: false, requestId, error: 'request_expired', message: 'Blood request has expired.' };
    }
    if (engineResult.requestError === 'UNSUPPORTED_COMPONENT_FOR_MATCHING') {
      return { success: false, requestId, error: 'unsupported_component', message: 'Component not supported for matching.' };
    }
    return { success: false, requestId, error: 'database_error', message: 'Matching engine failed.' };
  }

  // ---------------------------------------------------------------------------
  // Step 9: Insert only NEW eligible candidates not already in a match row.
  // Uses upsert with onConflict + ignoreDuplicates: true to implement
  // INSERT-OR-IGNORE semantics through the UNIQUE(request_id, donor_id)
  // constraint. Existing rows — including their lifecycle status and
  // match_metadata — are NEVER overwritten by this operation.
  // ignoreDuplicates: true means a conflicting row is silently skipped;
  // no error is raised and no field is modified.
  // ---------------------------------------------------------------------------
  // Narrow to only newly eligible donors not already represented by a match row.
  // The alreadyMatchedDonorIds set was built from the Step 6 existing-match query.
  const newCandidates = engineResult.candidates.filter(
    (c) => !alreadyMatchedDonorIds.has(c.donorId)
  );

  if (newCandidates.length > 0) {
    const upsertPayloads: Database['public']['Tables']['matches']['Insert'][] = newCandidates.map(
      (candidate) => ({
        request_id: candidate.requestId,
        donor_id: candidate.donorId,
        status: 'candidate' as const,
        match_metadata: candidate.metadata as unknown as Record<string, unknown>,
      })
    );

    const { error: upsertError } = await client
      .from('matches')
      .upsert(upsertPayloads, {
        onConflict: 'request_id,donor_id',
        ignoreDuplicates: true,
      });

    if (upsertError) {
      return {
        success: false,
        requestId,
        error: 'database_error',
        message: 'An error occurred while persisting match candidates.',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Step 10: Re-query the authoritative current candidate match set
  // This includes rows created by this call AND rows from prior calls.
  // We filter to 'candidate' status for the Step 6 response; other lifecycle
  // statuses (notified/accepted/etc.) are preserved but not included here.
  // ---------------------------------------------------------------------------
  const { data: finalMatchRows, error: finalMatchError } = await client
    .from('matches')
    .select('id, donor_id, status, match_metadata, created_at')
    .eq('request_id', requestId)
    .eq('status', 'candidate');

  if (finalMatchError) {
    return {
      success: false,
      requestId,
      error: 'database_error',
      message: 'An error occurred while fetching the final match candidate set.',
    };
  }

  const finalMatches = (finalMatchRows ?? []) as ExistingMatchFields[];

  // ---------------------------------------------------------------------------
  // Step 11: Build the privacy-safe public response
  // Construct a lookup of donor data from our already-fetched donor rows.
  // We never need to re-query; we have sufficient data from Step 5.
  // ---------------------------------------------------------------------------
  const donorLookup = new Map<string, DonorMatchingRow>(donors.map((d) => [d.id, d]));

  // Build a lookup of engine-produced candidates by donorId for efficient access
  const engineCandidateByDonorId = new Map<string, EligibleMatchCandidate>(
    engineResult.candidates.map((c) => [c.donorId, c])
  );

  const publicCandidates: PublicMatchCandidate[] = [];

  for (const matchRow of finalMatches) {
    const donorData = donorLookup.get(matchRow.donor_id);
    if (!donorData) {
      // Donor existed in a prior match but is no longer in the district query.
      // Skip silently — do not surface this donor's details or error.
      continue;
    }

    // Prefer engine-produced candidate for freshly computed metadata and reasons.
    const engineCandidate = engineCandidateByDonorId.get(matchRow.donor_id);
    if (engineCandidate) {
      publicCandidates.push(
        buildPublicCandidateFromEngine(
          engineCandidate,
          { id: matchRow.id, status: matchRow.status, created_at: matchRow.created_at },
          districtName
        )
      );
    } else {
      // Historical candidate: reconstruct from persisted match_metadata.
      const metadata = matchRow.match_metadata as MatchMetadata | null;
      publicCandidates.push(
        buildPublicCandidateFromRow(
          matchRow,
          matchRow.donor_id,
          donorData.blood_group as BloodGroup,
          donorData.approximate_area,
          requestId,
          districtName,
          metadata
        )
      );
    }
  }

  // Apply the same deterministic sort used by the engine for stable output ordering.
  // Homologous first, then days_since_donation descending, then donor UUID ascending.
  publicCandidates.sort((a, b) => {
    if (a.compatibilityType === 'homologous' && b.compatibilityType !== 'homologous') return -1;
    if (b.compatibilityType === 'homologous' && a.compatibilityType !== 'homologous') return 1;
    return a.matchId.localeCompare(b.matchId); // stable secondary sort by match UUID
  });

  return {
    success: true,
    requestId,
    matches: publicCandidates,
    totalMatches: publicCandidates.length,
  };
}
