import { NextResponse } from 'next/server';
import { getCurrentProprietaryAccess } from '@/lib/server/proprietary-strategy-access';
import { getTurboSnapshot } from '@/lib/finance/turbo-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = getTurboSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: 'Turbo snapshot unavailable' }, { status: 503 });
  }

  const access = await getCurrentProprietaryAccess();

  // If user does not have proprietary access or is unauthenticated,
  // return only public qualification status (to drive the gold star badges)
  if (!access.authenticated || (!access.canView && !access.canReceiveAlerts)) {
    return NextResponse.json(
      {
        hasAccess: false,
        qualifiedTickers: snapshot.qualifiedTickers,
        benchmark: snapshot.benchmark,
        asOf: snapshot.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  }

  // Full proprietary telemetry for authorized users and staff
  return NextResponse.json(
    {
      hasAccess: true,
      isOwner: access.isOwner,
      ...snapshot,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
