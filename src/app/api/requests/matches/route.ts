/**
 * Hemo Match - POST /api/requests/matches
 *
 * Thin HTTP boundary over the server-only findAndCreateMatches() helper.
 *
 * RESPONSIBILITIES:
 * - Parse and validate the incoming JSON request body.
 * - Accept ONLY a well-formed requestId UUID.
 * - Delegate all matching logic and database access to findAndCreateMatches().
 * - Map the typed helper result to the appropriate HTTP response.
 * - Return privacy-safe PublicMatchCandidate objects without modification.
 *
 * NON-RESPONSIBILITIES (do not add here):
 * - No matching logic.
 * - No direct Supabase queries.
 * - No eligibility rules.
 * - No donor UUID resolution.
 * - No phase-specific business logic beyond input validation + HTTP mapping.
 *
 * PRIVACY:
 * - No logging of request bodies or match results.
 * - No private donor contact info, personal names, or internal exclusion reasons are surfaced.
 * - Sanitized PublicMatchCandidate objects are passed through from the helper as-is.
 *
 * ACCEPTED INPUT:
 * { "requestId": "<uuid-v4>" }
 *
 * REJECTED INPUTS (400):
 * - Invalid JSON
 * - Non-object body
 * - Missing requestId
 * - Non-string requestId
 * - Malformed UUID (not matching UUID format)
 */

import { NextResponse } from 'next/server';
import { findAndCreateMatches } from '@/lib/db/matches';
import { validateMatchRequest, type MatchRequestInput } from '@/lib/validation/matches';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // ---------------------------------------------------------------------------
  // 1. Parse JSON safely
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 2. Validate request body — accepts only { requestId: string (UUID) }
  // All other fields are ignored. Client-supplied match IDs, donor IDs,
  // statuses, blood groups, districts, and metadata are NOT accepted.
  // ---------------------------------------------------------------------------
  const validation = validateMatchRequest(body);
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

  const { requestId }: MatchRequestInput = validation.data;

  // ---------------------------------------------------------------------------
  // 3. Delegate all matching logic and DB access to the server-only helper
  // ---------------------------------------------------------------------------
  const result = await findAndCreateMatches(requestId);

  // ---------------------------------------------------------------------------
  // 4. Map helper result to HTTP response
  // ---------------------------------------------------------------------------

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
            message: 'Blood request is not currently active for matching.',
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
              'This blood component is not supported for preliminary matching in the current version.',
          },
          { status: 400 }
        );

      case 'rule_not_found':
        return NextResponse.json(
          {
            success: false,
            error: 'internal_error',
            message: 'A matching configuration error occurred. Please try again later.',
          },
          { status: 500 }
        );

      case 'database_error':
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'database_error',
            message: 'An error occurred while processing the match request. Please try again.',
          },
          { status: 500 }
        );
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Success — return sanitized match candidates as-is from the helper
  // Zero matches is still a 200 (not a 404 or error), with an explanatory message.
  // ---------------------------------------------------------------------------
  if (result.totalMatches === 0) {
    return NextResponse.json(
      {
        success: true,
        requestId: result.requestId,
        totalMatches: 0,
        matches: [],
        message: 'No eligible candidate donors currently found in this district.',
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      requestId: result.requestId,
      totalMatches: result.totalMatches,
      matches: result.matches,
    },
    { status: 200 }
  );
}
