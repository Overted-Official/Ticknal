import { NextResponse } from 'next/server';
import { handlePerformanceGet, handleSignalsGet } from '@/lib/sectors-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ action: string[] }> }) {
  const { action } = await context.params;
  const sub = action[0];

  switch (sub) {
    case 'performance':
      return handlePerformanceGet(req);
    case 'signals':
      return handleSignalsGet();
    default:
      return NextResponse.json({ error: `Unknown sector action: ${sub}` }, { status: 404 });
  }
}
