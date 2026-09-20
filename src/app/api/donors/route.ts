import { NextResponse } from 'next/server';
import { validateDonorProfile } from '@/lib/validation';
import { resolveDistrictId } from '@/lib/db/districts';
import { createDonor, updateDonor, type CreateDonorParams } from '@/lib/db/donors';
import { isValidUuid } from '@/lib/validation/matches';

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

  // 2. Re-run donor validation on the server using existing validation logic
  const validation = validateDonorProfile(body);
  if (!validation.isValid || !validation.data) {
    // 3. Reject invalid input with HTTP 400
    return NextResponse.json(
      {
        success: false,
        error: 'validation_error',
        message: 'Donor registration validation failed.',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const validData = validation.data;

  // 4. Validate/resolve the frontend district slug
  const districtResult = await resolveDistrictId(validData.districtId);
  if (!districtResult.success) {
    if (districtResult.error === 'unconfigured') {
      // 11. Return 503 when Supabase is not configured
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

    // 5. Return 400 for an unknown/invalid district
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

  // 6. Map validated frontend donor fields to the database schema
  // 7. Ignore/discard any client-provided donor id (PostgreSQL generates UUID)
  const donorParams: CreateDonorParams = {
    fullName: validData.fullName,
    bloodGroup: validData.bloodGroup,
    districtId: districtResult.districtId,
    approximateArea: validData.approximateArea,
    phoneNumber: validData.phoneNumber,
    lastDonationDate: validData.lastDonationDate ?? null,
    availability: validData.availability,
    notificationPreference: validData.notificationPreference,
    consentGiven: validData.consentGiven,
    locationLatitude: validData.locationLatitude ?? null,
    locationLongitude: validData.locationLongitude ?? null,
  };

  // 8. Insert through the donor DB helper
  const insertResult = await createDonor(donorParams);

  if (!insertResult.success) {
    if (insertResult.error === 'unconfigured') {
      // 11. Return 503 when Supabase is not configured
      return NextResponse.json(
        {
          success: false,
          error: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    // 12. Return generic 500 for unexpected database failures without leaking internals
    return NextResponse.json(
      {
        success: false,
        error: 'database_error',
        message: 'An error occurred while saving the donor profile. Please try again.',
      },
      { status: 500 }
    );
  }

  // 9. Return HTTP 201 on success
  // 10. Return a public response that does NOT contain phone_number or phoneNumber
  return NextResponse.json(
    {
      success: true,
      donor: insertResult.donor,
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
        message: "A valid donorId UUID is required for updating a donor profile.",
        errors: { id: "Invalid or missing donor ID." },
      },
      { status: 400 }
    );
  }

  const donorId = rawId.trim();

  // Re-run validation on server
  const validation = validateDonorProfile(body);
  if (!validation.isValid || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: "validation_error",
        message: "Donor profile validation failed.",
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const validData = validation.data;

  // Validate/resolve the frontend district slug
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

    if (districtResult.error === "database_error") {
      return NextResponse.json(
        {
          success: false,
          error: "database_error",
          message: "An error occurred while validating the district. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "invalid_district",
        message: `District "${validData.districtId}" could not be resolved.`,
        errors: { districtId: "Please select a valid district." },
      },
      { status: 400 }
    );
  }

  const updateResult = await updateDonor({
    id: donorId,
    fullName: validData.fullName,
    bloodGroup: validData.bloodGroup,
    districtId: districtResult.districtId,
    approximateArea: validData.approximateArea,
    phoneNumber: validData.phoneNumber,
    lastDonationDate: validData.lastDonationDate ?? null,
    availability: validData.availability,
    notificationPreference: validData.notificationPreference,
    consentGiven: validData.consentGiven,
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

    return NextResponse.json(
      {
        success: false,
        error: "database_error",
        message: updateResult.message || "An error occurred while updating the donor profile. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      donor: updateResult.donor,
    },
    { status: 200 }
  );
}
