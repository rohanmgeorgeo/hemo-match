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
      errorCode?: string;
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

  // Handle known safe structured API error responses
  if (data && typeof data === 'object') {
    const errData = data as { error?: unknown; message?: unknown };
    const errCode = typeof errData.error === 'string' ? errData.error : undefined;

    if (errCode === 'request_expired') {
      return {
        status: 'error',
        errorCode: 'request_expired',
        message:
          'This blood request has expired. Create a new request with a future required-by time.',
      };
    }

    if (errCode === 'request_inactive') {
      return {
        status: 'error',
        errorCode: 'request_inactive',
        message: 'This blood request is not currently active for matching.',
      };
    }

    if (errCode === 'unsupported_component') {
      return {
        status: 'error',
        errorCode: 'unsupported_component',
        message:
          typeof errData.message === 'string' && errData.message.trim().length > 0
            ? errData.message
            : 'This blood component is not supported for preliminary matching in the current version.',
      };
    }

    if (statusCode === 404 || errCode === 'not_found' || errCode === 'request_not_found') {
      return {
        status: 'error',
        errorCode: 'not_found',
        message: 'Blood request not found.',
      };
    }

    if (statusCode === 503 || errCode === 'service_unavailable' || errCode === 'unconfigured') {
      return {
        status: 'error',
        errorCode: 'service_unavailable',
        message: 'Database service is temporarily unavailable. Please try again shortly.',
      };
    }
  }

  // Controlled safe error copy for unhandled 4xx/5xx responses or malformed payloads
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
