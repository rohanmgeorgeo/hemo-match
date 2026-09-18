/**
 * Hemo Match - POST /api/requests/notifications/dispatch
 *
 * Server API boundary for triggering outbound in-app notifications to candidate donors.
 *
 * DEMO AUTHORIZATION BOUNDARY:
 * User authentication is not yet integrated (Mock Auth stage).
 * Passing requestId establishes request identification for the demo workflow,
 * NOT cryptographically verified authorization.
 * In production, this endpoint will require an authenticated requester session
 * (Supabase Auth / JWT) verifying ownership of the blood request record.
 *
 * RESPONSIBILITIES:
 * - Validate JSON payload.
 * - Accept strictly { requestId: string (UUID) }.
 * - Reject client-supplied limits, donor IDs, statuses, or payloads.
 * - Delegate dispatch orchestration to the server-only helper.
 * - Return privacy-safe aggregate counts and user feedback.
 */

import { NextResponse } from 'next/server';
import { dispatchNotificationsForRequest } from '@/lib/db/notifications';
import { validateDispatchRequest } from '@/lib/validation/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

  // 2. Validate request body — strictly { requestId: UUID }
  const validation = validateDispatchRequest(body);
  if (!validation.isValid || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Request validation failed.',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const { requestId } = validation.data;

  // 3. Delegate to server-only orchestration helper
  const result = await dispatchNotificationsForRequest(requestId);

  // 4. Map helper result to HTTP response
  if (!result.success) {
    switch (result.error) {
      case 'unconfigured':
        return NextResponse.json(
          {
            success: false,
            error: 'service_unavailable',
            message: 'Database service is temporarily unavailable.',
          },
          { status: 503 }
        );

      case 'request_not_found':
        return NextResponse.json(
          {
            success: false,
            error: 'not_found',
            message: 'Blood request not found.',
          },
          { status: 404 }
        );

      case 'request_inactive':
        return NextResponse.json(
          {
            success: false,
            error: 'request_inactive',
            message: 'Blood request is not currently active for notification dispatch.',
          },
          { status: 400 }
        );

      case 'request_expired':
        return NextResponse.json(
          {
            success: false,
            error: 'request_expired',
            message: 'Blood request required-by time has passed.',
          },
          { status: 400 }
        );

      case 'unsupported_component':
        return NextResponse.json(
          {
            success: false,
            error: 'unsupported_component',
            message:
              'This blood component is not supported for notification dispatch in the current version.',
          },
          { status: 400 }
        );

      case 'database_error':
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'database_error',
            message: 'An error occurred while dispatching notifications. Please try again.',
          },
          { status: 500 }
        );
    }
  }

  // 5. Success response — privacy-safe aggregate counts only
  return NextResponse.json(
    {
      success: true,
      requestId: result.requestId,
      dispatchedCount: result.dispatchedCount,
      totalCandidates: result.totalCandidates,
      message: result.message,
    },
    { status: 200 }
  );
}
