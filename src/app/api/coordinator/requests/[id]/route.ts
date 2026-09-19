/**
 * Hemo Match - Coordinator Request Detail API Route
 *
 * GET /api/coordinator/requests/[id]
 * Returns the full operational lifecycle breakdown for a single blood request.
 * Strictly read-only and privacy-safe.
 */

import { NextResponse } from 'next/server';
import { fetchCoordinatorRequestDetail } from '@/lib/db/coordinator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing request ID parameter',
          generatedAt: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const result = await fetchCoordinatorRequestDetail(id);

    return NextResponse.json(result, {
      status: result.success ? 200 : result.error?.includes('not found') ? 404 : 400,
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
