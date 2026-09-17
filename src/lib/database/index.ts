/**
 * Hemo Match - Database Client & Configuration
 *
 * Scope: Supabase/PostgreSQL connection helpers, typed client factories,
 * and environment configuration validation.
 *
 * SECURITY RULES — read carefully before modifying:
 *
 * 1. getServerClient()  → uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *    Only call this from Next.js Route Handlers or Server Actions.
 *    NEVER call this in 'use client' components or pages.
 *
 * 2. getAnonClient()    → uses NEXT_PUBLIC_SUPABASE_ANON_KEY (respects RLS).
 *    Safe for server components that need read-only access to public data
 *    (e.g. districts list). Because RLS denies most tables, it cannot access
 *    donor phone_number or other private data.
 *
 * 3. The donor's phone_number is private. It must only be retrieved via
 *    getServerClient() inside the contact_reveals workflow.
 *
 * Both client factories are server-only (no 'use client' directive here).
 * This file must not be imported from client components.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

export interface DatabaseEnvConfig {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  isConfigured: boolean;
  isServerConfigured: boolean;
}

/**
 * Returns Supabase environment configuration and readiness status.
 * Call this to check whether the database is wired before making queries.
 */
export function getDatabaseConfig(): DatabaseEnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseUrl !== 'https://your-project-id.supabase.co' &&
      supabaseAnonKey &&
      supabaseAnonKey !== 'your-anon-key-placeholder'
  );

  const isServerConfigured = Boolean(
    isConfigured &&
      supabaseServiceRoleKey &&
      supabaseServiceRoleKey !== 'your-service-role-key-placeholder'
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    isConfigured,
    isServerConfigured,
  };
}

// ---------------------------------------------------------------------------
// Server-side privileged client (service role — bypasses RLS)
// ---------------------------------------------------------------------------

/**
 * Returns a Supabase client authenticated with the service role key.
 *
 * ⚠ IMPORTANT:
 * - Bypasses Row Level Security entirely.
 * - Can read/write ALL tables including donors.phone_number.
 * - Must ONLY be called in Next.js Route Handlers, Server Actions, or
 *   server-side lib functions. Never in client components.
 * - Returns null if SUPABASE_SERVICE_ROLE_KEY is not configured, so callers
 *   can handle the unconfigured state gracefully during development.
 */
export function getServerClient(): SupabaseClient<Database> | null {
  const config = getDatabaseConfig();

  if (!config.isServerConfigured) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[hemo-match/db] Server client not configured. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
          'and SUPABASE_SERVICE_ROLE_KEY in .env.local to enable database access.'
      );
    }
    return null;
  }

  return createClient<Database>(
    config.supabaseUrl!,
    config.supabaseServiceRoleKey!,
    {
      auth: {
        // Disable cookie-based auth persistence for server-side clients
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Anon client (respects RLS — safe for public/server-component read queries)
// ---------------------------------------------------------------------------

/**
 * Returns a Supabase client using the anon key.
 *
 * This client respects Row Level Security. With current RLS policies:
 * - Can read the districts table (public reference data).
 * - Cannot read donors, blood_requests, matches, or any sensitive table.
 *   Those tables have no permissive anon policy.
 *
 * Use for: server components that need to fetch non-sensitive reference data
 *   (e.g. rendering the districts dropdown server-side).
 * Do NOT use for: any operation that should access private donor data.
 *
 * Returns null if not configured.
 */
export function getAnonClient(): SupabaseClient<Database> | null {
  const config = getDatabaseConfig();

  if (!config.isConfigured) {
    return null;
  }

  return createClient<Database>(config.supabaseUrl!, config.supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience type exports for use in Route Handlers / Server Actions
// ---------------------------------------------------------------------------

export type { SupabaseClient };

/**
 * Typed Supabase client for Hemo Match database schema.
 * Alias for SupabaseClient<Database> to simplify import in consumers.
 */
export type HemoMatchClient = SupabaseClient<Database>;
