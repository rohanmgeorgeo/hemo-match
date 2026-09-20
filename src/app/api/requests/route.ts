import { NextResponse } from 'next/server';
import { validateBloodRequest, parseIstDateTime } from '@/lib/validation';
import { resolveDistrictId } from '@/lib/db/districts';
import { createBloodRequest, updateBloodRequest, type CreateBloodRequestParams } from "@/lib/db/requests";
import { isValidUuid } from "@/lib/validation/matches";

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

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_json",
        message: "Invalid JSON request payload.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "Invalid request payload.",
      },
      { status: 400 }
    );
  }

  const rawId = (body as Record<string, unknown>).id;
  if (typeof rawId !== "string" || !isValidUuid(rawId.trim())) {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "A valid requestId UUID is required for updating a blood request.",
        errors: { id: "Invalid or missing blood request ID." },
      },
      { status: 400 }
    );
  }

  const requestId = rawId.trim();

  // Validate form fields using existing validation
  const validation = validateBloodRequest(body);
  if (!validation.isValid || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "Blood request validation failed.",
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const validData = validation.data;

  if (validData.unitsNeeded > 50) {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "Blood request validation failed.",
        errors: { unitsNeeded: "Quantity cannot exceed 50 units." },
      },
      { status: 400 }
    );
  }

  const districtResult = await resolveDistrictId(validData.districtId);
  if (!districtResult.success) {
    if (districtResult.error === "unconfigured") {
      return NextResponse.json(
        {
          success: false,
          error: "service_unavailable",
          message: "Database service is temporarily unavailable.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "invalid_district",
        message: "District could not be resolved.",
        errors: { districtId: "Please select a valid district." },
      },
      { status: 400 }
    );
  }

  const targetDate = parseIstDateTime(validData.requiredByDate, validData.requiredByTime);
  if (!targetDate) {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "Invalid required date or time.",
        errors: { requiredByDate: "Please enter a valid date and time" },
      },
      { status: 400 }
    );
  }

  const updateResult = await updateBloodRequest({
    id: requestId,
    bloodGroup: validData.bloodGroup,
    component: validData.component,
    unitsNeeded: validData.unitsNeeded,
    districtId: districtResult.districtId,
    approximateArea: validData.approximateArea,
    hospitalName: validData.hospitalName,
    requiredBy: targetDate.toISOString(),
    urgency: validData.urgency,
    notes: validData.notes ?? null,
    locationLatitude: validData.locationLatitude ?? null,
    locationLongitude: validData.locationLongitude ?? null,
  });

  if (!updateResult.success) {
    if (updateResult.error === "unconfigured") {
      return NextResponse.json(
        {
          success: false,
          error: "service_unavailable",
          message: "Database service is temporarily unavailable.",
        },
        { status: 503 }
      );
    }
    if (updateResult.error === "not_found") {
      return NextResponse.json(
        {
          success: false,
          error: "not_found",
          message: "Blood request not found.",
        },
        { status: 404 }
      );
    }
    if (updateResult.error === "locked") {
      return NextResponse.json(
        {
          success: false,
          error: "request_locked",
          message: updateResult.message,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "database_error",
        message: updateResult.message || "An error occurred while updating the blood request.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      request: updateResult.request,
    },
    { status: 200 }
  );
}
