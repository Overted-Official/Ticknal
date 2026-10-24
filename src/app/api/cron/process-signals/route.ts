import { NextResponse } from 'next/server';
import { handleProcessSignals } from '@/lib/cron-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  return handleProcessSignals(req);
}
