import { NextResponse } from 'next/server';
import { submitDonorResponse } from '@/lib/db/responses';
import { validateResponseInput } from '@/lib/validation/responses';

/**
 * POST /api/donors/responses
 *
 * Records a donor's authoritative Accept or Decline response to a blood request match notification.
 *
 * DEMO AUTHORIZATION NOTE:
 * Uses client-supplied donorId as a demo identity boundary.
 * Production systems require authenticated sessions (e.g. Supabase Auth / SMS OTP).
 *
 * PRIVACY GUARANTEES:
 * - Omits donor phone numbers and PII.
 * - Omits requester contact details and patient names.
 * - Does NOT perform contact reveal (deferred strictly to Step 9).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_json',
        message: 'Request body must be a valid JSON object.',
      },
      { status: 400 }
    );
  }

  const validation = validateResponseInput(body);
  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: validation.error,
      },
      { status: 400 }
    );
  }

  const { donorId, notificationId, response } = validation.data;

  const result = await submitDonorResponse({
    donorId,
    notificationId,
    response,
  });

  if (result.success) {
    return NextResponse.json(
      {
        success: true,
        response: result.response,
      },
      { status: 200 }
    );
  }

  switch (result.error) {
    case 'not_found':
    case 'request_not_found':
    case 'match_not_found':
    case 'donor_not_found':
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 404 }
      );

    case 'already_responded':
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 409 }
      );

    case 'invalid_notification':
    case 'request_inactive':
    case 'request_expired':
    case 'invalid_match_status':
    case 'revalidation_failed':
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 400 }
      );

    case 'unconfigured':
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 503 }
      );

    case 'database_error':
    default:
      return NextResponse.json(
        {
          error: 'server_error',
          message: 'An error occurred while recording your response. Please try again.',
        },
        { status: 500 }
      );
  }
}
