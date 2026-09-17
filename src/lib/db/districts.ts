import 'server-only';

import { getServerClient } from '@/lib/database';

export type DistrictResolutionResult =
  | {
      success: true;
      districtId: string;
      error?: never;
      message?: never;
    }
  | {
      success: false;
      districtId: null;
      error: 'unconfigured' | 'not_found' | 'database_error';
      message: string;
    };

/**
 * Resolves a frontend district slug (e.g. 'dist-ekm') to the UUID primary key in the `districts` table.
 *
 * Requirements:
 * - Server-only execution
 * - Uses existing getServerClient()
 * - Returns a typed result
 * - Handles unconfigured Supabase gracefully
 * - Handles unknown district slug safely
 * - Exposes only the resolved UUID or descriptive error status, never credentials
 */
export async function resolveDistrictId(
  slug: string
): Promise<DistrictResolutionResult> {
  const trimmedSlug = slug?.trim();
  if (!trimmedSlug) {
    return {
      success: false,
      districtId: null,
      error: 'not_found',
      message: 'District slug must not be empty.',
    };
  }

  const client = getServerClient();
  if (!client) {
    return {
      success: false,
      districtId: null,
      error: 'unconfigured',
      message: 'Database client is not configured.',
    };
  }

  const { data, error } = await client
    .from('districts')
    .select('id')
    .eq('slug', trimmedSlug)
    .maybeSingle<{ id: string }>();

  if (error) {
    return {
      success: false,
      districtId: null,
      error: 'database_error',
      message: error.message,
    };
  }

  if (!data) {
    return {
      success: false,
      districtId: null,
      error: 'not_found',
      message: `District not found for slug: "${trimmedSlug}".`,
    };
  }

  return {
    success: true,
    districtId: data.id,
  };
}
