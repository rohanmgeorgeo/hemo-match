/**
 * Hemo Match - Database Client & Config Subsystem
 *
 * Scope: Supabase/PostgreSQL connection abstraction, schema query wrappers,
 * and data access layer.
 *
 * Note: Database client initialization and schema migrations are deferred to
 * the database milestone. This file defines configuration contracts.
 */

export interface DatabaseEnvConfig {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  isConfigured: boolean;
}

/**
 * Returns Supabase environment configuration status.
 */
export function getDatabaseConfig(): DatabaseEnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

/**
 * Database client stub.
 * Actual Supabase client instance will be exported once client package is configured.
 */
export function getDbClient() {
  const config = getDatabaseConfig();
  if (!config.isConfigured) {
    return null;
  }
  // Supabase client instance will be instantiated here in the database milestone
  return null;
}
