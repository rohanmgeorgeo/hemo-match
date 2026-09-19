/**
 * Hemo Match - Selection Dataset Seed Operations
 *
 * Scope: Idempotent database operations for the internal evaluation selection dataset.
 *
 * SAFETY INVARIANTS:
 * 1. Scope Isolation: Operates strictly on KNOWN_SELECTION_DONOR_IDS.
 * 2. Non-Destructive: NEVER truncates, drops, or alters unrelated tables/records.
 * 3. Idempotency: Multiple runs produce identical state without duplicate records.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SELECTION_EVAL_CENTER,
  KNOWN_SELECTION_DONOR_IDS,
  buildSelectionDonorRows,
  type SelectionDonorDefinition,
  SELECTION_DONOR_DEFINITIONS,
} from './data';

export interface SeedResult {
  success: boolean;
  action: 'seeded' | 'reset';
  districtId: string;
  districtName: string;
  affectedDonorIds: readonly string[];
  donors: readonly SelectionDonorDefinition[];
  message: string;
}

export interface SeedOptions {
  resetOnly?: boolean;
  referenceDate?: Date;
  districtId?: string;
}

/**
 * Idempotently seeds or resets the internal evaluation dataset.
 *
 * Guarantees:
 * - NEVER truncates tables.
 * - Touches ONLY the 5 deterministic selection donor UUIDs.
 * - Cleans prior test match/notification/response state for these 5 donors only.
 * - Safe to run repeatedly.
 */
export async function seedSelectionDataset(
  client: SupabaseClient,
  options: SeedOptions = {}
): Promise<SeedResult> {
  const { resetOnly = false, referenceDate = new Date() } = options;

  // 1. Resolve Ernakulam district ID if not explicitly provided
  let districtId = options.districtId;
  let districtName = SELECTION_EVAL_CENTER.districtName;

  if (!districtId) {
    const { data: district, error: districtError } = await client
      .from('districts')
      .select('id, name')
      .eq('slug', SELECTION_EVAL_CENTER.districtSlug)
      .maybeSingle<{ id: string; name: string }>();

    if (districtError || !district) {
      throw new Error(
        `Failed to resolve district '${SELECTION_EVAL_CENTER.districtSlug}': ${
          districtError?.message || 'District not found in database.'
        }`
      );
    }

    districtId = district.id;
    districtName = district.name;
  }

  // 2. Safe Isolation: clean up downstream evaluation records for ONLY the 5 deterministic donor IDs
  // We delete in reverse dependency order to respect database foreign keys.
  const { error: revealErr } = await client
    .from('contact_reveals')
    .delete()
    .in('donor_id', KNOWN_SELECTION_DONOR_IDS as string[]);
  if (revealErr) {
    throw new Error(`Failed to clean prior contact reveals: ${revealErr.message}`);
  }

  const { error: respErr } = await client
    .from('donor_responses')
    .delete()
    .in('donor_id', KNOWN_SELECTION_DONOR_IDS as string[]);
  if (respErr) {
    throw new Error(`Failed to clean prior donor responses: ${respErr.message}`);
  }

  const { error: notifErr } = await client
    .from('notifications')
    .delete()
    .in('donor_id', KNOWN_SELECTION_DONOR_IDS as string[]);
  if (notifErr) {
    throw new Error(`Failed to clean prior notifications: ${notifErr.message}`);
  }

  const { error: matchErr } = await client
    .from('matches')
    .delete()
    .in('donor_id', KNOWN_SELECTION_DONOR_IDS as string[]);
  if (matchErr) {
    throw new Error(`Failed to clean prior matches: ${matchErr.message}`);
  }

  // 3. Handle Reset vs Seed
  if (resetOnly) {
    const { error: donorDelErr } = await client
      .from('donors')
      .delete()
      .in('id', KNOWN_SELECTION_DONOR_IDS as string[]);
    if (donorDelErr) {
      throw new Error(`Failed to remove selection donors: ${donorDelErr.message}`);
    }

    return {
      success: true,
      action: 'reset',
      districtId,
      districtName,
      affectedDonorIds: KNOWN_SELECTION_DONOR_IDS,
      donors: SELECTION_DONOR_DEFINITIONS,
      message: `Successfully reset ${KNOWN_SELECTION_DONOR_IDS.length} selection donor records and associated test state.`,
    };
  }

  // 4. Idempotent Upsert: upsert the 5 selection donors into the donors table
  const donorRows = buildSelectionDonorRows(districtId, referenceDate);

  const { error: upsertErr } = await client
    .from('donors')
    .upsert(donorRows, { onConflict: 'id' });

  if (upsertErr) {
    throw new Error(`Failed to upsert selection donors: ${upsertErr.message}`);
  }

  return {
    success: true,
    action: 'seeded',
    districtId,
    districtName,
    affectedDonorIds: KNOWN_SELECTION_DONOR_IDS,
    donors: SELECTION_DONOR_DEFINITIONS,
    message: `Successfully seeded ${donorRows.length} selection donors in ${districtName} (${SELECTION_EVAL_CENTER.approximateArea}).`,
  };
}
