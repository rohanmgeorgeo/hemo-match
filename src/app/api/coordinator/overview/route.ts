/**
 * Hemo Match - Coordinator Overview API Route
 *
 * GET /api/coordinator/overview
 * Returns top-level metrics and blood requests with aggregated operational counts.
 * Strictly read-only and privacy-safe.
 */

import { NextResponse } from 'next/server';
import { fetchCoordinatorOverview } from '@/lib/db/coordinator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  try {
    const result = await fetchCoordinatorOverview();
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        generatedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
