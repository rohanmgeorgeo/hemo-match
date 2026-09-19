#!/usr/bin/env tsx
/**
 * Hemo Match - Selection Dataset CLI Runner
 *
 * Usage:
 *   npm run seed:selection         # Seeds or refreshes the 5 evaluation donors
 *   npm run seed:selection:reset   # Removes the 5 evaluation donors and their test records
 *
 * SAFETY INVARIANTS:
 * - Server / developer execution only.
 * - Never prints secrets or tokens.
 * - Operates strictly on deterministic selection UUIDs.
 * - Never truncates tables or deletes unrelated user data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { seedSelectionDataset } from '../src/lib/selection/seed';

/**
 * Loads key-value pairs from a local env file if the variable is not already in process.env.
 * Does NOT log or expose any values.
 */
function loadLocalEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key] && val) {
        process.env[key] = val;
      }
    }
  } catch {
    // Fail silently on file read error to avoid logging
  }
}

async function main() {
  const cwd = process.cwd();
  loadLocalEnvFile(path.join(cwd, '.env.local'));
  loadLocalEnvFile(path.join(cwd, '.env'));

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Error: Required Supabase configuration is missing.\n' +
        'Please ensure SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY ' +
        'are provided via environment variables or .env.local.'
    );
    process.exit(1);
  }

  const isResetOnly =
    process.argv.includes('--reset') ||
    process.env.npm_lifecycle_event === 'seed:selection:reset';

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const result = await seedSelectionDataset(client, { resetOnly: isResetOnly });

    if (result.action === 'reset') {
      console.log('----------------------------------------------------');
      console.log('✓ Hemo Match Selection Dataset: RESET COMPLETE');
      console.log('----------------------------------------------------');
      console.log(result.message);
      console.log('Targeted deterministic donor IDs:');
      for (const id of result.affectedDonorIds) {
        console.log(`  • ${id}`);
      }
      console.log('----------------------------------------------------');
    } else {
      console.log('----------------------------------------------------');
      console.log('✓ Hemo Match Selection Dataset: SEED COMPLETE');
      console.log('----------------------------------------------------');
      console.log(result.message);
      console.log('\nSeeded Evaluation Donor Pool (Ernakulam):');
      for (const donor of result.donors) {
        console.log(`\n• ${donor.fullName} [${donor.bloodGroup}]`);
        console.log(`  ID:       ${donor.id}`);
        console.log(`  Location: ${donor.approximateArea} (${donor.locationLatitude}, ${donor.locationLongitude})`);
        console.log(`  Interval: Last donation was ${donor.daysSinceLastDonation} days ago`);
        console.log(`  Delivery: Notifications ${donor.notificationPreference}`);
        console.log(`  Role:     ${donor.scenarioRole}`);
        console.log(`  Expected: ${donor.expectedBehavior}`);
      }
      console.log('----------------------------------------------------');
      console.log('Evaluation scenario is ready. Create an A+ request in Ernakulam to test.');
    }
  } catch (error) {
    console.error(
      'Error executing selection seed operation:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

void main();
