/**
 * Hemo Match - Notification Dispatch Request Validation
 *
 * Pure validator for POST /api/requests/notifications/dispatch input.
 * Ensures the body contains strictly a well-formed RFC 4122 UUID for requestId.
 *
 * DISPATCH LIMIT SECURITY:
 * Any client-supplied limit, donor ID, status, or configuration is discarded.
 * Dispatch limit is server-controlled exclusively.
 */

import { isValidUuid } from '@/lib/validation/matches';

export interface DispatchRequestInput {
  requestId: string;
}

export interface DispatchRequestValidationResult {
  isValid: boolean;
  data: DispatchRequestInput | null;
  errors: Record<string, string>;
}

export function validateDispatchRequest(
  body: unknown
): DispatchRequestValidationResult {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      data: null,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const record = body as Record<string, unknown>;

  if (!('requestId' in record)) {
    errors.requestId = 'requestId is required.';
  } else if (typeof record.requestId !== 'string') {
    errors.requestId = 'requestId must be a string.';
  } else if (!isValidUuid(record.requestId)) {
    errors.requestId = 'requestId must be a valid UUID.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
    };
  }

  return {
    isValid: true,
    data: {
      requestId: record.requestId as string,
    },
    errors: {},
  };
}

// ---------------------------------------------------------------------------
// Donor Notification Inbox Query Validation
// ---------------------------------------------------------------------------

export interface DonorNotificationsQueryValidationResult {
  isValid: boolean;
  donorId: string | null;
  error?: string;
}

export function validateDonorNotificationsQuery(
  donorIdParam: unknown
): DonorNotificationsQueryValidationResult {
  if (typeof donorIdParam !== 'string' || !donorIdParam.trim()) {
    return {
      isValid: false,
      donorId: null,
      error: 'donorId query parameter is required.',
    };
  }

  const trimmed = donorIdParam.trim();
  if (!isValidUuid(trimmed)) {
    return {
      isValid: false,
      donorId: null,
      error: 'donorId must be a valid UUID.',
    };
  }

  return {
    isValid: true,
    donorId: trimmed,
  };
}

// ---------------------------------------------------------------------------
// Mark Notification Read Validation (PATCH)
// ---------------------------------------------------------------------------

export interface MarkNotificationReadInput {
  notificationId: string;
  donorId: string;
}

export interface MarkNotificationReadValidationResult {
  isValid: boolean;
  data: MarkNotificationReadInput | null;
  errors: Record<string, string>;
}

export function validateMarkNotificationReadInput(
  body: unknown
): MarkNotificationReadValidationResult {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      data: null,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const record = body as Record<string, unknown>;

  if (!('notificationId' in record)) {
    errors.notificationId = 'notificationId is required.';
  } else if (typeof record.notificationId !== 'string') {
    errors.notificationId = 'notificationId must be a string.';
  } else if (!isValidUuid(record.notificationId)) {
    errors.notificationId = 'notificationId must be a valid UUID.';
  }

  if (!('donorId' in record)) {
    errors.donorId = 'donorId is required.';
  } else if (typeof record.donorId !== 'string') {
    errors.donorId = 'donorId must be a string.';
  } else if (!isValidUuid(record.donorId)) {
    errors.donorId = 'donorId must be a valid UUID.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
    };
  }

  return {
    isValid: true,
    data: {
      notificationId: record.notificationId as string,
      donorId: record.donorId as string,
    },
    errors: {},
  };
}

// ---------------------------------------------------------------------------
// UI Response Parser for Dispatch API
// ---------------------------------------------------------------------------

export type DispatchUiState =
  | { status: 'idle' }
  | { status: 'dispatching' }
  | { status: 'success'; count: number; message: string }
  | { status: 'zero_notifications'; message: string }
  | { status: 'already_notified'; message: string }
  | { status: 'error'; message: string };

export function parseDispatchApiResponse(
  status: number,
  data: unknown
): DispatchUiState {
  if (status === 200 && data && typeof data === 'object') {
    const res = data as Record<string, unknown>;
    const count = typeof res.dispatchedCount === 'number' ? res.dispatchedCount : 0;
    const message =
      typeof res.message === 'string'
        ? res.message
        : count > 0
        ? `${count} eligible donor(s) notified • In-app notifications sent`
        : '0 eligible donors notified';

    if (count > 0) {
      return {
        status: 'success',
        count,
        message: `${count} eligible donor${count === 1 ? '' : 's'} notified • In-app notifications sent`,
      };
    } else {
      return {
        status: 'zero_notifications',
        message:
          message ||
          'No notifications were dispatched (candidates may already be notified or no longer available).',
      };
    }
  }

  if (status === 400 && data && typeof data === 'object') {
    const res = data as Record<string, unknown>;
    if (res.error === 'request_inactive') {
      return {
        status: 'already_notified',
        message:
          'In-app notifications have already been sent for this blood request.',
      };
    }
    return {
      status: 'error',
      message:
        typeof res.message === 'string'
          ? res.message
          : 'Unable to process notification dispatch.',
    };
  }

  if (status === 404) {
    return {
      status: 'error',
      message: 'Blood request not found.',
    };
  }

  if (status === 503) {
    return {
      status: 'error',
      message: 'Notification dispatch service is temporarily unavailable.',
    };
  }

  return {
    status: 'error',
    message: 'An unexpected error occurred while dispatching notifications.',
  };
}
