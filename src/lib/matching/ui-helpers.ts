/**
 * Hemo Match - Matching UI State & Response Parsing Helpers
 *
 * Pure, side-effect-free helpers for managing the Request → Match UI.
 * Validates localStorage handoff state and maps API responses to calm UI states.
 * No database or client dependencies.
 */

import type { BloodRequest } from '@/types';
import type {
  PublicMatchCandidate,
  CompatibilityType,
  MatchApiResponseSuccess,
} from '@/types/matches';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StoredRequestValidationResult {
  isValid: boolean;
  requestId: string | null;
  request: BloodRequest | null;
}

/**
 * Validates the cached active blood request retrieved from localStorage.
 * Ensures the stored record contains an authoritative PostgreSQL UUID
 * before triggering server matching.
 */
export function validateStoredRequest(
  raw: unknown
): StoredRequestValidationResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { isValid: false, requestId: null, request: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { isValid: false, requestId: null, request: null };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { isValid: false, requestId: null, request: null };
  }

  const record = parsed as Record<string, unknown>;
  const idValue = record.id;

  if (typeof idValue !== 'string' || !UUID_REGEX.test(idValue)) {
    return { isValid: false, requestId: null, request: null };
  }

  // Confirm essential presentation fields exist
  if (
    typeof record.bloodGroup !== 'string' ||
    typeof record.component !== 'string' ||
    typeof record.districtId !== 'string'
  ) {
    return { isValid: false, requestId: null, request: null };
  }

  return {
    isValid: true,
    requestId: idValue,
    request: record as unknown as BloodRequest,
  };
}

export type MatchUiState =
  | {
      status: 'success';
      matches: PublicMatchCandidate[];
      totalMatches: number;
    }
  | {
      status: 'zero_matches';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

/**
 * Safely parses the HTTP status and JSON payload from POST /api/requests/matches.
 * Returns a typed UI state with sanitized copy. Never displays raw database errors.
 */
export function parseMatchApiResponse(
  statusCode: number,
  data: unknown
): MatchUiState {
  if (statusCode === 200 && data && typeof data === 'object') {
    const res = data as Partial<MatchApiResponseSuccess>;
    if (res.success === true && Array.isArray(res.matches)) {
      const candidates = res.matches;
      const count = typeof res.totalMatches === 'number' ? res.totalMatches : candidates.length;

      if (count === 0 || candidates.length === 0) {
        return {
          status: 'zero_matches',
          message:
            typeof res.message === 'string' && res.message.trim().length > 0
              ? res.message
              : 'No eligible candidate donors currently found in this district.',
        };
      }

      return {
        status: 'success',
        matches: candidates,
        totalMatches: count,
      };
    }
  }

  // Controlled safe error copy for all 4xx/5xx responses or malformed payloads
  return {
    status: 'error',
    message:
      'Unable to retrieve matching donors right now. Please verify your connection and try again.',
  };
}

export interface CompatibilityBadgeDetails {
  label: string;
  isHomologous: boolean;
}

/**
 * Maps compatibility type to calm, precise badge copy.
 */
export function getCompatibilityBadgeDetails(
  type: CompatibilityType
): CompatibilityBadgeDetails {
  if (type === 'homologous') {
    return {
      label: 'Exact blood-group match',
      isHomologous: true,
    };
  }

  return {
    label: 'Compatible blood-group match',
    isHomologous: false,
  };
}
