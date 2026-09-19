import { NextResponse } from 'next/server';
import { validateDonorProfile } from '@/lib/validation';
import { resolveDistrictId } from '@/lib/db/districts';
import { createDonor, type CreateDonorParams } from '@/lib/db/donors';

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
