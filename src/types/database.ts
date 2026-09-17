/**
 * Hemo Match - Database Row Types
 *
 * These types represent the shape of rows returned from Supabase/PostgreSQL.
 * They are intentionally separate from the frontend form/domain types in
 * src/types/index.ts to keep concerns clean:
 *
 *   • Frontend types  (src/types/index.ts)       → form state, validation, localStorage
 *   • Database types  (src/types/database.ts)     → Supabase row shapes, server queries
 *
 * Key differences:
 *   • DB uses snake_case column names; frontend uses camelCase field names.
 *   • DB uses UUID strings for all primary keys.
 *   • DB stores required_by as a combined TIMESTAMPTZ string.
 *   • DonorRow includes phone_number — this type MUST only be used server-side.
 *
 * Usage: Import these types in src/lib/database/index.ts and in
 * future Next.js Route Handlers / Server Actions. Do NOT import into
 * client components.
 */

// ---------------------------------------------------------------------------
// Enum string literals (mirror PostgreSQL CREATE TYPE ... AS ENUM)
// ---------------------------------------------------------------------------

export type DbBloodGroup =
  | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type DbBloodComponent =
  | 'Whole Blood' | 'Red Blood Cells' | 'Platelets' | 'Plasma';

export type DbUrgencyLevel =
  | 'critical' | 'urgent' | 'routine' | 'standard';

export type DbRequestStatus =
  | 'draft' | 'active' | 'matching' | 'notified'
  | 'partially_filled' | 'fulfilled' | 'expired' | 'cancelled';

export type DbDonorAvailability =
  | 'available' | 'temporarily_unavailable' | 'paused';

export type DbNotificationPreference = 'enabled' | 'disabled';

export type DbMatchStatus =
  | 'candidate' | 'notified' | 'responded'
  | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export type DbResponseStatus = 'accepted' | 'declined' | 'pending';

export type DbNotificationStatus = 'unread' | 'read' | 'dismissed';

export type DbNotificationType =
  | 'match_found' | 'request_fulfilled' | 'request_expired'
  | 'contact_reveal' | 'system';

// ---------------------------------------------------------------------------
// Row types — one type per table
// ---------------------------------------------------------------------------

export type DistrictRow = {
  id: string;
  slug: string;
  name: string;
  state: string | null;
  created_at: string;
};

/**
 * DonorRow — server-side only.
 * phone_number is included here but MUST NOT be returned in public API
 * responses or matching previews. Use DonorPublicRow for safe projections.
 */
export type DonorRow = {
  id: string;
  full_name: string;
  blood_group: DbBloodGroup;
  district_id: string;
  approximate_area: string;
  /** PRIVATE — never expose in matching results or public queries. */
  phone_number: string;
  last_donation_date: string | null;
  availability: DbDonorAvailability;
  notification_preference: DbNotificationPreference;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * DonorPublicRow — safe projection of DonorRow without private fields.
 * Use this type for any server response that could reach client components
 * or be included in matching metadata visible to requesters.
 */
export type DonorPublicRow = Omit<DonorRow, 'phone_number'>;

export type BloodRequestRow = {
  id: string;
  blood_group: DbBloodGroup;
  component: DbBloodComponent;
  units_needed: number;
  district_id: string;
  approximate_area: string;
  hospital_name: string;
  /** Combined date+time stored as TIMESTAMPTZ (ISO 8601 string from Supabase) */
  required_by: string;
  urgency: DbUrgencyLevel;
  status: DbRequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchRow = {
  id: string;
  request_id: string;
  donor_id: string;
  status: DbMatchStatus;
  /** Matching engine metadata. Must not contain donor phone_number. */
  match_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type DonorResponseRow = {
  id: string;
  request_id: string;
  donor_id: string;
  match_id: string | null;
  status: DbResponseStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  donor_id: string;
  request_id: string | null;
  match_id: string | null;
  type: DbNotificationType;
  status: DbNotificationStatus;
  /** Notification payload. Must not contain donor phone_number. */
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

export type ContactRevealRow = {
  id: string;
  request_id: string;
  donor_id: string;
  match_id: string | null;
  trigger: string;
  reason: string | null;
  revealed_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_ref: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  /** Audit metadata. Must not contain phone_number or sensitive PII. */
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Database schema type (used to type the Supabase client generics)
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      districts: {
        Row: DistrictRow;
        Insert: Omit<DistrictRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<DistrictRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      donors: {
        Row: DonorRow;
        Insert: Omit<DonorRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DonorRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      blood_requests: {
        Row: BloodRequestRow;
        Insert: Omit<BloodRequestRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<BloodRequestRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Omit<MatchRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<MatchRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      donor_responses: {
        Row: DonorResponseRow;
        Insert: Omit<DonorResponseRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DonorResponseRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<NotificationRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      contact_reveals: {
        Row: ContactRevealRow;
        Insert: Omit<ContactRevealRow, 'id' | 'revealed_at'> & { id?: string };
        Update: Record<string, never>; // contact_reveals is append-only / immutable
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, 'id' | 'created_at'> & { id?: string };
        Update: Record<string, never>; // audit_logs is append-only / immutable
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
