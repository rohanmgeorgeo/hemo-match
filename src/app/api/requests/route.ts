import { NextResponse } from 'next/server';
import { validateBloodRequest, parseIstDateTime } from '@/lib/validation';
import { resolveDistrictId } from '@/lib/db/districts';
import { createBloodRequest, type CreateBloodRequestParams } from '@/lib/db/requests';

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

  // 2. Re-run blood request validation on the server using existing validation logic
  const validation = validateBloodRequest(body);
  if (!validation.isValid || !validation.data) {
    // 3. Reject invalid input with HTTP 400
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Blood request validation failed.',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const validData = validation.data;

  // Schema-level constraint: units_needed must not exceed 50
  if (validData.unitsNeeded > 50) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Blood request validation failed.',
        errors: { unitsNeeded: 'Quantity cannot exceed 50 units.' },
      },
      { status: 400 }
    );
  }

  // 4. Validate/resolve the frontend district slug
  const districtResult = await resolveDistrictId(validData.districtId);
  if (!districtResult.success) {
    if (districtResult.error === 'unconfigured') {
      // Return 503 when Supabase is not configured
      return NextResponse.json(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    if (districtResult.error === 'database_error') {
      // Return generic 500 when district lookup encounters database error
      return NextResponse.json(
        {
          success: false,
          error: 'database_error',
          message: 'An error occurred while validating the district. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return 400 for an unknown/invalid district
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_district',
        message: `District "${validData.districtId}" could not be resolved.`,
        errors: { districtId: 'Please select a valid district.' },
      },
      { status: 400 }
    );
  }

  // 5. Deterministically map requiredByDate and requiredByTime to TIMESTAMPTZ ISO string in IST (UTC+05:30)
  const targetDate = parseIstDateTime(validData.requiredByDate, validData.requiredByTime);
  if (!targetDate) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Invalid required date or time.',
        errors: { requiredByDate: 'Please enter a valid date and time' },
      },
      { status: 400 }
    );
  }
  const requiredByIso = targetDate.toISOString();

  // 6. Map validated frontend fields explicitly to the database schema
  // 7. Ignore/discard any client-provided id, created_at, updated_at, district_id, status, requesterContact, patientName
  // 8. Let PostgreSQL generate the authoritative request UUID
  // 9. Initial lifecycle status ('active') is enforced by createBloodRequest
  const requestParams: CreateBloodRequestParams = {
    bloodGroup: validData.bloodGroup,
    component: validData.component,
    unitsNeeded: validData.unitsNeeded,
    districtId: districtResult.districtId,
    approximateArea: validData.approximateArea,
    hospitalName: validData.hospitalName,
    requiredBy: requiredByIso,
    urgency: validData.urgency,
    notes: validData.notes ?? null,
    locationLatitude: validData.locationLatitude ?? null,
    locationLongitude: validData.locationLongitude ?? null,
  };

  // 10. Insert through the blood request DB helper
  const insertResult = await createBloodRequest(requestParams);

  if (!insertResult.success) {
    if (insertResult.error === 'unconfigured') {
      // Return 503 when Supabase is not configured
      return NextResponse.json(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    // Return generic 500 for unexpected database failures without leaking internals
    return NextResponse.json(
      {
        success: false,
        error: 'database_error',
        message: 'An error occurred while saving the blood request. Please try again.',
      },
      { status: 500 }
    );
  }

  // 11. Return HTTP 201 on success with public request representation
  // 12. requester_contact is never returned
  return NextResponse.json(
    {
      success: true,
      request: insertResult.request,
    },
    { status: 201 }
  );
}
