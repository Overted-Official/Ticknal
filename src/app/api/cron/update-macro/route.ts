import { NextResponse } from 'next/server';
import { db } from '@/db';
import { systemLogs } from '@/db/schema';
import { syncAllMacroInflation } from '@/lib/cbe-inflation';
import { verifyCronAuth } from '@/lib/cron-auth';

export async function GET(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    await syncAllMacroInflation();
    
    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'INFO',
      message: 'Successfully synced Macro Inflation Rates from CBE and FRED.',
    });

    return NextResponse.json({ message: 'Macro inflation sync completed' }, { status: 200 });
  } catch (error) {
    console.error('Error syncing macro inflation rates:', error);
    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'ERROR',
      message: 'Failed to sync Macro Inflation Rates',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
