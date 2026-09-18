/**
 * Hemo Match - /api/donors/notifications
 *
 * Privacy-safe Donor Inbox API.
 * Supports:
 * - GET: Fetch notifications for a demo donor identity (?donorId=<uuid>)
 * - PATCH: Mark a specific notification as read ({ notificationId, donorId })
 *
 * DEMO AUTHORIZATION BOUNDARY:
 * User authentication is not yet integrated (Mock Auth stage).
 * Passing donorId establishes demo donor identification, NOT cryptographically verified
 * production authorization. In production, this endpoint requires an authenticated donor session
 * (Supabase Auth / JWT) verifying ownership.
 *
 * PRIVACY GUARANTEES:
 * - Omits donor UUID, donor name, donor phone/email from response.
 * - Omits requester phone/contact and patient identifiers.
 * - Omits match ID and internal exclusion reasons.
 * - All queries are server-only and scoped strictly to the supplied demo donor ID.
 */

import { NextResponse } from 'next/server';
import {
  getDonorNotifications,
  markNotificationAsRead,
} from '@/lib/db/notifications';
import {
  validateDonorNotificationsQuery,
  validateMarkNotificationReadInput,
} from '@/lib/validation/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const donorIdParam = searchParams.get('donorId');

  // 1. Validate donorId query parameter
  const validation = validateDonorNotificationsQuery(donorIdParam);
  if (!validation.isValid || !validation.donorId) {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_donor_id',
        message: validation.error || 'A valid donorId query parameter is required.',
      },
      { status: 400 }
    );
  }

  // 2. Fetch scoped notifications via server-only DB helper
  const result = await getDonorNotifications(validation.donorId);

  // 3. Map result to HTTP response
  if (!result.success) {
    if (result.error === 'unconfigured') {
      return NextResponse.json(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'database_error',
        message: 'Unable to retrieve notifications at this time.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      notifications: result.notifications,
    },
    { status: 200 }
  );
}

export async function PATCH(request: Request) {
  // 1. Parse JSON safely
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_json',
        message: 'Invalid JSON request payload.',
      },
      { status: 400 }
    );
  }

  // 2. Validate input body
  const validation = validateMarkNotificationReadInput(body);
  if (!validation.isValid || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Validation failed for notification update.',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const { notificationId, donorId } = validation.data;

  // 3. Delegate to server-only helper with ownership verification
  const result = await markNotificationAsRead(notificationId, donorId);

  // 4. Map result to HTTP response
  if (!result.success) {
    if (result.error === 'unconfigured') {
      return NextResponse.json(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    if (result.error === 'not_found') {
      return NextResponse.json(
        {
          success: false,
          error: 'not_found',
          message: 'Notification not found or access denied.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'database_error',
        message: 'Failed to mark notification as read.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      notificationId: result.notificationId,
      readAt: result.readAt,
    },
    { status: 200 }
  );
}
