import { NextResponse } from 'next/server';
import { validateRevealInput } from '@/lib/validation/reveal';
import { requestContactReveal } from '@/lib/db/reveal';

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

  // 2. Validate input parameters strictly
  const validation = validateRevealInput(body);
  if (!validation.isValid || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Contact reveal request validation failed.',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const { requestId, matchId, notificationId } = validation.data;

  // 3. Delegate to server-only helper
  const result = await requestContactReveal({
    requestId,
    matchId,
    notificationId,
  });

  // 4. Handle result
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

      case 'not_found':
        return NextResponse.json(
          {
            success: false,
            error: 'not_found',
            message: 'Match or request record not found.',
          },
          { status: 404 }
        );

      case 'unauthorized_or_not_accepted':
        return NextResponse.json(
          {
            success: false,
            error: 'unauthorized_or_not_accepted',
            message: 'Contact reveal is not authorized. The donor has not accepted or the request is no longer active.',
          },
          { status: 403 }
        );

      case 'database_error':
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'internal_error',
            message: 'An error occurred while authorizing contact reveal.',
          },
          { status: 500 }
        );
    }
  }

  // 5. Success - return minimum contact projection only
  return NextResponse.json(
    {
      success: true,
      contact: {
        name: result.contact.name,
        phone: result.contact.phone,
      },
    },
    { status: 200 }
  );
}
